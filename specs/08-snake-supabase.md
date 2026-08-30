# SPEC 08 — Snake real para Serpentina con leaderboard propio en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05, SPEC 06
> **Date:** 2026-08-30
> **Objective:** Construir desde cero un motor real de canvas para Snake (grilla 20×20, sprites de fruta) que reemplaza el reproductor simulado de la entrada `serpentina` del catálogo, con su propio leaderboard persistido en Supabase siguiendo el patrón de las specs 05 y 06.

## Why this spec exists

`serpentina` es una de las 5 entradas del catálogo que hoy sigue con el reproductor simulado (`setInterval` sumando puntos al azar, spec 01/05). A diferencia de Asteroids/Tetris/Arkanoid, no hay una carpeta en `references/started_games/` con el juego ya hecho — el usuario aportó únicamente los sprites de fruta (`references/snake-assets/fruits.png` + `sprites.js`, un atlas de 21 frutas recortadas de un spritesheet de Google Snake) y pidió construir Snake usando esos assets, reemplazando el canvas simulado de `serpentina`. Esta spec fija por escrito cada mecánica (nada de eso existía en un archivo fuente para copiar) y aplica el mismo patrón de leaderboard en Supabase que ya usan los otros 3 juegos reales.

## Scope

**In:**

- `components/games/serpentina/`: motor de Snake nuevo, construido desde cero (sin código fuente de referencia) según las mecánicas confirmadas en esta spec:
  - Grilla de 20×20 celdas de 40px cada una, canvas fijo de 800×800px (mismo criterio de "no desborda pero no es responsive" que Asteroids/Tetris/Arkanoid).
  - Serpiente de largo inicial 3 celdas, se mueve por la grilla con `←`/`→`/`↑`/`↓` **y** `W`/`A`/`S`/`D` simultáneamente.
  - Chocar contra cualquier pared del tablero, o contra el propio cuerpo, termina la partida de inmediato (sin wrap-around).
  - Sin concepto de vidas: el HUD siempre reporta 0 vidas, igual que Tetris.
  - Comer una fruta suma 10 puntos fijos (sin importar cuál de las 21 frutas sea) y hace crecer la serpiente en un segmento.
  - Tras comer, aparece una fruta nueva en una celda libre al azar, con el sprite elegido al azar entre las 21 del atlas `fruits.png`/`sprites.js`, sin repetir la fruta inmediatamente anterior (puramente cosmético, no afecta puntaje).
  - Nivel = `floor(frutasComidas / 5) + 1`; la velocidad de movimiento aumenta en cada nivel, sin un tope máximo visible para el jugador (el motor conserva internamente un piso técnico bajo en el intervalo de movimiento solo para evitar un valor inválido, no como "nivel máximo" perceptible).
- `components/games/serpentina/sprite-atlas.ts`: versión TS tipada de `references/snake-assets/sprites.js` (mismas coordenadas `{x, y, w, h}` de las 21 frutas), apuntando a `/games/serpentina/fruits.png` en vez de `window.SPRITE_ATLAS`.
- Copiar `references/snake-assets/fruits.png` a `public/games/serpentina/fruits.png`.
- `components/games/serpentina/leaderboard.ts`: `getSerpentinaLeaderboard()`/`addSerpentinaScore()` async contra Supabase (tabla `serpentina_scores`), mismo contrato que Asteroids/Tetris/Arkanoid desde la spec 06 — sin paso intermedio por `localStorage` (Serpentina no tiene puntajes previos que preservar, a diferencia de Asteroids/Tetris en su momento).
- Migración SQL: tabla `"arcade-vault"."serpentina_scores"`, fila `('serpentina', 'SERPENTINA')` en `"arcade-vault".games`, trigger de espejo hacia `global_scores` reusando `mirror_to_global_scores`, RLS (SELECT público, INSERT público con los `check` habituales), tabla agregada a la publicación `supabase_realtime`.
- `components/game-player.tsx`: `isSerpentina = game.id === "serpentina"`, incorporado a `isPortedGame`; rama del ternario que monta `<SerpentinaCanvas>` dentro del `crt-screen`; slice de estado `serpentinaResult`; rama en `handleForceEnd`; prop `leaderboard` construido con `getSerpentinaLeaderboard`/`addSerpentinaScore` (carga/error inline, sin bloquear "JUGAR DE NUEVO"/"SALIR").
- `serpentina: "serpentina_scores"` agregado al `SCORE_TABLE` de `app/games/[id]/page.tsx` **y**, por separado, al `SCORE_TABLE` de `app/salon/page.tsx` (mapas duplicados, no importados entre sí).
- Tipos nuevos: `SerpentinaScoreRow` en `lib/supabase/types.ts`; `SerpentinaGameOverResult` (= `GameOverResult`, sin stats extra) en `components/games/shared/types.ts`.

