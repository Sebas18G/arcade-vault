# SPEC 10 — Leaderboard propio de Frogger en Supabase

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 06, SPEC 09
> **Date:** 2026-08-30
> **Objective:** Dar a Frogger su propia tabla de puntajes en Supabase (`frogger_scores`), conectada al modal de fin de partida, a la ficha del juego y al Salón de la Fama, siguiendo el mismo patrón que los otros cuatro juegos reales.

## Why this spec exists

La spec 09 deja a Frogger jugable pero sin memoria: cada partida se pierde al cerrar el modal. Los cuatro juegos reales del catálogo (Asteroids, Tetris, Arkanoid y Snake) ya tienen su tabla propia en el schema `"arcade-vault"`, su tab en el Salón de la Fama y su top-12 en la ficha del juego. Esta spec pone a Frogger en esa misma línea, sin inventar patrón nuevo: es la aplicación directa de `recipe.md` §4 y §5, con el precedente de la spec 06 y de la spec 08.

La separación respecto de la spec 09 es deliberada: el motor puede revisarse y commitearse sin ninguna migración de base de datos aplicada, y esta spec puede revisarse mirando solo SQL y clientes de datos.

## Scope

**In:**

- Migración SQL en el schema `"arcade-vault"`:
  - Tabla `"arcade-vault"."frogger_scores"` con `score`, `level` y las dos stats propias del juego, `frogs_home` y `time_bonus`.
  - Fila `('frogger', 'FROGGER')` en `"arcade-vault".games` — es lo que hace aparecer el tab de Frogger en el Salón de la Fama, sin código adicional ahí.
  - Trigger `frogger_mirror` `after insert`, reusando la función genérica ya existente `"arcade-vault".mirror_to_global_scores('frogger')`. **No** se recrea esa función.
  - RLS habilitado: policy de `SELECT` público, policy de `INSERT` público con `check (char_length(player_name) between 1 and 10 and score >= 0)`.
  - Tabla agregada a la publicación `supabase_realtime`, para que el Salón la reciba en vivo.
- `components/games/frogger/leaderboard.ts`: `getFroggerLeaderboard()` y `addFroggerScore()`, top-5, con la asimetría de `recipe.md` §4 — una lectura fallida degrada a leaderboard vacío, una escritura fallida **lanza** y se muestra como error inline.
- `lib/supabase/types.ts`: `FroggerScoreRow`.
- `components/game-player.tsx`: prop `leaderboard` construido con `getFroggerLeaderboard`/`addFroggerScore`, con estado de carga y error inline, sin bloquear "JUGAR DE NUEVO" ni "SALIR". Es el hueco que la spec 09 dejó abierto a propósito.
- `frogger: "frogger_scores"` agregado al `SCORE_TABLE` de `app/games/[id]/page.tsx` **y**, por separado, al `SCORE_TABLE` de `app/salon/page.tsx`. Son dos mapas distintos que no se importan entre sí; hay que tocar los dos.

**Out of scope (for future specs):**

- La capa temática de la jam: columnas de causa de muerte (`road_deaths`, `river_deaths`, `timeouts`), cartel de muerte en el canvas y selectores de skin y tema en el HUD. **Va entera en la spec 11**, que agrega esas columnas con un `ALTER TABLE` sobre la tabla que crea esta spec.
- Cualquier cambio en el motor de la spec 09.
- Migrar puntajes viejos de `av_scores` en `localStorage` (los del reproductor simulado de `ranaria`): se descartan, ver Decisions.
- Autenticación real. `user_id` queda nullable y siempre `null`, igual que en las otras cuatro tablas.
- Validación anti-cheat de puntajes más allá de los `check` de la tabla.
- Persistencia para los juegos que siguen simulados.
- Actualizar `CLAUDE.md` y `references/implemented-games.md`.
- Tests automatizados.

## Data model

```sql
-- migration
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

-- RLS: enable; policy SELECT público; policy INSERT público
-- con check (char_length(player_name) between 1 and 10 and score >= 0);
-- agregar la tabla a la publicación supabase_realtime.
```

```ts
// lib/supabase/types.ts
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
// components/games/frogger/leaderboard.ts
const MAX_ENTRIES = 5;
// getFroggerLeaderboard(): select id, player_name, score, level, frogs_home, time_bonus
//   order by score desc, limit MAX_ENTRIES; si hay error devuelve [] (falla en silencio).
// addFroggerScore(name, result: FroggerGameOverResult): insert y luego relee el top-5;
//   si hay error, lo lanza (lo muestra GamePlayer como error inline).
```

