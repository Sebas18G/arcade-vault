# SPEC 10 — Leaderboard propio de Frogger en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 04, SPEC 06, SPEC 09
> **Date:** 2026-09-04
> **Objective:** Dar a Frogger su propia tabla de puntajes en Supabase (`frogger_scores`), conectada al modal de fin de partida, a la tarjeta de la biblioteca, a la ficha del juego y al Salón de la Fama, siguiendo el mismo patrón que los otros cuatro juegos reales.

## Why this spec exists

La spec 09 dejó a Frogger jugable pero sin memoria: cada partida se pierde al cerrar el modal. Los cuatro juegos reales del catálogo (Asteroids, Tetris, Arkanoid y Snake) ya tienen su tabla propia en el schema `"arcade-vault"`, su tab en el Salón de la Fama y su top-12 en la ficha del juego. Esta spec pone a Frogger en esa misma línea, sin inventar patrón nuevo: es la aplicación directa de `.claude/skills/add-game/recipe.md` §4 y §5, con el precedente de la spec 06 (Asteroids/Tetris/Arkanoid) y de la spec 08 (Snake).

La separación respecto de la spec 09 es deliberada: el motor ya está commiteado y funcionando sin ninguna migración de base de datos aplicada, y esta spec puede revisarse mirando solo SQL y clientes de datos.

El código actual deja el hueco marcado explícitamente. `components/games/frogger/leaderboard.ts` ya existe con los helpers de skin y lleva este comentario:

```ts
// Preferencia de UI: vive solo en localStorage, nunca en Supabase.
// La tabla `frogger_scores` y sus helpers llegan en la spec 10; este archivo
// hoy solo guarda la skin elegida, con la clave genérica "<gameId>-skin".
```

Y `components/game-player.tsx:49` lleva el gemelo: `// Frogger todavía no tiene leaderboard propio: llega en la spec 10.` Esta spec cierra los dos huecos.

## Scope

**In:**

- Migración SQL en el schema `"arcade-vault"`, aplicada con `apply_migration` del servidor MCP de Supabase ya configurado en `.mcp.json`:
  - Tabla `"arcade-vault"."frogger_scores"` con `score`, `level` y las dos stats propias del juego, `frogs_home` y `time_bonus`.
  - Fila `('frogger', 'FROGGER')` en `"arcade-vault".games` — es lo que hace aparecer el tab de Frogger en el Salón de la Fama, que construye sus tabs desde esa tabla y no desde `GAMES`, sin código adicional ahí.
  - Trigger `frogger_mirror` `after insert`, reusando la función genérica ya existente `"arcade-vault".mirror_to_global_scores('frogger')`. **No** se recrea esa función.
  - RLS habilitado: policy de `SELECT` público, policy de `INSERT` público con `check (char_length(player_name) between 1 and 10 and score >= 0)`.
  - Tabla agregada a la publicación `supabase_realtime`, para que el Salón la reciba en vivo.
- `lib/supabase/types.ts`: `FroggerScoreRow`.
- `components/games/frogger/leaderboard.ts`: **extender** el archivo existente con `getFroggerLeaderboard()` y `addFroggerScore()`, top-5, con la asimetría de `recipe.md` §4 — una lectura fallida degrada a leaderboard vacío, una escritura fallida **lanza** y se muestra como error inline. Los helpers de skin ya presentes (`getFroggerSkin`/`setFroggerSkin`) y la constante `SKIN_KEY` se mantienen intactos; solo se borra el comentario que anuncia esta spec.
- `components/game-player.tsx`: `loadFroggerLeaderboard()` siguiendo el patrón de `loadAsteroidsLeaderboard`/`loadSnakeLeaderboard`, invocado desde `handleFroggerGameOver`; prop `leaderboard` en la rama `isFrogger` con `leaderboardEntries`, `leaderboardLoading` y `leaderboardFetchError`, y `onSaveName` llamando a `addFroggerScore` con el `froggerResult` de la spec 09. Se elimina el comentario de la línea 49 y el de la línea 392 (`// Sin carga de leaderboard: Frogger todavía no persiste puntajes (spec 10).`).
- `frogger: "frogger_scores"` agregado a los **tres** `SCORE_TABLE` del repo, que son mapas distintos que no se importan entre sí:
  - `app/games/page.tsx:3` — alimenta `fetchRealBests()`, el "mejor" real de las tarjetas de la biblioteca.
  - `app/games/[id]/page.tsx:5` — top-12 de la ficha del juego y "Mejor global".
  - `app/salon/page.tsx:7` — top-12 del tab del Salón de la Fama.

