import type { GameOverResult } from "@/components/games/shared/types";
export const ARKANOID_WIDTH = 800;
export const ARKANOID_HEIGHT = 600;
const BG_COLOR = "#1414a0";
const SOUNDS = {
  bounce: "/games/arkanoid/sounds/ball-bounce.mp3",
  break: "/games/arkanoid/sounds/break-sound.mp3",
};
const BLOCK_COLORS = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
] as const;
type BlockColor = (typeof BLOCK_COLORS)[number];
const INDESTRUCTIBLE_TEXTURES = [
  "wood",
  "brick_red",
  "stone",
  "brick_dark",
] as const;
type IndestructibleTexture = (typeof INDESTRUCTIBLE_TEXTURES)[number];
const GRID_COLS = 10;
const BLOCK_SCORE = 10;
const MAX_LEVEL = 15;
function rowsForLevel(level: number): number {
  return Math.min(6 + Math.floor((level - 1) / 3), 10);
}
function indestructibleCountForLevel(level: number): number {
  return Math.min(level - 1, 8);
}
function speedMultiplierForLevel(level: number): number {
  return 1 + 0.08 * (level - 1);
}
const BLOCK_W = 76;
const BLOCK_H = 24;
const BLOCK_GAP = 4;
const BLOCK_MARGIN_X = 2;
const BLOCK_MARGIN_TOP = 60;
const INITIAL_PADDLE = { x: 350, y: 570, w: 100, h: 16 };
const INITIAL_BALL = { x: 400, y: 300, vx: 4, vy: -4, r: 8 };
type Block = {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  breakable: boolean;
  color?: BlockColor;
  texture?: IndestructibleTexture;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  startTime: number;
};
type Screen = "playing" | "gameover" | "victory" | "levelcomplete";
// ── Spritesheet ───────────────────────────────────────────────────────────────
type SpriteRect = { sx: number; sy: number; sw: number; sh: number };
const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
};
const EXPLOSION_DURATION = 150;
const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } as Record<BlockColor, SpriteRect>,
  indestructible: {
    wood: { sx: 32, sy: 272, sw: 32, sh: 16 },
    brick_red: { sx: 64, sy: 272, sw: 32, sh: 16 },
    stone: { sx: 32, sy: 288, sw: 32, sh: 16 },
    brick_dark: { sx: 64, sy: 288, sw: 32, sh: 16 },
  } as Record<IndestructibleTexture, SpriteRect>,
};
let ssImg: HTMLCanvasElement | null = null;
let ssLoaded = false;
let ssLoading: Promise<void> | null = null;
function loadSpritesheet(): Promise<void> {
  if (ssLoaded) return Promise.resolve();
  if (ssLoading) return ssLoading;
  ssLoading = new Promise((resolve) => {
    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d")!;
      octx.drawImage(rawImg, 0, 0);
      ssImg = oc;
      ssLoaded = true;
      resolve();
    };
    rawImg.onerror = () => {
      console.error("Failed to load Arkanoid spritesheet");
      resolve();
    };
    rawImg.src = "/games/arkanoid/spritesheet-breakout.png";
  });
  return ssLoading;
}
function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: SpriteRect,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !ssImg) return;
  ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !ssImg) return;
  let sp: SpriteRect | undefined;
  if (name.startsWith("block_")) {
    sp = SPRITES.blocks[name.slice(6) as BlockColor];
  } else if (name.startsWith("indestructible_")) {
    sp = SPRITES.indestructible[name.slice(15) as IndestructibleTexture];
  } else if (name === "paddle" || name === "ball") {
    sp = SPRITES[name];
  }
  if (!sp) return;
  ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
