import { createClient } from "@/lib/supabase/client";
import type {
  LeaderboardEntry,
  TetrisGameOverResult,
} from "@/components/games/shared/types";
import type { TetrisSkin } from "@/components/games/tetris/engine";
import { requireUserId } from "@/components/games/shared/session";
const BEST_STATS_KEY = "tetris-best-stats";
const THEME_KEY = "tetris-theme";
const SKIN_KEY = "tetris-skin";
const START_LEVEL_KEY = "tetris-start-level";
const MAX_ENTRIES = 5;
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export async function getTetrisLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tetris_scores")
    .select("id, player_name, score, level, lines, best_combo")
    .order("score", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.player_name,
    score: row.score,
    level: row.level,
    lines: row.lines,
    maxCombo: row.best_combo,
  }));
}
export async function addTetrisScore(
  name: string,
  result: TetrisGameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("tetris_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
    lines: result.lines,
    best_combo: result.bestCombo,
    user_id: userId,
  });
  if (error) throw error;
  return getTetrisLeaderboard();
}
export function getTetrisBestStats(): { bestCombo: number; bestLines: number } {
  const parsed = loadJSON<{ bestCombo?: number; maxLines?: number } | null>(
    BEST_STATS_KEY,
    null,
  );
  if (!parsed || typeof parsed !== "object")
    return { bestCombo: 0, bestLines: 0 };
  return {
    bestCombo:
      typeof parsed.bestCombo === "number" && isFinite(parsed.bestCombo)
        ? parsed.bestCombo
        : 0,
    bestLines:
      typeof parsed.maxLines === "number" && isFinite(parsed.maxLines)
        ? parsed.maxLines
        : 0,
  };
}
export function updateTetrisBestStats(result: TetrisGameOverResult) {
  const stats = getTetrisBestStats();
  let changed = false;
  if (result.bestCombo > stats.bestCombo) {
    stats.bestCombo = result.bestCombo;
    changed = true;
  }
  if (result.lines > stats.bestLines) {
    stats.bestLines = result.lines;
    changed = true;
  }
  if (changed) {
    try {
      localStorage.setItem(
        BEST_STATS_KEY,
        JSON.stringify({
          bestCombo: stats.bestCombo,
          maxLines: stats.bestLines,
        }),
      );
    } catch {
      // localStorage no disponible
    }
  }
}
export function getTetrisTheme(): "dark" | "light" {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
export function setTetrisTheme(theme: "dark" | "light") {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage no disponible
  }
}
export function getTetrisSkin(): TetrisSkin {
  try {
    const stored = localStorage.getItem(SKIN_KEY);
    return stored === "neon" || stored === "pastel" || stored === "pixel"
      ? stored
      : "retro";
  } catch {
    return "retro";
  }
}
export function setTetrisSkin(skin: TetrisSkin) {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // localStorage no disponible
  }
}
export function getTetrisStartLevel(): number {
  try {
    const stored = parseInt(localStorage.getItem(START_LEVEL_KEY) || "", 10);
    return Number.isInteger(stored) && stored >= 1 && stored <= 10 ? stored : 1;
  } catch {
    return 1;
  }
}
