# SPEC 13 — Endurecimiento de seguridad de la autenticación

> **Status:** Aprobado
> **Depends on:** SPEC 06, SPEC 08, SPEC 12
> **Date:** 2026-09-05
> **Objective:** Cerrar los tres hallazgos de la revisión de seguridad de la spec 12 — suplantación de alias en los leaderboards, `SECURITY DEFINER` con `search_path` mutable, y open redirect en el parámetro `next` — moviendo a la base de datos las garantías que hoy solo sostiene el cliente.

## Why this spec exists

La spec 12 puso autenticación real, pero una revisión de seguridad posterior encontró que tres de sus garantías viven solo en el cliente o quedaron a medio cerrar. Las tres son verificables hoy contra el proyecto de Supabase:

**1. `player_name` es suplantable.** Las policies de `INSERT` de las 5 tablas de scores validan `user_id = auth.uid()`, `char_length(player_name) between 1 and 10` y `score >= 0`, pero **no** validan que `player_name` sea el alias del perfil de quien inserta. El comentario de `components/game-player.tsx:115` afirma "_player_name viene de profiles_" y `CLAUDE.md` llama a `profiles` "la fuente única de `player_name`", pero eso solo lo garantiza el código del navegador. Como el `INSERT` sale del cliente con la publishable key, `player_name` es un campo libre del payload: cualquier usuario autenticado puede hacer un POST directo a PostgREST con el alias de otro jugador y aparecer firmando su puntaje en el Salón de la Fama, en vivo vía Realtime. Además `profiles_select_public` (`using (true)`, rol `public`) permite enumerar sin sesión la lista completa de aliases a suplantar. Es la integridad del leaderboard, que es el producto.

**2. `mirror_to_global_scores` es `SECURITY DEFINER` sin `search_path` fijado.** Confirmado en `pg_proc` (`prosecdef = true`, `proconfig = null`) y reportado por tres lints del advisor de Supabase. Corre con privilegios del owner y resuelve nombres según el `search_path` del invocador, que el cliente controla. Encima conserva `EXECUTE` para `anon` y `authenticated`, así que queda expuesta como RPC en `/rest/v1/rpc/mirror_to_global_scores` pese a ser una función de trigger que nadie debería poder llamar.

**3. Open redirect en `next`.** `app/auth/page.tsx:37` y `app/auth/alias/page.tsx:16` leen `next` de la query y lo pasan sin validar a `router.replace(next)`, que con una URL absoluta navega fuera del sitio. Un enlace `https://<host>/auth?next=https://evil.example` deja al usuario en un sitio ajeno **justo después de un login legítimo**, que es su momento de mayor confianza. `app/auth/callback/route.ts:27` se salva por accidente (concatena `${origin}${next}`, lo que rompe una URL absoluta), pero propaga el `next` crudo hacia `/auth/alias`, donde sí se ejecuta el `router.replace`.

Como daño colateral de la misma revisión: `/auth/alias` promete "NO SE PUEDE CAMBIAR DESPUÉS", pero `profiles_update_own` permite cambiar `username` sin restricción.

## Scope

**In:**

- **Trigger `BEFORE INSERT` en las 5 tablas de scores** (`asteroids_scores`, `tetris_scores`, `arkanoid_scores`, `snake_scores`, `frogger_scores`): una función `"arcade-vault".enforce_player_name()` sobrescribe `NEW.player_name` con el `username` de la fila de `profiles` correspondiente a `auth.uid()`, y lanza excepción si ese perfil no existe. El valor que mande el cliente se ignora por completo.
- **Fijar `search_path` y revocar `EXECUTE`** en `"arcade-vault".mirror_to_global_scores()`, y aplicar el mismo endurecimiento a la función nueva `enforce_player_name()` desde su creación.
- **Bloquear el cambio de `username`**: un trigger `BEFORE UPDATE` sobre `profiles` que lanza excepción si `NEW.username` difiere de `OLD.username`. La policy `profiles_update_own` se conserva.
- **`lib/safe-next.ts` nuevo**: helper puro `safeNext(raw: string | null): string` que devuelve `raw` solo si es una ruta relativa de un único slash (empieza con `/` y no con `//`), y `/games` en cualquier otro caso.
- **Aplicar `safeNext()` en los tres puntos que leen `next` de la query**: `app/auth/page.tsx:37`, `app/auth/alias/page.tsx:16` y `app/auth/callback/route.ts:8`.
- **Paso manual del usuario (documentado, no automatizable desde el repo):** habilitar "Leaked password protection" en el dashboard de Supabase (Authentication → Passwords), que comprueba las contraseñas contra HaveIBeenPwned.

