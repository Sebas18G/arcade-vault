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
| FROGGER     | `frogger`     | Aceptado          | 9/10   | 2026-08-30 |
| INVASORES   | `invasores`   | Sugerido          | 9/10   | 2026-08-30 |
| 2048        | `2048`        | Candidato natural | 9/10   | 2026-08-30 |
| CIEMPIÉS    | `ciempies`    | Candidato natural | 8/10   | 2026-08-30 |
| MISILES     | `misiles`     | Candidato natural | 8/10   | 2026-08-30 |
| GLOTÓN      | `gloton`      | Candidato natural | 7/10   | 2026-08-30 |
| COLUMNAS    | `columnas`    | Candidato natural | 7/10   | 2026-08-30 |
| GALAXIA     | `galaxia`     | Candidato natural | 7/10   | 2026-08-30 |
| PANG        | `pang`        | Candidato natural | 7/10   | 2026-08-30 |
| RÍO LETAL   | `rio-letal`   | Candidato natural | 7/10   | 2026-08-30 |
| EXCAVADOR   | `excavador`   | Candidato natural | 7/10   | 2026-08-30 |
| ALETEO      | `aleteo`      | Candidato natural | 7/10   | 2026-08-30 |
| KABOOM      | `kaboom`      | Candidato natural | 7/10   | 2026-08-30 |
| ALUNIZAJE   | `alunizaje`   | Candidato natural | 6/10   | 2026-08-30 |
| GEMAS       | `gemas`       | Candidato natural | 6/10   | 2026-08-30 |
| PIRÁMIDE    | `piramide`    | Candidato natural | 6/10   | 2026-08-30 |
| SECUENCIA   | `secuencia`   | Candidato natural | 6/10   | 2026-08-30 |
| MOTOS DE LUZ| `motos-luz`   | Candidato natural | 5/10   | 2026-08-30 |
| BARRILES    | `barriles`    | Candidato natural | 5/10   | 2026-08-30 |
| DUELO PIXEL | `duelo-pixel` | Descartado        | 4/10   | 2026-08-30 |

> **Ronda 2 — game jam (2026-08-30):** corrida del skill `/game-jam` con el tema **"cruza la carretera y el río sin convertirte en papilla"**. La jam agrega a la Fase 2 un criterio propio, **fuerza temática (0–10)**, y elige un solo juego. Se evaluaron `ranaria`/Frogger (10/10 temático), `rio-letal` (río, pero shooter con scroll: 4/10), `excavador` (3/10) y `kaboom` (2/10). Ganó Frogger por goleada y quedó **Aceptado**, con sus tres specs escritas en `specs/games-jam/` (09, 10 y 11). Ningún otro estado cambió en esta ronda.
>
> **Ronda 1 (2026-08-30):** se evaluaron 20 candidatos a pedido explícito del humano (anula el límite de 3–5 por ronda de la Fase 3 del agente). Se verificaron con fuentes las mecánicas y la puntuación del top: `invasores`, `2048`, `ranaria`, `ciempies`, `misiles`, `gloton`, `galaxia` (parcial) y `duelo-pixel`. Las fichas marcadas **"Estimación no verificada"** se puntuaron por conocimiento general del arcade sin confirmar con fuente; antes de aceptar cualquiera de ellas hay que verificar su puntuación y sus controles.

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

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** la entrada existe en `app/data/games.ts` pero el reproductor es simulado (`setInterval` + `av_scores` en `localStorage`). No tiene motor real ni tabla en Supabase.
**Evaluado el 2026-08-30 (ronda 1):** puntúa alto en todo salvo **tamaño de implementación (5/10)**, que es donde se cae. Portar Pac-Man honestamente exige laberinto de 28×36 tiles con 240 dots + 4 energizers, casa de fantasmas con reglas de salida, túnel lateral, ciclo scatter/chase por nivel, modo frightened decreciente, y **cuatro IAs de fantasma distintas** (Blinky persigue la celda de Pac-Man; Pinky apunta 4 celdas por delante, con el bug del vector hacia arriba; Inky duplica el vector Blinky→(2 celdas delante de Pac-Man); Clyde persigue si está a ≥8 celdas y huye a su esquina si está más cerca). Eso es más de lo que cabe en una spec comparable a la 05/06/08. **No descartado** — es el mejor candidato de la ronda siguiente si se acepta partirlo en dos specs o simplificar la IA de forma declarada.
**Brief parcial:** cat ARCADE (existe) · color yellow · cover `cover-glot` · teclado (flechas) · 3 vidas · niveles = laberintos completados · leaderboard: score, level, `dots_eaten`, `ghosts_eaten`, `fruits_eaten` · copy actual: "Devora puntos y escapa de los fantasmas."
**Puntuación confirmada:** dot 10 · energizer 50 · fantasmas 200/400/800/1600 en la misma ventana · frutas 100/300/500/700/1000/2000/3000/5000 según nivel · vida extra a los 10 000 (DIP).
**Pendiente de confirmar:** trazado exacto del laberinto original (hay que dibujarlo o adaptarlo, no está en `references/`); duración de frightened por nivel (Tabla A.1 del Pac-Man Dossier, no leída); tiempos exactos de cada fase scatter/chase.

