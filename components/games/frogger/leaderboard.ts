import { createClient } from "@/lib/supabase/client";
import type {
  FroggerGameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
import {
  isGameSkin,
  DEFAULT_GAME_SKIN,
  type GameSkin,
} from "@/components/games/shared/skins";
// Preferencia de UI: vive solo en localStorage, nunca en Supabase.
const SKIN_KEY = "frogger-skin";
const MAX_ENTRIES = 5;
export async function getFroggerLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("frogger_scores")
    .select("id, player_name, score, level")
    .order("score", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.player_name,
    score: row.score,
    level: row.level,
  }));
}
export async function addFroggerScore(
  name: string,
  result: FroggerGameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { error } = await supabase.from("frogger_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
    frogs_home: result.frogsHome,
    time_bonus: result.timeBonus,
  });
  if (error) throw error;
  return getFroggerLeaderboard();
}
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
