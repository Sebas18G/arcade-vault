# SPEC 12 — Autenticación real con Supabase y bloqueo de rutas

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 04, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Reemplazar la sesión simulada de `localStorage` por autenticación real de Supabase (registro con usuario + correo + contraseña, login por correo, OAuth con Google y GitHub), con una tabla `profiles` que fija el alias del jugador, y bloquear las rutas de juego y del Salón de la Fama para quien no haya iniciado sesión.

## Why this spec exists

La app tiene una sesión falsa desde la spec 01: `lib/storage.ts` guarda `{ name }` en `localStorage` bajo `av_user`, `lib/auth-context.tsx` la expone vía `useAuth()`, y `app/auth/page.tsx` es un formulario decorativo que acepta cualquier cosa (incluso vacío, con fallback a `PLAYER1`). Cualquiera puede jugar, guardar puntajes con el nombre que quiera y verse en el Salón de la Fama sin tener cuenta.

Del lado de la base de datos la plomería ya está a medio poner: las 6 tablas de scores creadas en las specs 06/08 y en las de `games-jam` tienen una columna `user_id uuid null references auth.users(id)` que **nunca se llena**, y sus policies de `INSERT` son públicas. La spec 04 dejó explícitamente fuera `middleware.ts` diciendo "se agrega en la spec que implemente login con Supabase". Esta es esa spec: conecta Supabase Auth, llena `user_id`, endurece las policies para que un puntaje solo pueda insertarse a nombre propio, y cierra las rutas que generan datos.

## Scope

**In:**

- **Tabla `"arcade-vault"."profiles"`**: `id` (FK a `auth.users`), `username` único de 3–10 caracteres normalizado a MAYÚSCULAS, `created_at`. Es la fuente de verdad del alias que se muestra en el HUD y se guarda como `player_name` en los leaderboards. RLS: `SELECT` público, `INSERT`/`UPDATE` solo sobre la fila propia (`id = auth.uid()`).
- **Endurecer RLS de las tablas de scores** (`asteroids_scores`, `tetris_scores`, `arkanoid_scores`, `snake_scores`, `frogger_scores`): la policy de `INSERT` público se reemplaza por una `to authenticated with check (user_id = auth.uid() and char_length(player_name) between 1 and 10 and score >= 0)`. `SELECT` sigue público. Verificar que el trigger `mirror_to_global_scores` propague `user_id` hacia `global_scores` y actualizar la función si no lo hace.
- **`app/auth/page.tsx` reescrita** contra Supabase Auth, conservando el diseño retro/neón actual (tabs INICIAR SESIÓN / CREAR CUENTA, tarjeta `auth-card`, sección social):
  - **Crear cuenta:** campos `usuario` + `correo` + `contraseña`. Llama a `supabase.auth.signUp()` y, con la sesión ya activa, inserta la fila en `profiles` con el alias normalizado.
  - **Iniciar sesión:** campos `correo` + `contraseña`, vía `supabase.auth.signInWithPassword()`.
  - Errores en Español, inline en la tarjeta (credenciales inválidas, alias ya tomado, correo ya registrado, contraseña demasiado corta).
  - Respeta el parámetro `?next=<ruta>`: tras autenticarse redirige ahí; si no viene, a `/games`.
  - Los botones GOOGLE y GITHUB pasan a llamar `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: <origin>/auth/callback } })`.
  - Se **elimina** el botón "JUGAR COMO INVITADO".