### INVASORES (`invasores`)

**Estado:** Sugerido · **Encaje:** 9/10 · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** entrada de catálogo con reproductor simulado. Sin motor real ni tabla propia.
**Por qué encaja:** es el candidato con menos fricción contra `recipe.md`. Movimiento en grilla por pasos discretos (cero física real, cero WebGL), dibujable con `ctx.fillRect` sin un solo asset binario, controles de dos teclas más disparo, y una puntuación monótona y bien documentada que hace un leaderboard `score DESC` significativo desde la primera partida. Es upgrade de un simulado: reusa entrada de catálogo, `cover-invaders`, color y copy en Español ya escritos. Además aporta la mejor stat propia del catálogo hasta ahora (precisión de tiro), que ningún otro juego tiene.
**Brief:** cat SHOOTER (existe) · color green · cover `cover-invaders` · canvas 800×600 · teclado (`←`/`→` o `A`/`D` + `Space`) · 3 vidas · niveles sí (oleadas) · leaderboard: score, level, `aliens_killed`, `ufos_hit`, `shots_fired`
**Mecánica confirmada:** 5 filas × 11 columnas = 55 invasores. Fila superior 30 pts, dos filas medias 20 pts, dos filas inferiores 10 pts → 990 pts por pantalla limpia. El UFO **no** vale un valor aleatorio: recorre la secuencia fija `(50,50,100,150,100,100,50,300,100,100,100,50,150,100,100)` indexada por el número de disparos del jugador. La formación acelera a medida que quedan menos invasores. Al limpiar la pantalla, la oleada siguiente empieza más abajo, en bucle infinito. 4 búnkeres destructibles por pantalla, erosionados por disparos de ambos bandos y arrasados si un invasor los atraviesa.
**Pendiente de confirmar:** cadencia de disparo del jugador en el original (¿un solo proyectil en pantalla a la vez?); frecuencia y algoritmo de disparo de los invasores; velocidad exacta por invasor restante; cuántas filas baja cada oleada nueva y si hay tope; si hay vida extra por puntaje.

### FROGGER (`frogger`, antes `ranaria`)