**Out of scope (for future specs):**

- Cota superior de `score` y cualquier otra validación anti-cheat. El motor corre en el cliente, así que cualquier tope es arbitrario; sigue siendo una spec futura propia, como ya dice `CLAUDE.md`.
- Pantalla de cuenta/perfil y un flujo legítimo para cambiar el alias. Esta spec cierra el cambio; abrirlo con UI y reglas es otra spec.
- Restringir `profiles_select_public`. El alias es público por diseño (Salón de la Fama); enumerarlo facilita elegir a quién suplantar, pero con el trigger de `player_name` la suplantación deja de ser posible.
- Reclamar, migrar o corregir los puntajes ya existentes: los que tengan `player_name` suplantado o `user_id` null se quedan como están.
- Rate limiting de registro o de guardado de puntajes.
- Recuperación de contraseña, 2FA, confirmación de correo, roles y permisos (todos ya fuera de alcance en la spec 12).
- Tests automatizados (no hay test runner configurado todavía).
- Actualizar `CLAUDE.md` (se hace en un commit posterior, como en specs anteriores).

## Data model

No se crean tablas ni columnas nuevas. Cambian dos funciones, se agregan seis triggers y se ajusta una función existente.

```sql
-- 1. Anclar player_name al perfil. SECURITY DEFINER para que siga funcionando aunque
-- en el futuro se restrinja el SELECT público sobre profiles; search_path fijado
-- porque toda función SECURITY DEFINER debe llevarlo (ver punto 3).
create or replace function "arcade-vault".enforce_player_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select username into new.player_name
  from "arcade-vault".profiles
  where id = auth.uid();

  if new.player_name is null then
    raise exception 'No existe un perfil para el usuario actual';
  end if;

  return new;
end;
$$;

revoke execute on function "arcade-vault".enforce_player_name() from anon, authenticated;

-- Se repite para las 5 tablas de juego. El trigger es BEFORE, así que el AFTER
-- INSERT <juego>_mirror ya copia hacia global_scores el player_name normalizado.
create trigger asteroids_enforce_player_name
  before insert on "arcade-vault".asteroids_scores
  for each row execute function "arcade-vault".enforce_player_name();
```

```sql
-- 2. Congelar el alias: la UI de /auth/alias promete que no se puede cambiar.
create or replace function "arcade-vault".freeze_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'El alias no se puede cambiar';
  end if;
  return new;
end;
$$;

create trigger profiles_freeze_username
  before update on "arcade-vault".profiles
  for each row execute function "arcade-vault".freeze_username();
```

```sql
-- 3. Endurecer la función existente (advisors 0011, 0028 y 0029 de Supabase).
-- El cuerpo ya usa nombres calificados, así que search_path = '' no lo rompe.
alter function "arcade-vault".mirror_to_global_scores() set search_path = '';
revoke execute on function "arcade-vault".mirror_to_global_scores() from anon, authenticated;
```

```ts
// lib/safe-next.ts — helper puro, importable desde cliente y servidor.
const DEFAULT_NEXT = "/games";

/**
 * Solo se admite una ruta relativa de un único slash. Una URL absoluta
 * ("https://evil.example") o protocol-relative ("//evil.example") saldría del
 * sitio justo después de un login legítimo.
 */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : DEFAULT_NEXT;
}
```

Las filas de puntajes ya existentes no se tocan: conservan el `player_name` con el que se guardaron. El trigger solo gobierna los `INSERT` posteriores a esta spec.

## Implementation plan

