import { createClient } from "@/lib/supabase/client";
import type {
  InvasoresGameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
import { requireUserId } from "@/components/games/shared/session";
const MAX_ENTRIES = 5;
export async function getInvasoresLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invasores_scores")
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
export async function addInvasoresScore(
  name: string,
  result: InvasoresGameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const userId = await requireUserId(supabase);
  // player_name lo pisa el trigger invasores_enforce_player_name con el alias
  // del perfil de quien inserta (spec 13).
  const { error } = await supabase.from("invasores_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
    aliens_killed: result.aliensKilled,
    ufos_hit: result.ufosHit,
    shots_fired: result.shotsFired,
    user_id: userId,
  });
  if (error) throw error;
  return getInvasoresLeaderboard();
}
