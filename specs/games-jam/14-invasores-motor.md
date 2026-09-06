# SPEC 14 — Invasores real: motor de canvas que reemplaza el reproductor simulado de `invasores`

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 05
> **Date:** 2026-09-05
> **Objective:** Construir un motor real de canvas para Space Invaders (formación de 5×11 invasores, 4 búnkeres destructibles, UFO de bonus y oleadas infinitas) que reemplaza el reproductor simulado de la entrada `invasores` del catálogo, todavía sin persistencia.

## Why this spec exists

`invasores` es una de las tres entradas del catálogo que hoy sigue con el reproductor simulado (`setInterval` sumando puntos al azar, specs 01/05). La bitácora `references/game-suggestion-todo.md` lo tiene fichado con **encaje 9/10**, la puntuación más alta de la ronda 1 junto con `2048`, y con sus mecánicas ya verificadas contra fuentes. Su ficha lo resume así: es el candidato con menos fricción contra `recipe.md` — movimiento en grilla por pasos discretos, cero física real, dibujable con `ctx.fillRect` sin un solo asset binario, y una puntuación monótona y bien documentada que hace un leaderboard `score DESC` significativo desde la primera partida.

El trabajo se parte en **dos** specs (14 y 15), siguiendo el precedente de Frogger (09 → 10) y no el de Snake (spec 08, que metió motor y leaderboard en un solo documento): primero el motor jugable, después su leaderboard en Supabase. Esta primera deja el juego jugable de punta a punta y commiteable por sí sola, sin tocar Supabase ni aplicar ninguna migración.

## Scope

**In:**

- `components/games/invasores/engine.ts`: motor construido desde cero, sin código fuente de referencia en `references/`, según las mecánicas confirmadas más abajo.
  - Canvas fijo de **800×600px** (el tamaño que fija el brief de la ficha), dibujado proceduralmente con `ctx`.
  - **Formación de 5 filas × 11 columnas = 55 invasores.** Tres especies según la fila: fila 0 (la de arriba) vale **30 pts**, filas 1–2 valen **20 pts**, filas 3–4 valen **10 pts** → **990 puntos por pantalla limpia**.
  - **Movimiento de la formación:** se actualiza **un invasor vivo por frame**, en orden. La formación completa avanza cuando se recorrieron todos los vivos, así que con 55 invasores tarda 55 frames y con 1 invasor tarda 1 — la aceleración es emergente, no una tabla de velocidades. Ver Decisions.
  - Al tocar cualquier borde lateral, **toda** la formación baja un escalón e invierte la dirección.
  - **Cañón del jugador** en la parte baja, movido con `←`/`→` **y** `A`/`D` simultáneamente, disparo con `Space`.
  - **Un solo proyectil del jugador en pantalla a la vez**: no se puede volver a disparar hasta que el anterior impacta o sale por arriba. Ver Decisions.
  - **Disparos alienígenas:** hasta 3 simultáneos en pantalla, cada uno originado en el invasor **más bajo** de una columna con invasores vivos, elegida al azar. Cadencia y velocidad escalan con el nivel.
  - **4 búnkeres destructibles**, erosionables disparo a disparo por **ambos** bandos, y arrasados si un invasor los atraviesa. Se modelan como máscara de celdas, no como rectángulo entero. Ver Data model.
  - **UFO de bonus** que cruza la parte superior cada cierto tiempo. Su valor **no es aleatorio**: recorre la secuencia fija `(50,50,100,150,100,100,50,300,100,100,100,50,150,100,100)` indexada por el ordinal del disparo que lo derriba (`(shotsFired - 1) % 15`, ver Decisions).
  - **3 vidas.** Se pierde una cuando un disparo alienígena impacta el cañón.
  - **Fin de partida inmediato** (sin importar las vidas restantes) si la formación desciende hasta la altura de los búnkeres.
  - **Oleadas infinitas:** al limpiar los 55 invasores sube el nivel, la formación se regenera **más abajo** que la anterior (con tope, ver Decisions) y los disparos alienígenas se aceleran. `level` empieza en 1 y no tiene tope.
  - **Vida extra** al alcanzar cierto puntaje una única vez en la partida.
