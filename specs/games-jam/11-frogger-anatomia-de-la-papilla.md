# SPEC 11 — Anatomía de la papilla: causas de muerte y skins temáticas de Frogger

> **Status:** Draft
> **Depends on:** SPEC 09, SPEC 10
> **Date:** 2026-08-30
> **Objective:** Instrumentar en el motor de Frogger cómo muere el jugador, persistir esas causas como columnas propias del leaderboard, y darle al juego dos selectores de skin y tema en el HUD siguiendo el precedente de la spec 07.

## Why this spec exists

El tema de la game jam fue **"cruza la carretera y el río sin convertirte en papilla"**. Las dos specs anteriores construyen el juego y su ranking, pero ninguna se ocupa de la mitad del tema que importa: **la papilla**. Frogger no es un juego sobre llegar, es un juego sobre las muchas formas distintas de no llegar — atropellado, ahogado, arrastrado río abajo, tarde.

Esta spec convierte eso en algo que el sistema realmente sabe. El motor pasa a clasificar cada muerte por causa, el leaderboard guarda ese desglose, y el jugador ve al morir un cartel que le nombra su propio desenlace. Encima va la capa cosmética que hace que el juego se sienta de esta jam: dos selectores en el HUD, exactamente como Tetris los tiene desde la spec 07.

Es la tercera y última spec de la jam. Es también la única que introduce cambios en los tres frentes a la vez: motor, base de datos y HUD.

## Scope

**In:**

- `components/games/frogger/engine.ts`: tipo `DeathCause` con las seis causas ya implementadas en la spec 09, y un contador por causa acumulado durante toda la partida. El motor expone la causa de la muerte más reciente para que el canvas pueda dibujarla.
- `components/games/shared/types.ts`: `FroggerGameOverResult` se extiende con `roadDeaths`, `riverDeaths` y `timeouts`.
- Migración SQL con `alter table`: se agregan `road_deaths`, `river_deaths` y `timeouts` a `"arcade-vault"."frogger_scores"`, todas `integer not null default 0`. La tabla ya existe desde la spec 10; **no** se recrea.
- `components/games/frogger/leaderboard.ts`: `getFroggerLeaderboard()` selecciona además las tres columnas nuevas y `addFroggerScore()` las inserta desde el `FroggerGameOverResult`.
- Cartel de muerte dibujado en el canvas, breve, según la causa: `¡PAPILLA!` para atropello, `¡GLUP!` para agua y tortuga sumergida, `¡RÍO ABAJO!` para arrastre fuera de pantalla, `¡OCUPADO!` para casa ocupada o matorral, `¡TARDE!` para temporizador agotado. Es el remate temático de la jam.
- Selectores `SKIN` y `TEMA` en la fila de stats del HUD de `components/game-player.tsx`, junto a Jugador, Puntuación, Vidas y Nivel — el mismo lugar y el mismo mecanismo que Tetris usa desde la spec 07.
  - `SKIN` cambia el aspecto de la rana; `TEMA` cambia la paleta del tablero entre día y noche neón.
  - El estado lo posee `GamePlayer`, con un default seguro para SSR corregido post-montaje desde `localStorage`. `FroggerCanvas` los recibe como **props controladas**, nunca los maneja internamente.
- `components/games/frogger/frogger.module.css`: las variables de paleta se declaran alcanzadas a la clase raíz del módulo y se conmutan con una clase modificadora sobre el elemento raíz del propio componente.
- Persistencia de las preferencias de UI (`skin` y `theme`) en `localStorage`, envuelta en `try`/`catch`, dentro de `components/games/frogger/leaderboard.ts` — mismo archivo y mismo patrón que `getTetrisTheme`/`setTetrisSkin`.
- El modal de fin de partida y las tablas de top-5 muestran el desglose de causas junto al puntaje.

**Out of scope (for future specs):**

- Cambiar las mecánicas de juego de la spec 09. Esta spec **observa y presenta** cómo se muere; no agrega ni quita formas de morir.
- Serpientes, cocodrilos y nutrias.
- Mostrar el desglose de causas en `/salon` o en la ficha `/games/frogger`: esas vistas siguen mostrando puntaje y nivel como para el resto de los juegos.
- Aplicar el mismo tratamiento de causas de muerte a los otros juegos reales del catálogo.
- Logros, insignias o estadísticas agregadas entre partidas.
- Sonido o música asociada a las muertes.
- Actualizar `CLAUDE.md` y `references/implemented-games.md`.
- Tests automatizados.

## Data model

```sql
-- migration: la tabla ya existe desde la spec 10, solo se extiende
alter table "arcade-vault"."frogger_scores"
  add column road_deaths integer not null default 0,
  add column river_deaths integer not null default 0,
  add column timeouts integer not null default 0;
```

