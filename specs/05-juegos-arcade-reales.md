# SPEC 05 — Juegos arcade reales (Asteroids, Tetris, Arkanoid)

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-30
> **Objective:** Portar los 3 minijuegos de `references/started_games/` (Asteroids, Tetris, Arkanoid) a componentes de canvas en React que reemplacen el reproductor simulado para las entradas `rocas`, `caida` y `bloque-buster` del catálogo, notificando puntaje/vidas/nivel/fin de partida al HUD y al modal de fin de juego ya existentes de `GamePlayer`.

## Why this spec exists

`components/game-player.tsx` hoy simula **todos** los juegos con un `setInterval` que suma puntos al azar — ningún motor real está implementado (ver "Out of scope" de la spec 01). El usuario ya tiene 3 juegos completos y jugables en `references/started_games/` (vanilla JS + canvas, sin dependencias): `02-asteroids`, `03-tetris` y `04-arkanoid` (este último tenía assets faltantes que el usuario ya agregó y validó). Esta spec conecta esos 3 motores reales a la plataforma Next.js, dejando los otros 5 juegos del catálogo simulados como hoy (son candidatos para specs futuras, uno por uno o en lote).

## Mapeo de juegos

| Entrada del catálogo (`app/data/games.ts`) | Carpeta de referencia                    |
| ------------------------------------------ | ---------------------------------------- |
| `rocas` (SHOOTER, "ROCAS")                 | `references/started_games/02-asteroids/` |
| `caida` (PUZZLE, "CAÍDA")                  | `references/started_games/03-tetris/`    |
| `bloque-buster` (ARCADE, "BLOQUE BUSTER")  | `references/started_games/04-arkanoid/`  |