- **Explosión del cañón al perder una vida** (agregado al alcance a pedido explícito durante la implementación, ver Decisions): el cañón se dibuja destruido con dos fotogramas de restos que alternan, y la partida entera — formación, disparos y UFO — se congela durante `DEATH_MS`. Al terminar reaparece centrado, o se emite el game over si era la última vida.
  - Stats acumuladas durante toda la partida y expuestas en el resultado: `aliensKilled`, `ufosHit` y `shotsFired`.
- `components/games/shared/types.ts`: `InvasoresGameOverResult = GameOverResult & { aliensKilled: number; ufosHit: number; shotsFired: number }`.
- `components/games/invasores/invasores-canvas.tsx`: wrapper `forwardRef<GameCanvasHandle, GameCanvasProps<InvasoresGameOverResult>>` siguiendo el contrato de `recipe.md` (`callbacksRef`, listeners de teclado en `useEffect` mount-only con guard de `document.activeElement?.tagName === "INPUT"`, cleanup que cancela el RAF y remueve listeners, `useImperativeHandle` para `restart`).
- `components/game-player.tsx`: `isInvasores = game.id === "invasores"`, incorporado a `isPortedGame`; rama del ternario que monta `<InvasoresCanvas>`; slice de estado `invasoresResult`; rama en `handleForceEnd`. **Sin** prop `leaderboard` (ya es opcional en `GameOverModal`): el modal de fin de partida muestra el resultado sin tabla de top-5 hasta la spec 15.

**Out of scope (for future specs):**

- Toda la persistencia: tabla `invasores_scores`, `leaderboard.ts`, `SCORE_TABLE`, `InvasoresScoreRow` y Salón de la Fama. **Va entera en la spec 15.**
- Las **skins** del juego (`skins.ts`, `setSkin()` en el motor, prop `skin` propagada). El motor nace con su paleta fija; el contrato de `components/games/shared/skins.ts` lo completa después el agente `skin-designer`, igual que hizo con Frogger tras la spec 09. `GameCanvasProps` ya declara `skin?: GameSkin` como opcional, así que no hace falta tocarlo.
- La **capa de presentación de la precisión de tiro** (cartel en el canvas, columna en el Salón, stat visible en el modal). El motor **sí** cuenta `shotsFired` y `aliensKilled` porque los necesita como mecánica — `shotsFired` es lo que indexa la tabla del UFO — pero mostrarlos como "precisión" es alcance de una spec futura.
- Controles táctiles / mobile. `components/MobileGamepad.tsx` **no existe en el repo** pese a lo que dice la definición del agente `mobile-porter`; hasta que exista no hay patrón que seguir. Ver Risks.
- Renombrar el `id` o el `title` del catálogo: se quedan en `invasores`/`INVASORES`. Ver Decisions.
- Dibujo con sprites o assets binarios: todo procedural con `ctx`.
- Rediseño responsive del canvas (tamaño fijo 800×600, solo el `max-width:100%; height:auto` ya existente en `.crt-screen`).
- Sonido o música — incluido el icónico bajo de cuatro notas que acelera con la formación.
- Los otros 2 juegos simulados del catálogo (`gloton`, `duelo-pixel`) siguen exactamente igual.
- Actualizar `CLAUDE.md` y `references/implemented-games.md`.
- Tests automatizados.

## Data model

Esta spec **no introduce datos persistidos**: no toca Supabase ni `localStorage`. Las estructuras nuevas viven solo en memoria dentro del motor.