**Out of scope (for future specs):**

- La capa temática de la jam: columnas de causa de muerte (`road_deaths`, `river_deaths`, `timeouts`) y cartel de muerte en el canvas. **Va entera en la spec 11**, que agrega esas columnas con un `ALTER TABLE` sobre la tabla que crea esta spec.
- Cualquier cambio en el motor de la spec 09 (`engine.ts`, `frogger-canvas.tsx`). Esta spec consume `FroggerGameOverResult` tal como quedó, sin tocarlo.
- El selector de skin de Frogger en el HUD, que **ya está implementado**: `SKINS_BY_GAME` y `SKIN_STORAGE` de `game-player.tsx` ya tienen su entrada `frogger`, y `skins.ts` ya está en la carpeta del juego. Esta spec no lo modifica.
- Migrar puntajes viejos de `av_scores` en `localStorage` (los del reproductor simulado de `ranaria`): se descartan, ver Decisions.
- Autenticación real. `user_id` queda nullable y siempre `null`, igual que en las otras cuatro tablas.
- Validación anti-cheat de puntajes más allá de los `check` de la tabla.
- Persistencia para los tres juegos que siguen simulados (`gloton`, `invasores`, `duelo-pixel`).
- Consultar `global_scores` desde algún componente o agregar un tab "GLOBAL".
- Actualizar `CLAUDE.md` y `references/implemented-games.md`.
- Tests automatizados.

## Data model

```sql
-- migration: frogger_leaderboard
create table "arcade-vault"."frogger_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  frogs_home integer not null default 0,
  time_bonus integer not null default 0,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

insert into "arcade-vault".games (id, title) values ('frogger', 'FROGGER');

create trigger frogger_mirror after insert on "arcade-vault"."frogger_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('frogger');

alter table "arcade-vault"."frogger_scores" enable row level security;

create policy "frogger_scores_select_public"
  on "arcade-vault"."frogger_scores" for select using (true);

create policy "frogger_scores_insert_public"
  on "arcade-vault"."frogger_scores" for insert
  with check (char_length(player_name) between 1 and 10 and score >= 0);

alter publication supabase_realtime add table "arcade-vault"."frogger_scores";
```

```ts
// lib/supabase/types.ts — mismo orden de campos que SnakeScoreRow, con las dos stats propias
export type FroggerScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  frogs_home: number;
  time_bonus: number;
  user_id: string | null;
  created_at: string;
};
```

```ts
// components/games/frogger/leaderboard.ts — se agrega a lo que ya existe
const MAX_ENTRIES = 5;

// getFroggerLeaderboard(): select "id, player_name, score, level"
//   order by score desc, limit MAX_ENTRIES; si hay error devuelve [] (falla en silencio).
//   Devuelve LeaderboardEntry[], que solo lleva id/name/score/level: frogs_home y
//   time_bonus se persisten pero no se muestran en el top-5 del modal.
// addFroggerScore(name, result: FroggerGameOverResult): insert de
//   player_name, score, level, frogs_home, time_bonus; luego relee el top-5.
//   Si hay error, lo lanza (lo muestra GamePlayer como error inline).
```