**Estado:** Aceptado · **Encaje:** 9/10 · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** entrada de catálogo con reproductor simulado. Sin motor real ni tabla propia todavía; sus tres specs ya están escritas y en estado `Draft`.
**Aceptado el 2026-08-30 (ronda 2, game jam):** elegido por el skill `/game-jam` para el tema **"cruza la carretera y el río sin convertirte en papilla"**, que describe literalmente su bucle de juego. Su encaje sube de 8/10 a 9/10 al sumarse el criterio de **fuerza temática (10/10)** que la jam agrega a la Fase 2. La objeción de la ronda 1 (satura ARCADE) queda anulada por el tema recibido: el humano pidió este juego, no un hueco de catálogo.
**Specs:** `specs/games-jam/09-frogger-motor.md` (motor) · `specs/games-jam/10-frogger-leaderboard.md` (tabla `frogger_scores`) · `specs/games-jam/11-frogger-anatomia-de-la-papilla.md` (capa temática: causas de muerte persistidas + selectores de skin y tema en el HUD).
**Renombrado:** la ficha de `app/data/games.ts` pasa de `ranaria`/`RANARIA` a `frogger`/`FROGGER`, mismo patrón que las specs 06 y 08. El resto de sus campos no se toca.
**Evaluado el 2026-08-30 (ronda 1):** viable y de tamaño razonable — segundo lugar de la ronda, por detrás de `invasores`. Lo que lo bajaba: satura la categoría ARCADE (ya tiene `arkanoid` y `snake` con motor real, más `gloton` como candidato), y su capa de río exige lógica de "la rana viaja montada en el tronco" que no tiene precedente en el repo.
**Brief:** cat ARCADE (existe) · color green · cover `cover-rana` · canvas 800×650, grilla 16×13 de 50px · teclado (flechas **y** WASD, salto discreto celda a celda) · 3 vidas · temporizador de 30 s por rana · niveles sí (tableros de 5 casas) · leaderboard: score, level, `frogs_home`, `time_bonus`, más `road_deaths`/`river_deaths`/`timeouts` desde la spec 11 · copy actual: "Cruza la autopista de pixeles."
**Puntuación confirmada:** 10 pts por cada salto hacia adelante · 50 pts por rana en casa · 10 pts por cada medio segundo sin usar del temporizador · 200 pts por la rana rosa o por comerse la mosca · 1000 pts al meter las 5 ranas y cerrar el nivel · rana extra a los 20 000 · temporizador de 30 s por rana, se reinicia al llegar a casa o al perder una vida · el marcador del arcade original satura a 99 990 (guarda 5 dígitos).
**Confirmado en la ronda 2 (jam):** layout de 5 carriles de tráfico bidireccional, mediana, 5 carriles de río (troncos hacia la derecha, tortugas hacia la izquierda, algunas se sumergen) y 5 casas arriba. Formas de morir: vehículo, caer al agua, tortuga sumergida, ser arrastrado fuera de pantalla sobre una plataforma, casa ocupada o matorral, temporizador agotado. Vidas configurables por el operador entre 3, 5 y 7.
**Pendiente de confirmar:** número y velocidad de carriles de coches y de troncos/tortugas por nivel; cadencia exacta de inmersión de las tortugas; frecuencia de aparición de la rana rosa y de la mosca; si el original re-otorga los 10 pts al reavanzar una fila ya visitada en la misma vida; cómo escala la dificultad tras el nivel 5 (las fuentes dicen que se ablanda brevemente y vuelve a subir, sin dar números).

### DUELO PIXEL (`duelo-pixel`)

**Estado:** Descartado · **Encaje:** 4/10 · **Fecha:** 2026-08-30 · **Tipo:** upgrade de simulado
**Situación:** entrada de catálogo con reproductor simulado. Sin motor real ni tabla propia.
**Razón del descarte (2026-08-30, ronda 1):** falla el criterio duro de **score numérico acumulable**, y eso descalifica por más que puntúe bien en todo lo demás (es el port técnicamente más barato de los cuatro y el único VERSUS del catálogo). Confirmado del Pong de 1972: cada jugador tiene su propio marcador, se suma **1 punto** cuando el rival no devuelve la pelota, y la partida termina al llegar a 11 o 15 (ajustable por el operador) — no existe un score único acumulable. Un leaderboard `score DESC` sobre eso degenera en una tabla de empates a 11 (el `best` actual de la entrada, 24, ya delata el problema). Habría que **inventar** una métrica de puntaje que el original no tiene (peloteos aguantados, tiempo sobrevivido contra la CPU), y eso viola la regla dura de no inventar mecánicas.
**Cómo se rehabilita:** solo si alguien define primero, por decisión de producto y no por invención del agente, qué métrica de un jugador contra la CPU se persiste en el leaderboard. Con esa decisión tomada, su encaje sube de golpe: canvas 2D trivial, cero assets, controles obvios (`W`/`S` vs `↑`/`↓`), y la spec más chica del catálogo.
**Brief parcial:** cat VERSUS (existe, único) · color cyan · cover `cover-duelo` · copy actual: "Dos paletas. Una pelota. Reflejos máximos."

