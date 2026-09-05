export type GameRow = { id: string; title: string; created_at: string };
export type AsteroidsScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  asteroids_destroyed: number;
  best_combo: number;
  user_id: string | null;
  created_at: string;
};
export type TetrisScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  lines: number;
  best_combo: number;
  user_id: string | null;
  created_at: string;
};
export type ArkanoidScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  user_id: string | null;
  created_at: string;
};
export type SnakeScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  user_id: string | null;
  created_at: string;
};
export type FroggerScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  frogs_home: number;
  time_bonus: number;
  user_id: string | null;
  created_at: string;
};
export type GlobalScoreRow = {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  level: number;
  user_id: string | null;
  created_at: string;
};