`FroggerGameOverResult` ya viene de la spec 09 (`components/games/shared/types.ts:15`) y no cambia: aporta `score`, `level`, `frogsHome` y `timeBonus`, que mapean a `score`, `level`, `frogs_home` y `time_bonus`.

## Implementation plan

1. Aplicar la migración SQL con `apply_migration` del MCP de Supabase: tabla `frogger_scores`, fila en `games`, trigger de espejo, RLS con sus dos policies, y la tabla agregada a `supabase_realtime`. Verificación: `list_tables` muestra `frogger_scores` dentro del schema `"arcade-vault"` (no en `public`); una fila de prueba insertada a mano aparece reflejada en `global_scores` con `game_id = 'frogger'`.
2. Agregar `FroggerScoreRow` a `lib/supabase/types.ts`. Verificación: `npm run build` sin errores de tipos.
3. Extender `components/games/frogger/leaderboard.ts` con `getFroggerLeaderboard()` y `addFroggerScore()`, siguiendo la asimetría lectura-silenciosa / escritura-que-lanza de `snake/leaderboard.ts`. Conservar `SKIN_KEY`, `getFroggerSkin` y `setFroggerSkin`; borrar el comentario que anuncia esta spec. Verificación: `npm run build` pasa; el módulo todavía no está conectado a `GamePlayer`.
4. Conectar `components/game-player.tsx`: importar los dos helpers nuevos, agregar `loadFroggerLeaderboard()` junto a los otros cuatro `load*Leaderboard`, invocarlo desde `handleFroggerGameOver`, y pasar el prop `leaderboard` en la rama `isFrogger` con `onSaveName` llamando a `addFroggerScore(name, froggerResult)`. Borrar los dos comentarios que anuncian esta spec. Verificación manual: perder una partida en `/games/frogger/play`, guardar un nombre, ver el top-5 actualizado dentro del modal.
5. Verificar el camino de error de escritura: con la red cortada, guardar un nombre muestra el error inline y los botones "JUGAR DE NUEVO" y "SALIR" siguen funcionando. Verificación manual, sin cambios de código si el paso 4 quedó bien.
6. Agregar `frogger: "frogger_scores"` al `SCORE_TABLE` de `app/games/[id]/page.tsx`. Verificación: `/games/frogger` muestra el top-12 real en "MEJORES PUNTUACIONES" y "Mejor global" refleja el puntaje real más alto cuando existe, en vez del `seededScores` estático.
7. Agregar `frogger: "frogger_scores"` al `SCORE_TABLE` de `app/salon/page.tsx`. Verificación: `/salon` muestra un tab "FROGGER" con el top-12 real y "TU MEJOR MARCA" con datos reales si hay sesión.
8. Agregar `frogger: "frogger_scores"` al `SCORE_TABLE` de `app/games/page.tsx`. Verificación: la tarjeta de Frogger en `/games` muestra como "mejor" el puntaje real más alto de la tabla, no el `best` estático de `app/data/games.ts`.
9. Verificar Realtime: abrir `/salon` en dos pestañas, guardar un puntaje de Frogger en una y confirmar que aparece y se reordena en la otra sin recargar.
10. Verificación final de conjunto: `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] La tabla `frogger_scores` existe en el schema `"arcade-vault"` (no en `public`) y es consultable desde `supabase-js`.
- [ ] Existe la fila `('frogger', 'FROGGER')` en `"arcade-vault".games`.
- [ ] Insertar una fila en `frogger_scores` la refleja automáticamente en `global_scores` vía el trigger `frogger_mirror`, con `game_id = 'frogger'`.
- [ ] RLS está habilitado en `frogger_scores`, con `SELECT` público e `INSERT` público sujeto a los `check` de `player_name` (1–10 caracteres) y `score >= 0`.
- [ ] Un `INSERT` con `player_name` vacío o de más de 10 caracteres, o con `score` negativo, es rechazado por la base de datos.
- [ ] Al terminar una partida, el modal de fin de partida muestra el top-5 de Frogger leído de Supabase y permite guardar el nombre si el puntaje califica.
- [ ] Una lectura fallida del leaderboard deja la tabla vacía sin romper el modal; una escritura fallida muestra un error inline y **no** bloquea "JUGAR DE NUEVO" ni "SALIR".
- [ ] El puntaje guardado incluye `level`, `frogs_home` y `time_bonus` con los valores reales de la partida, no ceros por defecto.
- [ ] `/games/frogger` muestra el top-12 real de Supabase en "MEJORES PUNTUACIONES" y "Mejor global" usa el puntaje real más alto cuando existe.
- [ ] `/salon` muestra un tab "FROGGER" con el top-12 real de la tabla.
- [ ] La tarjeta de Frogger en `/games` muestra el puntaje real más alto de `frogger_scores`, no el `best` estático del catálogo.
- [ ] Los tres `SCORE_TABLE` del repo (`app/games/page.tsx`, `app/games/[id]/page.tsx`, `app/salon/page.tsx`) contienen la entrada `frogger`.
- [ ] Guardar un puntaje de Frogger en una pestaña lo hace aparecer en `/salon` abierto en otra pestaña, sin recargar.
- [ ] `components/games/frogger/leaderboard.ts` conserva `getFroggerSkin`/`setFroggerSkin` funcionando: el selector "SKIN" del HUD de Frogger sigue guardando la preferencia como antes.
- [ ] No queda en el repo ningún comentario que diga que el leaderboard de Frogger "llega en la spec 10".
- [ ] `npm run build` termina sin errores y `npm run lint` no introduce errores nuevos respecto de la rama base.

## Decisions

- **Sí:** una tabla propia por juego (`frogger_scores`), no una tabla compartida. Es el patrón establecido por la spec 06 y repetido por la spec 08, y permite columnas de stats específicas sin nulos por todos lados.
- **Sí:** se reusa la función genérica `mirror_to_global_scores` ya existente, pasándole `'frogger'` como argumento del trigger. No se recrea ni se duplica.
- **Sí (confirmado por el usuario):** las columnas mínimas e imprescindibles son `score` y `level`, porque son las que consumen el Salón de la Fama y el HUD del canvas. Se agregan además `frogs_home` y `time_bonus` porque el motor de la spec 09 ya las calcula y expone en `FroggerGameOverResult`: persistirlas no cuesta ningún cambio en el motor y describe dos estilos de juego distintos con el mismo score total — quien completa muchos tableros contra quien corre contrarreloj.
- **Sí (confirmado por el usuario):** los **tres** `SCORE_TABLE` reciben la entrada `frogger`, guiándose de cómo están los otros juegos. El draft original de `game-jam` solo nombraba dos; dejar fuera `app/games/page.tsx` produciría una inconsistencia visible en la misma sesión: la tarjeta de la biblioteca mostrando el `best` mock mientras la ficha y el Salón muestran el real.
- **Sí (confirmado por el usuario):** la migración se aplica con `apply_migration` del servidor MCP de Supabase, como en las specs 06 y 08, no a mano en el dashboard.
- **Sí:** `getFroggerLeaderboard()` selecciona solo `id, player_name, score, level`. `frogs_home` y `time_bonus` se persisten pero no viajan al modal, porque `LeaderboardEntry` no tiene dónde ponerlas y esta spec no rediseña el modal. Quedan disponibles en la tabla para la spec 11.
- **Decisión autónoma del skill:** el archivo `leaderboard.ts` se **extiende**, no se crea. El draft original de `game-jam` decía "crear", pero el archivo ya existe con los helpers de skin que dejó el agente `skin-designer` tras la spec 09. Escribirlo de cero borraría el selector "SKIN" de Frogger.
- **Decisión autónoma del skill:** los puntajes viejos de `ranaria` guardados en `av_scores` de `localStorage` (del reproductor simulado) **se descartan**, no se migran. Fueron generados por un `setInterval` que sumaba puntos al azar, así que no miden habilidad y contaminarían un ranking real. Asteroids y Tetris sí migraron los suyos en la spec 06, pero aquellos venían de partidas reales.
- **Sí:** top-5 en el modal de fin de partida y top-12 en la ficha del juego y en el Salón. Mismos números que los otros cuatro juegos.
- **No:** no se agrega un tab "GLOBAL" ni se consulta `global_scores` desde ningún componente. La spec 06 ya probó y quitó ese tab por redundante; el trigger sigue poblando la tabla solo para un futuro resumen cross-juego.
- **No:** sin autenticación. `user_id` queda nullable y siempre `null`, igual que en las otras cuatro tablas.
- **Descartado:** adelantar a esta spec las columnas de causa de muerte (`road_deaths`, `river_deaths`, `timeouts`). Obligaría a modificar el motor de la spec 09 para contarlas y dejaría a la spec 11 sin contenido técnico propio. Van allá con un `ALTER TABLE`.
- **Descartado:** escribir esta spec como documento nuevo dejando intacto el draft de `game-jam`. Habría dejado dos specs compitiendo por el mismo trabajo; el número 10 ya está tomado en la numeración global continua de `specs/games-jam/`, así que se reescribe in situ.

## Risks

| Risk                                                                                                                                                                                         | Mitigation                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crear la tabla en `public` en vez de en `"arcade-vault"` la vuelve invisible para `supabase-js` y PostgREST, aunque exista y sea consultable por SQL directo.                                | Documentado en `CLAUDE.md` y en la spec 06: el cliente está configurado con `db: { schema: "arcade-vault" }`. Cada identificador lleva las comillas dobles por el guion, y hay un criterio de aceptación explícito. |
| Reescribir `leaderboard.ts` en vez de extenderlo borra `getFroggerSkin`/`setFroggerSkin` y rompe el selector "SKIN" del HUD, que `game-player.tsx` importa desde ahí.                        | Está como decisión explícita, como paso 3 del plan y como criterio de aceptación propio.                                                                                                                            |
| `SCORE_TABLE` está triplicado en tres archivos que no se importan entre sí. Tocar solo algunos deja el juego a medias: top-12 en la ficha pero tab vacío en el Salón, o tarjeta con el mock. | Son tres pasos separados del plan (6, 7 y 8), con verificaciones distintas y un criterio de aceptación que nombra los tres archivos.                                                                                |
| Realtime no entrega eventos si el filtro del canal no usa `schema: "arcade-vault"`, o si la policy de `SELECT` no deja al rol `anon` ver las filas.                                          | Verificación explícita en el paso 9 del plan: guardar un puntaje en una pestaña y confirmar que aparece en `/salon` abierto en otra, sin recargar.                                                                  |
| No hay autenticación en los inserts: se puede publicar un puntaje falso pegándole directo a la API pública, sin pasar por la UI.                                                             | Precedente aceptado de las specs 05, 06 y 08: mismo modelo de confianza que ya tenían los leaderboards en `localStorage`, solo que ahora compartido. Los `check` bloquean basura obvia, no un puntaje verosímil.    |

## What is **not** in this spec

- Columnas y stats de causa de muerte, y cartel de muerte en el canvas (spec 11).
- Cambios en el motor de la spec 09 (`engine.ts`, `frogger-canvas.tsx`).
- El selector de skin de Frogger en el HUD, que ya está implementado.
- Migración de los puntajes viejos de `ranaria` en `localStorage`.
- Tab "GLOBAL" o cualquier consulta a `global_scores` desde la app.
- Autenticación real o validación anti-cheat de puntajes.
- Persistencia para los juegos que siguen simulados.
- Actualizar `CLAUDE.md` o `references/implemented-games.md`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
