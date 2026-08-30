import { createClient } from "@/lib/supabase/client";
import type {
  GameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
const MAX_ENTRIES = 5;
export async function getArkanoidLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("arkanoid_scores")
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
export async function addArkanoidScore(
  name: string,
  result: GameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { error } = await supabase.from("arkanoid_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
  });
  if (error) throw error;
  return getArkanoidLeaderboard();
}
