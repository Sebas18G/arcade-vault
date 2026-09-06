import type { GamepadLayout } from "@/components/games/shared/controls";
/**
 * Arkanoid lee `e.key` (ver `handleKeyDown`/`handleKeyUp` en
 * `arkanoid-canvas.tsx`): las flechas mueven la pala mientras se mantienen
 * pulsadas, así que ningún binding de dirección repite. `" "` (además de
 * `Enter`) lanza la bola y confirma el paso de nivel, por eso A queda mapeado
 * a `" "` como acción principal; no hay acción secundaria (B).
 */
export const ARKANOID_GAMEPAD: GamepadLayout = {
  buttons: {
    left: { key: "ArrowLeft", code: "ArrowLeft" },
    right: { key: "ArrowRight", code: "ArrowRight" },
    a: { key: " ", code: "Space", label: "LANZAR" },
  },
  hint: "← → MOVER PALA · A LANZAR",
};
