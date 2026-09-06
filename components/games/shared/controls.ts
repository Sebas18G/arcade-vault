/**
 * Contrato de controles táctiles compartido (spec 16).
 *
 * Los 6 canvas con motor real escuchan `keydown`/`keyup` en `window` — ninguno
 * expone una API de entrada propia. El gamepad táctil se apoya justamente en
 * eso: publica eventos de teclado sintéticos en `window`, así ni los motores ni
 * los `<juego>-canvas.tsx` necesitan un solo cambio para funcionar en mobile.
 *
 * Ojo con `key` vs `code`: `asteroids` y `tetris` leen `e.code`, mientras que
 * `arkanoid`, `snake`, `frogger` e `invasores` leen `e.key`. Cada binding
 * declara los dos, de modo que un mismo dispatch sirve para ambas familias.
 */
export type GamepadButtonId = "up" | "down" | "left" | "right" | "a" | "b";
export type GamepadBinding = {
  /** Valor de `KeyboardEvent.key` (lo leen arkanoid, snake, frogger, invasores). */
  key: string;
  /** Valor de `KeyboardEvent.code` (lo leen asteroids y tetris). */
  code: string;
  /** Etiqueta corta bajo los botones A/B. El D-pad no la usa. */
  label?: string;
  /**
   * Repite el `keydown` mientras el botón sigue pulsado. Solo para juegos que
   * actúan en el flanco de bajada (tetris); los que leen estado mantenido
   * (asteroids, arkanoid, invasores) no la necesitan — y en asteroids repetir
   * anularía su `justPressed`.
   */
  repeat?: boolean;
};
export type GamepadLayout = {
  /**
   * Bindings por botón. Los ausentes se renderizan deshabilitados, no ocultos:
   * la carcasa mantiene la misma silueta en todos los juegos.
   */
  buttons: Partial<Record<GamepadButtonId, GamepadBinding>>;
  /** Línea de ayuda que se muestra bajo la carcasa. */
  hint: string;
};
/** Espera antes de arrancar la auto-repetición, en ms. */
export const GAMEPAD_REPEAT_DELAY_MS = 220;
/** Cadencia de la auto-repetición una vez arrancada, en ms. */
export const GAMEPAD_REPEAT_INTERVAL_MS = 70;
/**
 * Publica un `keydown`/`keyup` sintético en `window`, con `key` y `code`
 * poblados para que lo entiendan las dos familias de canvas.
 */
export function dispatchGamepadKey(
  type: "keydown" | "keyup",
  binding: GamepadBinding,
  { repeat = false }: { repeat?: boolean } = {},
) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key: binding.key,
      code: binding.code,
      bubbles: true,
      cancelable: true,
      repeat,
    }),
  );
}
