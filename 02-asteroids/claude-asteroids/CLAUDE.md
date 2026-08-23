# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Clon de Asteroids en JavaScript vanilla y HTML5 Canvas. Sin dependencias, sin `package.json`, sin bundler ni transpilador — todo el juego vive en `game.js`, con estilos inline en `index.html`.

## Cómo ejecutar

No hay build. Basta con abrir `index.html` directamente en el navegador, o servirlo con cualquier servidor estático:

```bash
python3 -m http.server 8000
# o
npx serve .
```

No existen tests, linter ni scripts de build configurados en este repo.

## Arquitectura

Todo el estado y la lógica del juego están en `game.js` (variables globales `ship`, `bullets`, `asteroids`, `particles`, `powerups`, `score`, `lives`, `level`, `state`, etc. — no hay módulos). `index.html` define el `<canvas id="canvas">`, estilos básicos de centrado/fondo, y un overlay DOM (`#overlay`) con botones, usado únicamente para la pausa. El HUD y la pantalla de "GAME OVER" siguen dibujándose directamente sobre el canvas (`drawHUD`, `drawOverlay`) — no tienen equivalente en el DOM.

Puntos clave del modelo, todos en `game.js`:

- **Input**: patrón `keys{}` (estado continuo, para movimiento) + `justPressed{}` / `pressed(code)` (edge-triggered, para acciones puntuales tipo disparo o pausa), poblado por un único listener `keydown`/`keyup` en `window` (game.js:12-24). `pressed(code)` consume el flag al leerlo, así que solo debe llamarse una vez por frame por tecla.
- **Espacio toroidal**: la nave, asteroides y balas envuelven los bordes del canvas vía `wrap(v, max)` (game.js:27).
- **Estado del juego**: variable `state` con valores `'playing' | 'dead' | 'gameover'` (game.js:346). `'dead'` es el intervalo breve (`deadTimer`) tras perder una vida, antes de reaparecer con invencibilidad temporal (`ship.invincible`). `initGame()` resetea todo; `nextLevel()` se dispara cuando `asteroids.length === 0`.
- **Asteroides**: clase `Asteroid` (game.js:82-141) con tamaño 1-3 (`RADII`/`SPEEDS`/`POINTS` indexados por tamaño); al ser destruido, `split()` genera dos asteroides del tamaño inferior (excepto tamaño 1, que desaparece). Los asteroides grandes tienen 50% de probabilidad de usar una silueta fija de `ASTEROID_SHAPES` en vez de un polígono irregular aleatorio.
- **Power-ups**: clase `PowerUp`, tipos `triple`/`shield`/`slowmo`/`nova`/`hyper` (definidos en `POWERUP_STYLES`, cada uno con su `shape` de dibujo — diamante o hexágono) con 20% de probabilidad al destruir un asteroide (`POWERUP_CHANCE`). El tope de power-ups por nivel ya no es fijo: `maxPowerupsThisLevel` (`computeMaxPowerups`) escala con la dificultad (1 + nivel/3, hasta 5), y `powerupsSpawnedThisLevel` lleva la cuenta de cuántos han salido; si el nivel se limpia sin que haya salido ninguno, se fuerza uno en la posición del último asteroide destruido. El tipo se sortea de forma uniforme entre los cinco (`randomPowerUpType`). `nova` (Bomba Nova) es de un solo uso: al recogerla, `triggerNovaBomb()` destruye instantáneamente (sin fragmentarlos vía `split()`) los asteroides dentro de `NOVA_BLAST_RADIUS` (420px) alrededor de la nave, y dispara una onda expansiva visual (`novaFlash`/`novaOrigin`, dibujada en `draw()`) del mismo radio, así el efecto visual coincide con el radio real de destrucción; usa además un `grabRadius` ampliado porque su radio visual es menor que el radio de colisión letal de un asteroide grande cercano. `hyper` (hiperpropulsión) multiplica el `THRUST` y reduce el `DRAG` de la nave durante `ship.hyperTimer` (~8s), aumentando drásticamente aceleración y velocidad máxima. Los demás tipos (`triple`/`shield`/`slowmo`) activan temporizadores en la nave (`ship.tripleShotTimer`/`shieldTimer`/`slowMoTimer`). Visualmente, cada tipo puede parpadear (`style.blink`) — `nova` usa hexágono parpadeante para diferenciarse del resto sin romper la estética wireframe.
- **Colisiones**: todas por distancia euclidiana simple (`dist(a, b) < radioA + radioB`), evaluadas en `update()` (bala-asteroide, nave-asteroide, nave-power-up); no hay broad-phase ni quadtree.
- **Game loop** (`loop`, game.js final): basado en `requestAnimationFrame`, calcula `dt` en segundos con clamp a 0.05s para evitar saltos grandes si la pestaña pierde foco. Llama a `update(dt)` y `draw()` en cada frame, y se relanza a sí mismo incondicionalmente (incluso en `'gameover'` y en pausa) para que las partículas/overlays sigan animándose y la tecla de reinicio/pausa se siga leyendo.

