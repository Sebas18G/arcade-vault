# SPEC 09 — Frogger real: motor de canvas que reemplaza el reproductor simulado de `ranaria`

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 05
> **Date:** 2026-08-30
> **Objective:** Construir un motor real de canvas para Frogger (grilla 16×13, carretera de 5 carriles y río de 5 carriles) que reemplaza el reproductor simulado de la entrada `ranaria` del catálogo, todavía sin persistencia.

## Why this spec exists

Esta spec nace de una game jam cuyo tema fue **"cruza la carretera y el río sin convertirte en papilla"**. El tema no describe un género: describe literalmente el bucle de juego de Frogger. El catálogo ya tiene la entrada `ranaria` ("Cruza la autopista de pixeles.") como clon simulado de ese mismo juego, y la bitácora `references/game-suggestion-todo.md` ya lo tenía fichado como candidato 8/10, con su puntuación confirmada por fuentes y pendiente solo de aceptarse.

El trabajo se parte en tres specs (09, 10 y 11) siguiendo el precedente real de las specs 05 → 06 → 07: primero el motor jugable, después su leaderboard en Supabase, y al final la capa temática que le da su identidad de jam. Esta primera deja el juego jugable de punta a punta y commiteable por sí sola, sin tocar Supabase.

## Scope

**In:**

- `app/data/games.ts`: la ficha existente cambia su `id` de `"ranaria"` a `"frogger"` y su `title` de `"RANARIA"` a `"FROGGER"`. El resto de sus campos (`short`, `long`, `cat: "ARCADE"`, `cover: "cover-rana"`, `color: "green"`, `best`, `plays`) se mantiene intacto. Mismo patrón de renombrado que Asteroids/Tetris/Arkanoid en la spec 06 y Snake en la spec 08. Ver Decisions.
- `components/games/frogger/engine.ts`: motor construido desde cero, sin código fuente de referencia en `references/`, según las mecánicas confirmadas más abajo.
  - Canvas fijo de 800×650px: grilla de **16 columnas × 13 filas** de 50px por celda.
  - Distribución de filas, de arriba hacia abajo: fila 0 = orilla de casas (5 nenúfares en las columnas 1, 4, 7, 10 y 13; el resto es matorral); filas 1–5 = río (5 carriles); fila 6 = mediana segura; filas 7–11 = carretera (5 carriles); fila 12 = orilla de salida.
  - Río: las filas 1, 3 y 5 llevan troncos; las filas 2 y 4 llevan hileras de tortugas. Cada carril alterna su dirección respecto al anterior. Una de las dos hileras de tortugas se sumerge periódicamente.
  - Carretera: los 5 carriles alternan dirección, con vehículos de distinto largo y velocidad por carril.
  - La rana salta de celda en celda con `←`/`→`/`↑`/`↓` **y** `W`/`A`/`S`/`D` simultáneamente (precedente de Snake, spec 08).
  - La posición horizontal de la rana se guarda en píxeles con decimales: un salto la desplaza exactamente una celda y la alinea a la columna; montada sobre un tronco o una tortuga, se le suma la velocidad de la plataforma en cada frame.
  - 3 vidas. Temporizador de 30 segundos por rana, que se reinicia al llegar a casa y al perder una vida.
- Formas de perder una vida cubiertas por esta spec: atropello en la carretera; caer al agua en un carril de río sin plataforma bajo la rana; quedarse sobre una tortuga sumergida; ser arrastrada fuera del borde de la pantalla montada en una plataforma; saltar a una casa ya ocupada o al matorral entre casas; agotar el temporizador.
- Puntuación (confirmada con fuentes, ver Decisions): +10 al alcanzar por primera vez en la vida actual una fila más adelantada; +50 por rana en casa; +10 por cada medio segundo sin usar del temporizador al llegar a casa; +200 por la rana rosa; +200 por la mosca; +1000 al ocupar las 5 casas y cerrar el nivel; rana extra a los 20 000 puntos.
- Progresión: al ocupar las 5 casas sube el nivel, se vacían las casas y aumentan las velocidades de vehículos y plataformas. `level` empieza en 1 y no tiene tope.
- `components/games/frogger/frogger-canvas.tsx`: wrapper `forwardRef<GameCanvasHandle, GameCanvasProps<FroggerGameOverResult>>` siguiendo el contrato de `recipe.md` (`callbacksRef`, listeners de teclado en `useEffect` mount-only con guard de `document.activeElement?.tagName === "INPUT"`, cleanup que cancela el RAF y remueve listeners, `useImperativeHandle` para `restart`).
- `components/games/shared/types.ts`: `FroggerGameOverResult = GameOverResult & { frogsHome: number; timeBonus: number }`.
- `components/game-player.tsx`: `isFrogger = game.id === "frogger"`, incorporado a `isPortedGame`; rama del ternario que monta `<FroggerCanvas>`; slice de estado `froggerResult`; rama en `handleForceEnd`. **Sin** prop `leaderboard` (ya es opcional en `GameOverModal`): el modal de fin de partida muestra el resultado sin tabla de top-5 hasta la spec 10.

