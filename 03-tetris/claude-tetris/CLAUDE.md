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

## Power-ups

Piezas especiales de 1 bloque (tipos 13–17, análogas a `SINGLE`/`REWARD_TYPE`) que aparecen tras cierto número de líneas eliminadas y disparan un efecto sobre el tablero al fijarse (`applyPowerUpEffect`, llamada desde `lockPiece` justo después de `merge`, antes de `clearLines`):

- **Bomba** (`BOMB_TYPE`, 13): destruye el área 3×3 centrada en su celda (`effectBomb`).
- **Rayo** (`LIGHTNING_TYPE`, 14): limpia la fila y la columna completas donde cae (`effectLightning`).
- **Tinte** (`DYE_TYPE`, 15): elige al azar un color presente en el tablero y elimina todos sus bloques, luego compacta (`effectDye` + `applyGravityCompact`).
- **Gravedad** (`GRAVITY_TYPE`, 16): compacta huecos de cada columna hacia abajo (`applyGravityCompact`).
- **Congelar** (`FREEZE_TYPE`, 17): detiene la caída automática 5s (`freezeRemaining`, consumido en `loop` como delta de tiempo — no como timestamp absoluto, para que la pausa manual con `P` no lo afecte); el jugador conserva movimiento/rotación/hard-drop.

La celda de la propia pieza especial siempre se limpia (`clearCell(cy, cx)` al inicio de `applyPowerUpEffect`) para que ningún power-up deje un bloque permanente como si fuera una pieza normal.

Frecuencia y elección: `linesSincePowerUp` acumula líneas eliminadas; al alcanzar `powerUpThreshold` (recalculado con `rollPowerUpThreshold(level)`, más frecuente a mayor nivel) se sobreescribe `next` con un power-up elegido al azar sin repetir el último (`pickPowerUpType`). Si el mismo clear es un Tetris (4 líneas), tiene prioridad la pieza `REWARD_TYPE` y el contador de power-up no se resetea (se evalúa en el siguiente clear). Los tipos de power-up quedan fuera de `SPAWN_WEIGHTS`, igual que `REWARD_TYPE`, por lo que nunca salen del sorteo normal de piezas.