```ts
// components/games/frogger/engine.ts
export type DeathCause =
  | "road" // atropellada por un vehículo
  | "river" // cayó al agua
  | "turtle" // se quedó sobre una tortuga sumergida
  | "swept" // arrastrada fuera de pantalla sobre una plataforma
  | "home" // casa ocupada o matorral
  | "timeout"; // se agotó el temporizador

type DeathTally = Record<DeathCause, number>;
```

```ts
// components/games/shared/types.ts
export type FroggerGameOverResult = GameOverResult & {
  frogsHome: number;
  timeBonus: number;
  roadDeaths: number; // = tally.road
  riverDeaths: number; // = tally.river + tally.turtle + tally.swept
  timeouts: number; // = tally.timeout
};
```

```ts
// components/games/frogger/leaderboard.ts — prefs de UI, nunca en Supabase
export type FroggerSkin = "clasica" | "neon" | "papilla";
export type FroggerTheme = "dia" | "noche";
// getFroggerSkin/setFroggerSkin y getFroggerTheme/setFroggerTheme,
// sobre localStorage y envueltos en try/catch, igual que en tetris/leaderboard.ts.
```

Las seis causas del motor se agrupan en tres columnas a propósito: ver Decisions.

## Implementation plan

1. Agregar `DeathCause` y el contador por causa a `components/games/frogger/engine.ts`, poblado en los seis caminos de muerte que la spec 09 ya implementó. Exponer la causa de la muerte más reciente. Verificación: en una partida de prueba, el contador refleja exactamente las muertes provocadas a mano, una por causa.
2. Extender `FroggerGameOverResult` en `components/games/shared/types.ts` con `roadDeaths`, `riverDeaths` y `timeouts`, y poblarlos desde el contador al disparar `onGameOver`. Verificación: `npm run build` sin errores de tipos; los tres valores llegan correctos al `froggerResult` de `GamePlayer`.
3. Aplicar el `alter table` con `apply_migration` agregando las tres columnas. Verificación: `list_tables` muestra las columnas nuevas; las filas ya existentes quedan en 0 por el `default`.
4. Actualizar `components/games/frogger/leaderboard.ts` para seleccionar e insertar las tres columnas nuevas. Verificación manual: terminar una partida, guardar el nombre, y confirmar en la base de datos que la fila guardó el desglose real y no ceros.
5. Dibujar el cartel de muerte en `frogger-canvas.tsx` según la causa más reciente, con las cinco leyendas listadas en Scope. Verificación manual: provocar cada causa y ver el cartel correspondiente.
6. Crear `components/games/frogger/frogger.module.css` con las variables de paleta alcanzadas a la clase raíz del módulo y una clase modificadora para el tema de noche. Verificación: cambiar el tema no altera ningún color fuera del canvas de Frogger.
7. Agregar el estado de `skin` y `theme` a `components/game-player.tsx` (default seguro para SSR, corregido post-montaje desde `localStorage`) y los dos controles `SKIN` y `TEMA` en la fila de stats del HUD, pasándolos a `FroggerCanvas` como props controladas. Verificación manual: cambiar cualquiera de los dos se refleja al instante en el canvas y sobrevive a recargar la página; no hay error de hidratación en consola.
8. Mostrar el desglose de causas en el modal de fin de partida y en sus filas de top-5. Verificación manual: el desglose del modal coincide con lo que quedó guardado en la base de datos.

## Acceptance criteria

- [ ] El motor clasifica cada muerte en una de las seis causas de `DeathCause` y lleva un contador por causa durante toda la partida.
- [ ] `FroggerGameOverResult` llega a `GamePlayer` con `roadDeaths`, `riverDeaths` y `timeouts` reflejando la partida real.
- [ ] `riverDeaths` agrupa las muertes por agua, por tortuga sumergida y por arrastre fuera de pantalla.
- [ ] La tabla `frogger_scores` tiene las columnas `road_deaths`, `river_deaths` y `timeouts`, y las filas anteriores a la migración quedaron en 0.
- [ ] Un puntaje guardado tras la migración persiste el desglose real de causas, no ceros.
- [ ] Morir atropellado muestra el cartel `¡PAPILLA!` en el canvas.
- [ ] Morir en el agua o sobre una tortuga sumergida muestra `¡GLUP!`; ser arrastrado fuera de pantalla muestra `¡RÍO ABAJO!`.
- [ ] Saltar a una casa ocupada o al matorral muestra `¡OCUPADO!`; agotar el temporizador muestra `¡TARDE!`.
- [ ] El HUD muestra los controles `SKIN` y `TEMA` en la misma fila que Jugador, Puntuación, Vidas y Nivel, solo para Frogger.
- [ ] Cambiar `SKIN` o `TEMA` se refleja de inmediato en el canvas, sin reiniciar la partida en curso.
- [ ] La skin y el tema elegidos sobreviven a recargar la página.
- [ ] No aparece ningún error de hidratación en consola al cargar `/games/frogger/play` con una preferencia guardada distinta del default.
- [ ] Cambiar el tema de Frogger no altera ningún color fuera de su propio canvas: `frogger.module.css` no declara variables en `:root` ni toca `document.body`.
- [ ] El modal de fin de partida muestra el desglose de causas junto al puntaje.
- [ ] `npm run build` termina sin errores y `npm run lint` no introduce errores nuevos.