**Out of scope (for future specs):**

- Toda la persistencia: tabla `frogger_scores`, `leaderboard.ts`, `SCORE_TABLE`, `FroggerScoreRow` y Salón de la Fama. **Va entera en la spec 10.**
- La capa temática de la jam: stats de causa de muerte, selectores de skin y tema en el HUD, cartel de muerte en el canvas. **Va entera en la spec 11.**
- Serpientes, cocodrilos y nutrias del río y de las casas (peligros de niveles avanzados del original).
- Dibujo con sprites: todo se dibuja proceduralmente con `ctx`, sin assets binarios.
- Rediseño responsive del canvas (tamaño fijo 800×650, solo el `max-width:100%; height:auto` ya existente en `.crt-screen`).
- Sonido o música.
- Los otros 4 juegos simulados del catálogo (`gloton`, `invasores`, `duelo-pixel` y los que queden) siguen exactamente igual.
- Actualizar `CLAUDE.md` y `references/implemented-games.md`.
- Tests automatizados.

## Data model

Esta spec **no introduce datos persistidos**: no toca Supabase ni `localStorage`. Las estructuras nuevas viven solo en memoria dentro del motor.

```ts
// components/games/frogger/engine.ts
export const FROGGER_WIDTH = 800;
export const FROGGER_HEIGHT = 650;
export const COLS = 16;
export const ROWS = 13;
export const CELL_PX = 50; // 16*50 = 800, 13*50 = 650

export const HOME_ROW = 0;
export const RIVER_ROWS = [1, 2, 3, 4, 5] as const;
export const MEDIAN_ROW = 6;
export const ROAD_ROWS = [7, 8, 9, 10, 11] as const;
export const START_ROW = 12;
export const HOME_COLS = [1, 4, 7, 10, 13] as const;

export const START_LIVES = 3;
export const TIMER_SECONDS = 30;

type LaneKind = "road" | "log" | "turtles";
type Lane = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1; // 1 = hacia la derecha
  speedPxPerSec: number;
  spanCells: number; // largo del vehículo, tronco o hilera
  gapCells: number;
  diving: boolean; // solo para kind "turtles"
};
```

```ts
// components/games/shared/types.ts
export type FroggerGameOverResult = GameOverResult & {
  frogsHome: number; // ranas totales llevadas a casa en la partida
  timeBonus: number; // puntos acumulados por tiempo sin usar
};
```

## Implementation plan

1. Renombrar la ficha del catálogo en `app/data/games.ts`: `id` de `"ranaria"` a `"frogger"` y `title` de `"RANARIA"` a `"FROGGER"`, sin tocar ningún otro campo. Verificación: `/games/frogger` responde y `/games/ranaria` da 404; la tarjeta se sigue viendo igual en `/games` (mismo `cover-rana`, mismo color).
2. Agregar `FroggerGameOverResult` a `components/games/shared/types.ts`. Verificación: `npm run build` sin errores de tipos.
3. Crear `components/games/frogger/engine.ts` con la geometría y los carriles: constantes exportadas, tabla de carriles, y `update(dt)` moviendo vehículos y plataformas con reaparición por el borde opuesto. Todavía sin rana. Verificación: dibujando solo el fondo y los carriles, el tráfico y el río se mueven de forma continua y estable.
4. Agregar la rana al motor: salto celda a celda, posición horizontal en píxeles con decimales, arrastre sobre plataformas, alineación a columna al saltar. Verificación: la rana se mueve con flechas y con WASD, y viaja montada sobre un tronco sin desalinearse.
5. Agregar colisiones y muertes: atropello, agua, tortuga sumergida, arrastre fuera de pantalla, casa ocupada o matorral, y temporizador agotado. Cada muerte descuenta una vida, reinicia el temporizador y devuelve la rana a la fila 12; con 0 vidas dispara `onGameOver`. Verificación manual: provocar las seis muertes una por una y confirmar que cada una descuenta exactamente una vida.
6. Agregar puntuación y progresión: +10 por fila nueva más adelantada de la vida actual, +50 por casa, +10 por medio segundo sin usar, +200 por rana rosa y por mosca, +1000 al llenar las 5 casas, rana extra a los 20 000. Al llenar las casas sube el nivel y aumentan las velocidades. Verificación manual: el HUD refleja los saltos de puntaje esperados y el nivel sube al cerrar el tablero.
7. Crear `components/games/frogger/frogger-canvas.tsx` según el contrato de `recipe.md`, dibujando todo proceduralmente con `ctx`, sin assets. Verificación manual: el canvas monta, responde al teclado, y desmontar la pantalla no deja listeners ni RAF corriendo.
8. Conectar en `components/game-player.tsx`: `isFrogger`, `isPortedGame`, rama del ternario, `froggerResult`, rama en `handleForceEnd`. Verificación manual: jugar una partida completa desde `/games/frogger/play`, perder las 3 vidas, ver el modal de fin de partida sin tabla de puntajes, y que "JUGAR DE NUEVO" y "SALIR" funcionen.

