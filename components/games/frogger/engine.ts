import type { FroggerGameOverResult } from "@/components/games/shared/types";
export const FROGGER_WIDTH = 800;
export const FROGGER_HEIGHT = 650;
export const COLS = 16;
export const ROWS = 13;
export const CELL_PX = 50; // 16*50 = 800, 13*50 = 650
export const HOME_ROW = 0;
export const RIVER_ROWS = [1, 2, 3, 4, 5] as const;
export const MEDIAN_ROW = 6;
export const ROAD_ROWS = [7, 8, 9, 10, 11] as const;
export const START_ROW = 12;
export const HOME_COLS = [1, 4, 7, 10, 13] as const;
export const START_LIVES = 3;
export const TIMER_SECONDS = 30;
type LaneKind = "road" | "log" | "turtles";
type Lane = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1; // 1 = hacia la derecha
  speedPxPerSec: number;
  spanCells: number; // largo del vehículo, tronco o hilera
  gapCells: number;
  diving: boolean; // solo para kind "turtles"
};
/**
 * Tabla de carriles. La spec 09 deja los valores concretos "pendientes de
 * confirmar" y pide fijarlos acá: el original arcade no publica sus tablas.
 * Reglas que sí impone la spec y que esta tabla respeta:
 *  - filas 1, 3 y 5 llevan troncos; filas 2 y 4, hileras de tortugas;
 *  - cada carril alterna dirección respecto al anterior (dentro del río y
 *    dentro de la carretera);
 *  - una sola de las dos hileras de tortugas se sumerge (la fila 4).
 * Las velocidades crecen hacia el centro del tablero, así que los carriles
 * lejanos a la orilla de salida son los más difíciles.
 */
