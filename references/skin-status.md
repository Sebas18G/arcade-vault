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
| ARKANOID  | `arkanoid`  | Cumple    | classic, retro, neon               | 2026-09-05 |
| SNAKE     | `snake`     | Cumple    | classic, retro, neon               | 2026-09-01 |
| FROGGER   | `frogger`   | Cumple    | classic, retro, neon               | 2026-09-04 |
| INVASORES | `invasores` | Cumple    | classic, retro, neon               | 2026-09-05 |

> **Corrida 5 (2026-09-05):** auditoría contrastada contra el código: coincidía con la bitácora en los seis juegos del alcance (`invasores` figuraba Pendiente, sin ninguna de las tres piezas). Juego intervenido: **`invasores`**, el único pendiente que quedaba. Con esto **todo el alcance queda en `Cumple` o `Exento`** y no queda ningún juego sin prop `skin`, así que se cerró el contrato: `GameCanvasProps.skin` pasó de **opcional a obligatorio** en `components/games/shared/types.ts` (el candidato que había dejado anotado la corrida 4). Compila limpio: Tetris ya usaba `Omit<GameCanvasProps<...>, "skin">` y no se tocó, y `asteroids-canvas.tsx` perdió su intersección `& { skin?: GameSkin }`, que quedó redundante.
>
> **Corrida 4 (2026-09-05):** el alcance volvió a crecer: `invasores` pasó a `Implementado` en `references/game-suggestion-todo.md` ese mismo día (specs `specs/games-jam/14` y `15`, PR #32), así que entra al índice como **Pendiente** sin tocarlo. Auditoría contrastada contra el código: coincidía con la bitácora en los cinco juegos ya fichados. Juego intervenido: **`arkanoid`**, el pendiente más antiguo y el objetivo por defecto que dejó anotado la corrida 3; `invasores` se deja explícitamente para la corrida siguiente, para no pisar `components/game-player.tsx` en paralelo. Con esto, **los 4 juegos migrables del alcance cumplen** y el único sin `skin` es `invasores`: por eso `GameCanvasProps.skin` sigue siendo **opcional**, y volverlo obligatorio es candidato de la corrida 5.
>
> **Corrida 3 (2026-09-04):** el alcance creció: `frogger` entró como `Implementado` en `references/game-suggestion-todo.md` (spec `specs/games-jam/09-frogger-motor.md`) el mismo día. Auditoría contrastada contra el código: coincidía con la bitácora para los cuatro juegos ya fichados, y `frogger` figuraba Pendiente sin ficha (sin `skins.ts`, sin `setSkin()`, sin prop `skin`). Juego intervenido: **`frogger`**, por pedido explícito del humano (por orden de tabla habría tocado `arkanoid`). Como su `leaderboard.ts` todavía no existía —llega en la spec 10—, se creó con **solo** los helpers de preferencia de skin, sin nada de Supabase. Queda `arkanoid` como único pendiente.
>
> **Corrida 2 (2026-09-01):** auditoría contrastada contra el código: coincidía con la bitácora (asteroids Cumple, tetris Exento, arkanoid y snake Pendientes), así que no hubo nada que corregir. Juego intervenido: **`snake`**, elegido por pedido explícito del humano, con un requisito extra: que la **cuadrícula** sea parte de la paleta y no un valor fijo. El contrato compartido ya existía de la corrida 1, así que solo hubo que registrar `snake` en `SKINS_BY_GAME`/`SKIN_STORAGE` de `components/game-player.tsx`. Queda `arkanoid` como único pendiente.
>
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

**Estado:** Cumple · **Fecha:** 2026-09-05 · **Skins:** classic, retro, neon

> Estado anterior (2026-09-01 a 2026-09-04, corridas 1 a 3): **Pendiente**, sin ninguna de las tres piezas — `components/games/arkanoid/` tenía solo `engine.ts`, `arkanoid-canvas.tsx` y `leaderboard.ts`, y el juego no figuraba en `SKINS_BY_GAME`. Cambió al implementarse en la corrida 4.

**Inventario de colores del motor original (7 literales):** `BG_COLOR = "#1414a0"`; HUD con `shadowColor "rgba(255, 255, 255, 0.5)"` a `shadowBlur 6`, puntaje y nivel en `"#fff"` y vidas en `"#ff3b3b"`; pantalla de nivel completado con velo `"rgba(0, 0, 0, 0.7)"` y texto `"#fff"`. **Todo lo demás es spritesheet:** pala, bola, los 6 bloques rompibles, los 4 indestructibles y los 4 frames de explosión salen de `/games/arkanoid/spritesheet-breakout.png` (los nombres `red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green` son claves de recorte, no colores CSS que el motor pinte).

**El problema propio de este juego, y cómo se resolvió:** con solo 7 literales, cambiar la paleta habría dejado el 95% de la pantalla idéntico entre las tres skins. Por eso `ArkanoidPalette` lleva un campo **`render: "sprite" | "solid"`**: `classic` conserva el spritesheet y `retro`/`neon` dibujan las piezas de forma **procedural** (rectángulo relleno + contorno de 2 px, y círculo para la bola), igual que hace el resto del catálogo. Es el precedente del dispatcher `drawTetrisBlock` de Tetris, aplicado a tres dispatchers privados: `drawPaddle()`, `drawBall()` y `drawBlock()`. El PNG **no se recolorea** en ningún caso — se ignora, que es reversible y no destruye el arte.

**Paleta classic:** los 7 valores extraídos tal cual, sin alterar uno solo — fondo `#1414a0`; HUD `#fff`/`#fff`/`#ff3b3b` con halo `rgba(255,255,255,0.5)` a `blur 6`; velo `rgba(0,0,0,0.7)` con texto `#fff`; `render: "sprite"` y todos los `glow` en 0. Los campos `fill`/`edge` de pieza existen en esta paleta pero **nunca se dibujan** (describen el sprite y sirven de red de seguridad). Control de regresión: la ruta de dibujo de `classic` es exactamente la de antes del cambio.

**Paleta retro:** fósforo CRT cálido —ámbar, verde fósforo y blanco hueso—, sin un solo azul; adiós al fondo azul brillante `#1414a0`, que pasa a marrón casi negro `#140d04`. Pala ámbar `#ffb02e` con canto blanco hueso `#fff4d6`; bola `#fff9e6`, el punto más luminoso del tablero. Bloques, en orden de fila: `#ff5b3d` rojo-naranja, `#ffd447` ámbar, `#7dff86` verde fósforo, `#ff8a3d` naranja, `#ffe0a3` crema, `#c9ff5e` lima, cada uno con su contorno oscuro. Indestructibles en marrón/oliva con **contorno más claro que el relleno** (`#7a4a14`/`#c98b3a`, `#8c3a1e`/`#d2764a`, `#6b5f4c`/`#b3a68c`, `#4a2e10`/`#9c6a2e`), para que se lean como muro y no como bloque roto. HUD `#ffcf70` con vidas `#ff5b3d`; velo `rgba(20,13,4,0.78)` con texto `#fff4d6`. Sin brillo (`glow: 0` en todo).

**Paleta neon:** paleta de la plataforma (`app/globals.css`) reforzada con `shadowBlur`, sobre el `--bg` de la app `#0a0a0f`. **Semántica de color explícita: la bola es lo único amarillo y la pala lo único cian**, así que las dos piezas que el jugador sigue con la vista nunca se confunden con un bloque. Bola `#f5ff00` con `glow 14`; pala `#00f5ff` con `glow 12`. Bloques con `glow 8`, en orden de fila: `#ff4d4d`, `#ffb02e`, `#c77dff`, `#ff006e`, `#ff7ac6`, `#00ff88`. Indestructibles apagados y **sin brillo** (`#1e2438`, `#33202c`, `#242433`, `#20202e`), todos más claros que el fondo y con contorno luminoso (`#5f7fb8`, `#a85f86`, `#8a8ab0`, `#6a6a99`). Destello de rotura con `glow 16`. HUD `#e6e9ff` con vidas `#ff006e` y halo cian; velo `rgba(10,10,15,0.78)`.

**Archivos tocados:** `components/games/arkanoid/{skins.ts, engine.ts, arkanoid-canvas.tsx, leaderboard.ts}` · `components/game-player.tsx` (registro `SKINS_BY_GAME` + `SKIN_STORAGE` + prop `skin` al `<ArkanoidCanvas>`) · `components/games/shared/types.ts` (solo el comentario de `skin?`, que ya no puede citar a arkanoid)

**Notas de contraste y decisiones:**

- Ningún elemento jugable es más oscuro que el fondo de la app (`#0a0a0f`) en ninguna de las tres skins, y no hay grises medios: el único gris del original (la pala plateada del sprite) solo existe en `classic`, y ahí va sobre azul `#1414a0`, no sobre el fondo de la app.
- Bola vs bloques: nunca se distinguen solo por tono. En `retro` la bola es blanco hueso (la luminancia más alta del tablero) y ninguna fila de bloques es blanca; en `neon` es el único amarillo puro y encima tiene el `glow` más fuerte (14) y forma circular contra rectángulos.
- Filas adyacentes de bloques: se comprobó par a par que dos filas contiguas nunca comparten tono. En `retro` la secuencia es rojo → ámbar → verde → naranja → crema → lima; en `neon`, coral → naranja → violeta → magenta → rosa claro → verde (el par magenta `#ff006e` / rosa `#ff7ac6` se separa por luminancia, no solo por tono).
- Rompible vs indestructible: en `retro` y `neon` los indestructibles son los **únicos** bloques desaturados y sin brillo, además de tener el contorno más claro que el relleno. Es la señal de "esto no se rompe" que el spritesheet daba por textura.
- El brillo se maneja con `setGlow()` / `clearGlow()`. `setGlow()` **no toca el contexto** cuando el valor es 0, así que `classic` y `retro` emiten exactamente las mismas llamadas de dibujo que antes; `clearGlow()` resetea `shadowBlur` a 0 tras cada pieza, para que el halo no manche el contorno ni el resto del frame. El destello de rotura va envuelto en `save()`/`restore()` porque además usa `globalAlpha`.
- El HUD **nunca** lleva brillo de skin: conserva el mismo `blur 6` original en las tres, que es del texto y no compromete la legibilidad.
- El motor no lee la skin de ningún lado: entra solo por `setSkin()`. Sí sigue tocando `document` en `loadSpritesheet()` (`document.createElement("canvas")` para el offscreen del PNG), pero eso es **preexistente y ajeno a las skins** — no se leyó ni se agregó nada de tema desde el DOM.
- `components/games/arkanoid/leaderboard.ts` ganó `getArkanoidSkin()`/`setArkanoidSkin()` sobre la clave `"arkanoid-skin"`, con `try/catch` y validación vía `isGameSkin()`. Sus funciones de Supabase (`arkanoid_scores`) no se tocaron: la preferencia de UI no sale de `localStorage`.
- `GameCanvasProps.skin` **se dejó opcional a propósito**: `invasores` todavía no está migrado. Volverlo obligatorio es candidato de la corrida siguiente, cuando ese juego reciba sus skins.
- **Duda abierta:** `retro` y `neon` reemplazan el fondo azul `#1414a0`, que es la seña de identidad visual del Arkanoid original. Es deliberado (un azul saturado a pantalla completa pelea con el marco CRT y con el `--bg` de la app), pero es el cambio más agresivo de esta corrida; si se prefiere conservar el azul en alguna de las dos, es un solo campo por paleta.
- **Duda abierta:** en modo `solid` el spritesheet se sigue cargando aunque no se use, porque el flag `ready` del motor cuelga de esa carga. Se dejó así a propósito para no tocar la máquina de estados de arranque; el costo es un PNG que el navegador ya cachea.

### Snake (`snake`)

**Estado:** Cumple · **Fecha:** 2026-09-01 · **Skins:** classic, retro, neon

> Estado anterior (2026-09-01, corrida 1): **Pendiente**, sin ninguna de las tres piezas. Cambió al implementarse en la corrida 2.

**Inventario de colores del motor original (6 literales):** `SNAKE_COLOR = "green"` (cuerpo), `SNAKE_HEAD_COLOR = "#0f0"` (cabeza), `BG_COLOR = "#0a0a0a"`, `GRID_LINE_COLOR = "rgba(255, 255, 255, 0.05)"` con `lineWidth 1`, `"red"` (relleno de reserva de la fruta si el atlas no carga) y el HUD (`#fff` con `shadowColor rgba(255,255,255,0.5)` y `shadowBlur 6`). **El sprite-atlas no aporta colores a la paleta:** las 22 frutas son un PNG (`/games/snake/fruits.png`) que no se recolorea en ninguna skin — se las trata con brillo alrededor de su silueta, no cambiando sus píxeles.

**Paleta classic:** los 6 literales extraídos tal cual, sin alterar un valor — fondo `#0a0a0a`; cabeza `#0f0`; cuerpo `green`; grid `lines` en `rgba(255,255,255,0.05)` con `lineWidth 1`; sin marco de tablero (`border: null`); fruta de reserva `"red"`; HUD `#fff` con halo `rgba(255,255,255,0.5)` a `blur 6`; sin brillo en ningún elemento (`snakeGlow: 0`, `fruitGlow: 0`). Es el control de regresión.

**Paleta retro:** fósforo CRT cálido, sin un solo azul. Fondo `#0b0805`; cabeza en blanco hueso `#fff1c9` (el elemento más luminoso del tablero) y cuerpo en ámbar `#ffb02e`; **la cuadrícula cambia de forma**: pasa de malla a trama de puntos (`style: "dots"`, 3 px, `rgba(255,190,90,0.12)`) en las 21×21 intersecciones; marco del tablero en ámbar `rgba(255,176,46,0.3)` a 2 px, sin brillo; fruta de reserva `#ff6b2e`; HUD `#ffcf70` con halo `rgba(255,207,112,0.5)`.

**Paleta neon:** paleta de la plataforma (`app/globals.css`) reforzada con `shadowBlur`. Fondo `#0a0a0f` (el `--bg` de la app); cuerpo verde `#00ff88` con `glow 8` y cabeza amarilla `#f5ff00` con `glow 12` (8 × 1.5); grid de vuelta a `lines`, pero en cian `rgba(0,245,255,0.08)` — **por debajo** del 0.05→0.08 percibido de classic en luminancia, para no competir con el brillo de la serpiente; marco del tablero cian `rgba(0,245,255,0.45)` a 2 px con `borderGlow 12`; el sprite de fruta se dibuja con `shadowColor #ff006e` y `shadowBlur 14`, que le pinta un halo magenta alrededor de su silueta alpha sin tocar sus píxeles; fruta de reserva `#ff006e`; HUD `#e6e9ff` con halo cian al mismo `blur 6` de classic.

**Archivos tocados:** `components/games/snake/{skins.ts, engine.ts, snake-canvas.tsx, leaderboard.ts}` · `components/game-player.tsx` (registro) · `components/games/shared/types.ts` (solo un comentario)

**Notas de contraste y decisiones:**

- **La cuadrícula es parte de la paleta**, no un valor fijo: `SnakeGridPalette` lleva `style` (`lines` | `dots`), `color`, `lineWidth` y `dotSize`, y `SnakeBoardPalette` lleva `border`, `borderWidth` y `borderGlow`. `drawGrid()` despacha entre `drawGridLines()` y `drawGridDots()`, mismo patrón que el dispatcher `drawTetrisBlock` de Tetris.
- Las tres cuadrículas están en el rango pedido de baja luminancia: 0.05 (classic, intacta), 0.12 en puntos (retro — más alpha pero muchísima menos superficie cubierta, así que el resultado es **más tenue** que la malla) y 0.08 en líneas (neon).
- Serpiente vs grid: en las tres skins la serpiente es un relleno sólido y la grid nunca pasa de 0.12 de alpha, así que la diferencia es de luminancia, no de tono.
- Cabeza vs cuerpo: nunca se distinguen solo por tono. classic `#0f0` vs `green` (`#008000`, la mitad de luminancia); retro blanco hueso vs ámbar; neon amarillo (con 1.5× de brillo) vs verde.
- Los bordes del tablero son letales en Snake y en classic solo se intuyen (una línea al 5%). `retro` y `neon` los marcan con un marco propio; classic **no lo tiene** (`border: null` y `drawBoardBorder()` sale temprano), así que su aspecto no cambia.
- Todos los `shadowBlur` se resetean a 0 tras dibujar, además del `ctx.restore()` que los envuelve. El HUD conserva el mismo `blur 6` en las tres skins: es el que ya tenía y no compromete la legibilidad del texto.
- El motor sigue sin tocar `document`, `window` ni `localStorage`: la paleta entra solo por `setSkin()`.
- **Duda abierta:** `retro` y `neon` cambian el fondo que pinta el motor (`#0b0805` y `#0a0a0f` en vez de `#0a0a0a`). Es un cambio casi imperceptible bajo el marco CRT, elegido para acompañar la temperatura de cada paleta; si se prefiere `#0a0a0a` en las tres, es un solo campo por paleta.
- **Duda abierta:** las frutas del atlas conservan sus colores originales en las tres skins. Recolorearlas exigiría teñir el PNG con `globalCompositeOperation` sobre un canvas intermedio, lo que rompería el detalle del sprite; se optó por el halo, que es reversible y no destruye el arte.

### Frogger (`frogger`)

**Estado:** Cumple · **Fecha:** 2026-09-04 · **Skins:** classic, retro, neon

> Estado anterior: no tenía ficha. Entró al alcance el 2026-09-04, el mismo día en que su motor (spec `specs/games-jam/09-frogger-motor.md`) pasó a `Implementado`, y se implementó en la corrida 3.

**Inventario de colores del motor original (23 campos):** la constante de módulo `COLORS` del motor de la spec 09 (22 entradas: `water`, `road`, `laneMark`, `safe`, `bush`, `home`, `homeLily`, `log`, `logDark`, `turtle`, `turtleShell`, `car` —array de 5—, `truck`, `frog`, `frogLeg`, `frogEye`, `lady`, `fly`, `flyWing`, `timerTrack`, `timerFill`, `timerLow`) **más un literal inline** que estaba fuera de ella: el `"#1a1a1a"` del parabrisas en `drawVehicle()`, ahora campo propio `vehicleGlass`. El motor no tiene HUD de texto ni assets binarios: dibuja el 100% del tablero de forma procedural, así que las 13 filas del canvas están siempre pintadas por la paleta y el fondo de la app nunca asoma.

**Paleta classic:** los 23 valores extraídos tal cual, sin alterar uno solo — río `#0b2a63`; carretera `#2b2b2b` con marcas `#4a4a4a`; orillas `#1d3b2a`; matorral `#14401f`; casa `#0b2a63` con nenúfar `#2fbf5f`; troncos `#8b5a2b`/`#6b4420`; tortugas `#3fae6a`/`#2a7d4b`; coches `["#e0473e","#f2c14e","#4ea8de","#c46bd6","#ff8c42"]`; camión `#d9d9d9`; parabrisas `#1a1a1a`; rana `#7fe86b` con patas `#4fb83c` y ojos `#0d1a0d`; rana rosa `#ff7ac6`; mosca `#1a1a1a` con alas `#e8e8e8`; temporizador `#1a1a1a`/`#3fae6a`/`#e0473e`. Todos los `glow` en 0. Es el control de regresión: verificado literal contra `git show HEAD:.../engine.ts` — el único hex que aparece de más en la paleta es el `#1a1a1a` del parabrisas, que antes era inline.

**Paleta retro:** fósforo CRT cálido —ámbar, verde fósforo y blanco hueso—, sin un solo azul. Río `#0a1c11` (casi negro con tinte fósforo, sustituye al azul `#0b2a63`); carretera `#1b1409` con marcas `rgba(255,207,112,0.22)`; orillas `#3a2a0c` (claramente más claras que la carretera, para que se lean como banco seguro); matorral `#241605`; nenúfares `#7dff86`; troncos `#b3701f`/`#82500f`; tortugas `#7dff86` con caparazón `#3f9e52`; coches `["#ff5b3d","#ffd447","#ff8a3d","#e07b2e","#ffb02e"]`; camión `#d9b169` (arena, deliberadamente más apagado que la rana); parabrisas `#2a1400`; rana `#fff4d6` blanco hueso con patas ámbar `#ffb02e` y ojos `#2a1400`; rana rosa `#ff7a5c` coral; mosca `#2a1400` con alas `#fff4d6`; temporizador `#1b1409`/`#7dff86`/`#ff5b3d`. Sin brillo.

**Paleta neon:** paleta de la plataforma (`app/globals.css`) reforzada con `shadowBlur`, con una **semántica de color explícita**: la rana es lo único amarillo del tablero, lo seguro es frío y lo letal es cálido. Río `#071b2e`; carretera `#121019` con marcas `rgba(0,245,255,0.12)`; orillas `#0c2018`; matorral `#170b20` (violeta casi negro); nenúfares `#00ff88` con `glow 10`; troncos `#00ff88`/`#00b35f` con `glow 8`; tortugas `#00f5ff` con caparazón `#0090a8` y `glow 8`; coches `["#ff006e","#ff4d4d","#c77dff","#ff8a3d","#ff2ec4"]` con `glow 8` — ni un amarillo, ni un verde, ni un cian entre ellos; camión `#ffe1ef`; parabrisas `#0a0a0f`; rana `#f5ff00` con `glow 12`, patas `#c9d400` y ojos `#0a0a0f`; rana rosa `#ff6ec7` con `glow 10`; mosca `#ff006e` con alas `#ffd6ea` y `glow 10`; temporizador `#141420`/`#00ff88`/`#ff006e` con `glow 8`.

**Archivos tocados:** `components/games/frogger/{skins.ts, engine.ts, frogger-canvas.tsx, leaderboard.ts}` · `components/game-player.tsx` (registro `SKINS_BY_GAME` + `SKIN_STORAGE` + prop `skin` al `<FroggerCanvas>`)

**Notas de contraste y decisiones:**

- **Los dos choques que pedía resolver el encargo, resueltos en retro y neon:** (1) *rana verde sobre matorral verde oscuro* — en retro la rana pasa a blanco hueso sobre matorral marrón `#241605`, en neon a amarillo sobre matorral violeta `#170b20`; classic conserva su verde sobre verde a propósito, porque es el control de regresión. (2) *tortugas verdes sobre agua azul* — en retro las tortugas son verde fósforo brillante sobre un río casi negro (`#0a1c11`), y en neon son cian `#00f5ff` sobre `#071b2e`, con `glow 8` alrededor del círculo.
- Rana vs camión: en classic la rana es verde y el camión gris claro (ya distinguibles). En retro la rana es el elemento **más luminoso** del tablero (`#fff4d6`) y el camión un arena más apagado (`#d9b169`), además de ocupar 2 celdas; nunca comparten color. En neon la rana es amarilla y el camión rosa-blanco.
- Rana vs plataformas del río (donde la rana pasa la mitad del juego montada encima): retro blanco hueso sobre tronco ámbar y sobre tortuga verde; neon amarillo sobre tronco verde y sobre tortuga cian. En las tres skins hay diferencia de tono **y** de luminancia.
- Rana rosa a cuestas: se dibuja como un cuadrado de 16 px encima del cuerpo de la rana, así que su color se eligió mirando ese solapamiento. En retro se descartó un rosa pálido (se perdía sobre el blanco hueso) y se usó coral `#ff7a5c`; en neon, `#ff6ec7` sobre amarillo.
- Ningún elemento jugable es más oscuro que el fondo de la app (`#0a0a0f`) en ninguna de las tres skins. Los tres colores oscuros de las paletas —ojos de la rana, parabrisas y cuerpo de la mosca en classic/retro— son **detalles dibujados dentro de una forma clara** (cuerpo de la rana, carrocería, nenúfar), no elementos sobre el fondo.
- No se usan grises medios: el único gris del original (`#d9d9d9` del camión y `#4a4a4a` de las marcas de carril) se mantiene en classic y se reemplaza por color cálido/neón en las otras dos. Las marcas de carril de retro y neon bajan a `rgba(...)` de 0.22 y 0.12, y van pintadas **sobre la banda de carretera**, no sobre el fondo de la app.
- El brillo se maneja con dos helpers privados, `setGlow()` / `clearGlow()`, y un sub-objeto `glow` en la paleta con 6 campos (`frog`, `platform`, `vehicle`, `lily`, `bonus`, `timer`). `setGlow()` **no toca el contexto** cuando el valor es 0, así que classic y retro dibujan exactamente las mismas llamadas que antes; `clearGlow()` resetea `shadowBlur` a 0 tras cada elemento, para que el halo no se filtre a los detalles (patas, ojos, veta del tronco, caparazón, parabrisas, alas) ni al resto del frame.
- El motor sigue sin tocar `document`, `window` ni `localStorage`: la paleta entra solo por `setSkin()`.
- `components/games/frogger/leaderboard.ts` **se creó en esta corrida** y contiene **solo** `getFroggerSkin()`/`setFroggerSkin()` sobre la clave `"frogger-skin"`, con `try/catch` y validación vía `isGameSkin()`. Nada de Supabase: la tabla `frogger_scores` y sus helpers son de la spec 10 y no se tocaron.
- **Duda abierta:** en neon los troncos y los nenúfares comparten el verde `#00ff88`. Es deliberado (ambos son "suelo seguro") y están en filas distintas —nenúfares en la fila 0, troncos en las filas 1/3/5—, pero si se prefiere separarlos, el nenúfar puede pasar a `#00f5ff` moviendo las tortugas a otro tono. Un solo campo.
- **Duda abierta:** las tres skins repintan el fondo completo del tablero, incluidos los colores de banda (río, carretera, orillas, matorral). Es inevitable en este juego —el "fondo" *es* el tablero, no un color plano detrás—, pero significa que retro y neon cambian bastante más de aspecto que en Snake o Asteroids.

### Invasores (`invasores`)

**Estado:** Cumple · **Fecha:** 2026-09-05 · **Skins:** classic, retro, neon

> Estado anterior: entró al alcance el 2026-09-05, el mismo día en que su ficha pasó a `Implementado` en `references/game-suggestion-todo.md` (specs `specs/games-jam/14-invasores-motor.md` y `15-invasores-leaderboard.md`, PR #32). La corrida 4 lo dejó explícitamente como **Pendiente** para no pisar `components/game-player.tsx` en paralelo con arkanoid; se implementó en la corrida 5.

**Inventario de colores del motor original (9 campos, todos dentro de la constante `COLORS`):** `bg "#04070a"`; `ground "#39ff14"`; `cannon "#39ff14"`; `bunker "#39ff14"`; `rows ["#7df9ff", "#39ff14", "#39ff14", "#ffd166", "#ffd166"]` (un color por fila, alineado con `ROW_POINTS` 30/20/20/10/10); `ufo "#ff2e88"`; `explosion "#ff9f1c"` (restos del cañón); `playerBullet "#eaffea"`; `alienBullet "#ff6b6b"`. **No hay ningún literal inline fuera de `COLORS` y no hay un solo asset binario:** los invasores, el UFO, el cañón y sus restos son bitmaps de texto pintados celda a celda con `fillRect`, y los búnkeres son una máscara booleana de 22×16 celdas de 3 px. El motor tampoco dibuja HUD de texto: puntaje, vidas y nivel viven en el HUD de React.

**Los dos problemas propios de este juego, y cómo se resolvieron:**

1. *Un búnker dañado se veía igual que uno intacto, solo con menos celdas.* `InvasoresPalette` gana el campo **`bunkerEdge: string | null`**: cuando no es `null`, las celdas **expuestas** (perímetro de la máscara, o con al menos un vecino ortogonal apagado) se pintan con un segundo color, así que cada cráter abierto por un disparo se rodea de su propio canto iluminado y la erosión se lee de un vistazo. `classic` lo deja en `null` y conserva el búnker monocromo con exactamente el mismo bucle de dibujo de antes.
2. *El proyectil enemigo y el del jugador eran dos rectángulos de 3×12 idénticos salvo el color.* La paleta gana **`alienBulletStyle: "solid" | "zigzag"`**: `zigzag` parte el proyectil alienígena en 4 segmentos que alternan 1 px a cada lado, evocando los *squiggly shots* del arcade. Es la diferencia de **forma** —no solo de tono— que pide la regla de legibilidad. El desvío es de 1 px a propósito, para que la silueta no se salga de la caja de colisión real, que no cambia con la skin.

**Paleta classic:** los 9 valores extraídos tal cual, sin alterar uno solo, más `bunkerEdge: null`, `alienBulletStyle: "solid"` y todos los `glow` en 0. Control de regresión: con `classic` activa el motor emite exactamente las mismas llamadas de dibujo que antes de existir las skins (`setGlow()` no toca el contexto cuando el valor es 0, y la ruta monocromo del búnker es el bucle original intacto).

**Paleta retro:** fósforo CRT cálido —ámbar, verde fósforo, lima y blanco hueso—, sin un solo azul (adiós al cian `#7df9ff` de la fila superior). Fondo `#0a0704`. **Lo tuyo es blanco hueso**, el elemento más luminoso de la pantalla: cañón `#fff4d6` y su proyectil `#fff9e6`. Formación en rampa de valor descendente: fila 0 (30 pts) lima `#c9ff5e`, filas 1–2 (20 pts) verde fósforo `#7dff86`, filas 3–4 (10 pts) ámbar `#ffd447`. Búnkeres de tierra `#8c5a1e` con canto expuesto crema `#ffe0a3`. UFO naranja `#ff8a3d` (el único naranja: es el bonus). Línea del suelo ámbar `#ffb02e`. Todo lo que puede matarte, en rojo-naranja `#ff5b3d`: proyectil alienígena (en zigzag) y restos del cañón. Sin brillo.

**Paleta neon:** paleta de la plataforma (`app/globals.css`) sobre su propio `--bg` `#0a0a0f`, con **semántica de color explícita**: cian es tuyo (cañón `#00f5ff` con `glow 12`, línea del suelo `#00f5ff` con `glow 8`, canto de los búnkeres `#7df9ff` sobre relleno teal `#0a6f8c`); **amarillo es tu disparo** y lo único amarillo del canvas (`#f5ff00`, `glow 12`); **verde es el bonus** y lo único verde (UFO `#00ff88`, `glow 14`); la formación es violeta/magenta/rosa (fila 0 `#c77dff`, filas 1–2 `#ff006e`, filas 3–4 `#ff7ac6`); el peligro que baja es coral `#ff4d4d` con `glow 10` y silueta en zigzag; la explosión del cañón es naranja `#ff8a3d` con `glow 14`, el único naranja.

**Archivos tocados:** `components/games/invasores/{skins.ts, engine.ts, invasores-canvas.tsx, leaderboard.ts}` · `components/game-player.tsx` (registro `SKINS_BY_GAME` + `SKIN_STORAGE` + prop `skin` al `<InvasoresCanvas>`) · `components/games/shared/types.ts` (`skin` pasa a obligatorio) · `components/games/asteroids/asteroids-canvas.tsx` (solo tipos: se borra la intersección `& { skin?: GameSkin }`, ya redundante)

**Notas de contraste y decisiones:**

- Ningún elemento jugable es más oscuro que el fondo de la app (`#0a0a0f`) en ninguna de las tres skins, y no hay grises medios en ninguna: el motor original ya era monocromo-neón, así que no había ni uno que heredar.
- Cañón vs invasores: nunca se distinguen solo por tono. En `classic` el cañón comparte el verde `#39ff14` con las filas 1–2 (así nació el motor y así se queda, porque es el control de regresión), pero en `retro` el cañón es el único blanco hueso contra una formación lima/verde/ámbar, y en `neon` es el único cian contra una formación violeta/magenta/rosa. En las tres, además, el cañón es lo único que se mueve en horizontal por decisión del jugador.
- Proyectil propio vs proyectil enemigo: en `retro` y `neon` difieren en tono **y** en forma (recto vs zigzag) **y** en dirección de viaje. En `neon` el propio es amarillo y el enemigo coral; en `retro`, blanco hueso contra rojo-naranja.
- Filas contiguas de la formación: se comprobó par a par que dos filas adyacentes con distinto puntaje nunca comparten tono, y las filas que sí lo comparten son justo las que valen lo mismo (1–2 y 3–4), replicando la agrupación del arcade original. Además cada grupo tiene su propio sprite (`SPRITE_SQUID`, `SPRITE_CRAB`, `SPRITE_OCTOPUS`), así que la diferencia también es de forma.
- **El brillo está deliberadamente apagado en los invasores y en los búnkeres, en las tres skins** (`glow.invader = 0`, `glow.bunker = 0`), y no por olvido: ambos se dibujan celda a celda, así que encender `shadowBlur` ahí serían entre 2 000 y 3 500 pasadas de blur por frame (55 sprites de ~45 celdas + 4 máscaras de 22×16), muy por encima del precedente de Tetris (~200 bloques). El halo se reserva para los elementos de conteo bajo: cañón, restos, UFO, proyectiles y la línea del suelo, ~135 llamadas en el peor caso. Los campos existen igual en la paleta, para que subirlos sea un solo valor si algún día se coalescen los sprites en runs horizontales.
- El brillo se maneja con `setGlow()` / `clearGlow()`, mismo patrón que Frogger y Arkanoid: `setGlow()` **no toca el contexto** cuando el valor es 0, y `clearGlow()` resetea `shadowBlur` a 0 tras cada elemento para que el halo no se filtre al resto del frame.
- El motor sigue sin tocar `document`, `window` ni `localStorage`: la paleta entra solo por `setSkin()`. Sí sigue tocando `document` el wrapper `invasores-canvas.tsx` (`document.activeElement`, para ignorar teclas escritas dentro de un `<input>`), que es preexistente y ajeno a las skins.
- `components/games/invasores/leaderboard.ts` ganó `getInvasoresSkin()`/`setInvasoresSkin()` sobre la clave `"invasores-skin"`, con `try/catch` y validación vía `isGameSkin()`. Sus funciones de Supabase (`invasores_scores`) no se tocaron: la preferencia de UI no sale de `localStorage`.
- **Duda abierta:** `retro` y `neon` cambian el fondo que pinta el motor (`#0a0704` y `#0a0a0f` en vez de `#04070a`). Es un cambio casi imperceptible bajo el marco CRT, elegido para acompañar la temperatura de cada paleta; si se prefiere `#04070a` en las tres, es un solo campo por paleta.
- **Duda abierta:** el canto del búnker se recalcula por celda en cada frame (`isBunkerEdge()`: 4 lecturas de vecinos × ~350 celdas × 4 búnkeres). Es aritmética pura sobre un array booleano y no mueve la aguja frente a los `fillRect`, pero si algún día molesta, la máscara de cantos se puede cachear e invalidar solo en `eraseBunkerCells()` y en `crushBunkers()`.
- **Duda abierta:** en `neon` el cañón `#00f5ff` y el canto de los búnkeres `#7df9ff` son dos cianes emparentados. Es deliberado ("todo lo tuyo es cian") y se separan por luminancia, por brillo (`glow 12` vs 0) y por forma (un sprite que se mueve vs cuatro masas estáticas); si se prefiere separarlos también por tono, el canto puede pasar a `#00ff88` moviendo el UFO a otro color.
