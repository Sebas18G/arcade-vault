import type { TetrisGameOverResult } from "@/components/games/shared/types";
export const TETRIS_COLS = 10;
export const TETRIS_ROWS = 20;
export const TETRIS_BLOCK = 30;
export const TETRIS_BOARD_WIDTH = TETRIS_COLS * TETRIS_BLOCK;
export const TETRIS_BOARD_HEIGHT = TETRIS_ROWS * TETRIS_BLOCK;
export const TETRIS_NEXT_SIZE = 120;
export type TetrisSkin = "retro" | "neon" | "pastel" | "pixel";
const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#64b5f6", // J - pale blue
  "#ffb74d", // L - orange
  "#f06292", // PLUS - rosa (pentominó)
  "#7986cb", // U - índigo (pentominó)
  "#dce775", // Y - lima (pentominó)
  "#ffd700", // SINGLE - dorado (recompensa Tetris)
  "#78909c", // HOLLOW - gris azulado (reto)
  "#ff5722", // BOMB - naranja fuego
  "#fff176", // LIGHTNING - amarillo eléctrico
  "#e040fb", // DYE - magenta comodín
  "#8d6e63", // GRAVITY - marrón tierra
  "#4fc3f7", // FREEZE - celeste hielo
];
const PASTEL_COLORS: (string | null)[] = [
  null,
  "#a8dadc",
  "#ffe8a3",
  "#d8bfd8",
  "#b5e8b0",
  "#f5b8b8",
  "#b8d4f0",
  "#ffcc99",
  "#f7c6d9",
  "#c5cae9",
  "#eef2a8",
  "#fff2b2",
  "#c8d0d8",
  "#ffb3a1",
  "#fff6b3",
  "#f0b3f7",
  "#d2b8a8",
  "#b3e0f7",
];
const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [0, 8, 0],
    [8, 8, 8],
    [0, 8, 0],
  ], // PLUS (pentominó)
  [
    [9, 0, 9],
    [9, 9, 9],
  ], // U (pentominó)
  [
    [0, 10],
    [10, 10],
    [0, 10],
    [0, 10],
  ], // Y (pentominó)
  [[11]], // SINGLE (recompensa tras Tetris)
  [
    [12, 12, 12],
    [12, 0, 12],
    [12, 12, 12],
  ], // HOLLOW (reto)
  [[13]], // BOMB
  [[14]], // LIGHTNING
  [[15]], // DYE
  [[16]], // GRAVITY
  [[17]], // FREEZE
];
const NORMAL_TYPES = [1, 2, 3, 4, 5, 6, 7];
const PENTOMINO_TYPES = [8, 9, 10];
const CHALLENGE_TYPES = [12];
const REWARD_TYPE = 11;
const BOMB_TYPE = 13;
const LIGHTNING_TYPE = 14;
const DYE_TYPE = 15;
const GRAVITY_TYPE = 16;
const FREEZE_TYPE = 17;
const POWERUP_TYPES = [
  BOMB_TYPE,
  LIGHTNING_TYPE,
  DYE_TYPE,
  GRAVITY_TYPE,
  FREEZE_TYPE,
];
const POWERUP_LABELS: Record<number, string> = {
  [BOMB_TYPE]: "💣 BOMBA",
  [LIGHTNING_TYPE]: "⚡ RAYO",
  [DYE_TYPE]: "🎨 TINTE",
  [GRAVITY_TYPE]: "⬇️ GRAVEDAD",
  [FREEZE_TYPE]: "❄️ CONGELAR",
};
const FREEZE_DURATION = 5000;
const SPAWN_WEIGHTS: { type: number; weight: number }[] = [
  ...NORMAL_TYPES.map((type) => ({ type, weight: 10 })),
  ...PENTOMINO_TYPES.map((type) => ({ type, weight: 3 })),
  ...CHALLENGE_TYPES.map((type) => ({ type, weight: 2 })),
];
const LINE_SCORES = [0, 100, 300, 500, 800];
const T_SPIN_SCORES = [400, 800, 1200, 1600];
const T_SPIN_LABELS: Record<number, string> = {
  0: "T-SPIN",
  1: "T-SPIN SINGLE",
  2: "T-SPIN DOUBLE",
  3: "T-SPIN TRIPLE",
};
const PERFECT_CLEAR_SCORES = [0, 800, 1200, 1800, 2000];
const T_TYPE = 3;
const B2B_BONUS_RATIO = 0.5;
export type TetrisPieceSnapshot = { type: number; shape: number[][] };
export type TetrisClearEffect = {
  toast: string | null;
  flashClass:
    | "flash-normal"
    | "flash-tspin"
    | "flash-tetris"
    | "flash-b2b"
    | "flash-perfect"
    | null;
};
export type TetrisEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  onComboChange: (combo: number) => void;
  onFreezeChange: (remainingMs: number) => void;
  onNextPieceChange: (piece: TetrisPieceSnapshot) => void;
  onClearEffect: (effect: TetrisClearEffect) => void;
  onPowerUpToast: (label: string) => void;
  onGameOver: (result: TetrisGameOverResult) => void;
};
type Piece = { type: number; shape: number[][]; x: number; y: number };
function createBoard(): number[][] {
  return Array.from({ length: TETRIS_ROWS }, () =>
    new Array(TETRIS_COLS).fill(0),
  );
}
function createPiece(type: number): Piece {
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(TETRIS_COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
function weightedRandomType(): number {
  const total = SPAWN_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * total;
  for (const w of SPAWN_WEIGHTS) {
    if (r < w.weight) return w.type;
    r -= w.weight;
  }
  return SPAWN_WEIGHTS[0].type;
}
function randomPiece(): Piece {
  return createPiece(weightedRandomType());
}
function dropIntervalForLevel(lvl: number): number {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}
function rollPowerUpThreshold(lvl: number): number {
  const maxLines = Math.max(4, 12 - lvl);
  const minLines = Math.max(2, maxLines - 3);
  return minLines + Math.floor(Math.random() * (maxLines - minLines + 1));
}
function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
// ── Dibujo (funciones puras, reutilizadas por el tablero principal y el preview) ──
export function drawTetrisBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  skin: TetrisSkin,
  alpha?: number,
) {
  if (!colorIndex) return;
  switch (skin) {
    case "neon":
      drawBlockNeon(context, x, y, colorIndex, size, alpha);
      break;
    case "pastel":
      drawBlockPastel(context, x, y, colorIndex, size, alpha);
      break;
    case "pixel":
      drawBlockPixel(context, x, y, colorIndex, size, alpha);
      break;
    default:
      drawBlockRetro(context, x, y, colorIndex, size, alpha);
      break;
  }
}
function drawBlockRetro(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha?: number,
) {
  const color = COLORS[colorIndex]!;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}
function drawBlockNeon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha?: number,
) {
  const color = COLORS[colorIndex]!;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowBlur = size * 0.5;
  context.shadowColor = color;
  context.fillStyle = color;
  context.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255,255,255,0.7)";
  context.lineWidth = 1;
  context.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.restore();
}
function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, w, h, r);
    return;
  }
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}
function drawBlockPastel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha?: number,
) {
  const color = PASTEL_COLORS[colorIndex] || COLORS[colorIndex]!;
  const px = x * size + 2;
  const py = y * size + 2;
  const w = size - 4;
  const h = size - 4;
  const r = Math.min(6, w / 2, h / 2);
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  roundedRectPath(context, px, py, w, h, r);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.35)";
  roundedRectPath(context, px, py, w, Math.max(2, h * 0.35), r);
  context.fill();
  context.restore();
}
function drawBlockPixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha?: number,
) {
  const color = COLORS[colorIndex]!;
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, w, h);
  const cell = Math.max(2, Math.floor(size / 8));
  context.fillStyle = "rgba(0,0,0,0.18)";
  for (let iy = 0; iy < h; iy += cell) {
    for (let ix = 0; ix < w; ix += cell) {
      if ((ix / cell + iy / cell) % 2 === 0) {
        context.fillRect(
          px + ix,
          py + iy,
          Math.min(cell, w - ix),
          Math.min(cell, h - iy),
        );
      }
    }
  }
  context.strokeStyle = "rgba(0,0,0,0.35)";
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
  context.restore();
}
function drawBackground(
  context: CanvasRenderingContext2D,
  w: number,
  h: number,
  skin: TetrisSkin,
) {
  if (skin === "neon") {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, w, h);
  }
}
export function drawTetrisPreview(
  ctx: CanvasRenderingContext2D,
  piece: TetrisPieceSnapshot | null,
  skin: TetrisSkin,
) {
  const NB = 30;
  ctx.clearRect(0, 0, TETRIS_NEXT_SIZE, TETRIS_NEXT_SIZE);
  drawBackground(ctx, TETRIS_NEXT_SIZE, TETRIS_NEXT_SIZE, skin);
  if (!piece) return;
  const shape = piece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawTetrisBlock(ctx, offX + c, offY + r, shape[r][c], NB, skin);
}
export class TetrisEngine {
  private callbacks: TetrisEngineCallbacks;
  private board: number[][] = createBoard();
  private current: Piece = createPiece(1);
  private next: Piece = createPiece(1);
  private score = 0;
  private lines = 0;
  private level = 1;
  private startLevel = 1;
  private paused = false;
  private gameOver = false;
  private dropAccum = 0;
  private dropInterval = dropIntervalForLevel(1);
  private linesSincePowerUp = 0;
  private powerUpThreshold = 4;
  private lastPowerUpType: number | null = null;
  private freezeRemaining = 0;
  private comboCount = 0;
  private backToBackActive = false;
  private lastActionRotation = false;
  private currentGameMaxCombo = 0;
  private skin: TetrisSkin = "retro";
  private gridColor = "#22222e";
  private audioCtx: AudioContext | null = null;
  constructor(callbacks: TetrisEngineCallbacks, startLevel = 1) {
    this.callbacks = callbacks;
    this.restart(startLevel);
  }
  restart(startLevel = this.startLevel) {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.startLevel = startLevel;
    this.level = startLevel;
    this.paused = false;
    this.gameOver = false;
    this.currentGameMaxCombo = 0;
    this.dropInterval = dropIntervalForLevel(this.level);
    this.dropAccum = 0;
    this.linesSincePowerUp = 0;
    this.powerUpThreshold = rollPowerUpThreshold(this.level);
    this.lastPowerUpType = null;
    this.freezeRemaining = 0;
    this.comboCount = 0;
    this.backToBackActive = false;
    this.lastActionRotation = false;
    this.next = randomPiece();
    this.spawn();
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLinesChange(this.lines);
    this.callbacks.onLevelChange(this.level);
    this.callbacks.onComboChange(this.comboCount);
    this.callbacks.onFreezeChange(this.freezeRemaining);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  setSkin(skin: TetrisSkin) {
    this.skin = skin;
  }
  setGridColor(color: string) {
    this.gridColor = color;
  }
  private collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }
  moveLeft() {
    if (this.paused || this.gameOver) return;
    if (!this.collide(this.current.shape, this.current.x - 1, this.current.y)) {
      this.current.x--;
      this.lastActionRotation = false;
    }
  }
  moveRight() {
    if (this.paused || this.gameOver) return;
    if (!this.collide(this.current.shape, this.current.x + 1, this.current.y)) {
      this.current.x++;
      this.lastActionRotation = false;
    }
  }
  rotate() {
    if (this.paused || this.gameOver) return;
    const rotated = rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collide(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        this.lastActionRotation = true;
        return;
      }
    }
  }
  private ghostY(): number {
    let gy = this.current.y;
    while (!this.collide(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }
  hardDrop() {
    if (this.paused || this.gameOver) return;
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.callbacks.onScoreChange(this.score);
    this.lockPiece();
  }
  softDrop() {
    if (this.paused || this.gameOver) return;
    if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
      this.callbacks.onScoreChange(this.score);
    } else {
      this.lockPiece();
    }
  }
  private clearCell(r: number, c: number) {
    if (r >= 0 && r < TETRIS_ROWS && c >= 0 && c < TETRIS_COLS)
      this.board[r][c] = 0;
  }
  private applyGravityCompact() {
    for (let c = 0; c < TETRIS_COLS; c++) {
      let write = TETRIS_ROWS - 1;
      for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
        if (this.board[r][c]) {
          this.board[write][c] = this.board[r][c];
          if (write !== r) this.board[r][c] = 0;
          write--;
        }
      }
      for (let r = write; r >= 0; r--) this.board[r][c] = 0;
    }
  }
  private effectBomb(cy: number, cx: number) {
    for (let r = cy - 1; r <= cy + 1; r++)
      for (let c = cx - 1; c <= cx + 1; c++) this.clearCell(r, c);
  }
  private effectLightning(cy: number, cx: number) {
    for (let c = 0; c < TETRIS_COLS; c++) this.clearCell(cy, c);
    for (let r = 0; r < TETRIS_ROWS; r++) this.clearCell(r, cx);
  }
  private effectDye() {
    const presentColors = new Set<number>();
    for (let r = 0; r < TETRIS_ROWS; r++)
      for (let c = 0; c < TETRIS_COLS; c++) {
        const v = this.board[r][c];
        if (v && v !== REWARD_TYPE && !POWERUP_TYPES.includes(v))
          presentColors.add(v);
      }
    if (presentColors.size === 0) return;
    const colors = [...presentColors];
    const target = colors[Math.floor(Math.random() * colors.length)];
    for (let r = 0; r < TETRIS_ROWS; r++)
      for (let c = 0; c < TETRIS_COLS; c++)
        if (this.board[r][c] === target) this.board[r][c] = 0;
    this.applyGravityCompact();
  }
  private effectFreeze() {
    this.freezeRemaining = FREEZE_DURATION;
    this.callbacks.onFreezeChange(this.freezeRemaining);
  }
  private pickPowerUpType(): number {
    const choices = POWERUP_TYPES.filter((t) => t !== this.lastPowerUpType);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  private applyPowerUpEffect(type: number, cy: number, cx: number) {
    this.clearCell(cy, cx);
    switch (type) {
      case BOMB_TYPE:
        this.effectBomb(cy, cx);
        break;
      case LIGHTNING_TYPE:
        this.effectLightning(cy, cx);
        break;
      case DYE_TYPE:
        this.effectDye();
        break;
      case GRAVITY_TYPE:
        this.applyGravityCompact();
        break;
      case FREEZE_TYPE:
        this.effectFreeze();
        this.applyGravityCompact();
        break;
    }
    this.callbacks.onPowerUpToast(POWERUP_LABELS[type]);
  }
  private getAudioCtx(): AudioContext | null {
    if (!this.audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.audioCtx = new AC();
    }
    if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    return this.audioCtx;
  }
  private playTone(
    freq: number,
    duration: number,
    delay = 0,
    type: OscillatorType = "square",
    volume = 0.15,
  ) {
    const ctxA = this.getAudioCtx();
    if (!ctxA) return;
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctxA.destination);
    const startTime = ctxA.currentTime + delay;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
  private playClearSound(
    cleared: number,
    isTSpin: boolean,
    combo: number,
    isB2B: boolean,
    perfectClear: boolean,
  ) {
    try {
      if (perfectClear) {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.playTone(f, 0.25, i * 0.08, "triangle", 0.18),
        );
        return;
      }
      if (isTSpin) {
        this.playTone(440, 0.12, 0, "sawtooth", 0.15);
        this.playTone(660, 0.15, 0.06, "sawtooth", 0.15);
      } else if (cleared === 4) {
        [392, 523.25, 659.25].forEach((f, i) =>
          this.playTone(f, 0.18, i * 0.05, "square", 0.15),
        );
      } else if (cleared > 0) {
        this.playTone(330 + cleared * 40, 0.1, 0, "square", 0.12);
      }
      if (isB2B) this.playTone(880, 0.1, 0.12, "sine", 0.12);
      if (combo > 1)
        this.playTone(
          220 + combo * 30,
          0.08,
          isTSpin || cleared === 4 ? 0.18 : 0.06,
          "triangle",
          0.1,
        );
    } catch {
      // audio no soportado o bloqueado: efecto silencioso, no bloquea el juego
    }
  }
  private triggerClearEffects(
    cleared: number,
    isTSpin: boolean,
    combo: number,
    isB2B: boolean,
    perfectClear: boolean,
  ) {
    const messages: string[] = [];
    let flashClass: TetrisClearEffect["flashClass"] = null;
    if (isTSpin) {
      messages.push(T_SPIN_LABELS[cleared] || "T-SPIN");
      flashClass = "flash-tspin";
    } else if (cleared === 4) {
      messages.push("TETRIS");
      flashClass = "flash-tetris";
    } else if (cleared > 0) {
      flashClass = "flash-normal";
    }
    if (isB2B) {
      messages.push("BACK-TO-BACK");
      flashClass = "flash-b2b";
    }
    if (combo > 1) messages.push(`COMBO x${combo}`);
    if (perfectClear) {
      messages.push("PERFECT CLEAR");
      flashClass = "flash-perfect";
    }
    this.callbacks.onClearEffect({
      toast: messages.length ? messages.join(" · ") : null,
      flashClass,
    });
    this.playClearSound(cleared, isTSpin, combo, isB2B, perfectClear);
  }
  private detectTSpin(): boolean {
    if (this.current.type !== T_TYPE || !this.lastActionRotation) return false;
    const cy = this.current.y + 1;
    const cx = this.current.x + 1;
    const corners = [
      [cy - 1, cx - 1],
      [cy - 1, cx + 1],
      [cy + 1, cx - 1],
      [cy + 1, cx + 1],
    ];
    let filled = 0;
    for (const [r, c] of corners) {
      if (
        r < 0 ||
        r >= TETRIS_ROWS ||
        c < 0 ||
        c >= TETRIS_COLS ||
        this.board[r][c]
      )
        filled++;
    }
    return filled >= 3;
  }
  private merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] =
            this.current.shape[r][c];
  }
  private setComboCount(count: number) {
    this.comboCount = count;
    this.callbacks.onComboChange(this.comboCount);
  }
  private emitNext() {
    this.callbacks.onNextPieceChange({
      type: this.next.type,
      shape: this.next.shape,
    });
  }
  private clearLines(isTSpin: boolean) {
    let cleared = 0;
    for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(TETRIS_COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared === 0) {
      if (this.comboCount > 0) this.setComboCount(0);
      if (isTSpin) {
        this.score += T_SPIN_SCORES[0] * this.level;
        this.callbacks.onScoreChange(this.score);
        this.triggerClearEffects(0, true, 0, false, false);
      }
      return;
    }
    this.lines += cleared;
    this.callbacks.onLinesChange(this.lines);
    this.setComboCount(this.comboCount + 1);
    if (this.comboCount > this.currentGameMaxCombo)
      this.currentGameMaxCombo = this.comboCount;
    let clearScore =
      ((isTSpin ? T_SPIN_SCORES[cleared] : LINE_SCORES[cleared]) || 0) *
      this.level;
    clearScore *= this.comboCount;
    const isB2BEligible = cleared === 4 || isTSpin;
    const isB2B = isB2BEligible && this.backToBackActive;
    if (isB2B) clearScore += Math.round(clearScore * B2B_BONUS_RATIO);
    this.backToBackActive = isB2BEligible;
    this.score += clearScore;
    const perfectClear = this.board.every((row) => row.every((v) => v === 0));
    if (perfectClear) {
      this.score +=
        (PERFECT_CLEAR_SCORES[cleared] || PERFECT_CLEAR_SCORES[4]) * this.level;
    }
    this.level = this.startLevel + Math.floor(this.lines / 10);
    this.dropInterval = dropIntervalForLevel(this.level);
    this.linesSincePowerUp += cleared;
    if (cleared === 4) {
      this.next = createPiece(REWARD_TYPE);
      this.emitNext();
    } else if (this.linesSincePowerUp >= this.powerUpThreshold) {
      this.linesSincePowerUp = 0;
      this.powerUpThreshold = rollPowerUpThreshold(this.level);
      const type = this.pickPowerUpType();
      this.lastPowerUpType = type;
      this.next = createPiece(type);
      this.emitNext();
    }
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLevelChange(this.level);
    this.triggerClearEffects(
      cleared,
      isTSpin,
      this.comboCount,
      isB2B,
      perfectClear,
    );
  }
  private lockPiece() {
    this.merge();
    if (POWERUP_TYPES.includes(this.current.type)) {
      this.applyPowerUpEffect(
        this.current.type,
        this.current.y,
        this.current.x,
      );
    }
    const isTSpin = this.detectTSpin();
    this.clearLines(isTSpin);
    this.spawn();
  }
  private spawn() {
    this.current = this.next;
    this.lastActionRotation = false;
    this.next = randomPiece();
    if (this.collide(this.current.shape, this.current.x, this.current.y)) {
      this.endGame();
    }
    this.emitNext();
  }
  private endGame() {
    this.gameOver = true;
    this.callbacks.onGameOver({
      score: this.score,
      level: this.level,
      lines: this.lines,
      bestCombo: this.currentGameMaxCombo,
    });
  }
  update(dtMs: number) {
    if (this.paused || this.gameOver) return;
    if (this.freezeRemaining > 0) {
      this.freezeRemaining = Math.max(0, this.freezeRemaining - dtMs);
      this.callbacks.onFreezeChange(this.freezeRemaining);
    } else {
      this.dropAccum += dtMs;
      if (this.dropAccum >= this.dropInterval) {
        this.dropAccum = 0;
        if (
          !this.collide(this.current.shape, this.current.x, this.current.y + 1)
        ) {
          this.current.y++;
        } else {
          this.lockPiece();
        }
      }
    }
  }
  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle =
      this.skin === "neon" ? "rgba(255,255,255,0.08)" : this.gridColor;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < TETRIS_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TETRIS_BLOCK, 0);
      ctx.lineTo(c * TETRIS_BLOCK, TETRIS_ROWS * TETRIS_BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < TETRIS_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TETRIS_BLOCK);
      ctx.lineTo(TETRIS_COLS * TETRIS_BLOCK, r * TETRIS_BLOCK);
      ctx.stroke();
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, TETRIS_BOARD_WIDTH, TETRIS_BOARD_HEIGHT);
    drawBackground(ctx, TETRIS_BOARD_WIDTH, TETRIS_BOARD_HEIGHT, this.skin);
    this.drawGrid(ctx);
    for (let r = 0; r < TETRIS_ROWS; r++)
      for (let c = 0; c < TETRIS_COLS; c++)
        drawTetrisBlock(ctx, c, r, this.board[r][c], TETRIS_BLOCK, this.skin);
    const gy = this.ghostY();
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          drawTetrisBlock(
            ctx,
            this.current.x + c,
            gy + r,
            this.current.shape[r][c],
            TETRIS_BLOCK,
            this.skin,
            0.2,
          );
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        drawTetrisBlock(
          ctx,
          this.current.x + c,
          this.current.y + r,
          this.current.shape[r][c],
          TETRIS_BLOCK,
          this.skin,
        );
  }
}
