export type GameSkin = "classic" | "retro" | "neon";
export const GAME_SKINS: { value: GameSkin; label: string }[] = [
  { value: "classic", label: "Clásico" },
  { value: "retro", label: "Retro" },
  { value: "neon", label: "Neón" },
];
export const DEFAULT_GAME_SKIN: GameSkin = "classic";
/** Valida un valor arbitrario (p. ej. leído de localStorage) contra las 3 skins. */
export function isGameSkin(value: unknown): value is GameSkin {
  return value === "classic" || value === "retro" || value === "neon";
}
