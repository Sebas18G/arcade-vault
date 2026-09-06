import type { GamepadLayout } from "@/components/games/shared/controls";
/**
 * Frogger lee `e.key` (ver `directionFromKey` en `frogger-canvas.tsx`):
 * flechas y WASD mueven la rana mientras se mantienen pulsadas, así que
 * ningún binding de dirección repite. No hay tecla de acción — el motor solo
 * escucha las 4 direcciones — así que A y B quedan sin binding.
 */
export const FROGGER_GAMEPAD: GamepadLayout = {
  buttons: {
    up: { key: "ArrowUp", code: "ArrowUp" },
    down: { key: "ArrowDown", code: "ArrowDown" },
    left: { key: "ArrowLeft", code: "ArrowLeft" },
    right: { key: "ArrowRight", code: "ArrowRight" },
  },
  hint: "← → ↑ ↓ MOVER",
};
