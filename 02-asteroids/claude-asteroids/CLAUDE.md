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
- **Power-ups**: clase `PowerUp` (game.js:297-341), tipos `triple`/`shield`/`slowmo` con 20% de probabilidad al destruir un asteroide (`POWERUP_CHANCE`), garantizados como máximo una vez por nivel (`powerupSpawnedThisLevel`); si el nivel se limpia sin que haya salido ninguno, se fuerza en la posición del último asteroide destruido (game.js:461-464).
- **Colisiones**: todas por distancia euclidiana simple (`dist(a, b) < radioA + radioB`), evaluadas en `update()` (bala-asteroide, nave-asteroide, nave-power-up); no hay broad-phase ni quadtree.
- **Game loop** (`loop`, game.js final): basado en `requestAnimationFrame`, calcula `dt` en segundos con clamp a 0.05s para evitar saltos grandes si la pestaña pierde foco. Llama a `update(dt)` y `draw()` en cada frame, y se relanza a sí mismo incondicionalmente (incluso en `'gameover'` y en pausa) para que las partículas/overlays sigan animándose y la tecla de reinicio/pausa se siga leyendo.

## Pausa

- Variable `paused` (game.js:349, independiente de `state`).
- `togglePause()` alterna `paused` y sincroniza el overlay DOM (`overlay.classList.toggle('hidden', !paused)`); no hace nada si `state === 'gameover'` (para que `Espacio` reinicie sin interferencias, y para que el overlay de pausa nunca compita con la pantalla de "GAME OVER").
- Se detecta con `pressed('KeyP')` al principio de `update(dt)`, seguido de `if (paused) return;` — esto congela nave, asteroides, balas, partículas y power-ups (no se llama a ningún `.update()`), pero el `requestAnimationFrame` global sigue corriendo para poder seguir leyendo la tecla `P` mientras el overlay está abierto.
- El overlay `#overlay` (en `index.html`, junto al canvas dentro de `.board-wrap`) tiene dos botones: `#continue-btn` (llama a `togglePause()` si `paused` es `true`) y `#restart-btn` (pone `paused = false`, oculta el overlay y llama a `initGame()`). A diferencia de Tetris, este overlay se usa **solo** para pausa — la pantalla de "GAME OVER" sigue siendo puramente canvas (`drawOverlay`, dibujada en `draw()`) con reinicio por `Espacio`, sin botones.
- Si se cambian `W`/`H` en `game.js`, hay que actualizar también `width`/`height` del `<canvas id="canvas">` en `index.html` para que el overlay (que usa `position: absolute; inset: 0` dentro de `.board-wrap`) siga cubriendo exactamente el área del canvas.
