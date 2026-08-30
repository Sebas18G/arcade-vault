# SPEC 06 — Leaderboards reales en Supabase (Asteroids, Tetris, Arkanoid)

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-08-30
> **Objective:** Mover el leaderboard de Asteroids/Tetris/Arkanoid de `localStorage` a tablas propias en Supabase (una por juego + una global), y hacer que el Salón de la Fama y la ficha de cada juego lean esos datos reales en vivo en vez de `seededScores`.

## Why this spec exists

La spec 05 dejó explícitamente fuera de alcance conectar los leaderboards de Asteroids/Tetris (localStorage) y Arkanoid (inexistente) a cualquier persistencia compartida entre jugadores, y dejó `app/salon/page.tsx` / `app/games/[id]/page.tsx` usando `seededScores` inventados para los 8 juegos. La spec 04 conectó el SDK de Supabase pero explícitamente no creó ninguna tabla. Esta spec cierra ambos pendientes solo para los 3 juegos que ya tienen motor real: crea las tablas, conecta lectura/escritura real desde React, y reemplaza los datos inventados de esos 3 juegos en el Salón y en la ficha de detalle. Los otros 5 juegos del catálogo (simulados) no se tocan.

## Scope

**In:**

- 5 tablas nuevas en Supabase (proyecto existente sin tablas previas): `games`, `asteroids_scores`, `tetris_scores`, `arkanoid_scores`, `global_scores`. Ver Data model.
- `global_scores` se puebla automáticamente vía trigger `AFTER INSERT` en cada una de las 3 tablas de juego (no vía doble insert desde el cliente).
- RLS habilitado en las 5 tablas: `SELECT` público en todas; `INSERT` público (sin autenticación) solo en `asteroids_scores`/`tetris_scores`/`arkanoid_scores`, con `check` de `player_name` (1–10 caracteres) y `score >= 0`; `global_scores` y `games` sin policy de `INSERT` para el cliente (solo el trigger, vía `security definer`, y las migraciones/seed respectivamente).
- Realtime de Supabase habilitado en `asteroids_scores`, `tetris_scores`, `arkanoid_scores` y `global_scores` (no en `games`, es estática).
- Columna `user_id uuid null references auth.users(id)` en las 4 tablas de scores, siempre `null` en esta spec (no hay auth real todavía — spec 04). Queda lista para una spec futura de auth sin romper el esquema.
- Refactor de `components/games/asteroids/leaderboard.ts` y `components/games/tetris/leaderboard.ts`: `getXLeaderboard()`/`addXScore()` pasan de `localStorage` síncrono a Supabase asíncrono (fetch top-5 / insert). Los helpers de tema/skin/nombre guardado (`tetris-theme`, `tetris-skin`, `asteroids_player_name`, etc.) **no** se tocan, siguen en `localStorage` (son preferencias de UI, no puntajes).
- `components/games/arkanoid/leaderboard.ts` nuevo (no existía): mismo contrato que los otros 2, respaldado por `arkanoid_scores`.
- `GameOverModal`/`GamePlayer` (`components/game-player.tsx`): Arkanoid deja de ser `scoreOnly` — pasa a tener campo de nombre y su propio top-5, igual que Asteroids/Tetris. Las 3 rutas de guardado/lectura pasan a ser asíncronas (estado de carga mientras se guarda/lee; si Supabase falla, se muestra un mensaje de error inline sin romper el modal ni bloquear "JUGAR DE NUEVO"/"SALIR").
- Renombrar en `app/data/games.ts` el campo `title` de las 3 entradas reales: `rocas` → `"ASTEROIDS"`, `caida` → `"TETRIS"`, `bloque-buster` → `"ARKANOID"`. El resto de los campos de esas 3 entradas (`short`, `long`, `cover`, `color`, `best`, `plays`) y las otras 5 entradas del catálogo no cambian.
- **(Revisado tras implementar, ver Decisions)** El `id` (slug de ruta) de las 3 entradas reales también se renombra para que coincida con el motor/título: `rocas` → `asteroids`, `caida` → `tetris`, `bloque-buster` → `arkanoid`. Afecta rutas (`/games/[id]`, `/games/[id]/play`), los checks `game.id === "..."` en `GamePlayer`, el mapa `SCORE_TABLE` en `app/salon/page.tsx` y `app/games/[id]/page.tsx`, y las filas de la tabla `games`/`global_scores.game_id` en Supabase (migradas preservando el historial ya guardado). Los ids de los 5 juegos simulados no cambian.
- `app/salon/page.tsx` reescrito (misma ruta `/salon`, no se renombra):
  - Los tabs por juego se construyen con un fetch a la tabla `games` de Supabase (client-side, `lib/supabase/client.ts`) en vez de iterar `GAMES`. Solo aparecen tabs para los juegos presentes en `games` (los 3 reales); los 5 juegos simulados dejan de tener tab en el Salón (siguen jugables normalmente, solo pierden esta tabla).
  - Al activar un tab de juego, fetch client-side del top-12 de la tabla de scores correspondiente (`asteroids_scores`/`tetris_scores`/`arkanoid_scores`, según el `id` del juego activo) ordenado por `score desc`. Estado vacío ("AÚN SIN PUNTAJES") si no hay filas.
  - **(Revisado tras implementar, ver Decisions)** No hay tab `GLOBAL`. Solo existen los 3 tabs por juego descritos arriba; `global_scores` sigue existiendo y poblándose vía trigger (útil para el futuro), pero el Salón no la consulta ni la muestra.
  - "TU MEJOR MARCA" (fila destacada del usuario actual) se calcula con datos reales: si hay sesión (`useAuth`), query adicional `eq('player_name', user.name)` + `order('score', {ascending:false})` + `limit(1)` sobre la tabla del tab activo; si no hay fila, no se muestra la sección.
  - Suscripción Realtime (`postgres_changes`, evento `INSERT`) sobre la tabla del tab activo; nuevas filas se insertan/reordenan en vivo en el top visible sin recargar la página. Se desuscribe al cambiar de tab o desmontar.
  - El podio (1°/2°/3°) se sigue calculando a partir del array ya ordenado que devuelve el fetch/realtime, sin lógica nueva.
