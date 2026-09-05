import { createClient } from "@/lib/supabase/client";
import type {
  AsteroidsGameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
import {
  isGameSkin,
  DEFAULT_GAME_SKIN,
  type GameSkin,
} from "@/components/games/shared/skins";
import { requireUserId } from "@/components/games/shared/session";
// Preferencia de UI: vive solo en localStorage, nunca en Supabase.
const SKIN_KEY = "asteroids-skin";
const MAX_ENTRIES = 5;
export async function getAsteroidsLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("asteroids_scores")
    .select("id, player_name, score, level, asteroids_destroyed, best_combo")
    .order("score", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.player_name,
    score: row.score,
    level: row.level,
    destroyed: row.asteroids_destroyed,
    combo: row.best_combo,
  }));
}
export async function addAsteroidsScore(
  name: string,
  result: AsteroidsGameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("asteroids_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
    asteroids_destroyed: result.asteroidsDestroyed,
    best_combo: result.bestCombo,
    user_id: userId,
  });
  if (error) throw error;
  return getAsteroidsLeaderboard();
}
export function getAsteroidsSkin(): GameSkin {
  try {
    const stored = localStorage.getItem(SKIN_KEY);
    return isGameSkin(stored) ? stored : DEFAULT_GAME_SKIN;
  } catch {
    return DEFAULT_GAME_SKIN;
  }
}
export function setAsteroidsSkin(skin: GameSkin): void {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // localStorage no disponible
  }
}
