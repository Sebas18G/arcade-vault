import type { GamepadLayout } from "@/components/games/shared/controls";
/**
 * Invasores lee `e.key` (ver `inputFromKey` en `invasores-canvas.tsx`) y actúa
 * sobre estado mantenido: las flechas mueven la nave mientras se sostienen y
 * `Space` dispara en el flanco de bajada. Ningún binding repite — repetir el
 * `keydown` de disparo generaría ráfagas artificiales que el motor no espera.
 * No hay arriba/abajo ni botón B: la nave solo se desplaza en horizontal.
 */
export const INVASORES_GAMEPAD: GamepadLayout = {
  buttons: {
    left: { key: "ArrowLeft", code: "ArrowLeft" },
    right: { key: "ArrowRight", code: "ArrowRight" },
    a: { key: " ", code: "Space", label: "DISPARAR" },
  },
  hint: "← → MOVER · A DISPARAR",
};
