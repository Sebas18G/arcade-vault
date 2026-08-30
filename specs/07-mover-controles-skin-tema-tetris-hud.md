# SPEC 07 — Mover controles de skin y tema de Tetris al HUD del reproductor

**Estado:** Implementado
**Depende de:** SPEC 05 (juegos arcade reales)
**Fecha:** 2026-08-30

## Objetivo

Mover el selector de skin y el interruptor de tema de Tetris, que hoy viven flotando encima del canvas del juego, a la barra HUD del reproductor (`player-hud` en `components/game-player.tsx`), junto a los indicadores de Jugador/Puntuación/Vidas/Nivel, como dos controles con el mismo lenguaje visual de botón pixel que ya usa ese HUD.

## Alcance

**Incluye:**

- Quitar de `components/games/tetris/tetris-canvas.tsx` el bloque `topControls` (el `<select>` de SKIN y el switch de TEMA) que hoy se renderiza dentro del contenedor del canvas.
- Agregar dos controles nuevos a la fila de estadísticas del HUD en `components/game-player.tsx` (junto a Jugador/Puntuación/Vidas/Nivel), visibles **solo quando el juego activo es Tetris** (`game.id === "tetris"`).
- Levantar el estado de `skin` y `theme` desde `TetrisCanvas` hacia `GamePlayer`, pasándolo hacia abajo como props controladas (mismo patrón que ya usa `paused`).
- Mantener la persistencia existente en `localStorage` (claves `tetris-skin` y `tetris-theme`, vía las funciones ya existentes en `components/games/tetris/leaderboard.ts`), solo cambiando qué componente las invoca.
- Eliminar el CSS ya sin uso en `tetris.module.css` (`.topControls`, `.skinToggle`, `.themeToggle`, `.switch`, `.slider` y las variables `--switch-track`/`--switch-thumb`) una vez confirmado que nada más las referencia.

**No incluye (fuera de alcance):**

