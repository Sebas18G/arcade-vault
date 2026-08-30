import type {
  LeaderboardEntry,
  TetrisGameOverResult,
} from "@/components/games/shared/types";
import type { TetrisSkin } from "@/components/games/tetris/engine";
const HIGHSCORES_KEY = "tetris-highscores";
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
export function getTetrisLeaderboard(): LeaderboardEntry[] {
  const parsed = loadJSON<unknown>(HIGHSCORES_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (e): e is Record<string, unknown> =>
        !!e &&
        typeof e === "object" &&
        typeof (e as Record<string, unknown>).score === "number" &&
        isFinite((e as Record<string, unknown>).score as number),
    )
    .map((e, i) => ({
      id: `${i}-${e.score}`,
      name: typeof e.name === "string" && e.name ? e.name : "AAA",
      score: e.score as number,
      level: 0,
      maxCombo:
        typeof e.maxCombo === "number" && isFinite(e.maxCombo) ? e.maxCombo : 0,
      lines: typeof e.lines === "number" && isFinite(e.lines) ? e.lines : 0,
    }));
}
function saveHighscores(
  list: { name: string; score: number; maxCombo: number; lines: number }[],
) {
  try {
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(list));
  } catch {
    // localStorage no disponible
  }
}
export function addTetrisScore(
  name: string,
  result: TetrisGameOverResult,
): LeaderboardEntry[] {
  const list = getTetrisLeaderboard().map((e) => ({
    name: e.name,
    score: e.score,
    maxCombo: e.maxCombo as number,
    lines: e.lines as number,
  }));
  list.push({
    name,
    score: result.score,
    maxCombo: result.bestCombo,
    lines: result.lines,
  });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, MAX_ENTRIES);
  saveHighscores(top);
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