`FroggerGameOverResult` ya viene de la spec 09 y no cambia en esta spec: aporta `score`, `level`, `frogsHome` y `timeBonus`, que mapean a `score`, `level`, `frogs_home` y `time_bonus`.

## Implementation plan

1. Aplicar la migración SQL con `apply_migration`: tabla `frogger_scores`, fila en `games`, trigger de espejo, RLS con sus dos policies, y la tabla agregada a `supabase_realtime`. Verificación: `list_tables` muestra `frogger_scores` dentro del schema `"arcade-vault"`; una fila de prueba insertada a mano aparece reflejada en `global_scores`.
2. Agregar `FroggerScoreRow` a `lib/supabase/types.ts`. Verificación: `npm run build` sin errores de tipos.
3. Crear `components/games/frogger/leaderboard.ts` con `getFroggerLeaderboard()` y `addFroggerScore()`, siguiendo la asimetría lectura-silenciosa / escritura-que-lanza. Verificación: `npm run build` pasa; el módulo todavía no está conectado a `GamePlayer`.
4. Conectar el prop `leaderboard` en `components/game-player.tsx` para la rama `isFrogger`, con `leaderboardEntries`, `leaderboardLoading` y `leaderboardFetchError`, y `onSaveName` llamando a `addFroggerScore` con el `froggerResult` de la spec 09. Verificación manual: perder una partida en `/games/frogger/play`, guardar un nombre, ver el top-5 actualizado dentro del modal.
5. Verificar el camino de error de escritura: con la red cortada, guardar un nombre muestra el error inline y los botones "JUGAR DE NUEVO" y "SALIR" siguen funcionando. Verificación manual, sin cambios de código si el paso 4 quedó bien.
6. Agregar `frogger: "frogger_scores"` al `SCORE_TABLE` de `app/games/[id]/page.tsx`. Verificación: `/games/frogger` muestra el top-12 real en "MEJORES PUNTUACIONES" y "Mejor global" refleja el puntaje real más alto cuando existe, en vez del `seededScores` estático.
7. Agregar `frogger: "frogger_scores"` al `SCORE_TABLE` de `app/salon/page.tsx`. Verificación: `/salon` muestra un tab "FROGGER" con el top-12 real y "TU MEJOR MARCA" con datos reales si hay sesión.
8. Verificar Realtime: abrir `/salon` en dos pestañas, guardar un puntaje de Frogger en una y confirmar que aparece y se reordena en la otra sin recargar.

## Acceptance criteria

- [ ] La tabla `frogger_scores` existe en el schema `"arcade-vault"` (no en `public`) y es consultable desde `supabase-js`.
- [ ] Existe la fila `('frogger', 'FROGGER')` en `"arcade-vault".games`.
- [ ] Insertar una fila en `frogger_scores` la refleja automáticamente en `global_scores` vía el trigger `frogger_mirror`.
- [ ] RLS está habilitado en `frogger_scores`, con `SELECT` público e `INSERT` público sujeto a los `check` de `player_name` (1–10 caracteres) y `score >= 0`.
- [ ] Un `INSERT` con `player_name` vacío o de más de 10 caracteres, o con `score` negativo, es rechazado por la base de datos.
- [ ] Al terminar una partida, el modal de fin de partida muestra el top-5 de Frogger leído de Supabase y permite guardar el nombre si el puntaje califica.
- [ ] Una lectura fallida del leaderboard deja la tabla vacía sin romper el modal; una escritura fallida muestra un error inline y **no** bloquea "JUGAR DE NUEVO" ni "SALIR".
- [ ] El puntaje guardado incluye `frogs_home` y `time_bonus` con los valores reales de la partida, no ceros.
- [ ] `/games/frogger` muestra el top-12 real de Supabase en "MEJORES PUNTUACIONES" y "Mejor global" usa el puntaje real más alto cuando existe.
- [ ] `/salon` muestra un tab "FROGGER" con el top-12 real de la tabla.
- [ ] Guardar un puntaje de Frogger en una pestaña lo hace aparecer en `/salon` abierto en otra pestaña, sin recargar.
- [ ] Los `SCORE_TABLE` de `app/games/[id]/page.tsx` y de `app/salon/page.tsx` contienen ambos la entrada `frogger`.
- [ ] `npm run build` termina sin errores y `npm run lint` no introduce errores nuevos.

