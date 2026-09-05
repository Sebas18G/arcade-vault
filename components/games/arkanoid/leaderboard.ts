import { createClient } from "@/lib/supabase/client";
import type {
  GameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
import { requireUserId } from "@/components/games/shared/session";
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
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("arkanoid_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
    user_id: userId,
  });
  if (error) throw error;
  return getArkanoidLeaderboard();
}