---

## Fichas — entradas nuevas de catálogo (ronda 1, 2026-08-30)

Ninguna de estas tiene entrada en `app/data/games.ts`: agregar cualquiera implica una fila nueva en `GAMES` y una clase `cover-*` nueva en `app/globals.css` (las 9 existentes son `cover-bg`, `cover-bricks`, `cover-duelo`, `cover-glot`, `cover-invaders`, `cover-rana`, `cover-rocas`, `cover-snake`, `cover-tetro`). Todas caen en una `CATS` existente — **ninguna exige categoría nueva**.

### 2048 (`2048`)

**Estado:** Candidato natural · **Encaje:** 9/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Por qué encaja:** empata en puntaje con `invasores` y es el port más barato de los 20 — grilla 4×4, cero assets, cero física, cero colisiones. Score estrictamente monótono y de gran rango, ideal para `score DESC`. Pierde contra `invasores` solo por dos cosas: no es un arcade de los 80 (choca con la estética CRT/scanlines de la plataforma) y no tiene concepto nativo de "nivel", que habría que derivar.
**Brief parcial:** cat PUZZLE (existe) · color magenta o cyan a definir · cover nuevo · teclado (`←`/`→`/`↑`/`↓`) · 0 vidas (como Tetris) · nivel derivado, p. ej. de la ficha más alta alcanzada · leaderboard: score, level, `max_tile`, `moves`
**Mecánica confirmada:** grilla 4×4. Cada turno aparece una ficha nueva de valor **2 o 4** en una celda libre al azar. Las fichas se deslizan con las cuatro flechas hasta topar con otra ficha o con el borde. Dos fichas del mismo valor que colisionan durante un movimiento se fusionan en una sola del doble de valor. **Cada ficha solo puede fusionarse una vez por movimiento** (no hay fusiones en cadena en una sola dirección). El score sube por el **valor de la ficha resultante de cada fusión**, no por el valor de la ficha más alta.
**Pendiente de confirmar:** condición exacta de fin de partida (presumiblemente "no queda ningún movimiento legal", sin confirmar); probabilidad relativa de que la ficha nueva sea 2 o 4; si la partida continúa tras alcanzar la ficha 2048.

### CIEMPIÉS (`ciempies`)

**Estado:** Candidato natural · **Encaje:** 8/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Por qué encaja:** pantalla única, dibujo procedural puro, sin física, y una tabla de puntos rica que da un leaderboard con textura. Lo baja el control: el original usa trackball, y la Fase 2 penaliza los controles que no sean teclado/ratón conocidos — hay que declarar la adaptación explícitamente en la spec.
**Brief parcial:** cat SHOOTER (existe) · color green · cover nuevo · teclado (flechas, con movimiento vertical limitado al quinto inferior) + `Space` · 3 vidas · niveles sí (rondas) · leaderboard: score, level, `mushrooms_shot`, `spiders_killed`
**Mecánica confirmada:** shooter vertical de pantalla única. El jugador ("Bug Blaster") se mueve en horizontal **y** en vertical, pero solo dentro del quinto inferior del campo. Puntos: segmento de ciempiés 10 · araña 300, 600 o 900 según lo cerca que esté al morir · pulga 200 · escorpión 1000. Al matar un segmento, este se destruye y **aparece un hongo en su lugar**, y el ciempiés se parte en dos ciempiés menores, cada uno con su propia cabeza. Al matar la cabeza, el segmento siguiente pasa a ser la nueva cabeza y **el ciempiés invierte su dirección**. Los hongos también se pueden disparar, tanto por puntos como para despejar el camino. La ronda se completa al eliminar el ciempiés entero. Se empieza con 2, 3, 4 o 5 naves según el ajuste del operador, y se gana una gratis cada 10 000 / 12 000 / 15 000 / 20 000 puntos, también según ajuste.
**Pendiente de confirmar:** puntos exactos por hongo destruido; dimensiones de la grilla de hongos; velocidad del ciempiés y cómo escala por ronda; frecuencia de aparición de araña/pulga/escorpión.

