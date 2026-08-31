# Bitácora de juegos sugeridos — Arcade Vault

Este archivo es la **memoria persistente del agente `game-planner`** (`.claude/agents/game-planner.md`). El agente arranca en frío en cada sesión: sin este archivo volvería a proponer lo que ya se descartó. Lo lee antes de evaluar nada y lo actualiza al terminar.

Es legible y editable a mano: si quieres vetar un juego o cambiar un estado, edita su ficha directamente y el agente lo respetará en la corrida siguiente.

**Flujo:** `game-planner` decide **qué** juego → `/add-game <id>` genera la spec → `/spec-impl NN-slug` la implementa.

## Estados

| Estado                | Significado                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| **Candidato natural** | Hueco abierto, todavía sin evaluar. El agente puede estudiarlo.                                  |
| **Sugerido**          | Evaluado y recomendado. No se vuelve a proponer hasta que se acepte o se descarte.               |
| **Aceptado**          | Elegido para implementar. Su spec está por escribirse o en curso.                                |
| **Descartado**        | Evaluado y rechazado, con razón registrada. No se vuelve a proponer salvo pedido explícito.      |
| **Implementado**      | Ya tiene motor real en `components/games/<id>/` y leaderboard propio.                            |

---

## Índice

| Juego       | id            | Estado            | Encaje | Fecha      |
| ----------- | ------------- | ----------------- | ------ | ---------- |
| ARKANOID    | `arkanoid`    | Implementado      | —      | 2026-08-30 |
| TETRIS      | `tetris`      | Implementado      | —      | 2026-08-30 |
| SNAKE       | `snake`       | Implementado      | —      | 2026-08-30 |
| ASTEROIDS   | `asteroids`   | Implementado      | —      | 2026-08-30 |
| GLOTÓN      | `gloton`      | Candidato natural | —      | 2026-08-30 |
| INVASORES   | `invasores`   | Candidato natural | —      | 2026-08-30 |
| RANARIA     | `ranaria`     | Candidato natural | —      | 2026-08-30 |
| DUELO PIXEL | `duelo-pixel` | Candidato natural | —      | 2026-08-30 |

---

## Fichas

### ARKANOID (`arkanoid`)

**Estado:** Implementado · **Fecha:** 2026-08-30 · **Tipo:** entrada de catálogo con motor real
**Dónde:** `components/games/arkanoid/` · specs 05 y 06 · tabla `arkanoid_scores`
**Brief:** cat ARCADE · color cyan · cover `cover-bricks`

### TETRIS (`tetris`)

**Estado:** Implementado · **Fecha:** 2026-08-30 · **Tipo:** entrada de catálogo con motor real
**Dónde:** `components/games/tetris/` · specs 05, 06 y 07 · tabla `tetris_scores`
**Brief:** cat PUZZLE · color magenta · cover `cover-tetro` · sin concepto de vidas (reporta 0) · único con UI propia en pantalla (selector de skin/tema, movido al HUD en la spec 07)

### SNAKE (`snake`)

**Estado:** Implementado · **Fecha:** 2026-08-30 · **Tipo:** construido desde cero (no portado)
**Dónde:** `components/games/snake/` · spec 08 · tabla `snake_scores`
**Brief:** cat ARCADE · color green · cover `cover-snake` · grilla 20×20 · único precedente de sprite-atlas (`sprite-atlas.ts`)

### ASTEROIDS (`asteroids`)

**Estado:** Implementado · **Fecha:** 2026-08-30 · **Tipo:** entrada de catálogo con motor real
**Dónde:** `components/games/asteroids/` · specs 05 y 06 · tabla `asteroids_scores`
**Brief:** cat SHOOTER · color yellow · cover `cover-rocas`

### GLOTÓN (`gloton`)

**Estado:** Candidato natural · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** la entrada existe en `app/data/games.ts` pero el reproductor es simulado (`setInterval` + `av_scores` en `localStorage`). No tiene motor real ni tabla en Supabase.
**Brief parcial:** cat ARCADE · color yellow · cover `cover-glot` · copy actual: "Devora puntos y escapa de los fantasmas."
**Pendiente de evaluar:** el agente debe puntuarlo y llenar el brief técnico.

### INVASORES (`invasores`)

**Estado:** Candidato natural · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** entrada de catálogo con reproductor simulado. Sin motor real ni tabla propia.
**Brief parcial:** cat SHOOTER · color green · cover `cover-invaders` · copy actual: "Defiende el planeta de filas alienígenas."
**Pendiente de evaluar:** el agente debe puntuarlo y llenar el brief técnico.

### RANARIA (`ranaria`)

**Estado:** Candidato natural · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** entrada de catálogo con reproductor simulado. Sin motor real ni tabla propia.
**Brief parcial:** cat ARCADE · color green · cover `cover-rana` · copy actual: "Cruza la autopista de pixeles."
**Pendiente de evaluar:** el agente debe puntuarlo y llenar el brief técnico.

### DUELO PIXEL (`duelo-pixel`)

**Estado:** Candidato natural · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** entrada de catálogo con reproductor simulado. Sin motor real ni tabla propia.
**Brief parcial:** cat VERSUS · color cyan · cover `cover-duelo` · copy actual: "Dos paletas. Una pelota. Reflejos máximos."
**Riesgo conocido:** es el único VERSUS del catálogo. Un leaderboard ordenado por `score DESC` encaja mal con un juego de dos jugadores locales — su `best` actual es 24. Requiere definir primero **qué** se puntúa antes de considerarlo viable.
**Pendiente de evaluar:** el agente debe puntuarlo y llenar el brief técnico.
