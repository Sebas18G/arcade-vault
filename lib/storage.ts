const SCORES_KEY = "av_scores";
export function addScore(entry: {
  game: string;
  score: number;
  name: string;
}): void {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage deshabilitado (modo privado): el puntaje simplemente no persiste.
  }
}
