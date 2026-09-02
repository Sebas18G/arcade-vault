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
export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  [key: string]: unknown;
};
export type GameCanvasProps<TResult extends GameOverResult = GameOverResult> = {
  paused: boolean;
  /** Opcional: los canvas todavía sin skins (arkanoid) lo ignoran. */
  skin?: GameSkin;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: TResult) => void;
};
export type GameCanvasHandle = {
  restart: () => void;
};
