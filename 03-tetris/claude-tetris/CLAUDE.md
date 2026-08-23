# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Implementación de Tetris en JavaScript vanilla, HTML5 Canvas y CSS. Sin dependencias, sin `package.json`, sin bundler ni transpilador — todo el juego vive en tres archivos.

## Cómo ejecutar

No hay build. Basta con abrir `index.html` directamente en el navegador, o servirlo con cualquier servidor estático:

```bash
python3 -m http.server 8000
# o
npx serve .
```

No existen tests, linter ni scripts de build configurados en este repo.

## Arquitectura

Todo el estado y la lógica del juego están en `game.js` (variables globales `board`, `current`, `next`, `score`, `lines`, `level`, etc. — no hay clases ni módulos). `index.html` solo define el DOM (canvas del tablero, canvas de "next", panel HUD, overlay) y `style.css` el tema visual dark/retro.

Puntos clave del modelo, todos en `game.js`:

- **Tablero**: matriz `ROWS × COLS` (20×10) donde cada celda es `0` (vacía) o un índice 1–7 que indexa en `COLORS`/`PIECES` (identifica tanto el color como el tipo de pieza fija).
- **Piezas**: matrices cuadradas fijas en `PIECES`. La rotación (`rotateCW`) se calcula por transposición, no hay tablas de rotación por pieza (tipo SRS).
- **Wall kicks** (`tryRotate`): tras rotar, prueba desplazamientos `[0, -1, 1, -2, 2]` en X hasta encontrar una posición sin colisión; es un sistema simplificado, no el SRS estándar.
- **Colisión** (`collide`): única función que valida límites del tablero y solapamiento con bloques fijados; toda la lógica de movimiento pasa por aquí.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula delta de tiempo (`dropAccum`) contra `dropInterval` para decidir cuándo baja la pieza una fila.
- **Fijado de pieza** (`lockPiece`): `merge()` (vuelca la pieza actual al tablero) → `clearLines()` (recorre de abajo hacia arriba, eliminando y reinsertando filas vacías arriba) → `spawn()` (promueve `next` a `current` y genera nueva `next`; si la nueva pieza colisiona al aparecer, dispara `endGame()`).
- **Puntuación/nivel**: tabla `LINE_SCORES = [0, 100, 300, 500, 800]` multiplicada por nivel; nivel sube cada 10 líneas (`Math.floor(lines / 10) + 1`); velocidad de caída = `max(100, 1000 - (level-1)*90)` ms.
- **Ghost piece**: `ghostY()` proyecta hacia abajo la posición final de la pieza actual; se dibuja con `globalAlpha = 0.2` antes de la pieza real en `draw()`.
- Un único listener `keydown` en `document` maneja todos los controles (flechas, `X` para rotar, `Space` para hard drop, `P` para pausa); se ignoran inputs si `paused` o `gameOver` están activos.

Si se ajustan `COLS`, `ROWS` o `BLOCK` en `game.js`, hay que actualizar también `width`/`height` del `<canvas id="board">` en `index.html` para que coincidan (`COLS × BLOCK`, `ROWS × BLOCK`).