## Acceptance criteria

- [ ] `/games/frogger/play` muestra el Frogger real dentro del `crt-screen`, en un canvas de 800×650 con las 13 filas descritas en Scope.
- [ ] La rana se controla con flechas **y** con WASD, y cada pulsación la mueve exactamente una celda.
- [ ] Montada sobre un tronco o una tortuga, la rana se desplaza junto con la plataforma y no se desalinea de la grilla al volver a saltar.
- [ ] Ser atropellada en cualquiera de los 5 carriles de carretera descuenta una vida.
- [ ] Caer al agua en un carril de río sin plataforma bajo la rana descuenta una vida.
- [ ] Quedarse sobre una tortuga que se sumerge descuenta una vida.
- [ ] Ser arrastrada fuera del borde de la pantalla montada en una plataforma descuenta una vida.
- [ ] Saltar a una casa ya ocupada o al matorral entre casas descuenta una vida.
- [ ] Agotar el temporizador de 30 segundos descuenta una vida y reinicia el temporizador.
- [ ] Llegar a una casa libre suma 50 puntos más 10 por cada medio segundo sin usar del temporizador.
- [ ] Ocupar las 5 casas suma 1000 puntos, sube el nivel, vacía las casas y aumenta las velocidades.
- [ ] El HUD muestra 3 vidas al empezar y llega a 0 tras la tercera muerte, momento en el que aparece el modal de fin de partida.
- [ ] El modal de fin de partida aparece sin tabla de top-5 (esta spec no tiene persistencia) y "JUGAR DE NUEVO" reinicia el motor a su estado inicial.
- [ ] `/games/ranaria` ya no existe y ningún archivo del repo sigue referenciando el id `ranaria`.
- [ ] `npm run build` termina sin errores y `npm run lint` no introduce errores nuevos.

## Decisions