### MISILES (`misiles`)

**Estado:** Candidato natural · **Encaje:** 8/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Por qué encaja:** trayectorias e interceptaciones son geometría simple, cero assets, y su bonus de fin de nivel produce naturalmente stats propias interesantes (ciudades salvadas, misiles sin usar). El control de trackball se adapta a ratón en web con más honestidad que en `ciempies`, porque lo que se mueve es una mira, no un personaje.
**Brief parcial:** cat SHOOTER (existe) · color cyan · cover nuevo · ratón (mira) + 3 teclas o 3 clics para elegir base izquierda/central/derecha · sin vidas convencionales: la partida termina cuando caen todas las ciudades · niveles sí · leaderboard: score, level, `cities_saved`, `missiles_intercepted`
**Mecánica confirmada:** el trackball mueve una mira por la pantalla y cada uno de los tres botones lanza un misil desde su torreta correspondiente (izquierda, centro, derecha). El **multiplicador de score empieza en 1× y sube 1× cada dos niveles, hasta un máximo de 6×**, y afecta tanto a los objetivos como a los bonus. Al terminar cada nivel se cobra bonus por cada ciudad que sobrevive (**50 × multiplicador**) y por cada misil sin usar (**5 × multiplicador**).
**Pendiente de confirmar:** puntos por misil enemigo derribado (el valor de 25 que se suele citar **no** apareció en las fuentes consultadas); número de ciudades por partida; misiles disponibles por base y por nivel; condición exacta de fin de partida.

### COLUMNAS (`columnas`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada** — no se confirmó su puntuación ni sus reglas con fuentes en esta ronda.
**Por qué encaja / no encaja:** puzzle de piezas que caen con eliminación por alineación de 3+ del mismo color; reusaría casi toda la arquitectura de grilla y gravedad ya escrita para `tetris`, lo que lo hace barato. En contra: por eso mismo es el candidato más redundante del catálogo, y satura PUZZLE.
**Brief parcial:** cat PUZZLE (existe) · teclado (flechas + rotación de la columna) · 0 vidas · niveles sí · leaderboard: score, level, `jewels_cleared`, `max_combo`
**Pendiente de confirmar:** todo — puntuación por eliminación y por combo, tamaño de la grilla, número de colores, velocidad por nivel.

### GALAXIA (`galaxia`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Por qué encaja / no encaja:** es `invasores` con mejores mecánicas (enemigos que rompen formación y bajan en picado, rayo tractor, nave doble). Precisamente por eso queda por detrás: si se implementa `invasores` primero, este pasa a ser una variante y satura SHOOTER, que ya tiene `asteroids`.
**Brief parcial:** cat SHOOTER (existe) · teclado (`←`/`→` + `Space`) · 3 vidas · niveles sí (etapas) · leaderboard: score, level, `dual_fighter_stages`, `perfect_challenges`
**Mecánica confirmada (parcial):** los enemigos **en picado valen más puntos que los que están en formación**, y un Boss Galaga vale más cuanto más escoltas bajen con él. Cada 3 etapas hay una "challenging stage" con 40 alienígenas que no disparan: **100 puntos de bonus por cada uno derribado, o 10 000 si se derriban los 40**. El Dual Fighter dispara dos balas a la vez y aguanta un impacto extra (al ser golpeado, una de las dos naves explota y la otra sigue como nave normal). Vida extra a los 20 000 puntos, y después cada 70 000.
**Pendiente de confirmar:** valor en puntos de cada tipo de enemigo, en formación y en picado; mecánica exacta del rayo tractor del Boss Galaga y cómo se recupera la nave capturada; número de etapas antes de repetir patrones.

