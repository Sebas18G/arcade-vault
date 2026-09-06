import type { GameSkin } from "@/components/games/shared/skins";
export type GameOverResult = {
  score: number;
  level: number;
};
export type AsteroidsGameOverResult = GameOverResult & {
  asteroidsDestroyed: number;
  bestCombo: number;
};
export type TetrisGameOverResult = GameOverResult & {
  lines: number;
  bestCombo: number;
};
export type SnakeGameOverResult = GameOverResult; // sin stats extra, igual que Arkanoid
export type FroggerGameOverResult = GameOverResult & {
  /** Ranas totales llevadas a casa en la partida. */
  frogsHome: number;
  /** Puntos acumulados por tiempo sin usar del temporizador. */
  timeBonus: number;
};
export type InvasoresGameOverResult = GameOverResult & {
  /** Invasores destruidos en toda la partida (no incluye UFOs). */
  aliensKilled: number;
  /** UFOs de bonus derribados. */
  ufosHit: number;
  /** Disparos efectuados por el jugador. Indexa además la tabla del UFO. */
  shotsFired: number;
};
export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  [key: string]: unknown;
};
export type GameCanvasProps<TResult extends GameOverResult = GameOverResult> = {
  paused: boolean;
  /**
   * Obligatorio desde 2026-09-05: con `invasores` migrado ya no queda ningún
   * canvas sin skin. Tetris queda fuera de este campo por tener sus 4 skins
   * propias — lo reemplaza con `Omit<GameCanvasProps<...>, "skin">`.
   */
  skin: GameSkin;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: TResult) => void;
};
export type GameCanvasHandle = {
  restart: () => void;
};
