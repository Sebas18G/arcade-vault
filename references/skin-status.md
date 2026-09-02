# Bitácora de skins — Arcade Vault

Este archivo es la **memoria persistente del agente `skin-designer`** (`.claude/agents/skin-designer.md`). El agente arranca en frío en cada sesión: sin este archivo volvería a auditar todo desde cero y a repetir decisiones de paleta ya tomadas. Lo lee antes que nada y lo actualiza al terminar.

**Alcance cerrado:** solo los juegos marcados `Implementado` en `references/game-suggestion-todo.md`. Los candidatos, los aceptados y los 5 juegos simulados del catálogo (sin motor de canvas) quedan fuera.

Un juego **cumple** si tiene las tres cosas: `skins.ts` con las 3 paletas, `setSkin()` en su `engine.ts`, y prop `skin` en su `<id>-canvas.tsx` propagada al motor.

## Estados

| Estado         | Significado                                                                              |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Cumple**     | Tiene las 3 skins obligatorias (`classic`, `retro`, `neon`) cableadas de punta a punta.  |
| **Pendiente**  | Le falta al menos una de las tres piezas.                                                |
| **Exento**     | Fuera de la regla por decisión explícita, con razón registrada.                          |

---

## Índice

| Juego     | id          | Estado    | Skins presentes                    | Fecha      |
| --------- | ----------- | --------- | ---------------------------------- | ---------- |
| ASTEROIDS | `asteroids` | Cumple    | classic, retro, neon               | 2026-09-01 |
| TETRIS    | `tetris`    | Exento    | retro, neon, pastel, pixel         | 2026-09-01 |
| ARKANOID  | `arkanoid`  | Pendiente | ninguna                            | 2026-09-01 |
| SNAKE     | `snake`     | Pendiente | ninguna                            | 2026-09-01 |

> **Corrida 1 (2026-09-01):** primera auditoría. No existía este archivo, así que se auditó el catálogo entero desde el código. Estado de partida: solo Tetris tenía skins; `asteroids`, `arkanoid` y `snake` no tenían ni `skins.ts` ni `setSkin()` ni prop `skin`. Juego intervenido: **`asteroids`**, elegido por pedido explícito del humano. En esta corrida también se creó el **contrato compartido** (`components/games/shared/skins.ts`) y se generalizó el control "SKIN" del HUD en `components/game-player.tsx`, que hasta ahora estaba gateado por `isTetris`.

---

## Fichas

### Asteroids (`asteroids`)

**Estado:** Cumple · **Fecha:** 2026-09-01 · **Skins:** classic, retro, neon

**Paleta classic:** extraída literal de los 18 literales del motor original, sin alterar un solo valor — fondo `#000`; nave, asteroides, balas, iconos de vida y HUD en `#fff`; llama `rgba(255, 130, 0, 0.85)`; llama de hiperpropulsión `rgba(170, 90, 255, 0.9)`; escudo `rgba(80, 200, 255, α)`; partículas `rgba(255,255,255,α)`; power-ups `#0ff` / `#5c8` / `#fc5` / `#ff5252` / `#a5f`; onda nova `rgba(255, 82, 82, α)`; HUD atenuado `rgba(255,255,255,0.6)`; combo `#ff9d3f`. Es el control de regresión: con `classic` el juego se ve idéntico a antes del cambio.

**Paleta retro:** fósforo CRT cálido, sin un solo azul. Fondo casi negro tibio `#0a0704`; nave y vidas en blanco hueso `#fff4d6` (el elemento más luminoso de la pantalla, para que el jugador nunca se pierda); asteroides en ámbar `#ffb02e`; balas `#fff9e6`; llama ámbar `rgba(255, 176, 46, 0.9)`; hiperpropulsión y escudo en verde fósforo `#7dff86` / `125, 255, 134`; partículas `255,200,120`; power-ups `#ffd447` (triple) / `#7dff86` (escudo) / `#ff8a3d` (slow-mo) / `#ff5b3d` (nova) / `#c9ff5e` (hiper); HUD ámbar `#ffcf70` y combo en verde para que destaque contra el resto del HUD.

**Paleta neon:** la paleta de la plataforma (`app/globals.css`) reforzada con `shadowBlur` (`glow: 10`, escalado por elemento). Fondo `#0a0a0f` (el `--bg` de la app, para no pelear con el marco CRT); nave cian `#00f5ff`; asteroides magenta `#ff006e`; balas amarillo `#f5ff00`; escudo verde `0, 255, 136`; llama amarilla y llama de hiperpropulsión magenta; power-ups `#00f5ff` / `#00ff88` / `#f5ff00` / `#ff4d4d` (nova) / `#c77dff` (hiper); HUD `#e6e9ff` (`--ink`) sin brillo, para que el texto siga siendo legible.

