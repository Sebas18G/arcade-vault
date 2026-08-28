# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

`04-arkanoid` es uno de los ejercicios del monorepo `claude-code-curses` (ver `../README.md`): un clon de Arkanoid en HTML, CSS y JavaScript vanilla, sin dependencias ni build. **Ya está implementado** (specs 01–03, ver `specs/`), siguiendo la misma convención sin build de los proyectos hermanos `02-asteroids` y `03-tetris`: todo el juego en unos pocos archivos planos (`index.html` + `style.css` + `game.js`), sin `package.json`, bundler ni transpilador.

## Flujo de trabajo: spec-driven

Este proyecto se construyó con el método spec-driven a través de dos skills instalados en `.agents/skills/` (con symlinks en `.claude/skills/`): `spec` y `spec-impl` (origen: `Klerith/fernando-skills`, ver `skills-lock.json`). El historial de incrementos está en `specs/` (`01-mvp-jugable.md`, `02-animacion-explosion-bloques.md`, `03-sonidos-y-niveles.md`, todas en estado `implementado`). **Para cualquier funcionalidad nueva, sigue usando este flujo** en vez de editar `game.js` directamente:

- **`/spec <descripción>`** — diseña una spec de forma guiada: hace preguntas de clarificación por bloques y solo al final escribe `specs/NN-slug.md` en estado `Draft`. No escribe código.
- **`/spec-impl <NN-slug>`** — solo funciona si la spec está en estado `Approved` (o equivalente). Crea la rama `spec-NN-slug`, muestra el resumen de la spec y luego implementa el plan paso a paso, pausando tras cada paso para revisión. Nunca commitea automáticamente.

Los detalles completos del comportamiento de cada fase están en `.agents/skills/spec/SKILL.md` y `.agents/skills/spec-impl/SKILL.md` — léelos si vas a ejecutar estos flujos, no los repitas de memoria. El branching está controlado por `specs/.spec-config.yml` (`AutoCreateBranch: true`).

## Arquitectura

Todo el estado y la lógica del juego están en `game.js` (objeto global `state` con `screen`, `lives`, `score`, `level`, `paddle`, `ball`, `blocks`, `explosions` — no hay clases ni módulos). `index.html` define el `<canvas id="game">` de 800×600 y carga `assets/spritesheet.js` antes que `game.js`; `style.css` aporta el marco/bezel arcade alrededor del canvas.

Puntos clave del modelo, todos en `game.js`:

- **Estado del juego**: `state.screen` con valores `'playing' | 'gameover' | 'victory' | 'levelcomplete'`. No hay pantalla de inicio ni pausa — el juego arranca directamente en `'playing'` al cargar el spritesheet (`loadSpritesheet(() => requestAnimationFrame(loop))`).
- **Input**: un listener `keydown`/`keyup` en `window` para el paddle (`ArrowLeft/Right`, `A`/`D`) más un listener `mousemove` en el canvas que también mueve el paddle (`clampPaddleX`) — ambos métodos conviven, no hay modo exclusivo. `Enter`/`Espacio` reinician la partida (`resetGame()`) en `'gameover'`/`'victory'`, o avanzan de nivel (`advanceLevel()`) en `'levelcomplete'`.
- **Niveles**: `MAX_LEVEL = 15`. Tres fórmulas puramente derivadas de `state.level`, sin tabla de configuración por nivel:
  - `rowsForLevel(level)` — filas de bloques, de 6 a 10, `+1` cada 3 niveles.
  - `speedMultiplierForLevel(level)` — multiplicador de `vx`/`vy` inicial de la pelota, `1 + 0.08 * (level - 1)`, sin tope.
  - `indestructibleCountForLevel(level)` — cantidad de bloques irrompibles, `min(level - 1, 8)`.
  - `generateBlocks(level)` arma la cuadrícula (10 columnas fijas × `rowsForLevel(level)` filas) con color cíclico por fila (`BLOCK_COLORS[row % 6]`) y luego elige al azar qué celdas se vuelven irrompibles (textura aleatoria de `INDESTRUCTIBLE_TEXTURES`).