## Decisions

- **Sí:** una tabla propia por juego (`frogger_scores`), no una tabla compartida. Es el patrón ya establecido por la spec 06 para los otros cuatro juegos, y permite columnas de stats específicas sin nulos por todos lados.
- **Sí:** se reusa la función genérica `mirror_to_global_scores` ya existente, pasándole `'frogger'` como argumento del trigger. No se recrea ni se duplica.
- **Decisión autónoma del skill:** las stats propias que persiste esta spec son `frogs_home` y `time_bonus`. Las dos salen directamente de la puntuación confirmada del original (50 puntos por rana en casa, 10 por cada medio segundo sin usar) y describen dos estilos de juego distintos con el mismo score total: quien completa muchos tableros contra quien corre contrarreloj.
- **Decisión autónoma del skill:** las stats de **causa de muerte** no van en esta spec aunque técnicamente podrían. Son la carga temática de la jam y por eso viven en la spec 11, que las agrega con un `ALTER TABLE`. Meterlas aquí dejaría a la spec 11 sin contenido técnico propio.
- **Decisión autónoma del skill:** los puntajes viejos de `ranaria` guardados en `av_scores` de `localStorage` (del reproductor simulado) **se descartan**, no se migran. Fueron generados por un `setInterval` que sumaba puntos al azar, así que no miden habilidad y contaminarían un ranking real. Asteroids y Tetris sí migraron los suyos en la spec 06, pero aquellos venían de partidas reales.
- **Sí:** top-5 en el modal de fin de partida y top-12 en la ficha del juego y en el Salón. Mismos números que los otros cuatro juegos.
- **No:** no se agrega un tab "GLOBAL" ni se consulta `global_scores` desde ningún componente. La spec 06 ya probó y quitó ese tab por redundante; el trigger sigue poblando la tabla solo para un futuro resumen cross-juego.
- **No:** sin autenticación. `user_id` queda nullable y siempre `null`, igual que en las otras cuatro tablas.
- **Pendiente de confirmar:** nada específico de esta spec. Todo su contenido es aplicación directa de un patrón ya implementado y verificado cuatro veces en este repo.

## Risks

| Risk                                                                                                                                                                        | Mitigation                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crear la tabla en `public` en vez de en `"arcade-vault"` la vuelve invisible para `supabase-js` y PostgREST, aunque exista y sea consultable por SQL directo.               | Documentado en `CLAUDE.md` y en la spec 06: el cliente está configurado con `db: { schema: "arcade-vault" }`. Cada identificador lleva las comillas dobles por el guion, y hay un criterio de aceptación explícito.    |
| Realtime no entrega eventos si el filtro del canal no usa `schema: "arcade-vault"`, o si la policy de `SELECT` no deja al rol `anon` ver las filas.                         | Verificación explícita en el paso 8 del plan: guardar un puntaje en una pestaña y confirmar que aparece en `/salon` abierto en otra, sin recargar.                                                                     |
| `SCORE_TABLE` está duplicado en dos archivos que no se importan entre sí. Tocar solo uno deja el juego a medias: top-12 en la ficha pero tab vacío en el Salón, o al revés. | Son dos pasos separados del plan (6 y 7), con verificaciones distintas y un criterio de aceptación que nombra los dos archivos.                                                                                        |
| No hay autenticación en los inserts: se puede publicar un puntaje falso pegándole directo a la API pública, sin pasar por la UI.                                            | Precedente aceptado de las specs 05, 06 y 08: es el mismo modelo de confianza que ya tenían los leaderboards en `localStorage`, solo que ahora compartido. Los `check` bloquean basura obvia, no un puntaje verosímil. |

## What is **not** in this spec

- Columnas y stats de causa de muerte, cartel de muerte en el canvas, y selectores de skin y tema en el HUD (spec 11).
- Cambios en el motor de la spec 09.
- Migración de los puntajes viejos de `ranaria` en `localStorage`.
- Tab "GLOBAL" o cualquier consulta a `global_scores` desde la app.
- Autenticación real o validación anti-cheat de puntajes.
- Persistencia para los juegos que siguen simulados.
- Actualizar `CLAUDE.md` o `references/implemented-games.md`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
