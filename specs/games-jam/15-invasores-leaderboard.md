# SPEC 15 — Leaderboard propio de Invasores en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 04, SPEC 06, SPEC 12, SPEC 13, SPEC 14
> **Date:** 2026-09-05
> **Objective:** Dar a Invasores su propia tabla de puntajes en Supabase (`invasores_scores`), conectada al modal de fin de partida, a la tarjeta de la biblioteca, a la ficha del juego y al Salón de la Fama, con el mismo modelo de seguridad autenticado que dejaron las specs 12 y 13.

## Why this spec exists

La spec 14 deja a Invasores jugable pero sin memoria: cada partida se pierde al cerrar el modal. Los cinco juegos reales del catálogo (Asteroids, Tetris, Arkanoid, Snake y Frogger) ya tienen su tabla propia en el schema `"arcade-vault"`, su tab en el Salón de la Fama y su top-12 en la ficha del juego. Esta spec pone a Invasores en esa misma línea, sin inventar patrón nuevo: es la aplicación directa de `.claude/skills/add-game/recipe.md` §4 y §5, con el precedente de la spec 10 (Frogger).

**La diferencia importante respecto de la spec 10:** entre medio pasaron las specs 12 (autenticación real con Supabase Auth) y 13 (endurecimiento). El modelo de seguridad ya **no** es el que describe la spec 10 en su Data model. Hoy, en `supabase/prod/bootstrap.sql`:

- `INSERT` solo `to authenticated`, con `check (user_id = auth.uid() and ...)`. Ya no existe la policy de `INSERT` público.
- Un trigger `BEFORE INSERT` (`enforce_player_name`) **pisa** el `player_name` que manda el cliente con el `username` del perfil de quien inserta, así que no se puede firmar un puntaje con alias ajeno.
- El trigger de espejo a `global_scores` es `AFTER INSERT`, deliberadamente después del anterior, para que `global_scores` reciba el alias ya normalizado.
- Cada `add*Score()` pide el id de sesión con `requireUserId()` de `components/games/shared/session.ts` y falla temprano con un mensaje legible si la sesión se perdió durante la partida.
- Hacen falta `GRANT` explícitos: sin ellos PostgREST rechaza la petición antes de evaluar RLS.

Esta spec sigue ese modelo, no el de la spec 10.

## Scope

**In:**

- Migración SQL en el schema `"arcade-vault"`, aplicada con `apply_migration` del servidor MCP de Supabase (proyecto de **desarrollo**, el único conectado al MCP):
  - Tabla `"arcade-vault"."invasores_scores"` con `score`, `level` y las tres stats propias del juego: `aliens_killed`, `ufos_hit` y `shots_fired`.
  - Fila `('invasores', 'INVASORES')` en `"arcade-vault".games` — es lo que hace aparecer el tab en el Salón de la Fama, que construye sus tabs desde esa tabla y no desde `GAMES`, sin código adicional ahí.
  - Trigger `invasores_enforce_player_name` `BEFORE INSERT`, reusando la función genérica ya existente `"arcade-vault".enforce_player_name()`. **No** se recrea esa función.
  - Trigger `invasores_mirror` `AFTER INSERT`, reusando `"arcade-vault".mirror_to_global_scores('invasores')`. **No** se recrea esa función.
  - RLS habilitado: `SELECT` público (`to anon, authenticated`), `INSERT` solo `to authenticated` con `check (user_id = auth.uid() and char_length(player_name) between 1 and 10 and score >= 0)`.
  - `grant select, insert on "arcade-vault".invasores_scores to anon, authenticated`.
  - Tabla agregada a la publicación `supabase_realtime`, para que el Salón la reciba en vivo.
- **Reflejo del esquema en producción** (`supabase/prod/`), que **no se sincroniza sola** porque no hay `supabase/migrations/` ni CLI:
  - `bootstrap.sql`: la tabla en la sección 2, el `enable row level security` en la 3, las dos policies en la 4, los dos triggers en la 6, el `grant` en la 7, `'invasores_scores'` en el array de Realtime de la 8, y `('invasores', 'INVASORES')` en el seed de la 9.
  - `verify.sql`: la comprobación equivalente a la de los otros cinco juegos.
  - La aplicación en el proyecto de producción se hace **a mano desde el dashboard**, siguiendo `references/migracion-produccion.md`.