- **Colisiones**: `collidesWithRect(ball, rect)` es la única función de colisión círculo-rectángulo, usada para paddle y bloques. `bounceOffBlock` decide el eje de rebote comparando los cuatro solapamientos (izquierda/derecha/arriba/abajo) y rebota el eje del menor solapamiento. `checkBlockCollisions()` recorre `state.blocks` y hace `break` en el primer bloque vivo que colisiona (un solo bloque por frame).
- **Explosiones**: al romper un bloque rompible se empuja un objeto a `state.explosions` con `startTime`; `updateExplosions()` filtra por `EXPLOSION_DURATION` (150ms, definido en `assets/spritesheet.js`) y dibuja 4 frames por color (`EXPLOSION_FRAMES`). Cuando se rompe el último bloque rompible del nivel, no se cambia `state.screen` directamente — se marca `pendingVictory`/`pendingLevelComplete` y `updateExplosions()` solo transiciona la pantalla cuando ya no quedan explosiones activas, para que la animación del último bloque termine de reproducirse antes de mostrar la pantalla de fin.
- **Sonido**: `playSound(name)` crea un `new Audio(SOUNDS[name])` en cada llamada (sin pool ni reutilización) y lo reproduce con `.play().catch(() => {})` para ignorar el bloqueo de autoplay del navegador. `bounce` suena en toda colisión (paredes, paddle, cualquier bloque); `break` solo al romper un bloque rompible.
- **Game loop** (`loop`): basado en `requestAnimationFrame`; solo llama a `updatePaddle`/`updateBall`/`updateExplosions` cuando `state.screen === 'playing'`, pero siempre llama a `draw()` y se relanza a sí mismo incondicionalmente (incluso en las pantallas de fin, para que el overlay se siga dibujando).

Si se ajustan `BLOCK_W`, `BLOCK_H`, `BLOCK_GAP`, `BLOCK_MARGIN_X`/`BLOCK_MARGIN_TOP` o `GRID_COLS` en `game.js`, revisa que la cuadrícula siga cabiendo en el `<canvas id="game">` de 800×600 definido en `index.html`.

## Assets disponibles

`assets/` contiene los recursos del juego, ya copiados a la ubicación que usa el juego en ejecución (`assets/spritesheet-breakout.png`, `assets/spritesheet.js`, `assets/sounds/*.mp3`), más una copia original duplicada en `assets/assets/` y basura de macOS en `assets/__MACOSX/` y `.DS_Store` — resultado de extraer un zip que ya traía una carpeta `assets` adentro. `assets/assets/` y `assets/__MACOSX/` no son parte del juego, no se referencian desde ningún código y pueden limpiarse con seguridad si se decide hacerlo en una spec futura.

- `spritesheet-breakout.png` — hoja de sprites del juego (paddle, pelota, bloques de colores, texturas irrompibles, frames de explosión).
- `spritesheet.js` — helper de carga y dibujo (`loadSpritesheet`, `drawSprite`, `drawFrame`) con las coordenadas mapeadas en `SPRITES` (`paddle`, `ball`, `blocks.<color>` para `red|yellow|cyan|magenta|hotpink|green`, `indestructible.<textura>` para `wood|brick_red|stone|brick_dark`) y `EXPLOSION_FRAMES` (4 frames por color, `EXPLOSION_DURATION = 150`ms). `drawSprite(ctx, name, x, y, w, h)` acepta nombres directos (`'paddle'`, `'ball'`) o prefijados (`'block_<color>'`, `'indestructible_<textura>'`).
- `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3` — efectos de sonido, referenciados desde `game.js` vía `SOUNDS`.

`spritesheet.js` carga la imagen con la ruta relativa fija `'assets/spritesheet-breakout.png'`, que resuelve correctamente porque `index.html` vive en la raíz de `04-arkanoid/` y el archivo está en `04-arkanoid/assets/`.

## Cómo ejecutar

Sin build. Basta con abrir `index.html` en el navegador o servirlo con un servidor estático, igual que el resto del monorepo:

```bash
python3 -m http.server 8000
# o, desde la raíz del monorepo
npx serve .
```

No hay tests automatizados, linter ni scripts de build configurados — ni en este proyecto ni en el resto del repositorio.
