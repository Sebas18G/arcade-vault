export type UserSession = { name: string } | null;

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

export function getUser(): UserSession {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setUser(user: UserSession): void {
  try {
    if (user === null) {
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch {
    // localStorage deshabilitado (modo privado): la sesión simplemente no persiste.
  }
}

export function addScore(entry: { game: string; score: number; name: string }): void {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage deshabilitado (modo privado): el puntaje simplemente no persiste.
  }
}
