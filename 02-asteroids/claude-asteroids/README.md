# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Demo:

[Asteroids demo](https://klerith.github.io/claude-asteroids/)

## Descripción del juego

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales, combos por rachas de destrucción, una tabla de récords local y niveles progresivos.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- **localStorage** — persistencia de la tabla de récords
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla       | Acción                                |
| ----------- | -------------------------------------- |
| `←` `→`     | Rotar nave                             |
| `↑`         | Propulsar                              |
| `Espacio`   | Disparar / iniciar / reiniciar partida |
| `P` `Esc`   | Pausar o reanudar                      |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Características

- Pantalla de inicio con selector de nivel inicial (1–20) antes de la primera partida.
- 3 vidas con invencibilidad temporal al reaparecer (parpadeo).
- Asteroides se parten en fragmentos más pequeños al ser destruidos; algunos grandes usan siluetas fijas en vez de polígonos aleatorios.
- Partículas de explosión al destruir asteroides.
- Niveles progresivos con más asteroides en cada uno.
- **Power-ups** (20% de probabilidad al destruir un asteroide, con tope escalado por nivel):
  - **Disparo triple** — dispara tres proyectiles a la vez.
  - **Escudo** — protege de una colisión.
  - **Cámara lenta** — ralentiza el juego temporalmente.
  - **Hiperpropulsión** — aumenta drásticamente aceleración y velocidad máxima.
  - **Bomba Nova** (un solo uso) — destruye instantáneamente todos los asteroides cercanos a la nave.
- **Combo**: destruir asteroides en una ventana de 1.5s encadena una racha (`COMBO xN`) mostrada en el HUD, junto con el mejor combo y el total de asteroides destruidos en la partida.
- **Tabla de récords** persistida en `localStorage` (top 5, con nombre, puntaje, nivel, destruidos y mejor combo).
- Menú de pausa con submenú de controles y opción de reiniciar sin salir de la partida.

Detalles de arquitectura e implementación en [CLAUDE.md](CLAUDE.md).
