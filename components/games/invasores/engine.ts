import type { InvasoresGameOverResult } from "@/components/games/shared/types";
export const INVASORES_WIDTH = 800;
export const INVASORES_HEIGHT = 600;
export const ROWS = 5;
export const COLS = 11; // 5 * 11 = 55 invasores
export const INVADER_W = 32;
export const INVADER_H = 24;
export const COL_STEP = 48; // 10 * 48 + 32 = 512px de formación
export const ROW_STEP = 40;
export const FORMATION_TOP = 96; // y de la fila 0 en la oleada 1
/**
 * px que avanza un invasor por paso. El arcade original usa 2px sobre una
 * pantalla de 224px de ancho; este canvas mide 800px, asi que el paso se
 * reescala por el mismo factor (800/224 ~= 3.57) para conservar el ritmo
 * original medido en fracciones de pantalla. Sin reescalar, un barrido con la
 * formacion completa tardaria ~2 minutos.
 */
export const STEP_X = 7;
export const STEP_DOWN = 8; // px que baja la formación al tocar un borde
/** Margen lateral que dispara el rebote de la formación. */
export const EDGE_MARGIN = 16;
/**
 * Tick lógico fijo. La aceleración de la formación es emergente: cada tick
 * mueve UN invasor vivo, así que con 55 vivos la formación entera avanza cada
 * 55 ticks y con 1 vivo avanza cada tick. El acumulador por `dt` mantiene ese
 * orden idéntico a 60Hz y a 144Hz — el motor nunca cuenta frames.
 */
export const TICK_MS = 1000 / 60;
export const CANNON_Y = 540;
export const CANNON_W = 40;
export const CANNON_H = 20;
export const BUNKER_Y = 460; // si la formación llega aquí, game over inmediato
export const GROUND_Y = 570;
export const START_LIVES = 3;
export const MAX_ALIEN_BULLETS = 3;
/** Puntos por fila, de arriba (0) hacia abajo (4). */
export const ROW_POINTS = [30, 20, 20, 10, 10] as const;
/** El UFO no vale un valor aleatorio: se indexa con shotsFired % 15. */
export const UFO_TABLE = [
  50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100, 100,
] as const;
/** Búnker como máscara de celdas erosionables, no como rectángulo entero. */
export const BUNKER_COUNT = 4;
export const BUNKER_CELL = 3; // px por celda de la máscara
export const BUNKER_COLS = 22; // 66px de ancho
export const BUNKER_ROWS = 16; // 48px de alto
type Bunker = {
  x: number;
  y: number;
  /** true = celda intacta. Un impacto apaga las celdas dentro de un radio. */
  cells: boolean[][];
};
type Invader = {
  row: number; // fija la especie y los puntos vía ROW_POINTS
  col: number;
  x: number;
  y: number;
  alive: boolean;
};
export type InvasoresEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: InvasoresGameOverResult) => void;
};
/**
 * Paleta fija. La spec 14 deja las skins fuera de alcance a propósito: el motor
 * nace monocromo-neón y el agente `skin-designer` agrega `skins.ts`/`setSkin()`
 * en una pasada posterior, igual que hizo con Frogger tras la spec 09.
 */
const COLORS = {
  bg: "#04070a",
  ground: "#39ff14",
  cannon: "#39ff14",
  bunker: "#39ff14",
  /** Un color por fila, alineado con ROW_POINTS: 30 / 20 / 20 / 10 / 10. */
  rows: ["#7df9ff", "#39ff14", "#39ff14", "#ffd166", "#ffd166"] as const,
  ufo: "#ff2e88",
};
/**
 * Sprites procedurales: cada especie es un bitmap de texto que se pinta con
 * `fillRect` celda a celda. Sin un solo asset binario, como pide la spec.
 */
