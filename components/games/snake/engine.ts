import type { GameOverResult } from "@/components/games/shared/types";
import type { GameSkin } from "@/components/games/shared/skins";
import { SNAKE_SKIN_PALETTES, type SnakePalette } from "./skins";
import {
  FRUITS,
  FRUIT_ATLAS_SRC,
  FRUIT_NAMES,
  type FruitSprite,
} from "./sprite-atlas";
export const SNAKE_WIDTH = 800;
export const SNAKE_HEIGHT = 800;
export const GRID_SIZE = 20; // celdas por lado
export const CELL_PX = 40; // 20 * 40 = 800
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GridPoint = { x: number; y: number }; // coordenadas de grilla (0..19), no píxeles
const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};
const DELTA: Record<Direction, GridPoint> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
const INITIAL_SNAKE: GridPoint[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION: Direction = "RIGHT";
const FRUITS_PER_LEVEL = 5;
const SCORE_PER_FRUIT = 10;
const BASE_MOVE_INTERVAL_MS = 220;
const MOVE_INTERVAL_STEP_MS = 12;
const MIN_MOVE_INTERVAL_MS = 45; // piso técnico interno, no un "nivel máximo" visible
const MAX_UPDATE_STEPS = 8; // evita explosión de pasos si el tab estuvo en background
// Los colores ya no viven aquí: entran por `setSkin()` desde ./skins.
// El motor nunca lee `document`, `window` ni `localStorage`.
let fruitImg: HTMLImageElement | null = null;
let fruitImgLoaded = false;
let fruitImgLoading: Promise<void> | null = null;
function loadFruitAtlas(): Promise<void> {
  if (fruitImgLoaded) return Promise.resolve();
  if (fruitImgLoading) return fruitImgLoading;
  fruitImgLoading = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      fruitImg = img;
      fruitImgLoaded = true;
      resolve();
    };
    img.onerror = () => {
      console.error("Failed to load Snake fruit atlas");
      resolve();
    };
    img.src = FRUIT_ATLAS_SRC;
  });
  return fruitImgLoading;
}
export type SnakeEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: GameOverResult) => void;
};
export class SnakeEngine {
  private callbacks: SnakeEngineCallbacks;
  private paused = false;
  private screen: "playing" | "gameover" = "playing";
  private score = 0;
  private level = 1;
  private fruitsEaten = 0;
  private snake: GridPoint[] = [];
  private direction: Direction = INITIAL_DIRECTION;
  private pendingDirection: Direction = INITIAL_DIRECTION;
  private fruit: { pos: GridPoint; name: string } | null = null;
  private moveAccumulator = 0;
  private skin: GameSkin = "classic";
  private palette: SnakePalette = SNAKE_SKIN_PALETTES.classic;
  constructor(callbacks: SnakeEngineCallbacks) {
    this.callbacks = callbacks;
    loadFruitAtlas();
    this.restart();
  }
  setSkin(skin: GameSkin) {
    this.skin = skin;
    this.palette = SNAKE_SKIN_PALETTES[skin] ?? SNAKE_SKIN_PALETTES.classic;
  }
  getSkin(): GameSkin {
    return this.skin;
  }
  restart() {
    this.score = 0;
    this.level = 1;
    this.fruitsEaten = 0;
    this.snake = INITIAL_SNAKE.map((p) => ({ ...p }));
    this.direction = INITIAL_DIRECTION;
    this.pendingDirection = INITIAL_DIRECTION;
    this.moveAccumulator = 0;
    this.screen = "playing";
    this.fruit = this.spawnFruit(null);
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(0);
    this.callbacks.onLevelChange(this.level);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  keyDown(direction: Direction) {
    if (direction === OPPOSITE[this.direction]) return;
    this.pendingDirection = direction;
  }
  // Sin estado que liberar al soltar la tecla; existe por simetría con el resto de motores.
  keyUp(_direction: Direction) {}
  private moveIntervalMs(): number {
    return Math.max(
      MIN_MOVE_INTERVAL_MS,
      BASE_MOVE_INTERVAL_MS - (this.level - 1) * MOVE_INTERVAL_STEP_MS,
    );
  }
  private spawnFruit(excludeName: string | null): {
    pos: GridPoint;
    name: string;
  } {
    const occupied = new Set(this.snake.map((s) => `${s.x},${s.y}`));
    const freeCells: GridPoint[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
      }
    }
    const pos = freeCells[Math.floor(Math.random() * freeCells.length)] ?? {
      x: 0,
      y: 0,
    };
    const candidates = FRUIT_NAMES.filter((n) => n !== excludeName);
    const pool = candidates.length > 0 ? candidates : FRUIT_NAMES;
    const name = pool[Math.floor(Math.random() * pool.length)];
    return { pos, name };
  }
  private step() {
    this.direction = this.pendingDirection;
    const delta = DELTA[this.direction];
    const head = this.snake[0];
    const newHead: GridPoint = { x: head.x + delta.x, y: head.y + delta.y };
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      this.gameOver();
      return;
    }
    const willGrow =
      !!this.fruit &&
      this.fruit.pos.x === newHead.x &&
      this.fruit.pos.y === newHead.y;
    const bodyToCheck = willGrow ? this.snake : this.snake.slice(0, -1);
    if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      this.gameOver();
      return;
    }
    this.snake.unshift(newHead);
    if (willGrow) {
      this.score += SCORE_PER_FRUIT;
      this.fruitsEaten += 1;
      const newLevel = Math.floor(this.fruitsEaten / FRUITS_PER_LEVEL) + 1;
      this.callbacks.onScoreChange(this.score);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.callbacks.onLevelChange(this.level);
      }
      this.fruit = this.spawnFruit(this.fruit!.name);
    } else {
      this.snake.pop();
    }
  }
  private gameOver() {
    this.screen = "gameover";
    this.callbacks.onGameOver({ score: this.score, level: this.level });
  }
  update(dt: number) {
    if (this.paused || this.screen !== "playing") return;
    this.moveAccumulator += dt;
    const interval = this.moveIntervalMs();
    let steps = 0;
    while (this.moveAccumulator >= interval && steps < MAX_UPDATE_STEPS) {
      this.moveAccumulator -= interval;
      this.step();
      steps += 1;
      if (this.screen !== "playing") {
        this.moveAccumulator = 0;
        break;
      }
    }
  }
  /** Retícula completa: el trazado original, con color y grosor de la paleta. */
  private drawGridLines(ctx: CanvasRenderingContext2D) {
    const { color, lineWidth } = this.palette.grid;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_PX, 0);
      ctx.lineTo(i * CELL_PX, SNAKE_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_PX);
      ctx.lineTo(SNAKE_WIDTH, i * CELL_PX);
      ctx.stroke();
    }
  }
  /** Trama de puntos en las intersecciones: misma información, mucha menos tinta. */
  private drawGridDots(ctx: CanvasRenderingContext2D) {
    const { color, dotSize } = this.palette.grid;
    if (dotSize <= 0) return;
    const half = dotSize / 2;
    ctx.fillStyle = color;
    for (let x = 0; x <= GRID_SIZE; x++) {
      for (let y = 0; y <= GRID_SIZE; y++) {
        ctx.fillRect(x * CELL_PX - half, y * CELL_PX - half, dotSize, dotSize);
      }
    }
  }
  private drawGrid(ctx: CanvasRenderingContext2D) {
    if (this.palette.grid.style === "dots") this.drawGridDots(ctx);
    else this.drawGridLines(ctx);
  }
  /** Marco del tablero: en classic no existe (`border: null`) y no se dibuja nada. */
  private drawBoardBorder(ctx: CanvasRenderingContext2D) {
    const { border, borderWidth, borderGlow } = this.palette.board;
    if (!border || borderWidth <= 0) return;
    ctx.save();
    ctx.strokeStyle = border;
    ctx.lineWidth = borderWidth;
    if (borderGlow > 0) {
      ctx.shadowColor = border;
      ctx.shadowBlur = borderGlow;
    }
    const inset = borderWidth / 2;
    ctx.strokeRect(
      inset,
      inset,
      SNAKE_WIDTH - borderWidth,
      SNAKE_HEIGHT - borderWidth,
    );
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  private drawFruit(ctx: CanvasRenderingContext2D) {
    if (!this.fruit) return;
    const { pos, name } = this.fruit;
    const sprite: FruitSprite | undefined = FRUITS[name];
    const dx = pos.x * CELL_PX;
    const dy = pos.y * CELL_PX;
    const { fruitGlow, fruitGlowColor, fruitFallback } = this.palette;
    ctx.save();
    if (fruitGlow > 0) {
      ctx.shadowColor = fruitGlowColor;
      ctx.shadowBlur = fruitGlow;
    }
    if (sprite && fruitImgLoaded && fruitImg) {
      ctx.drawImage(
        fruitImg,
        sprite.x,
        sprite.y,
        sprite.w,
        sprite.h,
        dx,
        dy,
        CELL_PX,
        CELL_PX,
      );
    } else {
      ctx.fillStyle = fruitFallback;
      ctx.fillRect(dx + 6, dy + 6, CELL_PX - 12, CELL_PX - 12);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  private drawSnake(ctx: CanvasRenderingContext2D) {
    const { snakeHead, snakeBody, snakeGlow } = this.palette;
    ctx.save();
    this.snake.forEach((seg, i) => {
      const color = i === 0 ? snakeHead : snakeBody;
      ctx.fillStyle = color;
      if (snakeGlow > 0) {
        ctx.shadowColor = color;
        // La cabeza brilla más que el cuerpo: nunca se confunden.
        ctx.shadowBlur = i === 0 ? snakeGlow * 1.5 : snakeGlow;
      }
      ctx.fillRect(
        seg.x * CELL_PX + 1,
        seg.y * CELL_PX + 1,
        CELL_PX - 2,
        CELL_PX - 2,
      );
    });
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  private drawHUD(ctx: CanvasRenderingContext2D) {
    const { hudText, hudShadow, hudShadowBlur } = this.palette;
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textBaseline = "top";
    ctx.shadowColor = hudShadow;
    ctx.shadowBlur = hudShadowBlur;
    ctx.fillStyle = hudText;
    ctx.textAlign = "left";
    ctx.fillText(`PUNTAJE ${this.score}`, 10, 10);
    ctx.fillStyle = hudText;
    ctx.textAlign = "right";
    ctx.fillText(`NIVEL ${this.level}`, SNAKE_WIDTH - 10, 10);
    ctx.shadowBlur = 0;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(0, 0, SNAKE_WIDTH, SNAKE_HEIGHT);
    this.drawGrid(ctx);
    this.drawBoardBorder(ctx);
    this.drawFruit(ctx);
    this.drawSnake(ctx);
    this.drawHUD(ctx);
  }
}