1. Migración SQL vía `apply_migration`: crear `enforce_player_name()` con `security definer` + `set search_path = ''`, revocarle `EXECUTE` a `anon`/`authenticated`, y crear el trigger `BEFORE INSERT` en las 5 tablas de scores (`asteroids_scores`, `tetris_scores`, `arkanoid_scores`, `snake_scores`, `frogger_scores`). Verificación: `select tgname from pg_trigger` devuelve los 5 triggers nuevos además de los 5 `<juego>_mirror` existentes.
2. Migración SQL vía `apply_migration`: crear `freeze_username()` y su trigger `BEFORE UPDATE` sobre `profiles`. Verificación: un `UPDATE profiles set username = 'OTRO'` sobre la fila propia falla con `El alias no se puede cambiar`.
3. Migración SQL vía `apply_migration`: `alter function mirror_to_global_scores() set search_path = ''` y revocar su `EXECUTE` a `anon`/`authenticated`. Verificación: `get_advisors type=security` ya no reporta los lints `function_search_path_mutable`, `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` para esa función.
4. Guardar un puntaje real desde la app en los 5 juegos y confirmar que el trigger no rompió el flujo normal (mismo alias que antes, fila espejada en `global_scores`). Verificación: las 5 partidas aparecen en su leaderboard con el alias del perfil.
5. Crear `lib/safe-next.ts` con `safeNext()`. Verificación: `npm run build` sin errores de tipos.
6. Aplicar `safeNext()` en `app/auth/page.tsx` (línea 37), `app/auth/alias/page.tsx` (línea 16) y `app/auth/callback/route.ts` (línea 8), reemplazando el `searchParams.get("next") || "/games"` actual. Verificación: `grep -rn 'get("next")' app/` solo devuelve líneas envueltas en `safeNext(...)`.
7. **Paso manual del usuario:** en el dashboard de Supabase, Authentication → Passwords, activar "Leaked password protection". Verificación: `get_advisors type=security` ya no reporta `auth_leaked_password_protection`.
8. Verificación final end-to-end (ver criterios de aceptación) más `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] Un `INSERT` autenticado contra cualquiera de las 5 tablas de scores con un `player_name` que **no** es el alias propio queda guardado con el alias propio, no con el enviado.
- [ ] Ese mismo `INSERT` propaga a `global_scores` el alias corregido, no el enviado (el trigger `AFTER` ve el valor ya normalizado).
- [ ] Un `INSERT` autenticado hecho por un usuario **sin** fila en `profiles` es rechazado con `No existe un perfil para el usuario actual`.
- [ ] Los 5 juegos con leaderboard (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) siguen guardando puntaje correctamente desde la app, con el alias del perfil.
- [ ] Un `UPDATE` sobre la fila propia de `profiles` que cambia `username` es rechazado; uno que no lo cambia sigue pasando.
- [ ] `get_advisors type=security` no reporta ningún lint sobre `mirror_to_global_scores` ni sobre `enforce_player_name`.
- [ ] `mirror_to_global_scores` y `enforce_player_name` no son invocables como RPC por `anon` ni por `authenticated`.
- [ ] Visitar `/auth?next=https://example.com` e iniciar sesión aterriza en `/games`, no en el dominio externo.
- [ ] Visitar `/auth?next=//example.com` e iniciar sesión aterriza en `/games`.
- [ ] Visitar `/auth?next=/salon` e iniciar sesión sigue aterrizando en `/salon` (el caso legítimo no se rompe).
- [ ] El mismo comportamiento se cumple entrando por OAuth: `/auth/callback?next=https://example.com` no saca al usuario del sitio, y `/auth/alias?next=https://example.com` tampoco.
- [ ] Los puntajes guardados antes de esta spec siguen visibles en `/games/<id>` y en `/salon`, sin cambios en su `player_name`.
- [ ] `get_advisors type=security` no reporta `auth_leaked_password_protection` (requiere el paso manual 7).
- [ ] `npm run build` termina sin errores; `npm run lint` no introduce errores nuevos respecto al estado actual del repo.

## Decisions