### PANG (`pang`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** burbujas que rebotan y se parten en dos más chicas al ser disparadas — es la misma idea de subdivisión que ya funciona en `asteroids`, pero con gravedad y rebote parabólico, que sí es física simple (no cuerpo rígido). En contra: conceptualmente cercano a `asteroids`, ya implementado.
**Brief parcial:** cat ARCADE (existe) · teclado (`←`/`→` + `Space`) · 3 vidas · niveles sí · leaderboard: score, level, `bubbles_popped`
**Pendiente de confirmar:** todo — puntuación por tamaño de burbuja, power-ups, número de niveles.

### RÍO LETAL (`rio-letal`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** scroller vertical con combustible como reloj de partida; genera una stat propia natural (`distance`). En contra: el terreno generado por scroll infinito no tiene precedente en el repo, y satura SHOOTER.
**Brief parcial:** cat SHOOTER (existe) · teclado (`←`/`→` + `Space`, quizá acelerar/frenar) · 3 vidas · niveles sí (secciones) · leaderboard: score, level, `distance`, `fuel_pickups`
**Pendiente de confirmar:** todo — puntos por cada tipo de objetivo, consumo de combustible, generación del terreno.

### EXCAVADOR (`excavador`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** grilla de tierra excavable con enemigos que persiguen por los túneles, más rocas que caen. Dibujo procedural, controles de flechas. En contra: la IA de los enemigos y el estado del terreno excavado lo acercan al costo de `gloton`, y satura ARCADE.
**Brief parcial:** cat ARCADE (existe) · teclado (flechas + `Space` para inflar) · 3 vidas · niveles sí · leaderboard: score, level, `enemies_popped`, `rocks_dropped`
**Pendiente de confirmar:** todo — puntuación por enemigo según profundidad, mecánica exacta del inflado, comportamiento de las rocas.

### ALETEO (`aleteo`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** es el port más pequeño concebible — una tecla, gravedad de una línea, obstáculos generados. En contra: **score de granularidad muy baja** (1 punto por obstáculo pasado), lo que produce un leaderboard corto y muy empatado; es el mismo defecto que hundió a `duelo-pixel`, aunque más suave porque al menos es acumulable y de un solo jugador. Tampoco es un arcade clásico, lo que choca con la línea del catálogo.
**Brief parcial:** cat ARCADE (existe) · teclado (`Space`) · 0 vidas · sin niveles nativos · leaderboard: score, level, `best_streak`
**Pendiente de confirmar:** todo — no hay un "original arcade" canónico que citar; cualquier regla concreta habría que fijarla por decisión propia en la spec, como se hizo con `snake` en la spec 08.

### KABOOM (`kaboom`)

**Estado:** Candidato natural · **Encaje:** 7/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** atrapar bombas que caen con baldes que se mueven en horizontal; cero colisiones complejas, cero assets, y la dificultad escala sola con la velocidad de caída. En contra: mecánicamente muy delgado, con poco que contar en un leaderboard más allá del score.
**Brief parcial:** cat ARCADE (existe) · ratón o teclado (`←`/`→`) · 3 vidas (baldes) · niveles sí (oleadas) · leaderboard: score, level, `bombs_caught`
**Pendiente de confirmar:** todo — puntos por bomba según oleada, número de baldes, velocidad por oleada.

### ALUNIZAJE (`alunizaje`)

**Estado:** Candidato natural · **Encaje:** 6/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** gráfico vectorial puro, encaja perfecto con la estética neón, y su física es solo gravedad + empuje (no cuerpo rígido, así que pasa el criterio duro). En contra: el score depende de la calidad del aterrizaje y del combustible restante, no crece de forma monótona a lo largo de una partida larga, así que el leaderboard mide menos habilidad acumulada que los demás.
**Brief parcial:** cat ARCADE (existe) · teclado (`↑` empuje, `←`/`→` rotación) · vidas = intentos de aterrizaje · niveles sí (zonas más difíciles) · leaderboard: score, level, `successful_landings`, `fuel_left`
**Pendiente de confirmar:** todo — tabla de multiplicadores por zona de aterrizaje, consumo de combustible, tolerancia de velocidad de impacto.