- **`app/auth/callback/route.ts`** (Route Handler): intercambia el código de OAuth por sesión (`exchangeCodeForSession`), consulta `profiles`; si el usuario ya tiene alias redirige a `/games` (o al `next` que venga en la query), si no lo tiene redirige a `/auth/alias`.
- **`app/auth/alias/page.tsx`**: pantalla de "elige tu alias" para el primer login por OAuth. Un solo campo, mismas reglas 3–10 / MAYÚSCULAS, error inline si el alias ya existe. Hasta no tener alias, el usuario no puede usar las rutas protegidas.
- **`middleware.ts`** nuevo en la raíz: patrón oficial de `@supabase/ssr` (crea el cliente de servidor, llama a `getUser()`, propaga las cookies refrescadas en la respuesta). Con `matcher` sobre `/salon` y `/games/:id/play`; sin sesión redirige a `/auth?next=<ruta original>`.
- **Chequeo en servidor además del middleware** (defensa en profundidad): `app/games/[id]/play/page.tsx` (ya es Server Component) valida `getUser()` y hace `redirect("/auth?next=...")`; se crea `app/salon/layout.tsx` (Server Component) que hace lo mismo, porque `app/salon/page.tsx` es `"use client"` y no puede validar en servidor por sí mismo.
- **`lib/auth-context.tsx` reescrito por dentro, misma API pública**: `useAuth()` sigue devolviendo `user` y `logout`, pero ahora la sesión sale de Supabase (`getSession()` + `onAuthStateChange()`) y el `name` sale de `profiles.username`. Gana `user.id` y un campo `loading` para no parpadear mientras hidrata. `login()` desaparece del contexto (autenticar es responsabilidad de `/auth`).
- **`lib/storage.ts`**: se eliminan `getUser`, `setUser`, la clave `av_user` y el tipo `UserSession` (que se muda a `lib/auth-context.tsx` con la forma nueva). `addScore` y `av_scores` se mantienen intactos: siguen sirviendo a los juegos aún simulados.
- **Los 5 `components/games/*/leaderboard.ts`**: cada `add*Score()` incluye `user_id` del usuario autenticado (obtenido con `supabase.auth.getUser()`), y falla con error si no hay sesión. Se eliminan `getSavedPlayerName`/`setSavedPlayerName` de `components/games/asteroids/leaderboard.ts` (viven solo ahí y solo los consume `game-player.tsx`): el nombre ya no se elige ni se recuerda, viene del perfil.
- **`components/game-player.tsx`**: el `GameOverModal` deja de renderizar el input de nombre — muestra el alias del perfil como texto fijo y el botón guarda con ese valor. El HUD muestra `user.name` sin el fallback `"INVITADO"`.
- **`app/salon/page.tsx`**: "TU MEJOR MARCA" pasa de `.eq("player_name", user.name)` a `.eq("user_id", user.id)`.
- **`components/nav.tsx`**: el botón `NOMBRE ▾` ejecuta `logout()` (ahora `supabase.auth.signOut()`) y redirige a `/`; el enlace del drawer móvil deja de ofrecer "Cuenta" y muestra "Iniciar Sesión" solo cuando no hay sesión.
- **`lib/supabase/types.ts`**: tipo `ProfileRow`.
- **Paso manual del usuario (documentado, no automatizable desde el repo):** en el dashboard de Supabase, desactivar "Confirm email" y habilitar los providers Google y GitHub con sus Client ID/Secret y la redirect URL `<url>/auth/callback`.

**Out of scope (for future specs):**

- Recuperación de contraseña ("¿olvidaste tu contraseña?"), `resetPasswordForEmail` y su pantalla de nueva contraseña.
- Pantalla de cuenta/perfil (`/cuenta`) y cambiar el alias después de elegirlo.
- Reclamar o migrar los puntajes viejos con `user_id` null: se quedan huérfanos tal como están.
- Migrar `av_scores` (`localStorage`) de los juegos aún simulados a Supabase; esos juegos siguen guardando puntaje localmente y solo quedan detrás del bloqueo de ruta.
- Validación anti-cheat de puntajes más allá de los `check` de RLS.
- Roles, permisos o administración de usuarios.
- Confirmación de correo, verificación de identidad, 2FA.
- Providers OAuth distintos de Google y GitHub.
- Tests automatizados (no hay test runner configurado todavía).
- Actualizar `CLAUDE.md` (se hace en un commit posterior, como en specs anteriores).

## Data model