```ts
// components/games/invasores/engine.ts
export const INVASORES_WIDTH = 800;
export const INVASORES_HEIGHT = 600;

export const ROWS = 5;
export const COLS = 11; // 5 * 11 = 55 invasores

export const INVADER_W = 32;
export const INVADER_H = 24;
export const COL_STEP = 48; // 11 * 48 - 16 = 512px de formación
export const ROW_STEP = 40;

export const FORMATION_TOP = 96; // y de la fila 0 en la oleada 1
export const STEP_X = 7; // px que avanza un invasor por paso (ver Decisions)
export const STEP_DOWN = 8; // px que baja la formación al tocar un borde

export const CANNON_Y = 540;
export const BUNKER_Y = 460; // si la formación llega aquí, game over inmediato
export const GROUND_Y = 570;

export const START_LIVES = 3;
export const MAX_ALIEN_BULLETS = 3;

/** Puntos por fila, de arriba (0) hacia abajo (4). */
export const ROW_POINTS = [30, 20, 20, 10, 10] as const;

/** El UFO no vale un valor aleatorio: se indexa con shotsFired % 15. */
export const UFO_TABLE = [
  50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100, 100,
] as const;

/** Búnker como máscara de celdas erosionables, no como rectángulo entero. */
export const BUNKER_COUNT = 4;
export const BUNKER_CELL = 3; // px por celda de la máscara
export const BUNKER_COLS = 22; // 66px de ancho
export const BUNKER_ROWS = 16; // 48px de alto

type Bunker = {
  x: number;
  y: number;
  /** true = celda intacta. Un impacto apaga las celdas dentro de un radio. */
  cells: boolean[][];
};

type Invader = {
  row: number; // fija la especie y los puntos vía ROW_POINTS
  col: number;
  x: number;
  y: number;
  alive: boolean;
};
```

```ts
// components/games/shared/types.ts
export type InvasoresGameOverResult = GameOverResult & {
  /** Invasores destruidos en toda la partida (no incluye UFOs). */
  aliensKilled: number;
  /** UFOs de bonus derribados. */
  ufosHit: number;
  /** Disparos efectuados por el jugador. Indexa además la tabla del UFO. */
  shotsFired: number;
};
```

## Implementation plan

1. Agregar `InvasoresGameOverResult` a `components/games/shared/types.ts`. Verificación: `npm run build` sin errores de tipos.
2. Crear `components/games/invasores/engine.ts` con la geometría y la formación estática: constantes exportadas, los 55 invasores colocados en su grilla, el cañón y los 4 búnkeres construidos con su máscara de celdas. Todavía sin movimiento. Verificación: dibujando solo el estado inicial, se ven las 5 filas de 11, el cañón y los 4 búnkeres bien repartidos dentro de los 800×600.
3. Agregar el movimiento de la formación: un invasor vivo actualizado por frame, avance de `STEP_X`, y bajada de `STEP_DOWN` con inversión de dirección al tocar un borde. Verificación manual: la formación barre de lado a lado y **acelera visiblemente** a medida que se le quitan invasores a mano desde el estado inicial.
4. Agregar el cañón y su disparo: movimiento con `←`/`→` y `A`/`D`, un único proyectil en pantalla a la vez, y colisión proyectil↔invasor que mata al invasor y suma sus puntos según `ROW_POINTS`. Verificación manual: limpiar una pantalla completa da exactamente 990 puntos.
5. Agregar los disparos alienígenas: hasta 3 simultáneos, originados en el invasor más bajo de una columna viva elegida al azar, y colisión disparo↔cañón que descuenta una vida. Verificación manual: perder las 3 vidas dispara `onGameOver`.
6. Agregar los búnkeres destructibles: erosión por celdas con los impactos de ambos bandos, y arrasado del búnker que un invasor atraviesa. Verificación manual: un búnker se desgasta progresivamente por arriba con los disparos alienígenas y por abajo con los propios, y deja pasar los disparos por los huecos ya abiertos.
7. Agregar el UFO: aparición periódica cruzando la parte superior, y valor tomado de `UFO_TABLE[shotsFired % 15]` al derribarlo. Verificación manual: derribarlo con el disparo número 23 de la partida da 300 puntos.
8. Agregar la progresión y el fin de partida: al limpiar los 55 sube el nivel, la formación se regenera más abajo y los disparos alienígenas se aceleran; game over inmediato si la formación alcanza `BUNKER_Y`; vida extra al llegar al umbral de puntaje, una sola vez. Verificación manual: el HUD sube de nivel al cerrar la oleada y el descenso total de la formación se detiene en el tope declarado.
9. Crear `components/games/invasores/invasores-canvas.tsx` según el contrato de `recipe.md`, dibujando todo proceduralmente con `ctx`, sin assets. Verificación manual: el canvas monta, responde al teclado, y desmontar la pantalla no deja listeners ni RAF corriendo.
10. Conectar en `components/game-player.tsx`: `isInvasores`, `isPortedGame`, rama del ternario, `invasoresResult`, rama en `handleForceEnd`. Verificación manual: jugar una partida completa desde `/games/invasores/play`, perder las 3 vidas, ver el modal de fin de partida sin tabla de puntajes, y que "JUGAR DE NUEVO" y "SALIR" funcionen.
11. Verificación final de conjunto: `npm run build` y `npm run lint`.

