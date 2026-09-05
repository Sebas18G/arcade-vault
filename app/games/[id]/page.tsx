import { notFound } from "next/navigation";
import Link from "next/link";
import { GAMES, seededScores } from "@/app/data/games";
import { createClient } from "@/lib/supabase/server";
const SCORE_TABLE: Record<string, string> = {
  asteroids: "asteroids_scores",
  tetris: "tetris_scores",
  arkanoid: "arkanoid_scores",
  snake: "snake_scores",
  frogger: "frogger_scores",
};
type DetailScoreRow = {
  key: string;
  name: string;
  score: number;
  date: string;
};
function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
async function fetchRealScores(table: string): Promise<DetailScoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("id, player_name, score, created_at")
    .order("score", { ascending: false })
    .limit(12);
  return (data ?? []).map(
    (r: {
      id: string;
      player_name: string;
      score: number;
      created_at: string;
    }) => ({
      key: r.id,
      name: r.player_name,
      score: r.score,
      date: formatDate(r.created_at),
    }),
  );
}
export default async function GameDetailPage({
  params,
}: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  const table = SCORE_TABLE[id];
  const isRealGame = !!table;
  const scores: DetailScoreRow[] = isRealGame
    ? await fetchRealScores(table)
    : seededScores(id.length * 17 + 3, 10).map((r) => ({
        key: `${r.name}-${r.rank}`,
        name: r.name,
        score: r.score,
        date: r.date,
      }));
  const bestScore = isRealGame ? (scores[0]?.score ?? game.best) : game.best;
  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {bestScore.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/play`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>
      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.length === 0 ? (
            <div
              className="mono"
              style={{
                padding: "16px 0",
                color: "var(--ink-dim)",
                fontSize: 12,
              }}
            >
              AÚN SIN PUNTAJES
            </div>
          ) : (
            scores.map((r, i) => (
              <div
                key={r.key}
                className={
                  "lb-row" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
              >
                <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
                <div className="pl">
                  {r.name}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