const SPRITE_SQUID = [
  "...XX...",
  "..XXXX..",
  ".XXXXXX.",
  "XX.XX.XX",
  "XXXXXXXX",
  "..X..X..",
  ".X.XX.X.",
  "X.X..X.X",
];
const SPRITE_CRAB = [
  "..X.....X..",
  "...X...X...",
  "..XXXXXXX..",
  ".XX.XXX.XX.",
  "XXXXXXXXXXX",
  "X.XXXXXXX.X",
  "X.X.....X.X",
  "...XX.XX...",
];
const SPRITE_OCTOPUS = [
  "....XXXX....",
  ".XXXXXXXXXX.",
  "XXXXXXXXXXXX",
  "XXX..XX..XXX",
  "XXXXXXXXXXXX",
  "...XX..XX...",
  "..XX.XX.XX..",
  "XX........XX",
];
const SPRITE_CANNON = [
  "......X......",
  ".....XXX.....",
  ".....XXX.....",
  ".XXXXXXXXXXX.",
  "XXXXXXXXXXXXX",
  "XXXXXXXXXXXXX",
  "XXXXXXXXXXXXX",
  "XXXXXXXXXXXXX",
];
/** Un sprite por fila de la formación, alineado con ROW_POINTS. */
const ROW_SPRITES = [
  SPRITE_SQUID,
  SPRITE_CRAB,
  SPRITE_CRAB,
  SPRITE_OCTOPUS,
  SPRITE_OCTOPUS,
];
/** Dibuja un bitmap escalado dentro de la caja dada, centrado y sin deformar. */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  bitmap: string[],
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  color: string,
) {
  const rows = bitmap.length;
  const cols = bitmap[0].length;
  const px = Math.min(boxW / cols, boxH / rows);
  const offsetX = boxX + (boxW - cols * px) / 2;
  const offsetY = boxY + (boxH - rows * px) / 2;
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (bitmap[r][c] !== "X") continue;
      ctx.fillRect(offsetX + c * px, offsetY + r * px, px + 0.5, px + 0.5);
    }
  }
}
/**
 * Máscara inicial de un búnker: rectángulo con las esquinas superiores
 * biseladas y un arco abierto hacia abajo, como el original.
 */
function buildBunkerCells(): boolean[][] {
  const cells: boolean[][] = [];
  const archTop = BUNKER_ROWS - 6;
  for (let r = 0; r < BUNKER_ROWS; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < BUNKER_COLS; c++) {
      let on = true;
      const bevel = 4 - r; // las 4 primeras filas pierden las esquinas
      if (bevel > 0 && (c < bevel || c >= BUNKER_COLS - bevel)) on = false;
      if (r >= archTop) {
        const half = 3 + (r - archTop) * 0.5;
        if (Math.abs(c + 0.5 - BUNKER_COLS / 2) < half) on = false;
      }
      row.push(on);
    }
    cells.push(row);
  }
  return cells;
}
/** x del invasor de la columna 0: la formación arranca centrada. */
const FORMATION_LEFT =
  (INVASORES_WIDTH - (COLS - 1) * COL_STEP - INVADER_W) / 2;