### GEMAS (`gemas`)

**Estado:** Candidato natural · **Encaje:** 6/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** match-3 por intercambio, con score acumulable y combos que dan buenas stats. En contra: satura PUZZLE junto a `tetris`, `2048` y `columnas`; y es de ratón, no de teclado.
**Brief parcial:** cat PUZZLE (existe) · ratón (arrastrar/intercambiar) · 0 vidas · niveles sí · leaderboard: score, level, `max_combo`, `gems_cleared`
**Pendiente de confirmar:** todo — puntuación por combo y por cascada, tamaño de la grilla, número de colores, condición de fin de partida.

### PIRÁMIDE (`piramide`)

**Estado:** Candidato natural · **Encaje:** 6/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** su gancho (cambiar el color de cada cubo de la pirámide) da un leaderboard con stat propia obvia. En contra: exige **dibujo isométrico y controles diagonales**, dos cosas sin ningún precedente en el repo, y el precedente de la Fase 2 sobre "controles conocidos" juega en contra de las diagonales.
**Brief parcial:** cat ARCADE (existe) · teclado (4 diagonales, mapeo a definir) · 3 vidas · niveles sí · leaderboard: score, level, `cubes_flipped`
**Pendiente de confirmar:** todo — puntuación por cubo y por disco, comportamiento de cada enemigo, número de niveles antes de repetir.

### SECUENCIA (`secuencia`)

**Estado:** Candidato natural · **Encaje:** 6/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué encaja / no encaja:** implementación trivial (4 paneles, una secuencia creciente) y encaja bien con el neón. En contra: el score es el **largo de la secuencia**, o sea números chicos y muy empatados — el mismo defecto estructural que descartó a `duelo-pixel`, aunque aquí sí es acumulable y de un jugador. Tampoco es realmente un juego de canvas: casi todo es UI.
**Brief parcial:** cat PUZZLE (existe) · ratón o 4 teclas · 0 vidas · niveles = largo de la secuencia · leaderboard: score, level, `longest_sequence`
**Pendiente de confirmar:** todo — velocidad de reproducción por ronda, si hay penalización por tiempo de respuesta.

### MOTOS DE LUZ (`motos-luz`)

**Estado:** Candidato natural · **Encaje:** 5/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué no encaja:** dos problemas a la vez. Es VERSUS, así que hereda el mismo choque estructural entre leaderboard `score DESC` y juego de dos jugadores locales que descartó a `duelo-pixel`; y mecánicamente es **casi idéntico a `snake`** (estelas que crecen, chocar contra una estela mata), que ya está implementado con motor real. Aporta poco al catálogo por lo que cuesta.
**Brief parcial:** cat VERSUS (existe) · teclado (`W`/`A`/`S`/`D` vs flechas) · leaderboard: sin métrica clara, mismo problema abierto que `duelo-pixel`
**Pendiente de confirmar:** qué se puntuaría en modo un jugador contra la CPU — decisión de producto, no del agente.

### BARRILES (`barriles`)

**Estado:** Candidato natural · **Encaje:** 5/10 · **Fecha:** 2026-08-30 · **Tipo:** entrada nueva
**Estimación no verificada.**
**Por qué no encaja:** es el port más caro de los 20. Exige plataformas con salto y colisión vertical, escaleras, martillo, y **sprites de personaje animado** — mientras que todos los juegos reales del repo, salvo el atlas de frutas de `snake`, se dibujan proceduralmente. No hay fuente en `references/started_games/` de donde portarlo, y los sprites del original son de licencia dudosa (la Fase 2 penaliza explícitamente eso). No cabe en una spec del tamaño de la 05/06/08.
**Brief parcial:** cat ARCADE (existe) · teclado (flechas + `Space` para saltar) · 3 vidas · niveles sí (pantallas) · leaderboard: score, level, `barrels_jumped`
**Pendiente de confirmar:** todo — puntuación por barril saltado y por martillo, número de pantallas, física exacta del salto.
