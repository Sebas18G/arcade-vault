"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Game } from "@/app/data/games";
import { useAuth, type UserSession } from "@/lib/auth-context";
import { addScore } from "@/lib/storage";
import type {
  AsteroidsGameOverResult,
  FroggerGameOverResult,
  GameCanvasHandle,
  GameOverResult,
  LeaderboardEntry,
  TetrisGameOverResult,
} from "@/components/games/shared/types";
import { GAME_SKINS, type GameSkin } from "@/components/games/shared/skins";
import { AsteroidsCanvas } from "@/components/games/asteroids/asteroids-canvas";
import {
  addAsteroidsScore,
  getAsteroidsLeaderboard,
  getAsteroidsSkin,
  setAsteroidsSkin,
} from "@/components/games/asteroids/leaderboard";
import { TetrisCanvas } from "@/components/games/tetris/tetris-canvas";
import type { TetrisSkin } from "@/components/games/tetris/engine";
import {
  addTetrisScore,
  getTetrisLeaderboard,
  getTetrisSkin,
  getTetrisTheme,
  setTetrisSkin,
  setTetrisTheme,
  updateTetrisBestStats,
} from "@/components/games/tetris/leaderboard";
import { ArkanoidCanvas } from "@/components/games/arkanoid/arkanoid-canvas";
import {
  addArkanoidScore,
  getArkanoidLeaderboard,
} from "@/components/games/arkanoid/leaderboard";
import { SnakeCanvas } from "@/components/games/snake/snake-canvas";
import {
  addSnakeScore,
  getSnakeLeaderboard,
  getSnakeSkin,
  setSnakeSkin,
} from "@/components/games/snake/leaderboard";
import { FroggerCanvas } from "@/components/games/frogger/frogger-canvas";
import {
  addFroggerScore,
  getFroggerLeaderboard,
  getFroggerSkin,
  setFroggerSkin,
} from "@/components/games/frogger/leaderboard";
const LIVES = 3;
const TETRIS_SKINS: { value: TetrisSkin; label: string }[] = [
  { value: "retro", label: "Retro" },
  { value: "neon", label: "Neon" },
  { value: "pastel", label: "Pastel" },
  { value: "pixel", label: "Pixel Art" },
];
type SkinOption = { value: string; label: string };
// Registro de skins por juego: el botón "SKIN" del HUD se renderiza para
// cualquier juego presente aquí. Tetris conserva sus 4 skins propias; los
// juegos migrados al contrato compartido usan las 3 de GAME_SKINS.
// (arkanoid todavía no tiene skins: por eso no figura).
const SKINS_BY_GAME: Record<string, SkinOption[]> = {
  tetris: TETRIS_SKINS,
  asteroids: GAME_SKINS,
  snake: GAME_SKINS,
  frogger: GAME_SKINS,
};
// Lectura/escritura de la preferencia, delegada al leaderboard.ts de cada juego.
// Ambas claves son "<gameId>-skin" ("tetris-skin" es la que Tetris ya usaba,
// así que la preferencia guardada de sus jugadores sobrevive intacta).
const SKIN_STORAGE: Record<
  string,
  { read: () => string; write: (value: string) => void }