export class InvasoresEngine {
  private callbacks: InvasoresEngineCallbacks;
  private paused = false;
  private screen: "playing" | "gameover" = "playing";
  private score = 0;
  private level = 1;
  private lives = START_LIVES;
  private invaders: Invader[] = [];
  private bunkers: Bunker[] = [];
  private cannonX = (INVASORES_WIDTH - CANNON_W) / 2;
  /** Dirección horizontal de la formación: 1 = derecha. */
  private dir: 1 | -1 = 1;
  /** Índice del próximo invasor a mover dentro del barrido actual. */
  private moveIndex = 0;
  /** Un invasor tocó un borde: la formación baja al cerrar el barrido. */
  private pendingDrop = false;
  /** Resto de tiempo acumulado sin consumir por el tick lógico. */
  private accMs = 0;
  /** Stats acumuladas durante toda la partida; viajan en el game over. */
  private aliensKilled = 0;
  private ufosHit = 0;
  private shotsFired = 0;
  constructor(callbacks: InvasoresEngineCallbacks) {
    this.callbacks = callbacks;
    this.restart();
  }
  restart() {
    this.score = 0;
    this.level = 1;
    this.lives = START_LIVES;
    this.screen = "playing";
    this.aliensKilled = 0;
    this.ufosHit = 0;
    this.shotsFired = 0;
    this.cannonX = (INVASORES_WIDTH - CANNON_W) / 2;
    this.dir = 1;
    this.moveIndex = 0;
    this.pendingDrop = false;
    this.accMs = 0;
    this.buildFormation();
    this.buildBunkers();
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  /** Los 55 invasores en su grilla de 5 filas x 11 columnas. */
  private buildFormation() {
    this.invaders = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.invaders.push({
          row,
          col,
          x: FORMATION_LEFT + col * COL_STEP,
          y: FORMATION_TOP + row * ROW_STEP,
          alive: true,
        });
      }
    }
  }
  /** Los 4 búnkeres, repartidos en cuartos iguales del ancho del canvas. */
  private buildBunkers() {
    const slot = INVASORES_WIDTH / BUNKER_COUNT;
    const width = BUNKER_COLS * BUNKER_CELL;
    this.bunkers = [];
    for (let i = 0; i < BUNKER_COUNT; i++) {
      this.bunkers.push({
        x: Math.round(slot * i + (slot - width) / 2),
        y: BUNKER_Y,
        cells: buildBunkerCells(),
      });
    }
  }
  update(dt: number) {
    if (this.paused || this.screen !== "playing") return;
    // Clamp: una pestaña en segundo plano no debe devolver un dt gigante que
    // dispare cientos de ticks de golpe al volver al foco.
    this.accMs = Math.min(this.accMs + dt, 200);
    while (this.accMs >= TICK_MS) {
      this.accMs -= TICK_MS;
      this.stepFormation();
    }
  }
  /**
   * Un tick lógico = un invasor vivo movido, en orden de array. Cuando el
   * barrido llega al final se reinicia, y si alguien tocó un borde durante el
   * barrido, TODA la formación baja un escalón e invierte la dirección.
   */
  private stepFormation() {
    let guard = this.invaders.length;
    while (guard-- > 0) {
      if (this.moveIndex >= this.invaders.length) {
        this.moveIndex = 0;
        if (this.pendingDrop) {
          this.dropFormation();
          this.pendingDrop = false;
        }
      }
      const invader = this.invaders[this.moveIndex++];
      if (!invader.alive) continue;
      invader.x += STEP_X * this.dir;
      if (
        invader.x <= EDGE_MARGIN ||
        invader.x + INVADER_W >= INVASORES_WIDTH - EDGE_MARGIN
      ) {
        this.pendingDrop = true;
      }
      return;
    }
  }
  private dropFormation() {
    this.dir = this.dir === 1 ? -1 : 1;
    for (const invader of this.invaders) {
      invader.y += STEP_DOWN;
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, INVASORES_WIDTH, INVASORES_HEIGHT);
    this.drawInvaders(ctx);
    this.drawBunkers(ctx);
    this.drawCannon(ctx);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, INVASORES_WIDTH, 2);
  }
  private drawInvaders(ctx: CanvasRenderingContext2D) {
    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      drawSprite(
        ctx,
        ROW_SPRITES[invader.row],
        invader.x,
        invader.y,
        INVADER_W,
        INVADER_H,
        COLORS.rows[invader.row],
      );
    }
  }
  private drawBunkers(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.bunker;
    for (const bunker of this.bunkers) {
      for (let r = 0; r < BUNKER_ROWS; r++) {
        for (let c = 0; c < BUNKER_COLS; c++) {
          if (!bunker.cells[r][c]) continue;
          ctx.fillRect(
            bunker.x + c * BUNKER_CELL,
            bunker.y + r * BUNKER_CELL,
            BUNKER_CELL,
            BUNKER_CELL,
          );
        }
      }
    }
  }
  private drawCannon(ctx: CanvasRenderingContext2D) {
    drawSprite(
      ctx,
      SPRITE_CANNON,
      this.cannonX,
      CANNON_Y,
      CANNON_W,
      CANNON_H,
      COLORS.cannon,
    );
  }
}