- `lib/supabase/types.ts`: `InvasoresScoreRow`.
- `components/games/invasores/leaderboard.ts`: `getInvasoresLeaderboard()` y `addInvasoresScore()`, top-5, con la asimetría de `recipe.md` §4 — una lectura fallida degrada a leaderboard vacío, una escritura fallida **lanza** y se muestra como error inline. `addInvasoresScore()` obtiene el `user_id` con `requireUserId()`.
  - **Si el archivo ya existe** cuando se implemente esta spec (porque `skin-designer` corrió después de la 14 y dejó ahí los helpers `getInvasoresSkin`/`setInvasoresSkin`), se **extiende**, no se reescribe. Ver Decisions.
- `components/game-player.tsx`: `loadInvasoresLeaderboard()` siguiendo el patrón de `loadFroggerLeaderboard`, invocado desde `handleInvasoresGameOver`; prop `leaderboard` en la rama `isInvasores` con `leaderboardEntries`, `leaderboardLoading` y `leaderboardFetchError`, y `onSaveName` llamando a `addInvasoresScore` con el `invasoresResult` de la spec 14.
- `invasores: "invasores_scores"` agregado a los **tres** `SCORE_TABLE` del repo, que son mapas distintos que no se importan entre sí:
  - `app/games/page.tsx:3` — alimenta `fetchRealBests()`, el "mejor" real de las tarjetas de la biblioteca.
  - `app/games/[id]/page.tsx:5` — top-12 de la ficha del juego y "Mejor global".
  - `app/salon/page.tsx:7` — top-12 del tab del Salón de la Fama.

**Out of scope (for future specs):**

- Cualquier cambio en el motor de la spec 14 (`engine.ts`, `invasores-canvas.tsx`). Esta spec consume `InvasoresGameOverResult` tal como quedó, sin tocarlo.
- La **presentación** de la precisión de tiro (`aliens_killed / shots_fired`) como stat visible en el modal, en la ficha o en el Salón. Esta spec **persiste** las tres columnas pero no las muestra: `LeaderboardEntry` no tiene dónde ponerlas y esta spec no rediseña el modal. Ver Decisions.
- Las skins de Invasores y su selector en el HUD: las agrega el agente `skin-designer`, fuera del flujo de specs.
- Migrar los puntajes viejos de `invasores` guardados en `av_scores` de `localStorage` (los del reproductor simulado): se descartan, ver Decisions.
- Validación anti-cheat de puntajes más allá de los `check` de la tabla y del trigger de `player_name`.
- Persistencia para los dos juegos que siguen simulados (`gloton`, `duelo-pixel`).
- Consultar `global_scores` desde algún componente o agregar un tab "GLOBAL".
- Controles táctiles / mobile.
- Actualizar `CLAUDE.md` y `references/implemented-games.md`.
- Tests automatizados.

## Data model

```sql
-- migration: invasores_leaderboard
create table "arcade-vault"."invasores_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  aliens_killed integer not null default 0,
  ufos_hit integer not null default 0,
  shots_fired integer not null default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

insert into "arcade-vault".games (id, title) values ('invasores', 'INVASORES')
  on conflict (id) do nothing;

-- BEFORE: ancla player_name al alias del perfil. AFTER: espeja a global_scores.
-- El orden importa: así global_scores recibe el alias ya normalizado (spec 13).
create trigger invasores_enforce_player_name
  before insert on "arcade-vault"."invasores_scores"
  for each row execute function "arcade-vault".enforce_player_name();

create trigger invasores_mirror
  after insert on "arcade-vault"."invasores_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('invasores');

alter table "arcade-vault"."invasores_scores" enable row level security;

create policy invasores_scores_select_public on "arcade-vault"."invasores_scores"
  for select to anon, authenticated using (true);

create policy invasores_scores_insert_own on "arcade-vault"."invasores_scores"
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

-- Sin GRANT, PostgREST rechaza antes de evaluar RLS.
grant select, insert on "arcade-vault"."invasores_scores" to anon, authenticated;

alter publication supabase_realtime add table "arcade-vault"."invasores_scores";
```

```ts
// lib/supabase/types.ts — mismo orden de campos que FroggerScoreRow, con las tres stats propias
export type InvasoresScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  aliens_killed: number;
  ufos_hit: number;
  shots_fired: number;
  user_id: string | null;
  created_at: string;
};
```

```ts
// components/games/invasores/leaderboard.ts
const MAX_ENTRIES = 5;

// getInvasoresLeaderboard(): select "id, player_name, score, level"
//   order by score desc, limit MAX_ENTRIES; si hay error devuelve [] (falla en silencio).
//   Devuelve LeaderboardEntry[], que solo lleva id/name/score/level: las tres stats
//   se persisten pero no se muestran en el top-5 del modal.
// addInvasoresScore(name, result: InvasoresGameOverResult): pide el user_id con
//   requireUserId(supabase), inserta player_name, score, level, aliens_killed,
//   ufos_hit, shots_fired y user_id; luego relee el top-5.
//   Si hay error, lo lanza (lo muestra GamePlayer como error inline).
//   Nota: el player_name enviado lo pisa el trigger enforce_player_name.
```

