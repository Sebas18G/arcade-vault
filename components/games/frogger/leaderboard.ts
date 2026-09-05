import {
  isGameSkin,
  DEFAULT_GAME_SKIN,
  type GameSkin,
} from "@/components/games/shared/skins";
// Preferencia de UI: vive solo en localStorage, nunca en Supabase.
// La tabla `frogger_scores` y sus helpers llegan en la spec 10; este archivo
// hoy solo guarda la skin elegida, con la clave genérica "<gameId>-skin".
const SKIN_KEY = "frogger-skin";
export function getFroggerSkin(): GameSkin {
  try {
    const stored = localStorage.getItem(SKIN_KEY);
    return isGameSkin(stored) ? stored : DEFAULT_GAME_SKIN;
  } catch {
    return DEFAULT_GAME_SKIN;
  }
}
export function setFroggerSkin(skin: GameSkin): void {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // localStorage no disponible
  }
}
