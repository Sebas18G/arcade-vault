"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Game } from "@/app/data/games";
import { useAuth } from "@/lib/auth-context";
import { addScore } from "@/lib/storage";
import type { UserSession } from "@/lib/storage";
import type { LeaderboardEntry } from "@/components/games/shared/types";
const LIVES = 3;
function GameOverModal({
  game,
  score,
  level,
  user,
  leaderboard,
  scoreOnly,
  onRestart,
}: {
  game: Game;
  score: number;
  level?: number;
  user: UserSession;
  leaderboard?: {
    entries: LeaderboardEntry[];
    onSaveName: (name: string) => void;
  };
  scoreOnly?: boolean;
  onRestart: () => void;
}) {
  const [name, setName] = useState(() => user?.name ?? "INVITADO");
  const [saved, setSaved] = useState(false);
  const saveScore = () => {
    if (leaderboard) {
      leaderboard.onSaveName(name);
    } else {
      addScore({ game: game.id, score, name });
    }
    setSaved(true);
  };
  return (
    <div className="modal-bd">
      <div className="modal">
        <h2>FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {level !== undefined && (
          <div className="final-label" style={{ marginTop: 4 }}>
            NIVEL {String(level).padStart(2, "0")}
          </div>
        )}
        {leaderboard && leaderboard.entries.length > 0 && (
          <div
            className="leaderboard"
            style={{ marginTop: 20, textAlign: "left" }}
          >
            <h3>MEJORES PUNTUACIONES</h3>
            {leaderboard.entries.map((entry, i) => (
              <div
                key={entry.id}
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
                <div className="pl">{entry.name}</div>
                <div className="sc">{entry.score.toLocaleString("es-ES")}</div>
              </div>
            ))}
          </div>
        )}
        {!scoreOnly &&
          (!saved ? (
            <div className="input-row">
              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toUpperCase().slice(0, 10))
                }
                placeholder="TUS INICIALES"
              />
              <button className="btn yellow" onClick={saveScore}>
                GUARDAR PUNTUACIÓN
              </button>
            </div>
          ) : (
            <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
          ))}
        <div className="actions">
          <button className="btn" onClick={onRestart}>
            JUGAR DE NUEVO
          </button>
          <Link href="/games" className="btn magenta">
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}
export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const level = Math.floor(score / 2500) + 1;
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      setScore((s) => s + Math.floor(10 + Math.random() * 90));
    }, 220);
    return () => clearInterval(t);
  }, [over, paused]);
  const restart = () => {
    setScore(0);
    setPaused(false);
    setOver(false);
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {user?.name ?? "INVITADO"}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(LIVES).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <div className="grid-floor"></div>
            <div className="enemy e1"></div>
            <div className="enemy e2"></div>
            <div className="enemy e3"></div>
            <div className="player-ship"></div>
          </div>
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {over && (
        <GameOverModal
          game={game}
          score={score}
          user={user}
          onRestart={restart}
        />
      )}
    </div>
  );
}
