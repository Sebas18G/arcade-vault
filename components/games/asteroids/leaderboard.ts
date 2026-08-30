import type {
  AsteroidsGameOverResult,
  LeaderboardEntry,
} from "@/components/games/shared/types";
const LEADERBOARD_KEY = "asteroids_leaderboard_v1";
const PLAYER_NAME_KEY = "asteroids_player_name";
const MAX_ENTRIES = 5;
export function getAsteroidsLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveLeaderboardList(list: LeaderboardEntry[]) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list));
  } catch {
    // localStorage no disponible
  }
}
export function addAsteroidsScore(
  name: string,
  result: AsteroidsGameOverResult,
): LeaderboardEntry[] {
  const entry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random()}`,
    name,
    score: result.score,
    level: result.level,
    destroyed: result.asteroidsDestroyed,
    combo: result.bestCombo,
  };
  const list = getAsteroidsLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, MAX_ENTRIES);
  saveLeaderboardList(list);
  return list;
}
export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || "";
  } catch {
    return "";
  }
}
export function setSavedPlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // localStorage no disponible
  }
}
