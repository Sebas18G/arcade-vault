# SPEC 16 — Controles táctiles (gamepad) para los juegos con motor real

**Estado:** Implementado
**Depende de:** SPEC 05 (juegos arcade reales), SPEC 07 (controles en el HUD), SPEC 08 y `specs/games-jam/` (snake, frogger, invasores)
**Fecha:** 2026-09-06

## Objetivo

Hacer jugables desde un teléfono los 6 juegos con motor real (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`, `invasores`), que hoy solo se controlan con teclado. Se añade un gamepad táctil en pantalla — portado del prototipo `references/gamepad-assets/gamepad.html` — que aparece bajo el CRT en pantallas angostas o con puntero grueso, y el reproductor pasa a ser responsive.

## Why this spec exists

Los 6 canvas escuchan `keydown`/`keyup` en `window`; ninguno expone una API de input. En un teléfono no hay teclado, así que hoy los juegos se ven pero no se juegan. Además el HUD (`player-hud`) y la carcasa CRT están dimensionados para escritorio y desbordan por debajo de ~700 px.

## Scope

**Incluye:**

- Contrato compartido `components/games/shared/controls.ts`: tipos `GamepadButtonId` / `GamepadBinding` / `GamepadLayout` y el helper `dispatchGamepadKey()`, que publica un `KeyboardEvent` sintético en `window`.
- Un `controls.ts` por juego (`components/games/<juego>/controls.ts`) con el `GamepadLayout` derivado de las teclas que ese canvas realmente escucha.
- Componente `components/mobile-gamepad.tsx`: carcasa neón con fila de sistema (PAUSA · SKIN · FIN · SALIR), D-pad, botones A/B y línea de ayuda.
- Estilos `.gp*` en `app/globals.css`, portados del prototipo y reescritos sobre las variables de tema del proyecto.
- Cableado en `components/game-player.tsx`: registro `GAMEPAD_BY_GAME`, render del gamepad bajo el CRT.
- Reproductor responsive: HUD compacto y carcasa CRT con menos padding en pantallas angostas; `@media` en `tetris.module.css` para que tablero + panel entren en 360 px.

**No incluye (fuera de alcance):**

- Tocar los motores (`engine.ts`) o los `<juego>-canvas.tsx`. El gamepad se apoya en los listeners de `window` que ya existen; ningún juego se entera de que la entrada es táctil.
- Los 2 juegos simulados (`gloton`, `duelo-pixel`): no tienen motor ni entrada, así que no reciben gamepad.
- Gestos sobre el propio canvas (swipe, arrastrar la pala de Arkanoid con el dedo), vibración háptica, o soporte de mandos físicos vía Gamepad API.
- Responsive del resto de pantallas (biblioteca, salón, detalle), que ya tienen sus propias `@media`.

## Modelo de datos

Ninguno. El gamepad no persiste nada: reutiliza el estado que `GamePlayer` ya posee (`paused`, `skin`) y las preferencias de skin siguen viajando por `SKIN_STORAGE` como hasta ahora.

## Mapa de controles

Derivado leyendo cada canvas. **`asteroids` y `tetris` leen `e.code`; `arkanoid`, `snake`, `frogger` e `invasores` leen `e.key`** — por eso cada binding declara los dos campos.

| Juego       | ↑            | ↓                  | ←         | →         | A                   | B                 |
| ----------- | ------------ | ------------------ | --------- | --------- | ------------------- | ----------------- |
| `asteroids` | ArrowUp      | —                  | ArrowLeft | ArrowRight | Space (disparar)    | —                 |
| `tetris`    | ArrowUp giro | ArrowDown (repite) | ← repite  | → repite  | Space (caída dura)  | KeyX (giro)       |
| `arkanoid`  | —            | —                  | ArrowLeft | ArrowRight | " " (lanzar)        | —                 |
| `snake`     | ArrowUp      | ArrowDown          | ArrowLeft | ArrowRight | —                   | —                 |
| `frogger`   | ArrowUp      | ArrowDown          | ArrowLeft | ArrowRight | —                   | —                 |
| `invasores` | —            | —                  | ArrowLeft | ArrowRight | " " (disparar)      | —                 |

Los botones sin binding se renderizan deshabilitados y apagados, no se ocultan: la carcasa mantiene la misma silueta en todos los juegos.

## Plan de implementación

1. `components/games/shared/controls.ts` — tipos y `dispatchGamepadKey()`.
2. Seis `components/games/<juego>/controls.ts` con su `GamepadLayout`.
3. `components/mobile-gamepad.tsx` — pulsación por eventos de puntero con `setPointerCapture`, auto-repetición opcional, liberación de todo lo pulsado al bloquearse o desmontarse.
4. `app/globals.css` — bloque `.gp*` y ajustes responsive de `.player-hud` / `.crt`.
5. `components/games/tetris/tetris.module.css` — `@media (max-width: 700px)` para panel y separación.
6. `components/game-player.tsx` — registro y render.

## Criterios de aceptación

- [x] En un viewport de 390 px, `/games/<juego>/play` de los 6 juegos con motor real muestra el gamepad bajo el CRT y no produce scroll horizontal.
- [x] Cada botón del D-pad y A/B mueve/dispara en el juego correspondiente; los botones sin binding se ven apagados y no hacen nada.
- [x] Mantener pulsado ← o → en Tetris repite el movimiento tras una pausa inicial; en Asteroids mantiene el giro sin repetición.
- [x] PAUSA pausa y reanuda, SKIN cicla la skin (y solo aparece si el juego tiene skins), FIN abre el modal de fin y SALIR vuelve a la ficha del juego.
- [x] Soltar el dedo fuera del botón (o cancelar el gesto) libera la tecla: no queda ninguna tecla "trabada".
- [x] Arrastrar el dedo sobre el gamepad no desplaza la página.
- [x] En escritorio (puntero fino y ≥ 900 px) el gamepad no se renderiza visible y el teclado se comporta igual que antes.
- [x] `npm run build` y `npm run lint` sin errores.

## Decisions

- **Eventos de teclado sintéticos en vez de una API de input por motor.** Refactorizar los 6 canvas para exponer `press()`/`release()` sería más "limpio" en abstracto, pero toca 6 archivos de juego más sus motores, y esta spec no quiere riesgo sobre juegos ya estables. Los canvas ya escuchan en `window`, así que el gamepad es puramente aditivo: cero líneas cambiadas en `components/games/*/engine.ts` y `*-canvas.tsx`.
- **`key` y `code` en cada binding.** Los juegos se dividen en dos familias según cuál lean. Poblar los dos campos evita un registro de "qué campo usa cada juego" y hace que un binding funcione aunque el canvas cambie de criterio.
- **Visibilidad por `(pointer: coarse), (max-width: 900px)`, no solo por ancho.** Un teléfono en horizontal supera los 768 px; con un breakpoint de ancho puro el gamepad desaparecería justo al rotar y el juego quedaría sin control.
- **Se compacta el HUD, no se oculta.** La puntuación y las vidas son parte del juego. Lo que se oculta en angosto es la fila de botones `hud-actions`, porque el gamepad ya los ofrece.
- **La auto-repetición es por binding, no global.** Solo Tetris actúa en el flanco de bajada; en Asteroids/Arkanoid/Invasores el motor lee estado mantenido y repetir el `keydown` sería ruido (y en Asteroids anularía `justPressed`).

## Risks

- Un `pointerup` perdido dejaría una tecla trabada. Mitigado con `setPointerCapture` más liberación en `pointerup`/`pointercancel`/`pointerleave`, al bloquearse el gamepad y al desmontar.
- Los eventos sintéticos no son `trusted`; ningún canvas lo comprueba, pero conviene recordarlo si alguna vez se añade anti-cheat de entrada.