> = {
  tetris: {
    read: getTetrisSkin,
    write: (value) => setTetrisSkin(value as TetrisSkin),
  },
  asteroids: {
    read: getAsteroidsSkin,
    write: (value) => setAsteroidsSkin(value as GameSkin),
  },
  snake: {
    read: getSnakeSkin,
    write: (value) => setSnakeSkin(value as GameSkin),
  },
  frogger: {
    read: getFroggerSkin,
    write: (value) => setFroggerSkin(value as GameSkin),
  },
};
function GameOverModal({
  game,
  score,
  level,
  user,
  leaderboard,
  onRestart,
}: {
  game: Game;
  score: number;
  level?: number;
  user: UserSession;
  leaderboard?: {
    entries: LeaderboardEntry[];
    loading?: boolean;
    fetchError?: string | null;
    onSaveName: (name: string) => void | Promise<void>;
  };
  onRestart: () => void;
}) {
  // El alias del perfil es la única firma posible de un puntaje: ya no hay input
  // libre (RLS exige user_id = auth.uid(), y player_name viene de profiles).
  const name = user?.name ?? "";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveScore = async () => {
    if (!name) {
      setSaveError("Tu sesión expiró. Vuelve a iniciar sesión para guardar.");
      return;
    }
    if (leaderboard) {
      setSaving(true);
      setSaveError(null);
      try {
        await leaderboard.onSaveName(name);
        setSaved(true);
      } catch {
        setSaveError("No se pudo guardar la puntuación. Intenta de nuevo.");
      } finally {
        setSaving(false);
      }
    } else {
      addScore({ game: game.id, score, name });
      setSaved(true);
    }
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
        {leaderboard && leaderboard.loading && (
          <div
            className="mono"
            style={{ marginTop: 20, fontSize: 11, color: "var(--ink-dim)" }}
          >
            CARGANDO PUNTUACIONES...
          </div>
        )}
        {leaderboard && leaderboard.fetchError && (
          <div
            className="mono"
            style={{ marginTop: 20, fontSize: 11, color: "var(--magenta)" }}
          >
            {leaderboard.fetchError}
          </div>
        )}
        {leaderboard &&
          !leaderboard.loading &&
          leaderboard.entries.length > 0 && (
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
                  <div className="sc">
                    {entry.score.toLocaleString("es-ES")}
                  </div>
                </div>
              ))}
            </div>
          )}
        {!saved ? (
          <div className="input-row">
            <div
              className="pixel neon-cyan"
              style={{
                flex: 1,
                alignSelf: "center",
                fontSize: 13,
                letterSpacing: "0.12em",
                textAlign: "center",
              }}
            >
              {name || "SIN SESIÓN"}
            </div>
            <button
              className="btn yellow"
              onClick={saveScore}
              disabled={saving || !name}
            >
              {saving ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
            </button>
          </div>
        ) : (
          <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
        )}
        {saveError && (
          <div
            className="mono"
            style={{ marginTop: 8, fontSize: 11, color: "var(--magenta)" }}
          >
            {saveError}
          </div>
        )}
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
  const isAsteroids = game.id === "asteroids";
  const isTetris = game.id === "tetris";
  const isArkanoid = game.id === "arkanoid";
  const isSnake = game.id === "snake";
  const isFrogger = game.id === "frogger";
  const isPortedGame =
    isAsteroids || isTetris || isArkanoid || isSnake || isFrogger;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [asteroidsResult, setAsteroidsResult] =
    useState<AsteroidsGameOverResult | null>(null);
  const [tetrisResult, setTetrisResult] = useState<TetrisGameOverResult | null>(
    null,
  );
  const [arkanoidResult, setArkanoidResult] = useState<GameOverResult | null>(
    null,
  );
  const [snakeResult, setSnakeResult] = useState<GameOverResult | null>(null);
  const [froggerResult, setFroggerResult] =
    useState<FroggerGameOverResult | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardFetchError, setLeaderboardFetchError] = useState<
    string | null
  >(null);
  // Arrancan en el default "seguro para SSR" (el servidor no tiene localStorage)
  // y se corrigen en un useEffect post-hidratación para no producir un
  // hydration mismatch cuando el usuario ya tenía guardada otra preferencia.
  const skinOptions = SKINS_BY_GAME[game.id];
  const [skin, setSkinState] = useState<string>(
    () => skinOptions?.[0]?.value ?? "classic",
  );
  const [tetrisTheme, setTetrisThemeState] = useState<"dark" | "light">("dark");
  const canvasRef = useRef<GameCanvasHandle>(null);
  const level = isPortedGame ? engineLevel : Math.floor(score / 2500) + 1;
  useEffect(() => {
    const storage = SKIN_STORAGE[game.id];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storage) setSkinState(storage.read());
    if (isTetris) setTetrisThemeState(getTetrisTheme());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cycleSkin = () => {
    if (!skinOptions) return;
    setSkinState((prev) => {
      const idx = skinOptions.findIndex((s) => s.value === prev);
      const next = skinOptions[(idx + 1) % skinOptions.length].value;
      SKIN_STORAGE[game.id]?.write(next);
      return next;
    });
  };
  const toggleTetrisTheme = () => {
    setTetrisThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      setTetrisTheme(next);
      return next;
    });
  };
  useEffect(() => {
    if (isPortedGame) return;
    if (over || paused) return;
    const t = setInterval(() => {
      setScore((s) => s + Math.floor(10 + Math.random() * 90));
    }, 220);
    return () => clearInterval(t);
  }, [isPortedGame, over, paused]);
  const restart = () => {
    setScore(0);
    setLives(isTetris || isSnake ? 0 : LIVES);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setAsteroidsResult(null);
    setTetrisResult(null);
    setArkanoidResult(null);
    setSnakeResult(null);
    setFroggerResult(null);
    setLeaderboardEntries([]);
    setLeaderboardLoading(false);
    setLeaderboardFetchError(null);
    canvasRef.current?.restart();
  };
  const loadAsteroidsLeaderboard = () => {
    setLeaderboardLoading(true);
    setLeaderboardFetchError(null);
    getAsteroidsLeaderboard()
      .then(setLeaderboardEntries)
      .catch(() =>
        setLeaderboardFetchError("No se pudieron cargar las puntuaciones."),
      )
      .finally(() => setLeaderboardLoading(false));
  };
  const loadTetrisLeaderboard = () => {
    setLeaderboardLoading(true);
    setLeaderboardFetchError(null);
    getTetrisLeaderboard()
      .then(setLeaderboardEntries)
      .catch(() =>
        setLeaderboardFetchError("No se pudieron cargar las puntuaciones."),
      )
      .finally(() => setLeaderboardLoading(false));
  };
  const handleAsteroidsGameOver = (result: AsteroidsGameOverResult) => {
    setAsteroidsResult(result);
    setOver(true);
    loadAsteroidsLeaderboard();
  };
  const handleTetrisGameOver = (result: TetrisGameOverResult) => {
    setTetrisResult(result);
    updateTetrisBestStats(result);
    setOver(true);
    loadTetrisLeaderboard();
  };
  const loadArkanoidLeaderboard = () => {
    setLeaderboardLoading(true);
    setLeaderboardFetchError(null);
    getArkanoidLeaderboard()
      .then(setLeaderboardEntries)
      .catch(() =>
        setLeaderboardFetchError("No se pudieron cargar las puntuaciones."),
      )
      .finally(() => setLeaderboardLoading(false));
  };
  const handleArkanoidGameOver = (result: GameOverResult) => {
    setArkanoidResult(result);
    setOver(true);
    loadArkanoidLeaderboard();
  };
  const loadSnakeLeaderboard = () => {
    setLeaderboardLoading(true);
    setLeaderboardFetchError(null);
    getSnakeLeaderboard()
      .then(setLeaderboardEntries)
      .catch(() =>
        setLeaderboardFetchError("No se pudieron cargar las puntuaciones."),
      )
      .finally(() => setLeaderboardLoading(false));
  };
  const handleSnakeGameOver = (result: GameOverResult) => {
    setSnakeResult(result);
    setOver(true);
    loadSnakeLeaderboard();
  };
  const loadFroggerLeaderboard = () => {
    setLeaderboardLoading(true);
    setLeaderboardFetchError(null);
    getFroggerLeaderboard()
      .then(setLeaderboardEntries)
      .catch(() =>
        setLeaderboardFetchError("No se pudieron cargar las puntuaciones."),
      )
      .finally(() => setLeaderboardLoading(false));
  };
  const handleFroggerGameOver = (result: FroggerGameOverResult) => {
    setFroggerResult(result);
    setOver(true);
    loadFroggerLeaderboard();
  };
  const handleForceEnd = () => {
    if (isAsteroids) {
      setAsteroidsResult({
        score,
        level: engineLevel,
        asteroidsDestroyed: 0,
        bestCombo: 0,
      });
      loadAsteroidsLeaderboard();
    }
    if (isTetris) {
      setTetrisResult({ score, level: engineLevel, lines: 0, bestCombo: 0 });
      loadTetrisLeaderboard();
    }
    if (isArkanoid) {
      setArkanoidResult({ score, level: engineLevel });
      loadArkanoidLeaderboard();
    }
    if (isSnake) {
      setSnakeResult({ score, level: engineLevel });
      loadSnakeLeaderboard();
    }
    if (isFrogger) {
      setFroggerResult({
        score,
        level: engineLevel,
        frogsHome: 0,
        timeBonus: 0,
      });
      loadFroggerLeaderboard();
    }
    setOver(true);
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {user?.name ?? "..."}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {skinOptions && (
            <div className="hud-stat">
              <div className="l">Skin</div>
              <button type="button" className="v" onClick={cycleSkin}>
                {skinOptions.find((s) => s.value === skin)?.label ??
                  skinOptions[0].label}
              </button>
            </div>
          )}
          {/* "TEMA" sigue siendo exclusivo de Tetris: es el único con CSS
              Module claro/oscuro. */}
          {isTetris && (
            <div className="hud-stat">
              <div className="l">Tema</div>
              <button type="button" className="v" onClick={toggleTetrisTheme}>
                {tetrisTheme === "dark" ? "OSCURO" : "CLARO"}
              </button>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={handleForceEnd}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className={"crt-screen" + (isPortedGame ? " fit-canvas" : "")}>
          {isAsteroids ? (
            <AsteroidsCanvas
              ref={canvasRef}
              paused={paused || over}
              skin={skin as GameSkin}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={handleAsteroidsGameOver}
            />
          ) : isTetris ? (
            <TetrisCanvas
              ref={canvasRef}
              paused={paused || over}
              skin={skin as TetrisSkin}
              theme={tetrisTheme}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={handleTetrisGameOver}
            />
          ) : isArkanoid ? (
            <ArkanoidCanvas
              ref={canvasRef}
              paused={paused || over}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={handleArkanoidGameOver}
            />
          ) : isSnake ? (
            <SnakeCanvas
              ref={canvasRef}
              paused={paused || over}
              skin={skin as GameSkin}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={handleSnakeGameOver}
            />
          ) : isFrogger ? (
            <FroggerCanvas
              ref={canvasRef}
              paused={paused || over}
              skin={skin as GameSkin}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={handleFroggerGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
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
          score={
            isAsteroids
              ? (asteroidsResult?.score ?? score)
              : isTetris
                ? (tetrisResult?.score ?? score)
                : isArkanoid
                  ? (arkanoidResult?.score ?? score)
                  : isSnake
                    ? (snakeResult?.score ?? score)
                    : isFrogger
                      ? (froggerResult?.score ?? score)
                      : score
          }
          level={
            isAsteroids
              ? (asteroidsResult?.level ?? engineLevel)
              : isTetris
                ? (tetrisResult?.level ?? engineLevel)
                : isArkanoid
                  ? (arkanoidResult?.level ?? engineLevel)
                  : isSnake
                    ? (snakeResult?.level ?? engineLevel)
                    : isFrogger
                      ? (froggerResult?.level ?? engineLevel)
                      : undefined
          }
          user={user}
          leaderboard={
            isAsteroids
              ? {
                  entries: leaderboardEntries,
                  loading: leaderboardLoading,
                  fetchError: leaderboardFetchError,
                  onSaveName: async (name) => {
                    const result = asteroidsResult ?? {
                      score,
                      level: engineLevel,
                      asteroidsDestroyed: 0,
                      bestCombo: 0,
                    };
                    const entries = await addAsteroidsScore(name, result);
                    setLeaderboardEntries(entries);
                  },
                }
              : isTetris
                ? {
                    entries: leaderboardEntries,
                    loading: leaderboardLoading,
                    fetchError: leaderboardFetchError,
                    onSaveName: async (name) => {
                      const result = tetrisResult ?? {
                        score,
                        level: engineLevel,
                        lines: 0,
                        bestCombo: 0,
                      };
                      const entries = await addTetrisScore(name, result);
                      setLeaderboardEntries(entries);
                    },
                  }
                : isArkanoid
                  ? {
                      entries: leaderboardEntries,
                      loading: leaderboardLoading,
                      fetchError: leaderboardFetchError,
                      onSaveName: async (name) => {
                        const result = arkanoidResult ?? {
                          score,
                          level: engineLevel,
                        };
                        const entries = await addArkanoidScore(name, result);
                        setLeaderboardEntries(entries);
                      },
                    }
                  : isSnake
                    ? {
                        entries: leaderboardEntries,
                        loading: leaderboardLoading,
                        fetchError: leaderboardFetchError,
                        onSaveName: async (name) => {
                          const result = snakeResult ?? {
                            score,
                            level: engineLevel,
                          };
                          const entries = await addSnakeScore(name, result);
                          setLeaderboardEntries(entries);
                        },
                      }
                    : isFrogger
                      ? {
                          entries: leaderboardEntries,
                          loading: leaderboardLoading,
                          fetchError: leaderboardFetchError,
                          onSaveName: async (name) => {
                            const result = froggerResult ?? {
                              score,
                              level: engineLevel,
                              frogsHome: 0,
                              timeBonus: 0,
                            };
                            const entries = await addFroggerScore(name, result);
                            setLeaderboardEntries(entries);
                          },
                        }
                      : undefined
          }
          onRestart={restart}
        />
      )}
    </div>
  );
}
