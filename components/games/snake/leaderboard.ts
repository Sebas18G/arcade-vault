import { createClient } from "@/lib/supabase/client";
import type {
  GameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
import {
  isGameSkin,
  DEFAULT_GAME_SKIN,
  type GameSkin,
} from "@/components/games/shared/skins";
// Preferencia de UI: vive solo en localStorage, nunca en Supabase.
const SKIN_KEY = "snake-skin";
const MAX_ENTRIES = 5;
export async function getSnakeLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("snake_scores")
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
export async function addSnakeScore(
  name: string,
  result: GameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { error } = await supabase.from("snake_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
  });
  if (error) throw error;
  return getSnakeLeaderboard();
}
export function getSnakeSkin(): GameSkin {
  try {
    const stored = localStorage.getItem(SKIN_KEY);
    return isGameSkin(stored) ? stored : DEFAULT_GAME_SKIN;
  } catch {
    return DEFAULT_GAME_SKIN;
  }
}
export function setSnakeSkin(skin: GameSkin): void {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // localStorage no disponible
  }
}
