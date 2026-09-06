import type { GamepadLayout } from "@/components/games/shared/controls";
/**
 * Asteroids lee `e.code` (ver `CONTROL_KEYS` en `asteroids-canvas.tsx`): las
 * flechas giran y propulsan mientras se mantienen, y `Space` dispara en el
 * flanco de bajada — por eso ningún binding repite (repetir el `keydown`
 * anularía el `justPressed` del motor y el disparo dejaría de salir).
 */
export const ASTEROIDS_GAMEPAD: GamepadLayout = {
  buttons: {
    up: { key: "ArrowUp", code: "ArrowUp" },
    left: { key: "ArrowLeft", code: "ArrowLeft" },
    right: { key: "ArrowRight", code: "ArrowRight" },
    a: { key: " ", code: "Space", label: "DISPARAR" },
  },
  hint: "← → GIRAR · ↑ PROPULSAR · A DISPARAR",
};