## Acceptance criteria

- [ ] `/games/invasores/play` muestra el Space Invaders real dentro del `crt-screen`, en un canvas de 800×600.
- [ ] La pantalla inicial tiene exactamente 55 invasores en 5 filas de 11, 4 búnkeres y un cañón.
- [ ] El cañón se controla con `←`/`→` **y** con `A`/`D`, y dispara con `Space`.
- [ ] Solo puede haber **un** proyectil del jugador en pantalla: pulsar `Space` con un disparo en vuelo no genera un segundo.
- [ ] Matar un invasor de la fila superior suma 30 puntos, uno de las dos filas medias 20, y uno de las dos inferiores 10.
- [ ] Limpiar una pantalla completa suma exactamente 990 puntos.
- [ ] La formación **acelera** a medida que quedan menos invasores, y el último invasor vivo se mueve notoriamente más rápido que la formación completa.
- [ ] Al tocar un borde lateral, **toda** la formación baja un escalón e invierte la dirección.
- [ ] Nunca hay más de 3 disparos alienígenas simultáneos en pantalla, y cada uno sale del invasor más bajo de su columna.
- [ ] Recibir un impacto descuenta una vida; el HUD muestra 3 al empezar y llega a 0 tras el tercer impacto, momento en el que aparece el modal de fin de partida.
- [ ] Los búnkeres se erosionan celda a celda con los disparos de **ambos** bandos, y un hueco ya abierto deja pasar los disparos siguientes.
- [ ] Un invasor que atraviesa un búnker lo arrasa.
- [ ] El UFO derribado con el disparo número 23 de la partida vale 300 puntos, y su valor sale siempre de `UFO_TABLE`, nunca de un aleatorio.
- [ ] Que la formación alcance la altura de los búnkeres termina la partida de inmediato, aunque queden vidas.
- [ ] Limpiar los 55 invasores sube el nivel y regenera la formación más abajo que la oleada anterior, hasta el tope declarado.
- [ ] El resultado de fin de partida lleva `aliensKilled`, `ufosHit` y `shotsFired` con los valores reales de la partida, no ceros.
- [ ] El modal de fin de partida aparece sin tabla de top-5 (esta spec no tiene persistencia) y "JUGAR DE NUEVO" reinicia el motor a su estado inicial.
- [ ] Los otros 2 juegos simulados (`gloton`, `duelo-pixel`) siguen usando el reproductor simulado exactamente como antes de esta spec.
- [ ] `npm run build` termina sin errores y `npm run lint` no introduce errores nuevos respecto de la rama base.

## Decisions