- `app/games/[id]/page.tsx`: para los 3 juegos reales, la sección "MEJORES PUNTUACIONES" pasa a hacer fetch server-side (`lib/supabase/server.ts`) del top-12 de la tabla correspondiente en vez de `seededScores`; el valor de "Mejor global" mostrado (`game.best`) se reemplaza por `scores[0]?.score ?? game.best` (si hay datos reales, se usa el real). Los otros 5 juegos siguen con `seededScores`/`game.best` estático, sin cambios.
- Tipos nuevos en `lib/supabase/types.ts` (nuevo archivo): `GameRow`, `AsteroidsScoreRow`, `TetrisScoreRow`, `ArkanoidScoreRow`, `GlobalScoreRow`.

**Out of scope (for future specs):**

- Los 5 juegos simulados (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`): siguen exactamente igual (reproductor simulado, `av_scores`, sin tab en el Salón, sin tabla propia en Supabase, sin cambios en la ficha de detalle).
- Autenticación real con Supabase Auth. `user_id` queda `null` siempre; el "nombre" del jugador sigue siendo texto libre capturado en el modal (o `av_user.name`/`INVITADO` como hoy), sin relación a una cuenta real.
- Migrar los puntajes que ya existan en `localStorage` (`asteroids_leaderboard_v1`, `tetris-highscores`) hacia Supabase. Las tablas nuevas arrancan vacías; esas claves de `localStorage` quedan sin uso (no se leen ni se borran).
- Validación anti-cheat de puntajes (rate limiting, verificación server-side de que el score es alcanzable). El modelo de confianza es el mismo que ya existía en `localStorage`: el cliente reporta su propio puntaje sin verificación de servidor, solo con constraints básicos de forma (`player_name` 1–10 caracteres, `score >= 0`).
- Suscripción Realtime dentro del modal de fin de partida (`GameOverModal`): el modal hace un fetch puntual al terminar la partida y un insert al guardar; no queda "escuchando" nuevas filas mientras está abierto. El Realtime en vivo aplica solo al Salón (spec actual).
- ~~Cambiar el `id` (slug de ruta) de `rocas`/`caida`/`bloque-buster`~~ **(revertido tras implementar, ver Decisions: sí se cambió, a petición explícita del usuario)**. Renombrar la ruta `/salon` sigue fuera de alcance.
- Actualizar `short`/`long`/`cover`/`color`/`best`/`plays` del catálogo para los 3 juegos reales, más allá del reemplazo de `best` ya descrito en la ficha de detalle (el campo en `app/data/games.ts` no se edita).
- Actualizar `CLAUDE.md` con el nuevo estado implementado (se hace en un commit posterior, como en specs anteriores).
- Tests automatizados (no hay test runner configurado todavía).

## Data model

```sql
-- Catálogo mínimo, solo para construir los tabs del Salón (no reemplaza app/data/games.ts)
-- Nota: 'id' se renombró tras la implementación inicial (ver Decisions) de
-- 'rocas'/'caida'/'bloque-buster' a 'asteroids'/'tetris'/'arkanoid'.
create table games (
  id text primary key,           -- 'asteroids' | 'tetris' | 'arkanoid'
  title text not null,           -- 'ASTEROIDS' | 'TETRIS' | 'ARKANOID'
  created_at timestamptz not null default now()
);

create table asteroids_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  asteroids_destroyed integer not null default 0,
  best_combo integer not null default 0,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create table tetris_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  lines integer not null default 0,
  best_combo integer not null default 0,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create table arkanoid_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Poblada solo por trigger, nunca por insert directo del cliente
create table global_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  player_name text not null,
  score integer not null,
  level integer not null default 1,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);