**Out of scope (for future specs):**

- Los otros 4 juegos simulados del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel`): siguen exactamente igual, sin cambios.
- Wrap-around en los bordes del tablero.
- Vidas múltiples o power-ups.
- Cualquier stat extra en el leaderboard de Serpentina más allá de `score`/`level` (ej. `fruits_eaten`).
- Controles táctiles/gestos nuevos.
- Rediseño responsive del canvas (sigue con tamaño fijo 800×800, solo evita desbordar el contenedor).
- Sonido o música.
- Cambios en `app/data/games.ts` (la ficha de `serpentina` ya existe con todos sus campos y no se toca).
- Autenticación real / validación anti-cheat de puntajes.
- Actualizar `CLAUDE.md` (se hace en un commit posterior, como en specs anteriores).
- Tests automatizados.

## Data model

```sql
-- Nueva tabla física, mismo patrón que asteroids_scores/tetris_scores/arkanoid_scores
create table "arcade-vault"."serpentina_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

insert into "arcade-vault".games (id, title) values ('serpentina', 'SERPENTINA');

create trigger serpentina_mirror after insert on "arcade-vault"."serpentina_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('serpentina');

-- RLS: enable; policy SELECT público; policy INSERT público
-- con check (char_length(player_name) between 1 and 10 and score >= 0);
-- agregar la tabla a la publicación supabase_realtime.
```

```ts
// lib/supabase/types.ts
export type SerpentinaScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  user_id: string | null;
  created_at: string;
};
```

```ts
// components/games/shared/types.ts
export type SerpentinaGameOverResult = GameOverResult; // sin stats extra, igual que Arkanoid
```

```ts
// components/games/serpentina/engine.ts
export const SERPENTINA_WIDTH = 800;
export const SERPENTINA_HEIGHT = 800;
export const GRID_SIZE = 20; // celdas por lado
export const CELL_PX = 40; // 20 * 40 = 800

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GridPoint = { x: number; y: number }; // coordenadas de grilla (0..19), no píxeles
```

```ts
// components/games/serpentina/sprite-atlas.ts — puerto tipado de references/snake-assets/sprites.js
export const FRUIT_ATLAS_SRC = "/games/serpentina/fruits.png";
export const FRUITS: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  // ...las 21 frutas restantes, mismas coordenadas que sprites.js
};
```

## Implementation plan

1. Crear `components/games/serpentina/sprite-atlas.ts` (puerto tipado de `references/snake-assets/sprites.js`, mismas coordenadas de las 21 frutas) y copiar `references/snake-assets/fruits.png` a `public/games/serpentina/fruits.png`. Verificación: el módulo importa sin errores de tipos, la imagen carga en el navegador desde `/games/serpentina/fruits.png`.
2. Crear `components/games/serpentina/engine.ts`: motor de Snake construido desde cero según las mecánicas confirmadas en Scope (grilla 20×20 de 40px, largo inicial 3, colisión con pared/cuerpo = game over inmediato sin vidas, fruta al azar entre las 21 sin repetir la anterior, +10 puntos por fruta, nivel `floor(frutasComidas/5)+1` con velocidad creciente sin tope visible). El motor nunca toca `document`/`window`/`localStorage`; recibe callbacks (`onScoreChange`, `onLivesChange` siempre con `0`, `onLevelChange`, `onGameOver`) inyectados en el constructor, expone `restart()`, `setPaused()`, `keyDown()`/`keyUp()`, `update(dt)`, `draw(ctx)`. Verificación: instanciar el motor en una prueba manual mínima (o directamente en el paso 3) confirma que produce movimiento, colisión y colecta de fruta correctos.
3. Crear `components/games/serpentina/serpentina-canvas.tsx`: wrapper `forwardRef<GameCanvasHandle, GameCanvasProps<SerpentinaGameOverResult>>`, mismo patrón que `AsteroidsCanvas`/`ArkanoidCanvas` (`callbacksRef`, listeners de teclado en `useEffect` mount-only con guard de `document.activeElement?.tagName === "INPUT"`, cleanup que cancela el RAF y remueve listeners, `useImperativeHandle` para `restart`). Dibuja la serpiente con el color `green` de la ficha del catálogo y la fruta con el sprite del atlas escalado a 40×40px por celda. Render: `<canvas width={800} height={800}>`. Verificación manual: la serpiente se mueve con flechas y con WASD, come fruta y crece, el juego termina al chocar contra una pared y también al chocar contra su propio cuerpo, la velocidad aumenta visiblemente con el nivel.
4. Crear `components/games/serpentina/leaderboard.ts` (`getSerpentinaLeaderboard`/`addSerpentinaScore`, contrato async contra Supabase, tabla `serpentina_scores`, top-5). Verificación: `npm run build` no reporta errores de tipos (todavía no está conectado a `GamePlayer`).
5. Migración SQL (`apply_migration`): tabla `serpentina_scores`, seed en `games`, trigger de espejo, RLS, tabla agregada a `supabase_realtime`. Verificación: `list_tables` muestra `serpentina_scores`; una fila de prueba insertada manualmente aparece reflejada en `global_scores`.
6. Agregar `SerpentinaScoreRow` en `lib/supabase/types.ts` y `SerpentinaGameOverResult` en `components/games/shared/types.ts`.
7. Conectar en `components/game-player.tsx`: `isSerpentina = game.id === "serpentina"`, incorporarlo a `isPortedGame`; rama del ternario que monta `<SerpentinaCanvas>`; slice de estado `serpentinaResult`; rama en `handleForceEnd`; prop `leaderboard` con `getSerpentinaLeaderboard`/`addSerpentinaScore` (carga/error inline). Vidas del HUD fijas en 0 para Serpentina. Verificación manual: jugar una partida completa desde `/games/serpentina/play`, perder (por pared y, en otra partida, por cuerpo propio), guardar nombre, ver el puntaje reflejado en el top-5 del modal.
8. Agregar `serpentina: "serpentina_scores"` al `SCORE_TABLE` de `app/games/[id]/page.tsx` y al `SCORE_TABLE` de `app/salon/page.tsx`. Verificación: `/games/serpentina` muestra el top-12 real en "MEJORES PUNTUACIONES"; `/salon` muestra un tab "SERPENTINA" que carga el top-12 real y se actualiza en vivo (probar guardando un puntaje en una pestaña y viéndolo aparecer en otra sin recargar).
9. Verificación final: jugar Serpentina de punta a punta varias veces (incluyendo perder por pared y por cuerpo propio, reiniciar con "JUGAR DE NUEVO", salir con "SALIR"), confirmar que `gloton`/`invasores`/`ranaria`/`duelo-pixel` siguen funcionando exactamente igual que antes, y correr `npm run lint`/`npm run build` sin errores nuevos.

## Acceptance criteria

- [ ] `/games/serpentina/play` muestra el Snake real dentro del `crt-screen`: grilla 20×20 (canvas 800×800), serpiente de largo inicial 3, controlable con flechas **y** con WASD.
- [ ] Comer una fruta suma 10 puntos, hace crecer la serpiente en un segmento, y hace aparecer una fruta nueva elegida al azar entre las 21 del atlas sin repetir la fruta anterior.
- [ ] El nivel sube cada 5 frutas comidas y la velocidad de movimiento aumenta en cada nivel, sin un tope visible para el jugador.
- [ ] Chocar contra cualquier pared del tablero termina la partida inmediatamente.
- [ ] Chocar contra el propio cuerpo de la serpiente termina la partida inmediatamente.
- [ ] El HUD de vidas siempre muestra 0 (Serpentina no tiene concepto de vidas), igual que Tetris.
- [ ] El botón PAUSA detiene el motor (la serpiente no avanza) y REANUDAR lo continúa donde quedó.
- [ ] Al terminar la partida, el modal de fin de juego muestra el top-5 propio de Serpentina (leído de Supabase) y permite guardar el nombre si el puntaje califica.
- [ ] "JUGAR DE NUEVO" reinicia el motor a su estado inicial (largo 3, nivel 1, velocidad inicial).
- [ ] "SALIR" desmonta el juego sin dejar listeners de teclado activos ni el loop de animación corriendo en segundo plano.
- [ ] `/games/serpentina` muestra el top-12 real de Supabase en "MEJORES PUNTUACIONES" y "Mejor global" refleja el puntaje más alto real cuando existe.
- [ ] `/salon` muestra un tab "SERPENTINA" con el top-12 real, que se actualiza en vivo (Realtime) sin recargar la página al guardarse un puntaje nuevo en otra pestaña.
- [ ] Los otros 4 juegos simulados (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen usando el reproductor simulado exactamente como antes de esta spec.
- [ ] El canvas de 800×800 no desborda el contenedor en un viewport angosto (usa el mismo `max-width:100%; height:auto` ya existente en `.crt-screen`).
- [ ] `npm run build` termina sin errores. `npm run lint` no introduce errores nuevos respecto al estado actual del repo.

## Decisions

- **Sí:** se reemplaza la entrada `serpentina` existente del catálogo (id/título/categoría/color/copy/cover se mantienen intactos) en vez de crear una ficha nueva — decisión explícita del usuario, mismo patrón de "upgrade" que la spec 05 usó para `rocas`/`caida`/`bloque-buster`.
- **Sí:** no hay código fuente de referencia para Snake (a diferencia de Asteroids/Tetris/Arkanoid) — el motor se construye desde cero siguiendo únicamente las mecánicas confirmadas explícitamente por el usuario en esta spec. No se inventa ninguna mecánica adicional.
- **Sí:** canvas fijo de 800×800px, grilla de 20×20 celdas de 40px cada una — decisión explícita del usuario ("debe estar embebido como los demás" + confirmación de la grilla exacta). Usa el mismo mecanismo `max-width:100%; height:auto` de `.crt-screen` que los otros 3 juegos, sin rediseño responsive nuevo.
- **Sí:** choque contra pared = fin de partida, sin wrap-around. Decisión explícita del usuario, pese a que el atlas de sprites proviene de Google Snake (que sí usa wrap-around) — se prefiere el comportamiento clásico.
- **Sí:** controles de flechas + WASD simultáneos (no solo flechas, a diferencia del resto de juegos portados). Decisión explícita del usuario.
- **Sí:** sin concepto de vidas — un solo choque (pared o cuerpo propio) termina la partida; el HUD reporta 0 vidas siempre, igual que Tetris.
- **Sí:** progresión de nivel (+1 cada 5 frutas) con velocidad creciente sin tope visible para el jugador. Decisión explícita del usuario ("sin tope... debería ser más rápido, igual como es solo una vida"). El motor conserva internamente un piso técnico bajo en el intervalo de movimiento solo para evitar un valor inválido, no como un "nivel máximo" perceptible.
- **Sí:** 10 puntos fijos por fruta, sin importar cuál de las 21 frutas del atlas aparezca. Decisión explícita del usuario.
- **Sí:** la fruta que aparece se elige al azar entre las 21 del atlas `fruits.png`/`sprites.js`, sin repetir la fruta inmediatamente anterior — puramente cosmético, no afecta el puntaje.
- **No:** el leaderboard de Serpentina no guarda stats extra más allá de `score`/`level` (sin `fruits_eaten` ni columnas adicionales). Decisión explícita del usuario, mismo patrón que Arkanoid.
- **Sí:** el leaderboard se conecta directo a Supabase desde el día uno (tabla `serpentina_scores`), sin paso intermedio por `localStorage` — a diferencia de Asteroids/Tetris, que primero se portaron a `localStorage` en la spec 05 y migraron en la spec 06, Serpentina es un juego nuevo sin puntajes previos que preservar.
- **Sí:** se reutiliza `mirror_to_global_scores` y el patrón tabla+trigger+RLS ya existente, agregando la fila `('serpentina', 'SERPENTINA')` a la tabla `games` de Supabase — esto hace aparecer el tab de Serpentina en el Salón automáticamente, sin código adicional ahí.
- **No:** no se agrega ningún control en pantalla más allá del canvas (a diferencia del selector de tema/skin de Tetris) — Serpentina no lo necesita.
- **No:** no se toca `app/data/games.ts` — la ficha de `serpentina` ya existe con todos sus campos y no requiere cambios.

## Risks

| Risk                                                                                                                                                                          | Mitigation                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al no existir código fuente de referencia, no hay una implementación "correcta" contra la cual comparar — cualquier ambigüedad de mecánica queda resuelta solo por esta spec. | Cada mecánica quedó fijada explícitamente en Scope/Decisions tras las preguntas de clarificación; la aceptación se mide contra esos criterios, no contra un archivo fuente. |
| Velocidad creciente sin tope visible puede volverse técnicamente injugable (intervalo de movimiento demasiado bajo) en partidas muy largas.                                   | El motor mantiene un piso técnico interno en el intervalo de movimiento (detalle de implementación, no un "nivel máximo" visible) para evitar un valor inválido o negativo. |
| No hay autenticación en los inserts de puntaje — mismo modelo de confianza que Asteroids/Tetris/Arkanoid.                                                                     | Aceptado, precedente ya documentado en specs 05/06: `check` constraints básicos (`player_name` 1–10, `score >= 0`) bloquean basura obvia, no un puntaje falso "razonable".  |
| Realtime no entrega eventos si el filtro del canal no usa `schema: "arcade-vault"` o si la policy de `SELECT` no permite al rol `anon` ver las filas.                         | Verificación explícita en el paso 8 del plan: guardar un puntaje en una pestaña del navegador y confirmar que aparece en `/salon` abierto en otra pestaña, sin recargar.    |

## What is **not** in this spec

- Los otros 4 juegos simulados del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel`), siguen igual.
- Wrap-around en los bordes del tablero.
- Vidas múltiples o power-ups.
- Stats extra en el leaderboard de Serpentina (`fruits_eaten` u otros).
- Controles táctiles/gestos nuevos.
- Rediseño responsive del canvas.
- Sonido o música.
- Cambios en `app/data/games.ts` o en `CLAUDE.md`.
- Autenticación real / validación anti-cheat de puntajes.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