```sql
-- Tabla nueva, en el schema "arcade-vault" (los clientes de lib/supabase/* ya están
-- fijados a ese schema con db: { schema: "arcade-vault" }).
create table "arcade-vault"."profiles" (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 10),
  created_at timestamptz not null default now()
);

alter table "arcade-vault"."profiles" enable row level security;

-- SELECT público: el Salón de la Fama y el HUD muestran alias de otros jugadores.
create policy "profiles_select_public" on "arcade-vault"."profiles"
  for select using (true);

-- Solo se puede crear/editar la fila propia.
create policy "profiles_insert_own" on "arcade-vault"."profiles"
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on "arcade-vault"."profiles"
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

```sql
-- Endurecer el INSERT de cada tabla de scores. Se repite para las 5 tablas de juego
-- (asteroids_scores, tetris_scores, arkanoid_scores, snake_scores, frogger_scores),
-- reemplazando la policy pública creada en las specs 06/08 y en las de games-jam.
drop policy <nombre actual del insert público> on "arcade-vault"."asteroids_scores";

create policy "asteroids_scores_insert_own" on "arcade-vault"."asteroids_scores"
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

-- global_scores se puebla por trigger, no por el cliente: revisar
-- "arcade-vault".mirror_to_global_scores y asegurarse de que copie NEW.user_id
-- hacia global_scores.user_id. Si la función no lo hace, actualizarla.
```

```ts
// lib/supabase/types.ts
export type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
};
```

```ts
// lib/auth-context.tsx — el usuario del contexto ahora lleva id real
export type UserSession = { id: string; name: string } | null;