const LANES: Lane[] = [
  // Río (arriba). Alternan +1 / -1 empezando por la fila 1.
  {
    row: 1,
    kind: "log",
    dir: 1,
    speedPxPerSec: 45,
    spanCells: 4,
    gapCells: 4,
    diving: false,
  },
  {
    row: 2,
    kind: "turtles",
    dir: -1,
    speedPxPerSec: 70,
    spanCells: 2,
    gapCells: 3,
    diving: false,
  },
  {
    row: 3,
    kind: "log",
    dir: 1,
    speedPxPerSec: 90,
    spanCells: 5,
    gapCells: 4,
    diving: false,
  },
  {
    row: 4,
    kind: "turtles",
    dir: -1,
    speedPxPerSec: 65,
    spanCells: 3,
    gapCells: 3,
    diving: true,
  },
  {
    row: 5,
    kind: "log",
    dir: 1,
    speedPxPerSec: 55,
    spanCells: 3,
    gapCells: 3,
    diving: false,
  },
  // Carretera (abajo). Alternan -1 / +1 empezando por la fila 7.
  {
    row: 7,
    kind: "road",
    dir: -1,
    speedPxPerSec: 130,
    spanCells: 2,
    gapCells: 6,
    diving: false,
  },
  {
    row: 8,
    kind: "road",
    dir: 1,
    speedPxPerSec: 70,
    spanCells: 2,
    gapCells: 5,
    diving: false,
  },
  {
    row: 9,
    kind: "road",
    dir: -1,
    speedPxPerSec: 100,
    spanCells: 1,
    gapCells: 4,
    diving: false,
  },
  {
    row: 10,
    kind: "road",
    dir: 1,
    speedPxPerSec: 80,
    spanCells: 1,
    gapCells: 5,
    diving: false,
  },
  {
    row: 11,
    kind: "road",
    dir: -1,
    speedPxPerSec: 60,
    spanCells: 1,
    gapCells: 4,
    diving: false,
  },
];
/** Ciclo completo de inmersión de una tortuga, en ms. */
const DIVE_CYCLE_MS = 7000;
/** Fracción del ciclo con la tortuga a flote y firme. */
const DIVE_UP_UNTIL = 0.62;
/** Fracción del ciclo en la que la tortuga parpadea antes de hundirse. */
const DIVE_SINKING_UNTIL = 0.78;
/** Cada nivel acelera vehículos y plataformas un 15% sobre la tabla base. */
const LEVEL_SPEED_STEP = 0.15;
/** Evita saltos gigantes de simulación si la pestaña estuvo en background. */
const MAX_FRAME_MS = 100;
const COLORS = {
  water: "#0b2a63",
  road: "#2b2b2b",
  laneMark: "#4a4a4a",
  safe: "#1d3b2a",
  bush: "#14401f",
  home: "#0b2a63",
  homeLily: "#2fbf5f",
  log: "#8b5a2b",
  logDark: "#6b4420",
  turtle: "#3fae6a",
  turtleShell: "#2a7d4b",
  car: ["#e0473e", "#f2c14e", "#4ea8de", "#c46bd6", "#ff8c42"],
  truck: "#d9d9d9",
} as const;
type Entity = {
  /** Borde izquierdo, en píxeles con decimales. */
  x: number;
  widthPx: number;
  /** Desfase 0..1 del ciclo de inmersión; solo se usa en carriles de tortugas. */
  phase: number;
  /** Índice dentro del carril, para variar el color de los vehículos. */
  index: number;
};
type LaneState = {
  lane: Lane;
  entities: Entity[];
  /** Distancia entre dos entidades consecutivas del carril. */
  periodPx: number;
};
export type FroggerEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: FroggerGameOverResult) => void;
};
export class FroggerEngine {
  private callbacks: FroggerEngineCallbacks;
  private paused = false;
  private screen: "playing" | "gameover" = "playing";
  private score = 0;
  private level = 1;
  private lives = START_LIVES;
  private lanes: LaneState[] = [];
  /** Reloj interno del motor, en ms; alimenta el ciclo de las tortugas. */
  private elapsedMs = 0;
  constructor(callbacks: FroggerEngineCallbacks) {
    this.callbacks = callbacks;
    this.restart();
  }
  restart() {
    this.score = 0;
    this.level = 1;
    this.lives = START_LIVES;
    this.elapsedMs = 0;
    this.screen = "playing";
    this.buildLanes();
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  /** Multiplicador de velocidad del nivel actual. */
  private speedFactor(): number {
    return 1 + (this.level - 1) * LEVEL_SPEED_STEP;
  }
  /**
   * Puebla cada carril con entidades equiespaciadas. La cantidad se calcula
   * para que la fila quede cubierta con una entidad de sobra: así el wrap
   * mantiene el espaciado exacto y nunca abre un hueco visible en el borde.
   */
  private buildLanes() {
    this.lanes = LANES.map((lane) => {
      const widthPx = lane.spanCells * CELL_PX;
      const periodPx = (lane.spanCells + lane.gapCells) * CELL_PX;
      const count = Math.ceil((FROGGER_WIDTH + widthPx) / periodPx) + 1;
      // Offset inicial propio de cada carril: evita que todo arranque alineado.
      const offset = Math.random() * periodPx;
      const entities: Entity[] = [];
      for (let i = 0; i < count; i++) {
        entities.push({
          x: i * periodPx - widthPx + offset,
          widthPx,
          phase: lane.diving ? i / count : 0,
          index: i,
        });
      }
      return { lane, entities, periodPx };
    });
  }
  update(dt: number) {
    if (this.paused || this.screen !== "playing") return;
    const step = Math.min(dt, MAX_FRAME_MS);
    this.elapsedMs += step;
    const seconds = step / 1000;
    const factor = this.speedFactor();
    for (const state of this.lanes) {
      const { lane, entities, periodPx } = state;
      const total = entities.length * periodPx;
      const dx = lane.dir * lane.speedPxPerSec * factor * seconds;
      for (const entity of entities) {
        entity.x += dx;
        // Reaparición por el borde opuesto, conservando el espaciado del carril.
        if (lane.dir === 1 && entity.x > FROGGER_WIDTH) entity.x -= total;
        else if (lane.dir === -1 && entity.x + entity.widthPx < 0)
          entity.x += total;
      }
    }
  }
  /** Estado de inmersión de una tortuga en el instante actual. */
  private diveState(entity: Entity, lane: Lane): "up" | "sinking" | "down" {
    if (!lane.diving) return "up";
    const t = (((this.elapsedMs / DIVE_CYCLE_MS + entity.phase) % 1) + 1) % 1;
    if (t < DIVE_UP_UNTIL) return "up";
    if (t < DIVE_SINKING_UNTIL) return "sinking";
    return "down";
  }
  private drawBackground(ctx: CanvasRenderingContext2D) {
    // Río.
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(
      0,
      RIVER_ROWS[0] * CELL_PX,
      FROGGER_WIDTH,
      RIVER_ROWS.length * CELL_PX,
    );
    // Carretera.
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(
      0,
      ROAD_ROWS[0] * CELL_PX,
      FROGGER_WIDTH,
      ROAD_ROWS.length * CELL_PX,
    );
    // Líneas discontinuas entre carriles de carretera.
    ctx.strokeStyle = COLORS.laneMark;
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 14]);
    for (let i = 1; i < ROAD_ROWS.length; i++) {
      const y = (ROAD_ROWS[0] + i) * CELL_PX;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FROGGER_WIDTH, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Orillas seguras: mediana y fila de salida.
    ctx.fillStyle = COLORS.safe;
    ctx.fillRect(0, MEDIAN_ROW * CELL_PX, FROGGER_WIDTH, CELL_PX);
    ctx.fillRect(0, START_ROW * CELL_PX, FROGGER_WIDTH, CELL_PX);
    this.drawHomeRow(ctx);
  }
  /** Fila 0: matorral continuo con cinco nenúfares recortados encima. */
  private drawHomeRow(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.bush;
    ctx.fillRect(0, HOME_ROW * CELL_PX, FROGGER_WIDTH, CELL_PX);
    for (const col of HOME_COLS) {
      const x = col * CELL_PX;
      const y = HOME_ROW * CELL_PX;
      ctx.fillStyle = COLORS.home;
      ctx.fillRect(x, y, CELL_PX, CELL_PX);
      ctx.fillStyle = COLORS.homeLily;
      ctx.beginPath();
      ctx.arc(x + CELL_PX / 2, y + CELL_PX / 2, CELL_PX * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  private drawLog(ctx: CanvasRenderingContext2D, entity: Entity, y: number) {
    const top = y + 8;
    const height = CELL_PX - 16;
    ctx.fillStyle = COLORS.log;
    ctx.fillRect(entity.x, top, entity.widthPx, height);
    ctx.fillStyle = COLORS.logDark;
    ctx.fillRect(entity.x, top + height / 2 - 2, entity.widthPx, 4);
    // Tapas de los extremos: dan la lectura de tronco y no de tabla.
    ctx.fillRect(entity.x, top, 5, height);
    ctx.fillRect(entity.x + entity.widthPx - 5, top, 5, height);
  }
  private drawTurtles(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    y: number,
    lane: Lane,
  ) {
    const state = this.diveState(entity, lane);
    if (state === "down") return;
    // El parpadeo avisa que la hilera está por hundirse.
    ctx.globalAlpha =
      state === "sinking" && Math.floor(this.elapsedMs / 150) % 2 === 0
        ? 0.35
        : 1;
    const count = entity.widthPx / CELL_PX;
    for (let i = 0; i < count; i++) {
      const cx = entity.x + i * CELL_PX + CELL_PX / 2;
      const cy = y + CELL_PX / 2;
      ctx.fillStyle = COLORS.turtle;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_PX * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.turtleShell;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_PX * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  private drawVehicle(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    y: number,
    lane: Lane,
  ) {
    const top = y + 9;
    const height = CELL_PX - 18;
    const isTruck = lane.spanCells > 1;
    ctx.fillStyle = isTruck
      ? COLORS.truck
      : COLORS.car[(lane.row + entity.index) % COLORS.car.length];
    ctx.fillRect(entity.x, top, entity.widthPx, height);
    // Parabrisas del lado hacia el que avanza el vehículo.
    ctx.fillStyle = "#1a1a1a";
    const glassW = 8;
    const glassX =
      lane.dir === 1 ? entity.x + entity.widthPx - glassW - 4 : entity.x + 4;
    ctx.fillRect(glassX, top + 4, glassW, height - 8);
  }
  private drawLanes(ctx: CanvasRenderingContext2D) {
    for (const { lane, entities } of this.lanes) {
      const y = lane.row * CELL_PX;
      for (const entity of entities) {
        if (entity.x > FROGGER_WIDTH || entity.x + entity.widthPx < 0) continue;
        if (lane.kind === "log") this.drawLog(ctx, entity, y);
        else if (lane.kind === "turtles")
          this.drawTurtles(ctx, entity, y, lane);
        else this.drawVehicle(ctx, entity, y, lane);
      }
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.drawBackground(ctx);
    this.drawLanes(ctx);
  }
}