- **Sí:** el fix de `player_name` es un **trigger `BEFORE INSERT` que sobrescribe**, no una policy con subconsulta que rechaza. Se evaluaron ambas y la de policy (`player_name = (select username from profiles where id = auth.uid())`) obliga al cliente a mandar el valor exacto o el guardado falla, así que un bug en el cliente se convierte en un error visible para el jugador. El trigger normaliza en silencio: el cliente no puede mentir ni equivocarse. Se descartó también aplicar los dos a la vez, porque duplica la misma regla en dos lugares que hay que mantener sincronizados en 5 tablas.
- **Sí:** el trigger es `BEFORE`, para que el `AFTER INSERT` `<juego>_mirror` que ya existe espeje hacia `global_scores` el nombre ya corregido. Si fuera `AFTER`, `global_scores` conservaría el nombre suplantado.
- **Sí:** los 5 `components/games/*/leaderboard.ts` **no se tocan**. Siguen mandando `player_name` en el `insert` y el trigger lo ignora. Quitar el campo sería un diff en 5 archivos que no cambia el comportamiento ni la seguridad, y el `player_name` que mandan hoy ya es el correcto: el problema nunca fue la app, fue que la base confiaba en ella.
- **Sí:** `enforce_player_name()` es `SECURITY DEFINER` aunque hoy `profiles_select_public` haría innecesario el privilegio elevado. Si mañana se restringe ese `SELECT` público (está listado como candidato fuera de alcance), el trigger seguiría funcionando sin tener que recordarlo.
- **Sí:** toda función nueva nace con `set search_path = ''` y sin `EXECUTE` para `anon`/`authenticated`. Es exactamente la deuda que la Vuln 2 viene a pagar en `mirror_to_global_scores`; no tiene sentido crear la siguiente con el mismo defecto.
- **Sí:** el alias se congela con un **trigger `BEFORE UPDATE`**, y `profiles_update_own` se conserva. Una policy RLS no puede comparar `OLD.username` con `NEW.username` (el `using` ve la fila vieja y el `with_check` la nueva, nunca las dos), así que la restricción tiene que vivir en un trigger. Se evaluó revocar `UPDATE` a nivel de columna, pero convivir con un `GRANT UPDATE` de tabla obliga a re-granear columna por columna y se vuelve frágil. Conservar la policy deja la puerta lista para una futura pantalla de cuenta que edite otras columnas.
- **Sí:** `safeNext()` vive en un archivo propio, `lib/safe-next.ts`, y no dentro de `lib/auth-guard.ts`. `auth-guard.ts` importa `next/navigation` y el cliente de servidor, así que no es importable desde un componente `"use client"`, y dos de los tres consumidores lo son.
- **Sí:** el destino por defecto de `safeNext()` es `/games`, el mismo fallback que ya usaban las tres rutas. Un `next` inválido se trata como ausente, sin mostrar error: quien llega con un `next` manipulado es la víctima, no el atacante, y un mensaje de error no le aporta nada.
- **No:** no se valida `next` contra una allowlist de rutas conocidas. La regla "empieza con `/` y no con `//`" ya garantiza que el destino es del mismo origen, que es la propiedad que importa; una allowlist habría que actualizarla con cada ruta nueva.
- **No:** no se restringe `profiles_select_public`. Enumerar aliases facilita elegir a quién suplantar, pero una vez que `player_name` está anclado al perfil eso deja de tener valor ofensivo, y el Salón de la Fama necesita leer aliases ajenos.
- **No:** no entra cota superior de `score`. El motor corre en el cliente; un tope por juego frena el `999999` obvio pero no el `+15%` sostenido, y elegir seis números arbitrarios da una falsa sensación de anti-cheat. Va en su propia spec, junto a la validación del lado del servidor.
- **No:** no se corrigen ni se borran los puntajes ya guardados. No hay evidencia de que ninguno esté suplantado, y reescribir `player_name` por coincidencia de `user_id` inventaría autoría — el mismo argumento con el que la spec 12 dejó los 18 puntajes huérfanos como estaban.

## Risks

| Risk                                                                                                                                     | Mitigation                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El trigger `BEFORE INSERT` rompe el guardado de puntajes en los 5 juegos si la lectura de `profiles` falla o el usuario no tiene perfil. | El paso 4 del plan exige jugar y guardar en los 5 juegos antes de continuar. El caso "sin perfil" ya está cubierto aguas arriba por `requirePlayer()` y `/auth/alias`, así que la excepción es un fail-safe, no un camino esperado. |
| `set search_path = ''` sobre `mirror_to_global_scores` rompe la función si algún nombre quedara sin calificar.                           | El cuerpo actual califica los dos objetos que usa (`"arcade-vault".global_scores` y las columnas de `NEW`). El paso 4 lo verifica en la práctica: si la función se rompiera, el `INSERT` del puntaje fallaría de inmediato.         |
| Revocar `EXECUTE` de las funciones a `anon`/`authenticated` podría impedir que los triggers corran.                                      | Los triggers ejecutan la función con los privilegios del owner de la tabla, no del rol que hace el `INSERT`; el `EXECUTE` de `anon`/`authenticated` solo gobierna la invocación directa por RPC. El paso 4 lo confirma end-to-end.  |
| `safeNext()` aplicado de más podría romper un redirect legítimo con query string (`?next=/games/tetris/play`).                           | El criterio de aceptación incluye el caso legítimo `?next=/salon`, y la regla solo mira el prefijo de la cadena: cualquier ruta relativa pasa intacta, con o sin query.                                                             |
| El paso 7 es manual y fuera del repo; si no se hace, el advisor sigue reportando el lint.                                                | Está aislado del resto: es un toggle del dashboard que no afecta a ninguna de las migraciones ni al código. Su criterio de aceptación se marca solo cuando el paso está hecho.                                                      |

## What is **not** in this spec

- Cota superior de `score` y validación anti-cheat.
- Pantalla de cuenta/perfil y flujo legítimo de cambio de alias.
- Restringir `profiles_select_public`.
- Corregir, reclamar o borrar puntajes ya existentes.
- Rate limiting de registro o de guardado de puntajes.
- Recuperación de contraseña, 2FA, confirmación de correo, roles y permisos.
- Tests automatizados.
- Actualización de `CLAUDE.md` reflejando esta spec como implementada.

Cada uno de estos, si se necesita, va en su propia spec futura.