`InvasoresGameOverResult` viene de la spec 14 (`components/games/shared/types.ts`) y no cambia: aporta `score`, `level`, `aliensKilled`, `ufosHit` y `shotsFired`, que mapean a `score`, `level`, `aliens_killed`, `ufos_hit` y `shots_fired`.

## Implementation plan

1. Aplicar la migración SQL con `apply_migration` del MCP de Supabase (proyecto de desarrollo): tabla, fila en `games`, los **dos** triggers, RLS con sus dos policies, el `grant`, y la tabla agregada a `supabase_realtime`. Verificación: `list_tables` muestra `invasores_scores` dentro del schema `"arcade-vault"` (no en `public`); una fila insertada desde la app aparece reflejada en `global_scores` con `game_id = 'invasores'` y con el alias del perfil, no con el nombre que mandó el cliente.
2. Agregar `InvasoresScoreRow` a `lib/supabase/types.ts`. Verificación: `npm run build` sin errores de tipos.
3. Crear (o **extender**, si `skin-designer` ya lo dejó con los helpers de skin) `components/games/invasores/leaderboard.ts` con `getInvasoresLeaderboard()` y `addInvasoresScore()`, siguiendo la asimetría lectura-silenciosa / escritura-que-lanza de `frogger/leaderboard.ts` y usando `requireUserId()`. Verificación: `npm run build` pasa; si el archivo ya tenía `getInvasoresSkin`/`setInvasoresSkin`, siguen exportados.
4. Conectar `components/game-player.tsx`: importar los dos helpers nuevos, agregar `loadInvasoresLeaderboard()` junto a los otros cinco `load*Leaderboard`, invocarlo desde `handleInvasoresGameOver`, y pasar el prop `leaderboard` en la rama `isInvasores` con `onSaveName` llamando a `addInvasoresScore(name, invasoresResult)`. Verificación manual: perder una partida en `/games/invasores/play` **con sesión iniciada**, guardar, ver el top-5 actualizado dentro del modal.
5. Verificar el camino de error de escritura en sus dos variantes: (a) **sin sesión**, guardar muestra inline "Necesitas iniciar sesión para guardar tu puntuación." que lanza `requireUserId()`; (b) con la red cortada, guardar muestra el error inline. En ambos casos "JUGAR DE NUEVO" y "SALIR" siguen funcionando. Verificación manual, sin cambios de código si el paso 4 quedó bien.
6. Agregar `invasores: "invasores_scores"` al `SCORE_TABLE` de `app/games/[id]/page.tsx`. Verificación: `/games/invasores` muestra el top-12 real en "MEJORES PUNTUACIONES" y "Mejor global" refleja el puntaje real más alto cuando existe, en vez del `seededScores` estático.
7. Agregar `invasores: "invasores_scores"` al `SCORE_TABLE` de `app/salon/page.tsx`. Verificación: `/salon` muestra un tab "INVASORES" con el top-12 real y "TU MEJOR MARCA" con datos reales si hay sesión.
8. Agregar `invasores: "invasores_scores"` al `SCORE_TABLE` de `app/games/page.tsx`. Verificación: la tarjeta de Invasores en `/games` muestra como "mejor" el puntaje real más alto de la tabla, no el `best: 54190` estático de `app/data/games.ts`.
9. Verificar Realtime: abrir `/salon` en dos pestañas, guardar un puntaje de Invasores en una y confirmar que aparece y se reordena en la otra sin recargar.
10. Reflejar el esquema en `supabase/prod/bootstrap.sql` y `supabase/prod/verify.sql`, en las nueve secciones que corresponda. Verificación: correr `bootstrap.sql` sobre una base limpia deja `invasores_scores` idéntica a la de desarrollo, y `verify.sql` la reporta correcta.
11. Aplicar el esquema en el proyecto de **producción** a mano desde el dashboard, siguiendo `references/migracion-produccion.md`. Verificación: `verify.sql` en producción reporta las 6 tablas de scores y los 6 juegos sembrados.
12. Verificación final de conjunto: `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] La tabla `invasores_scores` existe en el schema `"arcade-vault"` (no en `public`) y es consultable desde `supabase-js`.
- [ ] Existe la fila `('invasores', 'INVASORES')` en `"arcade-vault".games`.
- [ ] Insertar una fila la refleja automáticamente en `global_scores` vía `invasores_mirror`, con `game_id = 'invasores'`.
- [ ] El `player_name` guardado es el `username` del perfil de quien inserta, **no** el string que mandó el cliente: mandar un alias ajeno queda pisado por `invasores_enforce_player_name`.
- [ ] RLS está habilitado, con `SELECT` público e `INSERT` restringido a `authenticated` con `user_id = auth.uid()`.
- [ ] Un `INSERT` **sin sesión** es rechazado por la policy.
- [ ] Un `INSERT` autenticado con `user_id` distinto del propio es rechazado por la policy.
- [ ] Un `INSERT` con `score` negativo es rechazado por la base de datos.
- [ ] Existe el `GRANT` de `select, insert` para `anon, authenticated`.
- [ ] Al terminar una partida con sesión iniciada, el modal muestra el top-5 de Invasores leído de Supabase y permite guardar.
- [ ] Al terminar una partida **sin** sesión, guardar muestra inline "Necesitas iniciar sesión para guardar tu puntuación." y **no** bloquea "JUGAR DE NUEVO" ni "SALIR".
- [ ] Una lectura fallida del leaderboard deja la tabla vacía sin romper el modal.
- [ ] El puntaje guardado incluye `level`, `aliens_killed`, `ufos_hit` y `shots_fired` con los valores reales de la partida, no ceros por defecto.
- [ ] `/games/invasores` muestra el top-12 real de Supabase en "MEJORES PUNTUACIONES" y "Mejor global" usa el puntaje real más alto cuando existe.
- [ ] `/salon` muestra un tab "INVASORES" con el top-12 real de la tabla.
- [ ] La tarjeta de Invasores en `/games` muestra el puntaje real más alto de `invasores_scores`, no el `best: 54190` estático del catálogo.
- [ ] Los tres `SCORE_TABLE` del repo contienen la entrada `invasores`.
- [ ] Guardar un puntaje en una pestaña lo hace aparecer en `/salon` abierto en otra, sin recargar.
- [ ] Si `components/games/invasores/leaderboard.ts` ya tenía helpers de skin, siguen exportados y el selector "SKIN" del HUD sigue funcionando.
- [ ] `supabase/prod/bootstrap.sql` y `supabase/prod/verify.sql` incluyen `invasores_scores` en **todas** las secciones donde aparecen los otros cinco juegos (tabla, RLS, policies, triggers, grant, Realtime, seed).
- [ ] `npm run build` termina sin errores y `npm run lint` no introduce errores nuevos respecto de la rama base.

## Decisions

- **Sí:** una tabla propia por juego (`invasores_scores`), no una tabla compartida. Es el patrón establecido por la spec 06 y repetido por las specs 08 y 10, y permite columnas de stats específicas sin nulos por todos lados.
- **Sí:** se reusan las funciones genéricas ya existentes `enforce_player_name()` y `mirror_to_global_scores()`. No se recrean ni se duplican. Si se llegara a crear una función nueva, hay que revocarle `EXECUTE` a `public` y no solo a `anon`/`authenticated` — Postgres se lo concede a `PUBLIC` por defecto y esos roles lo heredan de ahí (aprendizaje de la spec 13).
- **Sí:** el modelo de seguridad es el de las specs 12/13 (INSERT autenticado, `user_id = auth.uid()`, `player_name` pisado por trigger), **no** el `INSERT` público que describe la spec 10 en su Data model. Copiar el SQL de la spec 10 tal cual abriría un agujero que el repo ya cerró.
- **Sí:** las tres stats (`aliens_killed`, `ufos_hit`, `shots_fired`) se persisten en esta spec aunque no se muestren. El motor de la spec 14 ya las calcula por mecánica — `shots_fired` indexa la tabla del UFO — así que persistirlas no cuesta ningún cambio en el motor, y habilitan la stat diferencial del catálogo (precisión de tiro) para cuando se quiera mostrar. Es exactamente el criterio con el que la spec 10 persistió `frogs_home` y `time_bonus`.
- **No:** la **presentación** de la precisión no entra aquí. Fue decisión explícita del usuario al elegir la partición en dos specs: la capa de stats visibles y skins queda para una spec futura si se quiere. Persistir la columna y mostrarla son dos trabajos distintos, y solo el primero es gratis.
- **Sí:** los **tres** `SCORE_TABLE` reciben la entrada `invasores`. Dejar fuera `app/games/page.tsx` produciría la inconsistencia que la spec 10 ya documentó: la tarjeta de la biblioteca mostrando el `best` mock mientras la ficha y el Salón muestran el real.
- **Sí:** la migración se aplica con `apply_migration` del MCP en desarrollo, y **a mano en producción** desde el dashboard. Los dos proyectos de Supabase no se sincronizan solos: no hay `supabase/migrations/` ni CLI. Por eso el reflejo en `bootstrap.sql`/`verify.sql` es un paso del plan con criterio de aceptación propio, y no un detalle de limpieza.
- **Decisión anticipada:** `leaderboard.ts` puede necesitar **extenderse** en vez de crearse. Si `skin-designer` corre entre la spec 14 y esta —que es lo que hace `/spec-impl-game` en su Fase 6.1— el archivo ya existirá con `getInvasoresSkin`/`setInvasoresSkin`. Escribirlo de cero borraría el selector "SKIN". Es literalmente lo que le pasó a la spec 10 con Frogger, anotado ahí como decisión autónoma; aquí se anticipa.
- **Decisión autónoma:** los puntajes viejos de `invasores` guardados en `av_scores` de `localStorage` (del reproductor simulado) **se descartan**, no se migran. Fueron generados por un `setInterval` que sumaba puntos al azar, así que no miden habilidad y contaminarían un ranking real. Mismo criterio que la spec 10 con `ranaria`.
- **Sí:** top-5 en el modal de fin de partida y top-12 en la ficha del juego y en el Salón. Mismos números que los otros cinco juegos.
- **No:** no se agrega un tab "GLOBAL" ni se consulta `global_scores` desde ningún componente. La spec 06 ya probó y quitó ese tab por redundante; el trigger sigue poblando la tabla solo para un futuro resumen cross-juego.

## Risks

| Risk                                                                                                                                                                                      | Mitigation                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copiar el SQL de la spec 10 tal cual reintroduce el `INSERT` público que las specs 12/13 eliminaron, abriendo la tabla nueva a puntajes anónimos mientras las otras cinco están cerradas. | El Data model de esta spec ya trae el modelo autenticado, con `bootstrap.sql` como referencia viva, y hay tres criterios de aceptación que exigen el rechazo del INSERT sin sesión, del INSERT con `user_id` ajeno, y la presencia del trigger de `player_name`. |
| Olvidar el `GRANT` deja la tabla inutilizable: PostgREST rechaza antes de evaluar RLS, y el síntoma no se parece a un problema de permisos de tabla.                                      | Es parte del Data model, un ítem del paso 1 del plan, y tiene criterio de aceptación propio.                                                                                                                                                                     |
| Producción **no se sincroniza sola**. Aplicar solo en desarrollo deja el juego roto en producción de una forma que no se ve en local.                                                     | Pasos 10 y 11 del plan, separados, con `verify.sql` como comprobación, y criterio de aceptación que exige la tabla en todas las secciones de `bootstrap.sql`.                                                                                                    |
| Crear la tabla en `public` en vez de en `"arcade-vault"` la vuelve invisible para `supabase-js` y PostgREST, aunque exista y sea consultable por SQL directo.                             | Documentado en `CLAUDE.md` y en la spec 06: el cliente está configurado con `db: { schema: "arcade-vault" }`. Cada identificador lleva las comillas dobles por el guion, y hay criterio de aceptación explícito.                                                 |
| Reescribir `leaderboard.ts` en vez de extenderlo borra los helpers de skin y rompe el selector "SKIN" del HUD, que `game-player.tsx` importa desde ahí.                                   | Está como decisión anticipada, como condicional en el paso 3 del plan y como criterio de aceptación propio.                                                                                                                                                      |
| `SCORE_TABLE` está triplicado en tres archivos que no se importan entre sí. Tocar solo algunos deja el juego a medias.                                                                    | Son tres pasos separados del plan (6, 7 y 8), con verificaciones distintas y un criterio de aceptación que nombra los tres archivos.                                                                                                                             |
| Realtime no entrega eventos si el filtro del canal no usa `schema: "arcade-vault"`, o si la policy de `SELECT` no deja al rol `anon` ver las filas.                                       | Verificación explícita en el paso 9 del plan: guardar un puntaje en una pestaña y confirmar que aparece en `/salon` abierto en otra, sin recargar.                                                                                                               |

## What is **not** in this spec

- Cambios en el motor de la spec 14 (`engine.ts`, `invasores-canvas.tsx`).
- Presentación de la precisión de tiro como stat visible.
- Skins de Invasores y su selector en el HUD.
- Migración de los puntajes viejos de `invasores` en `localStorage`.
- Tab "GLOBAL" o cualquier consulta a `global_scores` desde la app.
- Validación anti-cheat de puntajes.
- Persistencia para los juegos que siguen simulados.
- Controles táctiles / mobile.
- Actualizar `CLAUDE.md` o `references/implemented-games.md`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