function playSound(name: keyof typeof SOUNDS) {
  const audio = new Audio(SOUNDS[name]);
  audio.play().catch(() => {});
}
export type ArkanoidEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: GameOverResult) => void;
};
export class ArkanoidEngine {
  private callbacks: ArkanoidEngineCallbacks;
  private paused = false;
  private ready = false;
  private screen: Screen = "playing";
  private lives = 3;
  private score = 0;
  private level = 1;
  private paddle = { ...INITIAL_PADDLE };
  private ball = { ...INITIAL_BALL };
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];
  private pendingVictory = false;
  private pendingLevelComplete = false;
  private keysLeft = false;
  private keysRight = false;
  constructor(callbacks: ArkanoidEngineCallbacks) {
    this.callbacks = callbacks;
    loadSpritesheet().then(() => {
      this.ready = true;
    });
    this.restart();
  }
  restart() {
    this.lives = 3;
    this.score = 0;
    this.level = 1;
    this.blocks = this.generateBlocks(this.level);
    this.explosions = [];
    this.pendingVictory = false;
    this.pendingLevelComplete = false;
    this.screen = "playing";
    this.resetPositions();
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  setKey(key: "left" | "right", pressed: boolean) {
    if (key === "left") this.keysLeft = pressed;
    else this.keysRight = pressed;
  }
  /** x en coordenadas internas del canvas (0-800), ya corregido por escala CSS. */
  setPaddleFromPointer(x: number) {
    if (this.screen !== "playing") return;
    this.paddle.x = this.clampPaddleX(x - this.paddle.w / 2);
  }
  confirmLevelComplete() {
    if (this.screen !== "levelcomplete") return;
    this.advanceLevel();
  }
  private clampPaddleX(x: number): number {
    return Math.max(0, Math.min(ARKANOID_WIDTH - this.paddle.w, x));
  }
  private resetPositions() {
    this.paddle = { ...INITIAL_PADDLE };
    const speedMul = speedMultiplierForLevel(this.level);
    this.ball = {
      ...INITIAL_BALL,
      vx: INITIAL_BALL.vx * speedMul,
      vy: INITIAL_BALL.vy * speedMul,
    };
  }
  private generateBlocks(level: number): Block[] {
    const rows = rowsForLevel(level);
    const blocks: Block[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        blocks.push({
          row,
          col,
          x: BLOCK_MARGIN_X + col * (BLOCK_W + BLOCK_GAP),
          y: BLOCK_MARGIN_TOP + row * (BLOCK_H + BLOCK_GAP),
          w: BLOCK_W,
          h: BLOCK_H,
          alive: true,
          breakable: true,
          color: BLOCK_COLORS[row % BLOCK_COLORS.length],
        });
      }
    }
    const remainingIndices = blocks.map((_, i) => i);
    const indestructibleCount = indestructibleCountForLevel(level);
    for (let i = 0; i < indestructibleCount; i++) {
      const pick = Math.floor(Math.random() * remainingIndices.length);
      const blockIndex = remainingIndices.splice(pick, 1)[0];
      const block = blocks[blockIndex];
      block.breakable = false;
      block.color = undefined;
      block.texture =
        INDESTRUCTIBLE_TEXTURES[
          Math.floor(Math.random() * INDESTRUCTIBLE_TEXTURES.length)
        ];
    }
    return blocks;
  }
  private advanceLevel() {
    this.level += 1;
    this.blocks = this.generateBlocks(this.level);
    this.explosions = [];
    this.pendingLevelComplete = false;
    this.resetPositions();
    this.screen = "playing";
    this.callbacks.onLevelChange(this.level);
  }
  private updatePaddle() {
    if (this.keysLeft) this.paddle.x = this.clampPaddleX(this.paddle.x - 7);
    if (this.keysRight) this.paddle.x = this.clampPaddleX(this.paddle.x + 7);
  }
  private collidesWithRect(
    b: { x: number; y: number; r: number },
    r: { x: number; y: number; w: number; h: number },
  ): boolean {
    const closestX = Math.max(r.x, Math.min(b.x, r.x + r.w));
    const closestY = Math.max(r.y, Math.min(b.y, r.y + r.h));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    return dx * dx + dy * dy <= b.r * b.r;
  }
  private bounceOffBlock(b: typeof this.ball, block: Block) {
    const overlapLeft = b.x + b.r - block.x;
    const overlapRight = block.x + block.w - (b.x - b.r);
    const overlapTop = b.y + b.r - block.y;
    const overlapBottom = block.y + block.h - (b.y - b.r);
    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);
    if (minOverlapX < minOverlapY) b.vx *= -1;
    else b.vy *= -1;
  }
  private checkBlockCollisions() {
    const b = this.ball;
    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (!this.collidesWithRect(b, block)) continue;
      this.bounceOffBlock(b, block);
      playSound("bounce");
      if (block.breakable) {
        block.alive = false;
        this.score += BLOCK_SCORE;
        this.callbacks.onScoreChange(this.score);
        this.explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color!,
          startTime: performance.now(),
        });
        playSound("break");
        const breakableCleared = this.blocks
          .filter((bl) => bl.breakable)
          .every((bl) => !bl.alive);
        if (breakableCleared) {
          if (this.level === MAX_LEVEL) this.pendingVictory = true;
          else this.pendingLevelComplete = true;
        }
      }
      break;
    }
  }
  private updateBall() {
    const b = this.ball;
    b.x += b.vx;
    b.y += b.vy;
    if (b.x - b.r <= 0) {
      b.x = b.r;
      b.vx *= -1;
      playSound("bounce");
    } else if (b.x + b.r >= ARKANOID_WIDTH) {
      b.x = ARKANOID_WIDTH - b.r;
      b.vx *= -1;
      playSound("bounce");
    }
    if (b.y - b.r <= 0) {
      b.y = b.r;
      b.vy *= -1;
      playSound("bounce");
    }
    if (b.vy > 0 && this.collidesWithRect(b, this.paddle)) {
      b.y = this.paddle.y - b.r;
      b.vy *= -1;
      playSound("bounce");
    }
    this.checkBlockCollisions();
    if (b.y - b.r > ARKANOID_HEIGHT) {
      this.lives -= 1;
      this.callbacks.onLivesChange(this.lives);
      if (this.lives <= 0) {
        this.screen = "gameover";
        this.callbacks.onGameOver({ score: this.score, level: this.level });
      }
      this.resetPositions();
    }
  }
  private updateExplosions() {
    this.explosions = this.explosions.filter(
      (ex) => performance.now() - ex.startTime < EXPLOSION_DURATION,
    );
    if (this.explosions.length === 0) {
      if (this.pendingVictory) {
        this.screen = "victory";
        this.callbacks.onGameOver({ score: this.score, level: this.level });
      } else if (this.pendingLevelComplete) {
        this.screen = "levelcomplete";
      }
    }
  }
  update() {
    if (this.paused || !this.ready) return;
    if (this.screen === "playing") {
      this.updatePaddle();
      this.updateBall();
      this.updateExplosions();
    }
  }
  private drawExplosions(ctx: CanvasRenderingContext2D) {
    for (const ex of this.explosions) {
      const elapsed = performance.now() - ex.startTime;
      const frameIndex = Math.min(
        3,
        Math.floor(elapsed / (EXPLOSION_DURATION / 4)),
      );
      const frame = EXPLOSION_FRAMES[ex.color][frameIndex];
      drawFrame(ctx, frame, ex.x, ex.y, ex.w, ex.h);
    }
  }
  private drawHUD(ctx: CanvasRenderingContext2D) {
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`PUNTAJE ${this.score}`, 10, 10);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level} / ${MAX_LEVEL}`, ARKANOID_WIDTH / 2, 10);
    ctx.fillStyle = "#ff3b3b";
    ctx.textAlign = "right";
    ctx.fillText(`VIDAS ${this.lives}`, ARKANOID_WIDTH - 10, 10);
    ctx.shadowBlur = 0;
  }
  private drawLevelCompleteScreen(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, ARKANOID_WIDTH, ARKANOID_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "48px sans-serif";
    ctx.fillText(
      `NIVEL ${this.level} COMPLETADO`,
      ARKANOID_WIDTH / 2,
      ARKANOID_HEIGHT / 2 - 30,
    );
    ctx.font = "20px sans-serif";
    ctx.fillText(
      "Presiona Enter o Espacio para continuar",
      ARKANOID_WIDTH / 2,
      ARKANOID_HEIGHT / 2 + 20,
    );
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, ARKANOID_WIDTH, ARKANOID_HEIGHT);
    if (!this.ready) return;
    drawSprite(
      ctx,
      "paddle",
      this.paddle.x,
      this.paddle.y,
      this.paddle.w,
      this.paddle.h,
    );
    const b = this.ball;
    drawSprite(ctx, "ball", b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    for (const block of this.blocks) {
      if (!block.alive) continue;
      const spriteName = block.breakable
        ? `block_${block.color}`
        : `indestructible_${block.texture}`;
      drawSprite(ctx, spriteName, block.x, block.y, block.w, block.h);
    }
    this.drawExplosions(ctx);
    this.drawHUD(ctx);
    if (this.screen === "levelcomplete") {
      this.drawLevelCompleteScreen(ctx);
    }
  }
}
