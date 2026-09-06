import type { GamepadLayout } from "@/components/games/shared/controls";
/**
 * Snake lee `e.key` (ver `directionFromKey()` en `snake-canvas.tsx`) y actúa en
 * el flanco de bajada: cada pulsación cambia de dirección, y el motor mantiene
 * el movimiento por sí mismo hasta el siguiente giro. No hay auto-repetición
 * (repetir no aporta nada, la serpiente ya avanza sola) ni botones A/B: el
 * juego no tiene ninguna acción aparte de moverse.
 */
export const SNAKE_GAMEPAD: GamepadLayout = {
  buttons: {
    up: { key: "ArrowUp", code: "ArrowUp" },
    down: { key: "ArrowDown", code: "ArrowDown" },
    left: { key: "ArrowLeft", code: "ArrowLeft" },
    right: { key: "ArrowRight", code: "ArrowRight" },
  },
  hint: "↑ ↓ ← → MOVER",
};