Los otros 5 juegos del catálogo (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen usando el reproductor simulado sin cambios.

## Arquitectura de integración

Cada juego se porta como un **componente de canvas autocontenido**, sin overlays propios en el DOM (pausa, inicio, game over ni tabla de puntajes propia dibujada fuera del canvas quedan eliminados de la versión original). En su lugar, el motor **notifica a React** vía props/callbacks, y es `GamePlayer` quien maneja la UI alrededor del canvas (HUD, botón de pausa, modal de fin de juego), igual que hace hoy para los juegos simulados.

Contrato de cada componente de juego (`AsteroidsCanvas`, `TetrisCanvas`, `ArkanoidCanvas`):

```ts
type GameCanvasProps = {
  paused: boolean; // controlado por el botón PAUSA de GamePlayer
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void; // Tetris no tiene vidas: siempre reporta 0
  onLevelChange: (level: number) => void;
  onGameOver: (result: GameOverResult) => void;
};

type GameOverResult = {
  score: number;
  level: number;
  // resto de stats propias del juego (ej. asteroidsDestroyed/bestCombo en Asteroids,
  // lines/bestCombo en Tetris) que alimentan su propio leaderboard.
};

type GameCanvasHandle = { restart: () => void }; // expuesto vía useImperativeHandle/ref
```

- El motor de cada juego (bucle `requestAnimationFrame`, colisiones, dibujado) se porta casi sin cambios de lógica de juego — no se rediseñan mecánicas, dificultad, puntuación ni gráficos.
- Los `addEventListener` de teclado/mouse que en la referencia se agregan a `window`/`document` una sola vez se mueven a `useEffect` con cleanup: se agregan al montar el componente y se remueven al desmontar (salir del juego, navegar a otra ruta), evitando fugas de listeners entre partidas o entre pestañas del SPA.
- El `paused` prop pausa el `update()` interno del motor (el propio overlay "EN PAUSA" de `GamePlayer` ya cubre visualmente el canvas).
- El botón "FIN" de `GamePlayer` sigue forzando el fin de partida en React sin pasar por el motor, igual que hoy.
- "SALIR" desmonta el componente; el `useEffect` de cleanup cancela el `requestAnimationFrame` y remueve listeners.
- Estilos propios de cada referencia (CSS embebido o archivo `.css`) se portan como **CSS Modules** con clases y variables escopeadas a un contenedor propio — **no** se reutilizan selectores globales (`:root`, `body.*`) porque Tetris redefine `--bg` en `:root` y alterna un tema vía `body.light-theme`, lo que rompería el resto de la app (colisión real, verificada contra `app/globals.css`). El toggle de tema/skin de Tetris se conserva funcional pero aplicando la clase al contenedor del juego, no a `document.body`.

## Scope

**In:**

- `components/games/asteroids/`: motor de Asteroids portado desde `references/started_games/02-asteroids/game.js` (nave, disparo, asteroides que se dividen, power-ups, estrella fugaz, 3 vidas con invencibilidad temporal, niveles/oleadas), como `AsteroidsCanvas`. Controles idénticos a la referencia (`←`/`→` rotar, `↑` impulso, `Espacio` disparar).
- `components/games/tetris/`: motor de Tetris portado desde `references/started_games/03-tetris/game.js` (tablero 10×20, 7 piezas, wall kicks, soft/hard drop, ghost piece, niveles cada 10 líneas, combos, power-ups de congelar), como `TetrisCanvas`, más un `NextPieceCanvas` (preview de siguiente pieza, como en la referencia). Controles idénticos (`←`/`→` mover, `↑`/`X` rotar, `↓` soft drop, `Espacio` hard drop). Se conserva el selector de tema claro/oscuro y de skin (retro/neon/pastel/pixel) igual que en la referencia, reubicado como un control pequeño en la pantalla de juego (fuera del canvas), aplicando la clase de tema/skin al contenedor del juego en vez de a `document.body`.
- `components/games/arkanoid/`: motor de Arkanoid portado desde `references/started_games/04-arkanoid/game.js` + `assets/spritesheet.js` (paleta, pelota, bloques con sprites, bloques indestructibles, explosiones animadas, 3 vidas, niveles hasta 15, sonidos de rebote/rotura), como `ArkanoidCanvas`. Controles idénticos (`←`/`→` o `A`/`D` mover paleta, más arrastre con mouse sobre el canvas).
- Copiar los assets binarios de Arkanoid a `public/games/arkanoid/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3` (los archivos limpios de `references/started_games/04-arkanoid/assets/`, ignorando las carpetas duplicadas `assets/assets/` y `__MACOSX/` que quedaron de la extracción del zip).
- Cada motor notifica a `GamePlayer` (o al componente que lo reemplace) los cambios de puntaje/vidas/nivel en vivo y el evento de fin de partida con las stats finales.
- `GamePlayer` (`components/game-player.tsx`) pasa a despachar por `game.id`: para `rocas`/`caida`/`bloque-buster` monta el `*Canvas` correspondiente dentro del `crt-screen` (en vez del `.game-arena` decorativo actual) y usa el puntaje/vidas/nivel reales recibidos por callback en vez del `setInterval` aleatorio; para los otros 5 juegos, comportamiento sin cambios.
- `GameOverModal` se extiende para aceptar, opcionalmente, un leaderboard propio del juego:
  - **Asteroids y Tetris** (ya tienen tabla de mejores puntajes con ingreso de nombre en la referencia): el modal muestra el top-N propio de ese juego (leído de su propio `localStorage`, mismas claves que la referencia) y permite guardar el nombre si el puntaje califica — igual que hacía la pantalla de game over de la referencia, pero con la estética neon/pixel de Arcade Vault en vez del CSS oscuro genérico original. **No** se llama a `addScore()`/`av_scores` para estos 3 juegos.
  - **Arkanoid** (no tiene leaderboard propio en la referencia): el modal solo muestra el puntaje y nivel final, sin tabla ni ingreso de nombre — igual que la pantalla de game over/victoria de la referencia.
  - Los 5 juegos simulados restantes conservan exactamente el flujo actual (nombre + "GUARDAR PUNTUACIÓN" → `addScore()`/`av_scores`).
- Helpers de leaderboard propio por juego, reutilizando las mismas claves de `localStorage` que ya usa cada referencia (para no perder los puntajes que el usuario ya haya guardado probando las referencias en el navegador):
  - Asteroids: `asteroids_leaderboard_v1`, `asteroids_player_name`.
  - Tetris: `tetris-highscores`, `tetris-best-stats`, `tetris-start-level`, `tetris-theme`, `tetris-skin`.
- Ajuste menor en `app/globals.css`: una regla de seguridad para que el `<canvas>` de cada juego nunca desborde el ancho del `crt-screen` en viewports angostos (`max-width: 100%; height: auto;`), sin rediseñar el layout del reproductor.

**Out of scope (for future specs):**

- Los otros 5 juegos del catálogo (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen simulados; no se tocan en esta spec.
- Controles táctiles/gestos nuevos para pantallas sin teclado/mouse. Se conservan exactamente los controles ya configurados en cada referencia (teclado en los 3 juegos, mouse además en Arkanoid); en un dispositivo sin teclado/mouse el juego no será jugable, lo cual queda documentado como limitación conocida.
- Conectar los puntajes de estos 3 juegos a `av_scores`, al detalle de juego (`app/games/[id]/page.tsx`) o al Salón de la Fama (`app/salon/page.tsx`). Hoy ambos usan datos 100% inventados (`seededScores`) para los 8 juegos del catálogo; esta spec no cambia esa parte. Una spec futura puede reemplazar `seededScores` por datos reales combinando `av_scores` y los leaderboards propios de cada juego.
- Rediseño responsive de los canvases (siguen con el tamaño fijo en píxeles de la referencia: Asteroids/Arkanoid 800×600, Tetris 300×600 + preview 120×120); solo se evita que desborden el contenedor en pantallas angostas.
- Sonido nuevo, música o un toggle de mute (Arkanoid conserva sus 2 efectos de sonido tal cual la referencia; Asteroids y Tetris no tienen sonido en la referencia y no se les agrega).
- Actualizar `app/data/games.ts` (título, `cover`, `best`, `plays`, descripción) para reflejar los juegos reales. Se deja como está.
- Actualizar `CLAUDE.md` con el nuevo estado implementado (se hace en un commit posterior, como en specs anteriores).
- Tests automatizados (no hay test runner configurado todavía).

## Data model

No hay tablas ni estructuras persistentes nuevas en Supabase/servidor. Se agregan tipos y helpers de cliente:

```ts
// components/games/shared/types.ts
export type GameOverResult = {
  score: number;
  level: number;
};

export type AsteroidsGameOverResult = GameOverResult & {
  asteroidsDestroyed: number;
  bestCombo: number;
};

export type TetrisGameOverResult = GameOverResult & {
  lines: number;
  bestCombo: number;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  [key: string]: unknown; // stats propias del juego (destroyed/combo, lines/combo, etc.)
};
```

```ts
// components/games/asteroids/leaderboard.ts
const LEADERBOARD_KEY = "asteroids_leaderboard_v1";
const PLAYER_NAME_KEY = "asteroids_player_name";

export function getAsteroidsLeaderboard(): LeaderboardEntry[];
export function addAsteroidsScore(
  name: string,
  result: AsteroidsGameOverResult,
): LeaderboardEntry[];
export function getSavedPlayerName(): string;
export function setSavedPlayerName(name: string): void;
```

```ts
// components/games/tetris/leaderboard.ts
const HIGHSCORES_KEY = "tetris-highscores";
const BEST_STATS_KEY = "tetris-best-stats";

export function getTetrisLeaderboard(): LeaderboardEntry[];
export function addTetrisScore(
  name: string,
  result: TetrisGameOverResult,
): LeaderboardEntry[];
export function getTetrisBestStats(): { bestCombo: number; bestLines: number };
```

Arkanoid no define un módulo de leaderboard (no tiene esa función en la referencia).

## Implementation plan

1. Crear `components/games/shared/types.ts` con los tipos de arriba, y extender `GameOverModal` en `components/game-player.tsx` para aceptar un `leaderboard` opcional (`{ entries: LeaderboardEntry[]; onSaveName: (name: string) => void }`): si viene, muestra el top-N con estética Arcade Vault y el campo de nombre; si no viene, muestra solo el puntaje final (comportamiento actual sin cambios para los 5 juegos simulados y para Arkanoid).
2. Portar Asteroids: crear `components/games/asteroids/engine.ts` (lógica del motor sin manipulación del DOM propia) y `components/games/asteroids/asteroids-canvas.tsx` (monta el canvas, listeners de teclado escopeados con cleanup, expone `GameCanvasProps`/`GameCanvasHandle`) y `components/games/asteroids/leaderboard.ts`. Conectar en `GamePlayer`: si `game.id === "rocas"`, montar `AsteroidsCanvas` en vez de `.game-arena`, alimentar el HUD con los callbacks y pasar el leaderboard de Asteroids al `GameOverModal`. Verificar manualmente que se puede jugar una partida completa (mover, disparar, perder las 3 vidas, guardar nombre en el top-N, "JUGAR DE NUEVO" reinicia el motor).
3. Portar Tetris: crear `components/games/tetris/engine.ts`, `components/games/tetris/tetris-canvas.tsx`, `components/games/tetris/next-piece-canvas.tsx`, `components/games/tetris/tetris.module.css` (variables de tema/skin escopeadas al contenedor, no a `:root`/`body`) y `components/games/tetris/leaderboard.ts`. Conectar en `GamePlayer` para `game.id === "caida"` igual que en el paso 2 (vidas siempre en 0/"—"). Verificar manualmente una partida completa (mover/rotar/soft drop/hard drop, limpiar líneas, subir de nivel, perder por top-out, selector de tema/skin funcionando, guardar nombre en el top-N).
4. Portar Arkanoid: copiar los assets binarios limpios a `public/games/arkanoid/` (paso previo descrito en Scope), crear `components/games/arkanoid/engine.ts` (motor + carga de spritesheet + sonidos apuntando a `/games/arkanoid/...`) y `components/games/arkanoid/arkanoid-canvas.tsx`. Conectar en `GamePlayer` para `game.id === "bloque-buster"` (sin leaderboard propio, según Scope). Verificar manualmente una partida completa (mover paleta con teclado y arrastre de mouse, romper bloques, subir de nivel, perder las 3 vidas, sonidos de rebote/rotura).
5. Agregar la regla de `max-width`/`height: auto` para `<canvas>` dentro de `.crt-screen` en `app/globals.css`. Probar los 3 juegos en el navegador en un viewport angosto (DevTools) para confirmar que no desbordan.
6. Verificación final cruzada: jugar los 3 juegos de punta a punta, confirmar que los otros 5 juegos del catálogo siguen funcionando exactamente igual que antes (reproductor simulado sin cambios), y correr `npm run lint` y `npm run build` sin errores nuevos introducidos por esta spec.

## Acceptance criteria

- [x] `/games/rocas/play` muestra el Asteroids real dentro del `crt-screen`: nave controlable, disparo, asteroides que se dividen al ser destruidos, power-ups y estrella fugaz presentes¹, 3 vidas con invencibilidad temporal.
- [x] `/games/caida/play` muestra el Tetris real: tablero 10×20, las 7 piezas², wall kicks, soft/hard drop, ghost piece, preview de siguiente pieza, niveles que suben cada 10 líneas, selector de tema claro/oscuro y de skin funcionando.
- [x] `/games/bloque-buster/play` muestra el Arkanoid real: paleta controlable con teclado y mouse, pelota, bloques con sprites, bloques indestructibles, explosiones animadas, sonidos de rebote/rotura, niveles hasta 15.
- [x] En los 3 juegos, el HUD de `GamePlayer` (Puntuación/Vidas/Nivel) refleja en vivo el estado real del motor, no valores simulados.
- [x] El botón PAUSA detiene el motor del juego (el estado no avanza mientras está en pausa) y REANUDAR lo continúa donde quedó.
- [x] Al terminar una partida de Asteroids o Tetris, el modal de fin de juego muestra el top-N propio de ese juego (leído de `localStorage`) y permite guardar el nombre; el puntaje **no** se guarda en `av_scores`.
- [x] Al terminar una partida de Arkanoid, el modal de fin de juego muestra el puntaje y nivel final, sin tabla de puntajes ni campo de nombre.
- [x] "JUGAR DE NUEVO" reinicia el motor del juego real a su estado inicial (no solo resetea el puntaje simulado).
- [x] "SALIR" desmonta el juego sin dejar listeners de teclado/mouse activos ni el loop de animación corriendo en segundo plano (verificable navegando a otra pantalla y confirmando que no hay errores ni consumo de CPU sostenido).
- [x] Los otros 5 juegos del catálogo (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen usando el reproductor simulado exactamente como antes de esta spec.
- [x] Ninguna variable CSS (`:root`) ni clase de `document.body` de los juegos portados afecta la apariencia del resto de la app (verificado navegando a otra pantalla después de jugar Tetris con el tema claro/skin alternativo activado).
- [x] Los canvases no desbordan el contenedor en un viewport angosto (probado en DevTools).
- [x] `npm run build` termina sin errores. `npm run lint` no introduce errores nuevos respecto al estado actual del repo (ver hallazgo preexistente de CRLF documentado en la spec 04).

**Notas de implementación (desviaciones documentadas y aprobadas explícitamente por el usuario durante la implementación):**

1. **Estrella fugaz (Asteroids):** no existe en `references/started_games/02-asteroids/game.js` — es copy desactualizado del `README.md` de esa referencia. Por decisión explícita del usuario ("lo que está en las funcionalidades de los juegos se conserva, no debes desarrollar nada"), no se implementó como funcionalidad nueva. El resto del criterio (nave, disparo, asteroides que se dividen, power-ups, 3 vidas con invencibilidad) está completo.
2. **Piezas de Tetris:** el motor porta el juego completo tal como está en `game.js`, que incluye más de las "7 piezas" resumidas en el Scope — también 3 pentominós, una pieza de recompensa y una pieza reto, además de 5 power-ups (bomba, rayo, tinte, gravedad, congelar) y sonido real (Web Audio API), pese a que el "Out of scope" de esta spec decía erróneamente que Tetris no tenía sonido. Se portó todo por la misma decisión explícita del usuario de preservar la funcionalidad real de la referencia.

Verificación final cruzada (2026-08-30): `npm run build` y `npm run lint` limpios (sin errores nuevos), los 8 juegos + las 8 fichas de detalle recorridos en una sesión de navegador sin un solo error de consola. Durante esta verificación se encontró y corrigió un bug de hydration mismatch en `TetrisCanvas` (el tema/skin se leían de `localStorage` en el `useState` inicial, divergiendo entre servidor y cliente); ahora se corrigen en un `useEffect` posterior a la hidratación.

## Decisions

- **Sí:** mapeo `rocas`↔Asteroids, `caida`↔Tetris, `bloque-buster`↔Arkanoid. Confirmado por el usuario, coincide temáticamente con la categoría y descripción ya existentes de cada entrada del catálogo.
- **Sí:** el motor de cada juego vive encapsulado en su propio `<canvas>` sin overlays propios en el DOM, y notifica a React (puntaje, vidas, nivel, fin de partida) para que el HUD y el modal de fin de juego de `GamePlayer` reaccionen. Decisión explícita del usuario ("debe notificar a react todo, el canvas notifica cuando se acaba el juego").
- **Sí:** los controles de cada juego (teclado/mouse) se conservan exactamente como en la referencia, sin agregar controles táctiles nuevos. El usuario corrigió explícitamente la propuesta inicial de diseñar botones/gestos táctiles: los 3 juegos "ya tienen controles configurados" y solo necesitan quedar correctamente escopeados a su propio canvas/componente (agregados al montar, removidos al desmontar), no rediseñados.
- **Sí:** el top-N de puntajes de Asteroids y Tetris se muestra en el `GameOverModal` de React (con estética Arcade Vault), leyendo/escribiendo las mismas claves de `localStorage` que ya usaba cada referencia, en vez de que el canvas dibuje su propio overlay de game over con tabla. Decisión explícita del usuario.
- **No:** no se llama a `addScore()`/`av_scores` para estos 3 juegos. Decisión explícita del usuario ("solo el leaderboard propio de cada juego"); hoy ningún leaderboard de la app lee `av_scores` de todas formas, así que no hay pérdida de funcionalidad visible.
- **Sí (interpretación a confirmar):** Arkanoid no obtiene una tabla de puntajes propia en el modal de fin de juego, porque la referencia tampoco la tiene — agregarle una sería "desarrollar funcionalidad nueva", que el usuario pidió explícitamente evitar al validar Arkanoid. El modal para Arkanoid solo muestra puntaje y nivel final.
- **Sí (interpretación a confirmar):** el selector de tema claro/oscuro y de skin de Tetris se conserva funcional ("los juegos se conservan tal cual"), pero se reubica del `index.html` original a un control pequeño en la pantalla de juego de React, aplicando la clase de tema/skin al contenedor del juego en vez de a `document.body` — necesario porque Arcade Vault es una SPA con una sola instancia de `<body>` compartida entre todas las rutas; mutar `body` directamente rompería la apariencia del resto de la app al salir del juego.
- **Sí:** CSS de cada juego portado como CSS Modules escopeados a un contenedor, sin redefinir `:root` ni tocar `document.body`. Verificado que Tetris redefine `--bg` en `:root` (colisiona con `app/globals.css`) y alterna `body.light-theme`; necesario evitarlo para no romper el resto de la app.
- **Sí:** se reutilizan las claves de `localStorage` exactas de cada referencia (`asteroids_leaderboard_v1`, `tetris-highscores`, etc.) en vez de inventar nombres nuevos, para no perder puntajes que el usuario ya haya guardado probando las referencias standalone en el mismo navegador.
- **No:** no se conecta esta spec al Salón de la Fama ni al detalle de juego — ambos siguen usando `seededScores` para los 8 juegos, incluidos estos 3. Queda para una spec futura.
- **No:** no se agregan controles táctiles/gestos nuevos, ni rediseño responsive de los canvases más allá de evitar que desborden el contenedor.

## Risks

| Risk                                                                                                                                                                                                                                                    | Mitigation                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portar ~2350 líneas de JS vanilla (924 + 1059 + 370) a componentes React "seguros de montar/desmontar" es un trabajo no trivial; pueden aparecer bugs sutiles (dobles listeners, loops que no se detienen, estado que no se resetea bien al reiniciar). | Verificación manual completa de cada juego (no solo un smoke test) en los pasos 2–4 del plan, incluyendo reinicio y salida repetidos antes de dar la spec por cerrada.                                                                 |
| Los canvases mantienen su tamaño fijo en píxeles (hasta 800×600); en viewports muy angostos pueden quedar ilegibles aunque no desborden.                                                                                                                | Aceptado como limitación conocida (fuera de alcance el rediseño responsive); documentado en "Out of scope".                                                                                                                            |
| Las políticas de autoplay del navegador pueden bloquear `Audio.play()` en Arkanoid si no hubo interacción previa del usuario.                                                                                                                           | Ya mitigado en la referencia con `.catch(() => {})` (falla silenciosa); se conserva igual.                                                                                                                                             |
| Reutilizar las claves de `localStorage` de la referencia asume que el usuario no necesita que los puntajes de sus pruebas standalone se mantengan separados de los de la app integrada.                                                                 | Aceptado explícitamente: es la misma clave, por lo que un puntaje guardado probando la carpeta `references/` aparecerá también en Arcade Vault y viceversa; si esto no es deseado, se puede prefijar la clave en una iteración futura. |

## What is **not** in this spec

- Los otros 5 juegos del catálogo (siguen simulados).
- Controles táctiles/gestos nuevos.
- Conectar `av_scores`, el detalle de juego o el Salón de la Fama a puntajes reales.
- Rediseño responsive de los canvases.
- Sonido/música nueva o toggle de mute.
- Actualizar `app/data/games.ts` o `CLAUDE.md`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