- **Sí:** es un caso de **upgrade-to-real-engine**, no de entrada nueva. La ficha `invasores` ya existe en `app/data/games.ts` con `cat: "SHOOTER"`, `cover: "cover-invaders"`, `color: "green"` y su copy en Español. No se crea una fila nueva en `GAMES` ni una clase `cover-*` nueva.
- **Sí:** el `id` y el `title` se quedan en `invasores`/`INVASORES`, **sin renombrar a `invaders`**. La convención que fijaron las specs 06, 08 y 09 es que el id coincida con el nombre de la carpeta del motor, y `components/games/invasores/` la cumple tal cual. Los renombrados anteriores existieron porque el id viejo (`rocas`, `serpentina`, `ranaria`) **no** coincidía con su motor; aquí sí coincide, así que renombrar solo rompería la URL `/games/invasores` sin ganar nada.
- **Sí:** la aceleración de la formación se implementa como en el arcade original — **un invasor actualizado por frame** — y no con una tabla de velocidades por invasores restantes. Esto resuelve el "Pendiente de confirmar: velocidad exacta por invasor restante" de la ficha: en el original no hay tal tabla, la aceleración es un efecto secundario de que el bucle solo alcanza a mover un invasor por refresco de pantalla. Reproducir la causa da la curva correcta gratis.
- **Sí:** un solo proyectil del jugador en pantalla a la vez. Resuelve el "Pendiente de confirmar: cadencia de disparo del jugador" de la ficha; es la restricción del original y es también lo que hace que `shotsFired` sea una métrica de puntería y no de machaque de tecla.
- **Sí:** el valor del UFO sale de la secuencia fija indexada por `shotsFired % 15`. Es la mecánica confirmada en la ficha, y es lo que permite el truco clásico de reservar el disparo 23 para cobrar los 300.
- **Sí:** 3 vidas, por coherencia con Asteroids, Arkanoid y Frogger.
- **Sí:** controles de flechas **y** `A`/`D` en simultáneo, siguiendo el precedente de Snake (spec 08) y Frogger (spec 09).
- **Sí:** todo el dibujo es procedural con `ctx`, sin assets binarios. Solo Snake tiene precedente de atlas de sprites en el repo, y aquí no hay assets aportados por el usuario.
- **Sí:** los búnkeres se modelan como máscara de celdas de 3px, no como un rectángulo con "vida". La erosión progresiva y asimétrica es la mitad de la táctica del juego; un búnker con contador de golpes no la reproduce.
- **Sí:** el motor cuenta `aliensKilled`, `ufosHit` y `shotsFired` aunque esta spec no los muestre. `shotsFired` no es opcional — es mecánica core, porque indexa la tabla del UFO — y los otros dos salen del mismo bucle sin costo. Es el mismo criterio con el que la spec 09 dejó calculados `frogsHome` y `timeBonus` antes de que la 10 los persistiera.
- **No:** el marcador **no** satura como el arcade original, que envuelve a 0 tras 9990. Un leaderboard `score DESC` necesita el rango completo; saturar produciría empates artificiales en la cima. Mismo criterio que la spec 09.
- **No:** sin sonido. El bajo de cuatro notas que acelera con la formación es parte de la identidad del juego, pero ningún juego del repo tiene audio y esta spec no va a ser la primera en abrir ese frente.
- **No:** esta spec no toca Supabase ni `localStorage`. La separación limpia entre motor y persistencia es lo que hace que la spec 14 sea commiteable sola.
- **No:** sin skins en esta spec. El precedente de Frogger es que el motor nace con paleta fija y el agente `skin-designer` agrega `skins.ts`, `setSkin()` y la prop `skin` en una pasada posterior. Adelantarlo aquí duplicaría ese trabajo.
- **Confirmado durante la implementación — descenso por oleada:** la formación de la oleada N empieza `WAVE_DROP` = `ROW_STEP / 2` = 20px más abajo que la de la N−1, con tope tras 8 oleadas (`WAVE_DROP_MAX_LEVEL`). Con `ROW_STEP` entero (40px) la cuenta no cierra en este canvas: la base de la formación nace en `280 + (N−1)*40` y alcanza `BUNKER_Y` = 460 en la **oleada 6**, que terminaría la partida sola al aparecer. Con 20px la oleada 8 en adelante nace con su fila inferior 40px sobre los búnkeres. La ficha marca "cuántas filas baja cada oleada nueva y si hay tope" como no confirmado; el tope existe porque sin él la oleada 12 nacería ya dentro de los búnkeres, haciendo el juego imposible por construcción y no por dificultad.
- **Decisión pendiente de confirmar — vida extra:** se otorga una única vida extra a los **1500 puntos**. La ficha marca "si hay vida extra por puntaje" como no confirmado; el original lo dejaba en un DIP switch del operador con 1000 o 1500 como opciones, y se toma 1500.
- **Confirmado durante la implementación — `STEP_X` = 7, no 2:** los 2px del arcade original se miden sobre una pantalla de 224px de ancho; este canvas mide 800px. Sin reescalar por ese factor (800/224 ≈ 3.57), un barrido con la formación completa tarda ~2 minutos y el primer minuto y medio de cada oleada es prácticamente estático. Medido headless: con `STEP_X` = 2 la formación llena avanza a 2.1 px/s; con 7, a 7.2 px/s (y el último invasor vivo, a 410 px/s). La arquitectura de "un invasor por tick lógico a 60Hz" no cambia.
- **Confirmado durante la implementación — el índice del UFO es `(shotsFired - 1) % 15`:** `shotsFired` ya contabiliza el disparo en vuelo, así que `shotsFired % 15` haría que los 300 puntos cayeran en el disparo **22**, contradiciendo tanto el criterio de aceptación como el truco clásico del disparo 23 citado más arriba. Indexar por el ordinal del disparo (`n - 1`) deja el disparo 23 en `UFO_TABLE[7]` = 300.
- **Agregado al alcance durante la implementación — explosión del cañón:** la spec original no contemplaba ninguna animación de muerte y `loseLife()` resolvía todo en el mismo tick. Se agregó a pedido explícito del autor de la spec, ya con los 19 criterios de aceptación cumplidos. `loseLife()` ahora descuenta la vida en el acto (el HUD no se demora) y arranca la animación; el recentrado del cañón y el `onGameOver` de la última vida ocurren al terminarla. La explosión del invasor derribado y el cartel con el valor del UFO **siguen fuera de alcance**.
- **Confirmado durante la implementación — el arrasado de búnkeres se evalúa en cada tick**, no solo al bajar la formación: un invasor también puede atravesar un búnker lateralmente, barriendo a su altura, y la spec dice "atraviesa", no "desciende sobre".
- **Pendiente de confirmar:** frecuencia y algoritmo exactos de disparo de los invasores en el original (el arcade usa tablas de columnas preferidas por tipo de disparo). Esta spec fija "columna viva al azar, invasor más bajo, máximo 3 simultáneos". Valores fijados durante la implementación y documentados en `engine.ts`: cadencia 900ms en la oleada 1, −80ms por oleada, mínimo 260ms; velocidad 200 px/s, +26 px/s por oleada, máximo 420 px/s.
- **Confirmado durante la implementación — UFO:** aparece cada 18s, cruza a 130 px/s por `y` = 52, alternando el lado de entrada en cada aparición.

