# Arkanoid

Clon del clásico **Arkanoid / Breakout** implementado en canvas HTML5 puro, sin dependencias ni bundler. Construido con un flujo spec-driven: cada incremento de funcionalidad vive documentado en [`specs/`](specs/).

## Descripción del juego

Paddle y pelota en un campo de bloques. Rompe todos los bloques rompibles de cada nivel para avanzar; algunos bloques son irrompibles y solo sirven de obstáculo. Hay 15 niveles con dificultad creciente: más filas de bloques, pelota más rápida y más bloques irrompibles.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D con spritesheet
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- **Web Audio (`<audio>`)** — efectos de sonido de rebote y rotura
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla / entrada     | Acción                                  |
| -------------------- | ---------------------------------------- |
| `←` / `A`             | Mover el paddle a la izquierda           |
| `→` / `D`             | Mover el paddle a la derecha             |
| Mouse                 | Mover el paddle (funciona junto al teclado) |
| `Enter` / `Espacio`   | Reiniciar (Game Over/Victoria) o avanzar de nivel (Nivel completado) |

## Puntuación

Cada bloque rompible destruido suma **10 puntos**. Los bloques irrompibles no otorgan puntaje.

## Características

- Paddle controlado por teclado y mouse de forma simultánea.
- Pelota que rebota en paredes, paddle y bloques, con sonido de rebote (`ball-bounce.mp3`) en cada colisión y sonido de rotura (`break-sound.mp3`) al destruir un bloque.
- Animación de explosión de 4 frames al romper un bloque, sin afectar la física de la pelota.
- **15 niveles** (`MAX_LEVEL`), calculados por fórmula a partir del nivel actual:
  - Filas de bloques: de 6 hasta 10, creciendo cada 3 niveles.
  - Velocidad de la pelota: aumenta un 8% por nivel.
  - Bloques irrompibles: de 0 en el nivel 1 hasta 8 en niveles avanzados, con 4 texturas distintas (madera, ladrillo rojo, piedra, ladrillo oscuro).
  - Cada fila de bloques rompibles tiene un color propio, asignado cíclicamente entre 6 colores.
- Sistema de 3 vidas: al perder una vida se reinicia la posición de la pelota y el paddle, conservando el progreso de bloques rotos.
- Pantallas de "Nivel completado" (avanza conservando vidas y puntaje), Game Over y Victoria (al limpiar el nivel 15).
- HUD con puntaje, nivel actual (`X / 15`) y vidas.

Detalles de arquitectura, del flujo spec-driven y de los assets del juego en [CLAUDE.md](CLAUDE.md).