- Cambios en el motor de Tetris (`engine.ts`), en las skins en sí, o en cómo se dibuja el tablero/próxima pieza.
- Cambios al HUD de los otros 6 juegos (`asteroids`, `arkanoid`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — no ganan controles nuevos.
- Agregar más opciones de skin o tema, o exponer estos controles fuera del reproductor (p. ej. en la ficha del juego).
- Cualquier cambio a `tetris-start-level` o a `tetris-best-stats` (otras preferencias que también viven en `localStorage` pero no están involucradas en este pedido).

## Modelo de datos

No se introduce ningún dato ni estructura nueva. Se reutilizan tal cual las claves de `localStorage` `tetris-skin` y `tetris-theme`, y las funciones `getTetrisSkin`/`setTetrisSkin`/`getTetrisTheme`/`setTetrisTheme` ya existentes en `components/games/tetris/leaderboard.ts`. Lo único que cambia es el componente que las llama.

## Plan de implementación

1. **`components/games/tetris/tetris-canvas.tsx`:** convertir `skin` y `theme` en props controladas en vez de estado interno.
   - Agregar `skin: TetrisSkin` y `theme: "dark" | "light"` al tipo de props del componente (extendiendo `GameCanvasProps<TetrisGameOverResult>` localmente en este archivo, sin tocar `components/games/shared/types.ts`, ya que son específicas de Tetris).
   - Eliminar el `useState` local de `skin`/`theme` y el `useEffect` que los inicializaba desde `getTetrisSkin()`/`getTetrisTheme()` al montar (esa lógica se traslada a `GamePlayer`).
   - Los `useEffect` existentes que empujan el skin/tema al motor (`engine.setSkin(skin)`, `setGridColor`) pasan a depender de las props en vez del estado; se les quita la llamada a `setTetrisSkin`/`setTetrisTheme` (la persistencia se dispara ahora desde `GamePlayer`, en el punto donde el usuario hace click).
   - `NextPieceCanvas` recibe `skin` desde las props en vez de desde el estado local.
   - Quitar del JSX el `<div className={styles.topControls}>` completo (el `<select>` de SKIN y el switch de TEMA).
   - Quitar los imports que quedan sin uso en este archivo (`getTetrisSkin`, `getTetrisTheme`, `setTetrisSkin`, `setTetrisTheme`).

2. **`components/games/tetris/tetris.module.css`:** eliminar las reglas que quedan muertas: `.topControls`, `.skinToggle` (y su `label`/`select`), `.themeToggle` (y `.icon`), `.switch`/`.switch input`/`.switch .slider`/`.switch .slider::before`/`.switch input:checked + .slider`/`.switch input:checked + .slider::before`, y las variables `--switch-track`/`--switch-thumb` en `.container`/`.container.light`. Verificar antes de borrar que ninguna otra regla del archivo las reutiliza.

3. **`components/game-player.tsx`:** levantar el estado y agregar los controles al HUD.
   - Importar `TetrisSkin` desde `@/components/games/tetris/engine` y `getTetrisSkin`, `getTetrisTheme`, `setTetrisSkin`, `setTetrisTheme` desde `@/components/games/tetris/leaderboard`.
   - Definir la lista ordenada de skins para el ciclo: `retro → neon → pastel → pixel` (con etiquetas de display "Retro", "Neon", "Pastel", "Pixel Art", igual que las opciones que tenía el `<select>` original).
   - Agregar `skin`/`theme` como estado local (`useState<TetrisSkin>("retro")`, `useState<"dark" | "light">("dark")` como default seguro para SSR) y un `useEffect` gateado por `isTetris` que los corrige a lo guardado en `localStorage` después del montaje (mismo patrón de "hydration-safe default" que tenía `TetrisCanvas`, solo movido de lugar).
   - Agregar `cycleTetrisSkin` (avanza al siguiente valor de la lista, hace `setTetrisSkin(next)` y actualiza el estado) y `toggleTetrisTheme` (alterna `dark`/`light`, hace `setTetrisTheme(next)` y actualiza el estado).
   - En la fila de estadísticas del HUD (el `<div style={{ display: "flex", gap: 24, ... }}>` que ya contiene Jugador/Puntuación/Vidas/Nivel), agregar — solo si `isTetris` — dos bloques con la misma estructura visual que `.hud-stat` (label `.l` arriba), pero con un `<button>` en el lugar del `<div className="v">`, reseteado a texto plano (sin fondo/borde nativo) para que se vea igual que los demás valores del HUD pero sea clickeable:
     - `SKIN` → botón con el label de la skin actual (p. ej. "RETRO"), `onClick={cycleTetrisSkin}`.
     - `TEMA` → botón con "OSCURO" u "CLARO" según el tema actual, `onClick={toggleTetrisTheme}`.
   - Agregar en `app/globals.css`, cerca de las reglas `.hud-stat`, el reset mínimo de estilos nativos de botón para estos dos controles (fondo/borde en `none`, `padding: 0`, `font: inherit`, `cursor: pointer`) reutilizando la clase `.v` ya existente, más un estado `:hover` acorde al resto del HUD.
   - Pasar `skin={skin}` y `theme={theme}` como props nuevas al `<TetrisCanvas ... />`.

4. **Verificación manual:** correr `npm run dev`, entrar a `/games/tetris/play` y confirmar los criterios de aceptación de abajo; luego repetir una revisión rápida de `/games/asteroids/play` y `/games/arkanoid/play` para confirmar que su HUD no cambió.

## Criterios de aceptación

- [ ] En `/games/tetris/play`, el HUD (fila junto a Jugador/Puntuación/Vidas/Nivel) muestra dos controles nuevos, "SKIN" y "TEMA".
- [ ] El área del canvas de Tetris ya no muestra el `<select>` de SKIN ni el switch de TEMA que antes aparecían arriba del tablero.
- [ ] Un click en el control SKIN del HUD avanza cíclicamente Retro → Neon → Pastel → Pixel Art → Retro…, y el tablero y la vista de "próxima pieza" reflejan la nueva skin de inmediato.
- [ ] Un click en el control TEMA del HUD alterna Oscuro/Claro, y los colores del contenedor de Tetris (fondo, tablero, panel) cambian de inmediato.
- [ ] Al recargar `/games/tetris/play` (o volver a entrar), la skin y el tema elegidos persisten (se siguen leyendo de `localStorage`, claves `tetris-skin`/`tetris-theme`).
- [ ] El HUD de `/games/asteroids/play`, `/games/arkanoid/play` y los 5 juegos simulados no muestra estos controles y se ve igual que antes del cambio.
- [ ] El resto del comportamiento de Tetris (puntuación, niveles, pausa, fin de juego, guardado de puntaje en el leaderboard de Supabase) sigue funcionando sin cambios.
- [ ] `npm run lint` pasa sin errores ni advertencias nuevas.
- [ ] No quedan imports ni reglas CSS muertas de los controles viejos (`getTetrisSkin`/`getTetrisTheme` en `tetris-canvas.tsx` si ya no se usan ahí; `.topControls`/`.skinToggle`/`.themeToggle`/`.switch`/`.slider` en `tetris.module.css`).

## Decisiones tomadas y descartadas

- **Ubicación — fila de estadísticas, no fila de acciones:** se decidió colocar los controles junto a Jugador/Puntuación/Vidas/Nivel en vez de junto a PAUSA/FIN/SALIR, a pedido explícito del usuario.
- **Patrón visual — `hud-stat` con valor clickeable, en vez de un tercer patrón de UI:** el usuario pidió a la vez "estilo de botón pixel" y "ubicarlos en la fila de stats". Se resuelve reutilizando el layout label-arriba/valor-abajo de `.hud-stat`, pero reemplazando el `<div className="v">` de solo lectura por un `<button className="v">` clickeable con reset de estilos nativos — mantiene la consistencia visual sin sumar un tercer patrón de componente al HUD.
- **SKIN cicla con un click en vez de `<select>`:** se descarta mantener el desplegable porque el HUD de `GamePlayer` hoy solo usa botones (nunca selects ni switches); un botón que cicla por las 4 skins es consistente con ese lenguaje y con el botón de TEMA que alterna dos estados.
- **Arquitectura — estado levantado a `GamePlayer`, no expuesto vía ref imperativo:** se prefirió levantar `skin`/`theme` como props controladas (mismo patrón que ya usa `paused`) en vez de agregar `getSkin`/`setSkin`/`getTheme`/`setTheme` a `GameCanvasHandle`, porque mezclar un estado continuo con la interfaz de comandos puntuales que hoy solo tiene `restart()` la haría más confusa de leer y usar.
- **Persistencia sin cambios:** se descartó introducir cualquier cambio a las claves de `localStorage` o a su formato — solo cambia qué componente las lee/escribe.
- **Alcance limitado a Tetris:** los otros 6 juegos no ganan controles equivalentes; no hay skins/temas configurables para ellos hoy y agregarlos queda fuera de este spec.

## Riesgos identificados

- **CSS muerto mal identificado:** si alguna regla de `tetris.module.css` marcada para borrar (`.switch`, `.icon`, `--switch-track`, `--switch-thumb`) resultara estar reutilizada en otro lugar del archivo, borrarla rompería visualmente otra parte de Tetris. Mitigación: se verificó en este spec que esas reglas son exclusivas de los controles viejos (ver Plan de implementación, paso 2), pero conviene revisar visualmente el juego completo después de borrar.
- **Mismatch de hidratación:** al mover el patrón "default seguro para SSR + corrección post-montaje" desde `TetrisCanvas` hacia `GamePlayer` (que es un componente compartido por todos los juegos), hay que mantener ese `useEffect` de corrección gateado por `isTetris` para no disparar lecturas de `localStorage` innecesarias — ni un mismatch de hidratación — en los otros 6 juegos.