type AuthContextValue = {
  user: UserSession;
  loading: boolean; // true mientras se resuelve la sesión inicial
  logout: () => Promise<void>;
  // login() ya no existe: autenticar es responsabilidad de /auth
};
```

Las 18 filas de puntajes ya existentes conservan `user_id = null` y su `player_name` original. Siguen apareciendo en los leaderboards; ningún usuario nuevo las hereda, porque "TU MEJOR MARCA" pasa a filtrar por `user_id`.

## Implementation plan

0. **Paso manual del usuario, previo a todo lo demás:** en el dashboard de Supabase del proyecto `okqmxxqnmcqpqzusnype`, desactivar "Confirm email" en Authentication → Providers → Email, y habilitar Google y GitHub pegando su Client ID/Secret y registrando la redirect URL `<url>/auth/callback` (tanto la de desarrollo como la de producción). Verificación: los tres providers aparecen habilitados en el dashboard.
1. Migración SQL vía `apply_migration`: crear `"arcade-vault"."profiles"` con sus tres policies; reemplazar las policies de `INSERT` público de las 5 tablas de scores por las versiones `to authenticated ... user_id = auth.uid()`; revisar y, si hace falta, actualizar `mirror_to_global_scores` para que propague `user_id`. Verificación: `list_tables` muestra `profiles`; `get_advisors type=security` no reporta problemas nuevos.
2. Agregar `ProfileRow` en `lib/supabase/types.ts`. Verificación: `npm run build` sin errores de tipos.
3. Crear `middleware.ts` en la raíz siguiendo el patrón oficial de `@supabase/ssr` (crear `createServerClient` con el adaptador de cookies de request/response, llamar a `getUser()`, devolver la respuesta con las cookies refrescadas), con `matcher` sobre `/salon` y `/games/:id/play` y redirect a `/auth?next=<pathname>` cuando no hay usuario. Verificación: en una ventana anónima, visitar `/salon` redirige a `/auth?next=/salon`.
4. Reescribir `lib/auth-context.tsx`: sesión real (`getSession()` al montar + suscripción a `onAuthStateChange`), lectura del `username` desde `profiles` para el usuario activo, `logout()` que llama a `signOut()`, `loading` mientras resuelve, y el tipo `UserSession` con `id` + `name`. Verificación: `npm run build` compila y el nav deja de leer `localStorage`.
5. Limpiar `lib/storage.ts`: eliminar `getUser`, `setUser`, la constante `av_user` y el tipo `UserSession`; dejar `addScore`/`av_scores` intactos. Verificación: `grep -rn "av_user"` no devuelve resultados en `app/`, `components/` y `lib/`.
6. Reescribir `app/auth/page.tsx`: registro (usuario + correo + contraseña → `signUp` + insert en `profiles`), login (correo + contraseña → `signInWithPassword`), errores inline en Español, soporte de `?next=`, botones Google/GitHub con `signInWithOAuth`, sin botón de invitado. Verificación manual: crear una cuenta nueva y confirmar que aparece en `auth.users` y en `profiles`; cerrar sesión y volver a entrar con correo + contraseña.
7. Crear `app/auth/callback/route.ts` (`exchangeCodeForSession`; si el usuario no tiene fila en `profiles` redirige a `/auth/alias`, si la tiene al `next`/`/games`) y `app/auth/alias/page.tsx` (campo único de alias, normalización a mayúsculas, error "ese alias ya está tomado" ante la violación de `unique`). Verificación manual: entrar por primera vez con Google o GitHub y confirmar que aterriza en `/auth/alias`, y que en el segundo login ya entra directo.
8. Proteger en servidor: en `app/games/[id]/play/page.tsx` agregar el chequeo de `getUser()` con `redirect("/auth?next=/games/<id>/play")`, y crear `app/salon/layout.tsx` (Server Component) con el mismo chequeo. Verificación: ambas rutas redirigen sin sesión incluso si se desactiva temporalmente el `matcher` del middleware.
9. Actualizar los 5 `components/games/*/leaderboard.ts`: `add*Score()` obtiene el usuario con `supabase.auth.getUser()` y manda `user_id` en el insert; sin sesión lanza error. Eliminar `getSavedPlayerName`/`setSavedPlayerName` de `asteroids/leaderboard.ts`. Verificación: `npm run build` sin errores; un puntaje guardado tiene `user_id` no nulo.
10. Actualizar `components/game-player.tsx`: el `GameOverModal` muestra el alias del perfil como texto fijo (sin input) y guarda con ese valor; el HUD usa `user.name` sin fallback `"INVITADO"`; se quitan los imports de `getSavedPlayerName`/`setSavedPlayerName`. Verificación manual: jugar una partida de cada uno de los 5 juegos con leaderboard y confirmar que el puntaje se guarda con el alias correcto.
11. Actualizar `app/salon/page.tsx`: "TU MEJOR MARCA" filtra por `.eq("user_id", user.id)`. Verificación manual: la marca propia refleja solo puntajes guardados con la cuenta actual, no los huérfanos homónimos.
12. Actualizar `components/nav.tsx`: `handleSignOut` usa el `logout()` async del contexto; el drawer móvil ya no ofrece "Cuenta". Verificación manual: cerrar sesión desde el nav deja la app en estado anónimo y `/salon` vuelve a redirigir a `/auth`.
13. Verificación final end-to-end (ver criterios de aceptación) más `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] Crear una cuenta desde `/auth` con usuario + correo + contraseña deja sesión activa de inmediato (sin correo de confirmación) y crea una fila en `auth.users` **y** una en `"arcade-vault"."profiles"` con el alias en mayúsculas.
- [ ] Cerrar sesión y volver a entrar con correo + contraseña funciona y el nav muestra el alias del perfil.
- [ ] Intentar registrarse con un alias ya existente muestra un error inline en Español y **no** crea el perfil duplicado.
- [ ] Un alias de menos de 3 o más de 10 caracteres es rechazado (por UI y por el `check` de la tabla).
- [ ] En una ventana anónima, `/salon` y `/games/<id>/play` redirigen a `/auth?next=<ruta>`; tras iniciar sesión el usuario aterriza en la ruta que pidió originalmente.
- [ ] En una ventana anónima, `/`, `/about`, `/games` y `/games/<id>` siguen cargando normalmente sin sesión.
- [ ] `/salon` y `/games/<id>/play` siguen redirigiendo sin sesión aunque se desactive el `matcher` del middleware (el chequeo del Server Component las cubre).
- [ ] El botón "JUGAR COMO INVITADO" ya no existe en `/auth` y `"INVITADO"` no aparece en el HUD del reproductor.
- [ ] El modal de fin de partida ya no permite escribir un nombre arbitrario: muestra el alias del perfil como texto fijo.
- [ ] Un puntaje guardado tras esta spec tiene `user_id` no nulo y su `player_name` coincide con el `username` del perfil.
- [ ] Un `INSERT` directo contra cualquier tabla de scores usando la publishable key sin sesión es rechazado por RLS.
- [ ] Un `INSERT` con sesión pero con un `user_id` distinto al propio es rechazado por RLS.
- [ ] Los puntajes previos con `user_id` null siguen visibles en `/games/<id>` y en `/salon`, y **no** se cuentan como "TU MEJOR MARCA" de un usuario nuevo con el mismo alias.
- [ ] Entrar por primera vez con Google o con GitHub redirige a `/auth/alias`; tras elegir alias el usuario queda con perfil y en el segundo login entra directo a `/games`.
- [ ] Los 5 juegos con leaderboard (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) guardan puntaje correctamente después del cambio de RLS.
- [ ] `grep -rn "av_user"` no devuelve resultados en `app/`, `components/` ni `lib/`.
- [ ] `npm run build` termina sin errores; `npm run lint` no introduce errores nuevos respecto al estado actual del repo.

## Decisions

- **Sí:** el login es con **correo + contraseña**, no con username. Supabase Auth no autentica por username; se evaluaron un RPC `username → email` con `SECURITY DEFINER` y un email sintético `<alias>@arcadevault.local`, y el usuario eligió el camino estándar: el username vive en `profiles` y es identidad de jugador, no credencial. Se conserva así la recuperación de contraseña por correo como opción futura.
- **Sí:** el alias del perfil es la fuente única de `player_name`. El input de nombre del modal de fin de partida desaparece — era el hueco que permitía firmar un puntaje con cualquier nombre.
- **Sí:** solo se protegen `/games/[id]/play` y `/salon`. Home, Acerca de, catálogo y ficha de juego siguen públicas para que la plataforma tenga escaparate para quien no tiene cuenta. Se descartó cerrar todo salvo `/auth`.
- **Sí:** se elimina el modo invitado. Si nadie puede jugar sin sesión, un estado "invitado" solo agrega una rama muerta al código y un `player_name` "INVITADO" sin dueño.
- **Sí:** sin confirmación de correo — al registrarse se entra directo. Es un portal de arcade; la fricción del correo de verificación cuesta más registros de lo que aporta. Se asume que se pueden registrar correos falsos.
- **Sí:** `INSERT` en las tablas de scores pasa a exigir `authenticated` y `user_id = auth.uid()`. Se descartó la alternativa conservadora de solo llenar `user_id` dejando RLS pública: habría dejado abierto el mismo hueco que esta spec viene a cerrar.
- **Sí:** los 18 puntajes viejos con `user_id` null se quedan como están. Borrarlos es destructivo e irreversible, y reclamarlos por coincidencia de nombre inventaría autoría.
- **Sí:** "TU MEJOR MARCA" del Salón filtra por `user_id` y no por `player_name`. Evita que un usuario nuevo herede marcas anónimas homónimas y sigue funcionando si algún día se permite cambiar de alias.
- **Sí:** OAuth con Google y GitHub entra en esta spec, con un paso 0 manual (crear las apps OAuth y pegar las credenciales en el dashboard) que ejecuta el usuario. Se evaluó dejar OAuth para otra spec o limitarlo a GitHub; el usuario eligió ambos providers ahora.
- **Sí:** pantalla `/auth/alias` para el primer login por OAuth, en vez de derivar el alias automáticamente del correo. Un `SEBASN8NTE` autogenerado en la tabla del Salón es peor experiencia que una pantalla de un solo campo.
- **Sí:** `unique` + `check (char_length between 3 and 10)` + normalización a mayúsculas para el username. El tope de 10 empata exactamente con el `check` de `player_name` que ya tienen las 6 tablas de scores, así que ningún alias válido puede quedar sin caber en un leaderboard. Se descartó agregar un `check` de regex `^[A-Z0-9_]{3,10}$` por ahora.
- **Sí:** bloqueo en dos capas — `middleware.ts` (que además cumple el refresco de cookies que la spec 04 dejó pendiente) **y** chequeo en el Server Component de cada ruta protegida. Un `matcher` mal escrito deja una ruta abierta en silencio; la segunda capa lo cubre.
- **Sí:** `lib/auth-context.tsx` se reescribe por dentro manteniendo `useAuth()` como API pública. Cuatro consumidores (`nav.tsx`, `salon/page.tsx`, `game-player.tsx`, `auth/page.tsx`) ya dependen de ella; borrarla obligaría a repetir la lógica de sesión en cada uno.
- **No:** no se mantiene `av_user` en `localStorage` como caché de UI. Dos fuentes de verdad para la sesión es exactamente el tipo de estado que se desincroniza; el `loading` del contexto cubre el parpadeo inicial.
- **No:** no entra recuperación de contraseña. Suma cuatro piezas (pantalla de solicitud, correo, callback, pantalla de nueva contraseña) y depende del SMTP por defecto de Supabase, fuertemente limitado en envíos por hora.
- **No:** no entra pantalla de cuenta ni cambio de alias. El botón del nav sigue haciendo logout directo, como hoy.
- **No:** los juegos aún simulados no migran su puntaje a Supabase. Quedan detrás del bloqueo de ruta, pero su persistencia en `av_scores` no cambia.

## Risks

| Risk                                                                                                                                                         | Mitigation                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth depende de un paso manual fuera del repo (apps en Google Cloud/GitHub + credenciales en el dashboard). Si no se completa, los botones sociales fallan. | El paso 0 del plan lo documenta explícitamente y el fallo queda acotado: el login por correo + contraseña funciona igual. El criterio de aceptación de OAuth se marca solo cuando el paso 0 esté hecho. |
| Endurecer el `INSERT` de RLS rompe el guardado de puntajes si algún `add*Score()` queda sin mandar `user_id`.                                                | El paso 9 toca los 5 archivos en el mismo cambio, y el criterio de aceptación exige jugar y guardar en los 5 juegos antes de dar la spec por terminada.                                                 |
| Un `matcher` mal escrito en `middleware.ts` (ej. no cubrir la ruta dinámica `/games/[id]/play`) deja una ruta protegida abierta sin error visible.           | Doble capa: el chequeo en el Server Component de cada ruta protegida. El criterio de aceptación pide verificar el bloqueo con el `matcher` desactivado.                                                 |
| Registro en dos pasos (`signUp` y luego insert en `profiles`): si el insert falla, queda un usuario en `auth.users` sin alias y sin poder jugar.             | `/auth/alias` es la red de contención — el callback y el contexto tratan "usuario sin perfil" como un estado válido que se resuelve ahí, venga de OAuth o de un registro a medias.                      |
| Sin confirmación de correo, se pueden registrar direcciones falsas y farmear cuentas para el Salón de la Fama.                                               | Aceptado explícitamente: es un portal de arcade sin datos sensibles. La barrera de "una cuenta por puntaje" ya es mucho más alta que la de hoy (ninguna).                                               |
| El middleware corre en todas las requests que matchee; un error ahí tumba las rutas protegidas por completo.                                                 | El `matcher` se limita a `/salon` y `/games/:id/play`, no a `/((?!_next).*)`, así que un fallo no puede tumbar home, catálogo ni assets.                                                                |
| `mirror_to_global_scores` podría no propagar `user_id`, dejando `global_scores` con autoría nula pese al endurecimiento.                                     | El paso 1 incluye revisar la función y actualizarla si hace falta; `global_scores` hoy no lo consume ningún componente, así que el impacto de un desfase temporal es nulo.                              |

## What is **not** in this spec

- Recuperación de contraseña y su pantalla de reseteo.
- Pantalla de cuenta/perfil y cambio de alias.
- Reclamar o borrar los puntajes huérfanos con `user_id` null.
- Migrar `av_scores` de los juegos aún simulados a Supabase.
- Validación anti-cheat de puntajes.
- Roles, permisos o administración de usuarios.
- Confirmación de correo, verificación de identidad, 2FA.
- Providers OAuth distintos de Google y GitHub.
- Tests automatizados.
- Actualización de `CLAUDE.md` reflejando esta spec como implementada.

Cada uno de estos, si se necesita, va en su propia spec futura.