## Pausa

- Variable `paused` (game.js, independiente de `state`).
- `togglePause()` alterna `paused` y sincroniza el overlay DOM (`overlay.classList.toggle('hidden', !paused)`); no hace nada si `state === 'gameover'` (para que `Espacio` reinicie sin interferencias, y para que el overlay de pausa nunca compita con la pantalla de "GAME OVER"). Al pausar, siempre fuerza la vista principal del menú (`showPauseMain()`), así que si el jugador cerró el menú estando en "Ver controles" la próxima vez que pausa vuelve a ver primero el menú principal.
- Se detecta con `pressed('KeyP') || pressed('Escape')` al principio de `update(dt)`, seguido de `if (paused) return;` — esto congela nave, asteroides, balas, partículas y power-ups (no se llama a ningún `.update()`), pero el `requestAnimationFrame` global sigue corriendo para poder seguir leyendo `P`/`Escape` mientras el overlay está abierto.
- **Bloqueo de inputs durante la pausa**: el listener `keydown` (game.js:23) descarta cualquier tecla que no sea `KeyP`/`Escape` mientras `paused` es `true` (no llega a poblar `keys{}`/`justPressed{}`), así que mover/disparar queda inhabilitado por completo mientras el overlay está abierto. Además, `clearInputState()` limpia `keys{}` y `justPressed{}` cada vez que se sale del menú (al reanudar en `togglePause()` o al reiniciar), para que una tecla que haya quedado "pegada" (p. ej. `ArrowUp` mantenida al pausar) no mueva/dispare la nave apenas se vuelve al juego.
- El overlay `#overlay` (en `index.html`, junto al canvas dentro de `.board-wrap`) tiene dos vistas internas, alternadas con la clase `.hidden`:
  - `#pause-main` (vista por defecto): título "PAUSA", botones `#resume-btn` (llama a `togglePause()` si `paused` es `true`), `#restart-btn` (pone `paused = false`, oculta el overlay, limpia inputs y llama a `initGame()`) y `#controls-btn` (muestra `#pause-controls` vía `showPauseControls()`); además el selector de nivel inicial (`#level-dec`/`#level-inc`/`#level-value`, ver abajo).
  - `#pause-controls`: lista estática de teclas (`.controls-list`) y un botón `#back-btn` que vuelve a `#pause-main` vía `showPauseMain()` sin cerrar la pausa.
  A diferencia de Tetris, este overlay se usa **solo** para pausa — la pantalla de "GAME OVER" sigue siendo puramente canvas (`drawOverlay`, dibujada en `draw()`) con reinicio por `Espacio`, sin botones.
- **Nivel inicial**: variable `selectedStartLevel` (rango `MIN_START_LEVEL`–`MAX_START_LEVEL`, 1–20), ajustable con los botones `#level-dec`/`#level-inc` (`changeStartLevel(delta)`, que clampa y refresca `#level-value` vía `updateLevelSelectUI()`). No afecta la partida en curso — solo se lee en `initGame()` (`level = selectedStartLevel; spawnAsteroids(3 + level);`, misma fórmula que usa `nextLevel()` para escalar la cantidad de asteroides), por lo que aplica a la próxima vez que se llame `initGame()` (botón "Reiniciar" o `Espacio` tras un "GAME OVER").
- Si se cambian `W`/`H` en `game.js`, hay que actualizar también `width`/`height` del `<canvas id="canvas">` en `index.html` para que el overlay (que usa `position: absolute; inset: 0` dentro de `.board-wrap`) siga cubriendo exactamente el área del canvas.
