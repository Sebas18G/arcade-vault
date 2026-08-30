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
export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  [key: string]: unknown;
};
export type GameCanvasProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: GameOverResult) => void;
};
export type GameCanvasHandle = {
  restart: () => void;
};
