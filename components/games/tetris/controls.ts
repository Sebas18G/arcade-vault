import type { GamepadLayout } from "@/components/games/shared/controls";
/**
 * Tetris lee `e.code` (ver `ACTION_KEYS` en `tetris-canvas.tsx`) y actúa en el
 * flanco de bajada: cada pulsación es un movimiento discreto. Es el único juego
 * que necesita auto-repetición, para poder desplazar y bajar la pieza
 * manteniendo el botón. `ArrowUp` y `KeyX` giran (el motor los trata igual), así
 * que B queda como giro alternativo para el pulgar derecho y A como caída dura.
 */
export const TETRIS_GAMEPAD: GamepadLayout = {
  buttons: {
    up: { key: "ArrowUp", code: "ArrowUp" },
    down: { key: "ArrowDown", code: "ArrowDown", repeat: true },
    left: { key: "ArrowLeft", code: "ArrowLeft", repeat: true },
    right: { key: "ArrowRight", code: "ArrowRight", repeat: true },
    a: { key: " ", code: "Space", label: "CAÍDA" },
    b: { key: "x", code: "KeyX", label: "GIRO" },
  },
  hint: "← → MOVER · ↓ BAJAR · ↑/B GIRAR · A CAÍDA DURA",
};