## Decisions

- **Decisión autónoma del skill:** la capa temática de esta jam son **las causas de muerte**, no un recoloreado. El tema recibido ("sin convertirte en papilla") nombra el fracaso, no el objetivo, así que la spec instrumenta el fracaso: lo clasifica, lo persiste y se lo nombra al jugador. Un recoloreado habría sido relleno.
- **Decisión autónoma del skill:** las seis causas del motor se persisten agrupadas en **tres** columnas (`road_deaths`, `river_deaths`, `timeouts`) y no en seis. Tres columnas cuentan la historia que importa — te mata el asfalto, te mata el agua, o te mata el reloj — y mantienen la tabla legible. El motor conserva las seis por separado en memoria, así que abrir el desglose completo más adelante es un `alter table`, no un rediseño.
- **Decisión autónoma del skill:** `riverDeaths` agrupa agua, tortuga sumergida y arrastre fuera de pantalla, porque las tres son la misma historia desde la orilla: el río te ganó.
- **Sí:** los controles van en la **fila de stats del HUD**, no dentro del canvas ni en una barra propia. Es exactamente lo que la spec 07 decidió para Tetris después de haberlos tenido en otro lado, y no hay razón para reabrir esa decisión aquí.
- **Sí:** el estado de `skin` y `theme` lo posee `GamePlayer` y `FroggerCanvas` los recibe como props controladas. La spec 07 hizo justamente ese movimiento para Tetris (de estado interno del canvas a props controladas); esta spec nace ya del lado correcto.
- **Sí:** default seguro para SSR corregido post-montaje desde `localStorage`. Leer `localStorage` durante el render inicial provoca error de hidratación en Next; es el bug que la spec 07 ya resolvió para Tetris.
- **Sí:** las preferencias de UI van en `localStorage`, dentro de `leaderboard.ts`, envueltas en `try`/`catch`. Nunca en Supabase — y, simétricamente, nunca puntajes en `localStorage`.
- **Sí:** las variables de paleta se declaran alcanzadas a la clase raíz del módulo CSS. Redefinir `:root` o conmutar una clase sobre `document.body` es exactamente lo que obligó a reescribir el CSS de Tetris durante la spec 05.
- **No:** el desglose de causas no se muestra en `/salon` ni en la ficha `/games/frogger`. Esas vistas son comparables entre juegos y meterle columnas propias a uno solo rompe esa simetría. Los datos quedan guardados por si una spec futura los quiere.
- **No:** esta spec no toca las mecánicas de juego. Observa y presenta; no agrega ni quita formas de morir.
- **Pendiente de confirmar:** el original arcade no distingue causas de muerte de ninguna forma visible ni las puntúa. Todo lo de esta spec es capa propia de la plataforma, declarada como tal, no una reconstrucción del original.

## Risks

| Risk                                                                                                                                         | Mitigation                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leer `localStorage` durante el render inicial provoca un error de hidratación en Next.                                                       | Default seguro para SSR corregido post-montaje, el mismo mecanismo ya validado para Tetris en la spec 07, con criterio de aceptación explícito sobre la consola.  |
| Declarar las variables de paleta en `:root` o conmutar una clase sobre `document.body` haría que el tema de Frogger tiña el resto de la app. | `recipe.md` §7 lo prohíbe explícitamente y documenta el incidente de Tetris; hay un criterio de aceptación que verifica que ningún color fuera del canvas cambie. |
| El `alter table` corre sobre una tabla que puede tener filas de la spec 10 sin las columnas nuevas.                                          | Las tres columnas son `not null default 0`, así que las filas existentes quedan en 0 sin bloquear la migración. Verificado en el paso 3.                          |
| Agrupar seis causas en tres columnas pierde información que después alguien quiera.                                                          | El motor mantiene las seis por separado en memoria; recuperar el desglose completo es agregar columnas, no rediseñar. Decisión registrada arriba.                 |
| Los dos controles nuevos pueden desbordar la fila de stats del HUD en viewports angostos, que ya tiene Jugador, Puntuación, Vidas y Nivel.   | La fila de stats ya soporta los dos controles de Tetris desde la spec 07 con la misma cantidad de elementos; se reutiliza ese layout sin inventar uno nuevo.      |

## What is **not** in this spec

- Cambios en las mecánicas de juego de la spec 09.
- Serpientes, cocodrilos y nutrias.
- El desglose de causas en `/salon` o en la ficha `/games/frogger`.
- Causas de muerte para los otros juegos reales del catálogo.
- Logros, insignias o estadísticas agregadas entre partidas.
- Sonido o música.
- Autenticación real o validación anti-cheat de puntajes.
- Actualizar `CLAUDE.md` o `references/implemented-games.md`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec futura.