- **Decisión autónoma del skill:** el juego elegido para el tema **"cruza la carretera y el río sin convertirte en papilla"** es **Frogger**, sobre la entrada existente `ranaria`. El tema describe literalmente su bucle de juego, no un género; ningún otro candidato de la bitácora se le acerca en fuerza temática.
- **Decisión autónoma del skill:** es un caso de **upgrade**, no de entrada nueva — la ficha `ranaria` ya existe en `app/data/games.ts` con su categoría, color, cover y copy en Español. No se crea una fila nueva en `GAMES` ni una clase `cover-*` nueva.
- **Decisión autónoma del skill:** el `id` y el `title` pasan de `ranaria`/`RANARIA` a `frogger`/`FROGGER`, para que coincidan con el nombre del motor y de la carpeta. Es exactamente el patrón que la spec 06 aplicó a `rocas`/`caida`/`bloque-buster` y la spec 08 a `serpentina`. Mantener `ranaria` obligaría a una carpeta `components/games/ranaria/` y a una tabla `ranaria_scores`, rompiendo la convención de los cuatro juegos reales existentes.
- **Sí:** grilla de 16×13 celdas de 50px (canvas 800×650). El original arcade usa 13 filas con 5 carriles de carretera, mediana, 5 carriles de río y 5 casas — esa estructura se respeta. El ancho de 16 columnas es elección propia, para repartir las 5 casas de forma pareja y mantener el canvas cerca de los 800px del resto del catálogo.
- **Sí:** 3 vidas. El original es configurable por el operador entre 3, 5 y 7; se toma 3 por coherencia con Asteroids y Arkanoid.
- **Decisión autónoma del skill:** los +10 por avance se otorgan solo al alcanzar por primera vez, en la vida actual, una fila más adelantada que la máxima ya alcanzada. Las fuentes describen "10 puntos por cada salto hacia adelante", lo que en una implementación literal permitiría farmear puntos saltando adelante y atrás. Ver también **Pendiente de confirmar**.
- **No:** el marcador **no** satura a 99 990 como el arcade original, que solo guarda 5 dígitos. Un leaderboard `score DESC` necesita el rango completo; saturar produciría empates artificiales en la cima.
- **Sí:** todo el dibujo es procedural con `ctx`, sin assets binarios. Solo Snake tiene precedente de atlas de sprites en el repo, y aquí no hay assets aportados por el usuario.
- **Sí:** controles de flechas **y** WASD en simultáneo, siguiendo el precedente de Snake (spec 08) y no el del resto de juegos portados.
- **No:** serpientes, cocodrilos y nutrias quedan fuera. Son peligros de niveles avanzados del original, su ausencia no rompe ninguna mecánica ya listada, y agregarlos infla esta spec sin aportar al tema de la jam.
- **No:** esta spec no toca Supabase ni `localStorage`. La separación limpia entre motor y persistencia es lo que hace que la spec 09 sea commiteable sola.
- **Pendiente de confirmar:** si el arcade original vuelve a otorgar los 10 puntos al reavanzar una fila ya visitada dentro de la misma vida. Las fuentes consultadas dicen "10 puntos por cada salto hacia adelante" sin aclarar el caso de ir y volver.
- **Pendiente de confirmar:** número exacto de vehículos, troncos y tortugas por carril, sus velocidades y cómo escalan por nivel en el original. No aparecen en las fuentes consultadas; los valores concretos se fijan durante la implementación y quedan documentados en la tabla de carriles de `engine.ts`.
- **Pendiente de confirmar:** cadencia exacta con la que se sumergen las tortugas y cuánto tiempo permanecen bajo el agua.
- **Pendiente de confirmar:** frecuencia de aparición de la rana rosa y de la mosca, y cuánto duran en pantalla.

## Risks

| Risk                                                                                                                                                                                                               | Mitigation                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No existe código fuente de referencia para Frogger en `references/`, así que no hay implementación "correcta" contra la cual comparar.                                                                             | Cada mecánica queda fijada por escrito en Scope y Decisions, con las fuentes citadas en la bitácora; lo no confirmable queda listado como **Pendiente de confirmar** en vez de afirmarse como hecho.                                                    |
| Mezclar movimiento discreto (la rana salta de celda en celda) con movimiento continuo (troncos y vehículos en píxeles con decimales) es la fuente de bug más probable: la rana queda desalineada o a medio montar. | La posición horizontal se guarda en píxeles con decimales y se alinea a columna **solo** al saltar; el criterio de "estar sobre una plataforma" se evalúa por solapamiento de píxeles, no por igualdad de columna. Tiene criterio de aceptación propio. |
| Renombrar el `id` rompe cualquier enlace o marcador existente a `/games/ranaria`.                                                                                                                                  | Precedente ya aceptado en las specs 06 y 08 para los otros cuatro juegos; el criterio de aceptación exige que ninguna referencia a `ranaria` sobreviva en el repo.                                                                                      |
| El canvas de 800×650 no es responsive más allá de no desbordar su contenedor.                                                                                                                                      | Precedente aceptado de los cuatro juegos reales: se reutiliza el `max-width:100%; height:auto` ya existente en `.crt-screen`, sin rediseño.                                                                                                             |

## What is **not** in this spec

- Tabla `frogger_scores`, `leaderboard.ts`, `SCORE_TABLE`, `FroggerScoreRow` y Salón de la Fama (spec 10).
- Stats de causa de muerte, selectores de skin y tema en el HUD, y cartel de muerte en el canvas (spec 11).
- Serpientes, cocodrilos y nutrias.
- Assets binarios o dibujo con sprites.
- Sonido o música.
- Rediseño responsive del canvas.
- Cambios en los otros juegos simulados del catálogo.
- Actualizar `CLAUDE.md` o `references/implemented-games.md`.
- Autenticación real o validación anti-cheat de puntajes.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