```

```sql
-- Espejo automático hacia global_scores (una función, un trigger por tabla de juego)
create function mirror_to_global_scores() returns trigger
language plpgsql security definer as $$
begin
  insert into global_scores (game_id, player_name, score, level, user_id, created_at)
  values (TG_ARGV[0], new.player_name, new.score, new.level, new.user_id, new.created_at);
  return new;
end;
$$;

create trigger asteroids_mirror after insert on asteroids_scores
  for each row execute function mirror_to_global_scores('asteroids');
create trigger tetris_mirror after insert on tetris_scores
  for each row execute function mirror_to_global_scores('tetris');
create trigger arkanoid_mirror after insert on arkanoid_scores
  for each row execute function mirror_to_global_scores('arkanoid');
```

```ts
// lib/supabase/types.ts
export type GameRow = { id: string; title: string; created_at: string };
export type AsteroidsScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  asteroids_destroyed: number;
  best_combo: number;
  user_id: string | null;
  created_at: string;
};
export type TetrisScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  lines: number;
  best_combo: number;
  user_id: string | null;
  created_at: string;
};
export type ArkanoidScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  user_id: string | null;
  created_at: string;
};
export type GlobalScoreRow = {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  level: number;
  user_id: string | null;
  created_at: string;
};
```

## Implementation plan

1. Migración SQL (`apply_migration`): crear las 5 tablas, la función `mirror_to_global_scores` y sus 3 triggers, `check` constraints, RLS habilitado + policies (`SELECT` público en las 5; `INSERT` público solo en las 3 tablas de juego), seed de las 3 filas en `games`, y habilitar Realtime en `asteroids_scores`/`tetris_scores`/`arkanoid_scores`/`global_scores`. Verificación: `list_tables` muestra las 5 tablas; una fila de prueba insertada manualmente en `asteroids_scores` aparece reflejada en `global_scores`.
2. Crear `lib/supabase/types.ts` con los tipos de arriba. Verificación: `npm run build` no reporta errores de tipos en este archivo (todavía no se usa en ningún lado).
3. Refactor `components/games/asteroids/leaderboard.ts`: `getAsteroidsLeaderboard()`/`addAsteroidsScore()` pasan a ser `async` y usar `lib/supabase/client.ts` contra `asteroids_scores` (top-5 por `score desc`). Actualizar `GamePlayer` para manejar la promesa (estado de carga breve, error inline si falla). Verificación manual: jugar Asteroids, perder, guardar nombre, ver el puntaje aparecer en el top-5 del modal y confirmarlo en el Table Editor de Supabase.
4. Repetir el paso 3 para Tetris (`components/games/tetris/leaderboard.ts` contra `tetris_scores`). Verificación manual equivalente.
5. Crear `components/games/arkanoid/leaderboard.ts` nuevo (contra `arkanoid_scores`) y actualizar `GameOverModal`/`GamePlayer` para que Arkanoid deje de ser `scoreOnly`: agrega campo de nombre y top-5 igual que los otros dos. Verificación manual equivalente.
6. Renombrar los 3 títulos en `app/data/games.ts`. Verificación: `/games` muestra "ASTEROIDS", "TETRIS", "ARKANOID" en las cards correspondientes; los otros 5 títulos no cambian.
   6b. **(Agregado tras implementar, ver Decisions)** Renombrar los 3 `id` (`rocas`→`asteroids`, `caida`→`tetris`, `bloque-buster`→`arkanoid`) en `app/data/games.ts`, `GamePlayer` y los mapas `SCORE_TABLE`; migración en Supabase que reapunta `games`/`global_scores.game_id` sin perder el historial y recrea los triggers de espejo. Verificación: `/games/asteroids`, `/games/tetris`, `/games/arkanoid` responden 200 y muestran datos reales; `/games/rocas`, `/games/caida`, `/games/bloque-buster` responden 404.
7. Reescribir `app/salon/page.tsx`: fetch de `games` para los tabs, fetch client-side de top-12 al cambiar de tab, "tu mejor marca" con datos reales, suscripción Realtime por tab activo con cleanup al cambiar/desmontar. Sin tab `GLOBAL` (ver Decisions). Verificación manual: `/salon` muestra solo 3 tabs (Asteroids/Tetris/Arkanoid); jugar una partida en otra pestaña del navegador y confirmar que el puntaje nuevo aparece en el Salón sin recargar la página.
8. Actualizar `app/games/[id]/page.tsx`: fetch server-side del top-12 real para los 3 juegos reales (`best` recalculado), sin tocar los otros 5. Verificación manual: `/games/rocas`, `/games/caida`, `/games/bloque-buster` (ids originales; renombrados a `/games/asteroids`, `/games/tetris`, `/games/arkanoid` en el paso 6b) muestran el leaderboard real; `/games/gloton` (por ejemplo) sigue mostrando `seededScores` sin cambios.
9. Verificación final: recorrer los 3 juegos de punta a punta (jugar, guardar, ver reflejado en modal/ficha/Salón), confirmar que los 5 juegos simulados y su flujo de `av_scores` no cambiaron, y correr `npm run lint` y `npm run build` sin errores nuevos.

## Acceptance criteria

- [x] Las 5 tablas (`games`, `asteroids_scores`, `tetris_scores`, `arkanoid_scores`, `global_scores`) existen en Supabase con RLS habilitado y las policies descritas. (Nota: viven en el schema `arcade-vault`, no en `public` — ver Decisions/hallazgo del paso 3.)
- [x] Insertar una fila en cualquiera de las 3 tablas de juego produce automáticamente una fila espejo en `global_scores` (vía trigger), sin que el cliente haga un segundo insert.
- [x] El cliente (rol anónimo) puede hacer `SELECT` en las 5 tablas pero **no** puede insertar directamente en `games` ni en `global_scores`.
- [x] Al terminar una partida de Asteroids, Tetris o Arkanoid, el modal de fin de juego permite guardar el nombre y el puntaje queda persistido en la tabla de Supabase correspondiente (verificable en el Table Editor). Confirmado con partidas reales jugadas durante la implementación (jugador "SEBAS" en las 3 tablas).
- [x] El modal de fin de juego de Arkanoid ahora tiene campo de nombre y muestra su propio top-5, igual que Asteroids y Tetris (antes solo mostraba puntaje/nivel).
- [x] `/games` muestra "ASTEROIDS", "TETRIS" y "ARKANOID" como títulos de esas 3 cards; los otros 5 títulos no cambiaron.
- [x] `/salon` muestra exactamente 3 tabs: uno por cada juego presente en la tabla `games` (los 3 reales). No hay tab `GLOBAL` (ver Decisions) y los 5 juegos simulados no tienen tab.
- [ ] Jugar una partida en una pestaña del navegador y guardarla hace aparecer el nuevo puntaje en `/salon` (tab de ese juego) abierto en otra pestaña, sin recargar la página (verificado con la suscripción Realtime). **No verificado con dos pestañas reales de navegador** (sin herramienta de navegador en esta sesión); sí se verificó que la suscripción usa el schema/tabla correctos, que la tabla está en la publicación `supabase_realtime`, y que las policies de `SELECT` permiten al rol `anon` ver las filas (requisito para que Realtime entregue eventos). Pendiente de confirmación manual por el usuario.
- [x] Con sesión iniciada, "TU MEJOR MARCA" en cada tab de juego real refleja el mejor puntaje real guardado con ese nombre (no un valor inventado); si no hay ninguno, la sección no se muestra.
- [x] `/games/asteroids`, `/games/tetris` y `/games/arkanoid` (ids renombrados, ver Decisions) muestran el top-12 real de Supabase en "MEJORES PUNTUACIONES" y el valor de "Mejor global" refleja el puntaje más alto real cuando existe.
- [x] `/games/serpentina` (y los otros 4 juegos simulados) siguen mostrando `seededScores` exactamente como antes de esta spec, y su flujo de `av_scores` en el reproductor no cambió.
- [ ] Si Supabase no responde (red caída), el modal de fin de juego muestra un error inline sin romper "JUGAR DE NUEVO" ni "SALIR". **Verificado por revisión de código** (estado `saveError`/`fetchError` en `GameOverModal`, catch en los 3 flujos de guardado/lectura), no con una caída de red real inducida.
- [x] `npm run build` termina sin errores. `npm run lint` no introduce errores nuevos respecto al estado actual del repo (105 errores preexistentes sin relación, frente a 123 antes de esta spec — ninguno en archivos tocados).

## Decisions

- **Sí:** una tabla física por juego (`asteroids_scores`/`tetris_scores`/`arkanoid_scores`) más `global_scores` como tabla física separada, en vez de una única tabla `scores` compartida con columna `game_id`. Decisión explícita del usuario ("una tabla por juego"), reafirmada después de que un ejemplo pegado por error sugiriera el esquema compartido.
- **Sí:** `global_scores` se puebla vía trigger `AFTER INSERT` (función `security definer`) en vez de que el cliente inserte dos veces (una en la tabla del juego y otra en la global). Evita que un fallo de red a mitad de camino deje las tablas desincronizadas, y evita que el cliente pueda escribir en `global_scores` sin pasar por una tabla de juego real.
- **Sí:** tabla `games` mínima en Supabase (`id`, `title`) usada únicamente para construir los tabs del Salón. No reemplaza `app/data/games.ts` (que sigue siendo la fuente de verdad de Home/Nav/Biblioteca/los 5 juegos simulados). Hay duplicación intencional del título entre ambas fuentes porque el Salón debe leer los juegos "presentes en Supabase", no la lista completa del catálogo.
- **No:** no se renombra la ruta `/salon` a `/hall-of-fame` ni los `id` de los juegos (`rocas`/`caida`/`bloque-buster`). El ejemplo pegado por el usuario usaba esos nombres, pero nunca se pidió explícitamente renombrar rutas, y hacerlo rompería el link ya existente en la navbar sin necesidad.
- **Sí:** el Salón deja de mostrar tab para los 5 juegos simulados (antes tenía 8 tabs con `seededScores`). Decisión explícita del usuario ("Tabs muestran solo los juegos presentes en Supabase"), reemplaza una respuesta anterior más ambigua ("no quite los tabs") por ser la instrucción más reciente y específica.
- **Sí:** `user_id` nullable en las 4 tablas de scores, siempre `null` en esta spec. Decisión explícita del usuario ("no queremos que todo el mundo juegue con autenticación por ahora"); deja el esquema listo para una spec futura de auth real sin migración de columnas.
- **Sí:** se guarda el historial completo de partidas (cada fin de juego es un insert nuevo), no solo el top-N con borrado de lo que sobra. Decisión explícita del usuario ("aquí debe guardar según la recomendación" sobre la opción de guardar todo el historial); el leaderboard visible sigue acotado a un top-N en cada pantalla.
- **No:** no se migran los puntajes existentes de `localStorage` (`asteroids_leaderboard_v1`, `tetris-highscores`) a Supabase. Las tablas arrancan vacías; es más simple y sin riesgo de duplicar/corromper datos. Esas claves de `localStorage` quedan sin uso.
- **Sí (decisión del autor de la spec, ajustable):** conteos de top-N: 5 en el modal de fin de juego (igual que el límite que ya usaban Asteroids/Tetris en `localStorage`), 12 en cada tab de juego del Salón (confirmado explícitamente por el usuario) y en la ficha de detalle. No se volvió a preguntar por ser un detalle de despliegue visual de bajo riesgo; se puede ajustar editando la spec antes de aprobarla.
- **Sí (decisión del autor de la spec, ajustable):** "TU MEJOR MARCA" se implementa con datos reales (`player_name` igual al nombre de sesión) en los 3 tabs de juego real. Es la continuación natural de reemplazar `seededScores`; se puede revertir si el usuario prefiere ocultar esa sección para los juegos reales.
- **No (revierte una decisión previa de esta misma spec):** el Salón **no** tiene tab `GLOBAL`. La spec original (líneas de Scope más arriba) sí lo incluía, con un filtro por juego (chips TODOS/ASTEROIDS/TETRIS/ARKANOID) dentro del propio tab. Al verlo funcionando, el usuario notó que ese filtro duplicaba los tabs por juego ya existentes en la barra principal ("hay tabs que dice todos, y por juego... quítalo") y pidió quitar el tab GLOBAL por completo, dejando solo los 3 tabs por juego. La tabla `global_scores` y su trigger de espejo se mantienen sin cambios (siguen poblándose), simplemente el Salón ya no la consulta; queda disponible para una futura spec que sí quiera un resumen cross-juego con un diseño distinto (que no duplique los tabs existentes).
- **Sí (decisión del autor de la spec, ajustable):** la ficha de detalle (`/games/[id]`) de los 3 juegos reales también pasa a leer Supabase (incluye el valor de "Mejor global"). Es consistencia gratis dado que la query ya existe para el Salón; evita que la ficha muestre un puntaje inventado que contradiga el modal/Salón reales.
- **No:** el modal de fin de juego (`GameOverModal`) no mantiene una suscripción Realtime abierta mientras está visible; solo hace un fetch puntual al terminar la partida y un insert al guardar. El Realtime en vivo se reserva para el Salón, donde tiene sentido ver puntajes de otros jugadores mientras se navega. Simplifica el ciclo de vida del modal (se abre y cierra rápido, no vale la pena una suscripción de vida tan corta).
- **No:** no se agrega validación anti-cheat de puntajes en el servidor (rate limiting, verificación de que el score es alcanzable). Mismo modelo de confianza que ya existía con `localStorage` — el cliente reporta su propio puntaje sin verificación; documentado como riesgo aceptado.
- **Sí (revierte una decisión previa de esta misma spec):** los `id` de los 3 juegos reales se renombran de `rocas`/`caida`/`bloque-buster` a `asteroids`/`tetris`/`arkanoid`. Decisión explícita del usuario tras ver la app funcionando ("los ids... deberían ser acorde a los juegos implementados"), pedida otra vez sin ambigüedad después de que se le recordara que estaba fuera de alcance ("no aquí mismo cambielo"). Implica: migración en Supabase que inserta las 3 filas nuevas en `games` con el id definitivo, reapunta `global_scores.game_id` del historial ya guardado (sin perder datos) y borra las filas viejas; se recrean los 3 triggers de espejo con el literal de `game_id` actualizado; y en el código se actualizan `app/data/games.ts` (`id`), los checks `game.id === "..."` en `GamePlayer`, y el mapa `SCORE_TABLE` en `app/salon/page.tsx`/`app/games/[id]/page.tsx`. La ruta `/salon` y los ids de los 5 juegos simulados no cambian.

## Risks

| Risk                                                                                                                                                                                                                                                                      | Mitigation                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El modelo de confianza sin autenticación permite que cualquiera inserte un puntaje falso directamente contra la API pública de Supabase (aunque la UI del juego no lo permita).                                                                                           | Aceptado explícitamente: es el mismo modelo que ya existía con `localStorage` (cualquiera podía editar la clave manualmente), solo que ahora es compartido entre jugadores. Los `check` constraints (`player_name` 1–10, `score >= 0`) evitan basura obvia, no evitan un valor de score falso pero "razonable". Ver Decisions. |
| Las políticas de Realtime de Supabase (RLS + Realtime) requieren que las policies de `SELECT` permitan al rol `anon` ver las filas para que la suscripción reciba eventos; un error de configuración dejaría el Salón sin actualizarse en vivo aunque el insert funcione. | Verificación explícita en el paso 7 del plan: abrir `/salon` en dos pestañas, jugar y guardar en una, confirmar que la otra se actualiza sin recargar.                                                                                                                                                                         |
| El trigger `security definer` que puebla `global_scores` corre con privilegios elevados; un bug en `mirror_to_global_scores` podría insertar datos incorrectos sin que el cliente se entere del error.                                                                    | La función es mínima (un solo `insert` con los mismos valores de la fila nueva); se prueba manualmente en el paso 1 del plan antes de conectar el frontend.                                                                                                                                                                    |
| Los 3 fetches asíncronos nuevos en `GameOverModal` (leer top-5 al terminar, insertar al guardar) pueden fallar por red y dejar al usuario sin feedback si no se maneja el estado de error.                                                                                | Acceptance criteria explícito: error inline sin romper "JUGAR DE NUEVO"/"SALIR".                                                                                                                                                                                                                                               |

## What is **not** in this spec

- Los 5 juegos simulados del catálogo (siguen con `av_scores`/`seededScores`, sin tab en el Salón).
- Autenticación real con Supabase Auth (`user_id` sigue `null`).
- Migración de los puntajes existentes en `localStorage` hacia Supabase.
- Validación anti-cheat de puntajes en el servidor.
- Realtime dentro del modal de fin de juego (solo aplica al Salón).
- Renombrar la ruta `/salon`. (Los `id` de los 3 juegos reales sí se renombraron — ver Decisions.)
- Actualizar `CLAUDE.md`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