**Archivos tocados:** `components/games/asteroids/{skins.ts, engine.ts, asteroids-canvas.tsx, leaderboard.ts}` · `components/games/shared/{skins.ts, types.ts}` · `components/game-player.tsx` · `components/games/tetris/tetris-canvas.tsx` (solo un `Omit` de tipos, ver notas)

**Notas de contraste y decisiones:**

- Ningún elemento jugable es más oscuro que el fondo `#0a0a0f` en ninguna de las 3 skins, y no se usan grises medios en ninguna.
- Nave vs asteroides nunca se distinguen solo por tono: en `retro` la nave es blanco hueso (luminancia muy alta) contra ámbar; en `neon` es cian contra magenta (cian bastante más luminoso). En las tres, además, la forma difiere (triángulo vs polígono irregular).
- En `neon` la bomba nova usa `#ff4d4d` en vez del magenta de la plataforma, precisamente para no confundirse con los asteroides magenta; conserva su parpadeo, su hexágono y su etiqueta "NOVA".
- El brillo se aplica solo a los elementos de juego (nave, llama, escudo, asteroides, balas, power-ups, onda nova) y **nunca al texto del HUD**, que se volvería ilegible. `shadowBlur` se resetea a 0 tras cada elemento (vía `clearGlow()` o el `ctx.restore()` que ya existía).
- El motor sigue sin tocar `document`, `window` ni `localStorage`: la paleta entra solo por `setSkin()`.
- Los colores con alpha dinámico (escudo, partículas, onda nova) se guardan en la paleta como componentes `"r, g, b"` en vez de color completo, para reconstruir el `rgba()` exacto y no cambiar el aspecto de `classic` usando `globalAlpha`.
- `AsteroidsPowerUpType` se movió a `skins.ts` para que la paleta pueda tiparlo sin ciclo de imports; `POWERUP_STYLES` conserva forma, etiqueta, parpadeo y radio de recogida, y perdió solo el campo `color`.
- **Duda abierta:** `retro` y `neon` cambian el color del fondo que el motor pinta (`#0a0704` y `#0a0a0f` en vez de `#000`). Es un cambio casi imperceptible bajo el marco CRT, elegido para que el fondo no compita con la viñeta de `.crt-screen`; si se prefiere negro puro en las tres, es un solo campo por paleta.

### Tetris (`tetris`)

**Estado:** Exento · **Fecha:** 2026-09-01 · **Skins:** retro, neon, pastel, pixel

**Razón de la exención:** ya tiene 4 skins propias en `components/games/tetris/engine.ts` (`TetrisSkin`), donde `retro` cumple el papel de clásico y `neon` ya existe con el brillo `shadowBlur` que sirvió de precedente para el resto del catálogo. No se toca salvo orden explícita, y sus skins `pastel` y `pixel` no se eliminan nunca.

**Único cambio recibido (2026-09-01):** `components/games/tetris/tetris-canvas.tsx` pasó de `GameCanvasProps<TetrisGameOverResult> & { skin: TetrisSkin }` a `Omit<GameCanvasProps<...>, "skin"> & { skin: TetrisSkin }`. Es solo un ajuste de tipos: al ganar `GameCanvasProps` el campo `skin?: GameSkin`, la intersección colapsaba `TetrisSkin` a `"retro" | "neon"` y rompía la compilación. Cero cambios de lógica, de paletas o de aspecto.

**Persistencia verificada:** su `SKIN_KEY` es `"tetris-skin"`, que coincide exactamente con la clave genérica `"<gameId>-skin"` del registro nuevo del HUD, así que la preferencia guardada de sus jugadores sobrevive. El botón "TEMA" sigue siendo exclusivo suyo.

### Arkanoid (`arkanoid`)

**Estado:** Pendiente · **Fecha:** 2026-09-01 · **Skins:** ninguna

**Situación:** `components/games/arkanoid/` tiene solo `engine.ts`, `arkanoid-canvas.tsx` y `leaderboard.ts`. Sin `skins.ts`, sin `setSkin()`, sin prop `skin`. No figura en el registro `SKINS_BY_GAME` de `components/game-player.tsx`, así que su HUD todavía no muestra el botón "SKIN" (correcto: no tendría efecto). Candidato para la próxima corrida.

### Snake (`snake`)

**Estado:** Pendiente · **Fecha:** 2026-09-01 · **Skins:** ninguna

**Situación:** `components/games/snake/` tiene `engine.ts`, `snake-canvas.tsx`, `leaderboard.ts` y `sprite-atlas.ts`. Sin `skins.ts`, sin `setSkin()`, sin prop `skin`. Tampoco figura en `SKINS_BY_GAME`. **Aviso para la próxima corrida:** es el único juego del catálogo con sprite-atlas (`sprite-atlas.ts`), así que su inventario de colores no vive solo en literales del motor — hay que revisar también cómo se colorean los sprites antes de diseñar las paletas.