## Risks

| Risk                                                                                                                                                                                       | Mitigation                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Un invasor por frame" produce una velocidad que depende del framerate del dispositivo: a 144Hz la formación va al doble de rápido que a 60Hz.                                             | El paso se acumula por tiempo transcurrido (`dt`), no por frame contado, manteniendo el **orden** de un invasor por tick lógico a 60Hz fijos. Tiene criterio de aceptación propio sobre la aceleración relativa, no sobre la velocidad absoluta. |
| Los búnkeres como máscara de celdas son la parte más cara del motor y la más fácil de dejar a medias (erosión que no bloquea disparos, o que bloquea de más).                              | Es un paso propio del plan (6) con verificación manual explícita en los dos sentidos, y dos criterios de aceptación separados: erosión por ambos bandos y hueco que deja pasar.                                                                  |
| No existe código fuente de referencia para Space Invaders en `references/`, así que no hay implementación "correcta" contra la cual comparar.                                              | Cada mecánica queda fijada por escrito en Scope y Decisions, con las fuentes citadas en la ficha de la bitácora; lo no confirmable queda listado como **Pendiente de confirmar** en vez de afirmarse como hecho.                                 |
| La definición del agente `mobile-porter` promete un patrón táctil basado en `components/MobileGamepad.tsx` y `app/games/tetris/play/page.tsx`, y **ninguno de los dos existe** en el repo. | El soporte táctil queda explícitamente fuera de alcance. Si se quiere, primero hay que crear el componente y actualizar ese agente, en su propia spec.                                                                                           |
| El canvas de 800×600 no es responsive más allá de no desbordar su contenedor.                                                                                                              | Precedente aceptado de los cinco juegos reales: se reutiliza el `max-width:100%; height:auto` ya existente en `.crt-screen`, sin rediseño.                                                                                                       |

## What is **not** in this spec

- Tabla `invasores_scores`, `leaderboard.ts`, `SCORE_TABLE`, `InvasoresScoreRow` y Salón de la Fama (spec 15).
- Skins (`skins.ts`, `setSkin()`, prop `skin`) — las agrega el agente `skin-designer` después.
- Presentación de la precisión de tiro como stat visible.
- Controles táctiles / mobile.
- Assets binarios o dibujo con sprites.
- Sonido o música.
- Rediseño responsive del canvas.
- Cambios en los otros juegos simulados del catálogo.
- Actualizar `CLAUDE.md` o `references/implemented-games.md`.
- Validación anti-cheat de puntajes.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
