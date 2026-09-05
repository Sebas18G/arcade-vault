import type { FroggerGameOverResult } from "@/components/games/shared/types";
import type { GameSkin } from "@/components/games/shared/skins";
import { FROGGER_SKIN_PALETTES, type FroggerPalette } from "./skins";
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
/** Columna donde arranca cada rana: la misma que la casa central. */
export const START_COL = 7;
export type FroggerDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";
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
/**
 * Margen que se le perdona a la rana en la colisión con vehículos: sin él,
 * rozar el píxel del guardabarros ya mata y el juego se siente injusto.
 */
const FROG_HITBOX_INSET = 8;
const SCORE_PER_ROW = 10;
const SCORE_PER_HOME = 50;
const SCORE_PER_HALF_SECOND = 10;
const SCORE_LADY_FROG = 200;
const SCORE_FLY = 200;
const SCORE_LEVEL_CLEAR = 1000;
const EXTRA_LIFE_SCORE = 20000;
/**
 * Cadencias de la rana rosa y de la mosca. La spec las deja "pendientes de
 * confirmar" — las fuentes no publican los valores del original —, así que se
 * fijan acá: lo bastante frecuentes para que valga la pena esperarlas, lo
 * bastante escasas para que no sean la fuente principal de puntos.
 */
const LADY_SPAWN_MS = 15000;
const LADY_LIFETIME_MS = 12000;
const FLY_SPAWN_MS = 10000;
const FLY_LIFETIME_MS = 8000;
// Los colores ya no viven aquí: entran por `setSkin()` desde ./skins.
// El motor nunca lee `document`, `window` ni `localStorage`.
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
/**
 * La rana guarda su fila como entero (salta de celda en celda) y su posición
 * horizontal en píxeles con decimales, porque montada sobre una plataforma se
 * desplaza de forma continua. Solo el salto la vuelve a alinear a la columna.
 */
type Frog = {
  /** Borde izquierdo, en píxeles con decimales. */
  x: number;
  row: number;
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
  private frog: Frog = { x: START_COL * CELL_PX, row: START_ROW };
  /** Una entrada por casa de `HOME_COLS`: true = ya tiene rana dentro. */
  private homes: boolean[] = HOME_COLS.map(() => false);
  private frogsHome = 0;
  /** Milisegundos que le quedan a la rana actual antes de agotar el tiempo. */
  private timerMs = TIMER_SECONDS * 1000;
  /** Fila más adelantada alcanzada por la rana actual (menor = más lejos). */
  private maxRowReached = START_ROW;
  /** Total de puntos ganados por tiempo sin usar; viaja en el game over. */
  private timeBonus = 0;
  /** La rana extra de los 20 000 se otorga una sola vez por partida. */
  private extraLifeAwarded = false;
  /** Rana rosa: viaja pegada a un tronco hasta que se la recoge o expira. */
  private lady: { row: number; entity: Entity; offsetPx: number } | null = null;
  private ladySpawnMs = LADY_SPAWN_MS;
  private ladyLifeMs = 0;
  /** True mientras la rana lleva a la rana rosa encima. */
  private carryingLady = false;
  /** Mosca: se posa en un nenúfar libre y da puntos extra a quien llegue. */
  private fly: { slot: number } | null = null;
  private flySpawnMs = FLY_SPAWN_MS;
  private flyLifeMs = 0;
  /** Reloj interno del motor, en ms; alimenta el ciclo de las tortugas. */
  private elapsedMs = 0;
  private skin: GameSkin = "classic";
  private palette: FroggerPalette = FROGGER_SKIN_PALETTES.classic;
  constructor(callbacks: FroggerEngineCallbacks) {
    this.callbacks = callbacks;
    this.restart();
  }
  /** La paleta entra solo por acá: el motor no lee ninguna preferencia. */
  setSkin(skin: GameSkin) {
    this.skin = skin;
    this.palette = FROGGER_SKIN_PALETTES[skin] ?? FROGGER_SKIN_PALETTES.classic;
  }
  getSkin(): GameSkin {
    return this.skin;
  }
  restart() {
    this.score = 0;
    this.level = 1;
    this.lives = START_LIVES;
    this.elapsedMs = 0;
    this.screen = "playing";
    this.homes = HOME_COLS.map(() => false);
    this.frogsHome = 0;
    this.timeBonus = 0;
    this.extraLifeAwarded = false;
    this.lady = null;
    this.ladySpawnMs = LADY_SPAWN_MS;
    this.fly = null;
    this.flySpawnMs = FLY_SPAWN_MS;
    this.buildLanes();
    this.resetFrog();
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  /**
   * Devuelve la rana a la orilla de salida y reinicia su temporizador. Se usa
   * tanto al empezar como después de cada muerte y de cada rana llegada a casa.
   */
  private resetFrog() {
    this.frog = { x: START_COL * CELL_PX, row: START_ROW };
    this.timerMs = TIMER_SECONDS * 1000;
    // El avance se puntúa "por vida": la próxima rana vuelve a cobrar sus filas.
    this.maxRowReached = START_ROW;
    this.carryingLady = false;
  }
  /** Suma puntos y otorga la rana extra la primera vez que se cruzan 20 000. */
  private addScore(points: number) {
    this.score += points;
    if (!this.extraLifeAwarded && this.score >= EXTRA_LIFE_SCORE) {
      this.extraLifeAwarded = true;
      this.lives += 1;
      this.callbacks.onLivesChange(this.lives);
    }
    this.callbacks.onScoreChange(this.score);
  }
  /**
   * Un salto mueve exactamente una celda. En horizontal parte de la columna
   * más cercana a la posición actual, así que el arrastre de una plataforma
   * nunca deja la rana a medio camino entre dos columnas.
   */
  keyDown(direction: FroggerDirection) {
    if (this.paused || this.screen !== "playing") return;
    if (direction === "UP" || direction === "DOWN") {
      const next = this.frog.row + (direction === "UP" ? -1 : 1);
      this.frog.row = Math.max(HOME_ROW, Math.min(START_ROW, next));
      // Solo la primera vez que esta rana pisa una fila más adelantada: ir y
      // volver sobre lo ya recorrido no vuelve a pagar (ver Decisions).
      if (this.frog.row < this.maxRowReached) {
        this.addScore((this.maxRowReached - this.frog.row) * SCORE_PER_ROW);
        this.maxRowReached = this.frog.row;
      }
      return;
    }
    const col =
      Math.round(this.frog.x / CELL_PX) + (direction === "LEFT" ? -1 : 1);
    const clamped = Math.max(0, Math.min(COLS - 1, col));
    this.frog.x = clamped * CELL_PX;
  }
  // Sin estado que liberar al soltar la tecla; existe por simetría con el resto
  // de motores del repo.
  keyUp(_direction: FroggerDirection) {}
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
    this.ridePlatform(seconds, factor);
    this.timerMs -= step;
    this.updateBonuses(step);
    this.checkDeaths();
  }
  /**
   * Las seis muertes de la spec, evaluadas en el orden en que ocurren en el
   * tablero. La primera que dispara corta la cadena: una muerte descuenta
   * exactamente una vida.
   */
  private checkDeaths() {
    if (this.screen !== "playing") return;
    // 6 — el tiempo se agotó.
    if (this.timerMs <= 0) {
      this.die();
      return;
    }
    // 4 — arrastrada fuera del borde montada en una plataforma.
    if (this.frog.x < 0 || this.frog.x + CELL_PX > FROGGER_WIDTH) {
      this.die();
      return;
    }
    // 5 — llegó a la fila de casas: nenúfar libre, nenúfar ocupado o matorral.
    if (this.frog.row === HOME_ROW) {
      this.resolveHomeRow();
      return;
    }
    // 1 — atropellada en la carretera.
    if ((ROAD_ROWS as readonly number[]).includes(this.frog.row)) {
      if (this.hitByVehicle()) this.die();
      return;
    }
    // 2 y 3 — agua sin plataforma, o tortuga sumergida.
    if ((RIVER_ROWS as readonly number[]).includes(this.frog.row)) {
      const platform = this.platformUnderFrog();
      if (!platform) {
        this.die();
        return;
      }
      if (this.diveState(platform.entity, platform.state.lane) === "down") {
        this.die();
      }
    }
  }
  /** Solapamiento de la caja de la rana con algún vehículo de su carril. */
  private hitByVehicle(): boolean {
    const state = this.lanes.find((l) => l.lane.row === this.frog.row);
    if (!state) return false;
    const left = this.frog.x + FROG_HITBOX_INSET;
    const right = this.frog.x + CELL_PX - FROG_HITBOX_INSET;
    return state.entities.some((e) => left < e.x + e.widthPx && right > e.x);
  }
  /**
   * La columna de la casa se resuelve por proximidad, porque la rana puede
   * llegar desalineada desde un tronco. Fuera de un nenúfar libre, todo lo
   * demás en esa fila —matorral o casa ya ocupada— es muerte.
   */
  private resolveHomeRow() {
    const col = Math.round(this.frog.x / CELL_PX);
    const slot = HOME_COLS.indexOf(col as (typeof HOME_COLS)[number]);
    if (slot === -1 || this.homes[slot]) {
      this.die();
      return;
    }
    this.reachHome(slot);
  }
  /** Rana a salvo en un nenúfar libre: casa, tiempo sobrante y extras. */
  private reachHome(slot: number) {
    this.homes[slot] = true;
    this.frogsHome += 1;
    const bonus =
      Math.floor(Math.max(0, this.timerMs) / 500) * SCORE_PER_HALF_SECOND;
    this.timeBonus += bonus;
    let points = SCORE_PER_HOME + bonus;
    if (this.carryingLady) points += SCORE_LADY_FROG;
    if (this.fly?.slot === slot) {
      points += SCORE_FLY;
      this.fly = null;
      this.flySpawnMs = FLY_SPAWN_MS;
    }
    this.addScore(points);
    if (this.homes.every(Boolean)) this.clearLevel();
    this.resetFrog();
  }
  /** Las 5 casas llenas: bonus, nivel nuevo, tablero vacío y todo más rápido. */
  private clearLevel() {
    this.addScore(SCORE_LEVEL_CLEAR);
    this.level += 1;
    this.callbacks.onLevelChange(this.level);
    this.homes = HOME_COLS.map(() => false);
    // Las velocidades no se tocan acá: `speedFactor()` las deriva del nivel.
    this.fly = null;
    this.flySpawnMs = FLY_SPAWN_MS;
  }
  /**
   * Rana rosa y mosca: aparecen, envejecen y expiran. La rosa viaja pegada a
   * un tronco y se recoge montándose encima; la mosca espera en un nenúfar.
   */
  private updateBonuses(step: number) {
    if (this.lady) {
      this.ladyLifeMs -= step;
      const x = this.lady.entity.x + this.lady.offsetPx;
      if (this.ladyLifeMs <= 0 || x < 0 || x + CELL_PX > FROGGER_WIDTH) {
        this.lady = null;
        this.ladySpawnMs = LADY_SPAWN_MS;
      } else if (
        this.frog.row === this.lady.row &&
        Math.abs(this.frog.x - x) < CELL_PX * 0.6
      ) {
        this.carryingLady = true;
        this.lady = null;
        this.ladySpawnMs = LADY_SPAWN_MS;
      }
    } else {
      this.ladySpawnMs -= step;
      if (this.ladySpawnMs <= 0) this.spawnLady();
    }
    if (this.fly) {
      this.flyLifeMs -= step;
      // Un nivel nuevo puede haber vaciado su casa mientras ella esperaba.
      if (this.flyLifeMs <= 0 || this.homes[this.fly.slot]) {
        this.fly = null;
        this.flySpawnMs = FLY_SPAWN_MS;
      }
    } else {
      this.flySpawnMs -= step;
      if (this.flySpawnMs <= 0) this.spawnFly();
    }
  }
  private spawnLady() {
    const logs = this.lanes.filter((l) => l.lane.kind === "log");
    const state = logs[Math.floor(Math.random() * logs.length)];
    if (!state) return;
    const visible = state.entities.filter(
      (e) => e.x >= 0 && e.x + e.widthPx <= FROGGER_WIDTH,
    );
    const entity = visible[Math.floor(Math.random() * visible.length)];
    if (!entity) return; // Ningún tronco entero a la vista: se reintenta luego.
    this.lady = {
      row: state.lane.row,
      entity,
      offsetPx: (entity.widthPx - CELL_PX) / 2,
    };
    this.ladyLifeMs = LADY_LIFETIME_MS;
  }
  private spawnFly() {
    const free = this.homes
      .map((occupied, slot) => (occupied ? -1 : slot))
      .filter((slot) => slot !== -1);
    if (free.length === 0) return;
    this.fly = { slot: free[Math.floor(Math.random() * free.length)] };
    this.flyLifeMs = FLY_LIFETIME_MS;
  }
  private die() {
    this.lives -= 1;
    this.callbacks.onLivesChange(Math.max(0, this.lives));
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    this.resetFrog();
  }
  private gameOver() {
    this.screen = "gameover";
    this.callbacks.onGameOver({
      score: this.score,
      level: this.level,
      frogsHome: this.frogsHome,
      timeBonus: this.timeBonus,
    });
  }
  /**
   * La rana montada viaja con su plataforma. No se clampea al borde: salir de
   * la pantalla arrastrada es una de las muertes de la spec.
   */
  private ridePlatform(seconds: number, factor: number) {
    const platform = this.platformUnderFrog();
    if (!platform) return;
    const { lane } = platform.state;
    this.frog.x += lane.dir * lane.speedPxPerSec * factor * seconds;
  }
  /**
   * Plataforma bajo la rana, si la hay. El criterio es solapamiento de
   * píxeles — el centro de la rana dentro del tronco o de la hilera —, nunca
   * igualdad de columna: la rana casi siempre está desalineada mientras viaja.
   */
  private platformUnderFrog(): { state: LaneState; entity: Entity } | null {
    const state = this.lanes.find((l) => l.lane.row === this.frog.row);
    if (!state || state.lane.kind === "road") return null;
    const center = this.frog.x + CELL_PX / 2;
    const entity = state.entities.find(
      (e) => center >= e.x && center <= e.x + e.widthPx,
    );
    return entity ? { state, entity } : null;
  }
  /** Estado de inmersión de una tortuga en el instante actual. */
  private diveState(entity: Entity, lane: Lane): "up" | "sinking" | "down" {
    if (!lane.diving) return "up";
    const t = (((this.elapsedMs / DIVE_CYCLE_MS + entity.phase) % 1) + 1) % 1;
    if (t < DIVE_UP_UNTIL) return "up";
    if (t < DIVE_SINKING_UNTIL) return "sinking";
    return "down";
  }
  /**
   * Enciende el halo de la skin. `amount <= 0` (classic y retro) no toca el
   * contexto, así que esas skins dibujan exactamente igual que antes.
   */
  private setGlow(
    ctx: CanvasRenderingContext2D,
    color: string,
    amount: number,
  ) {
    if (amount <= 0) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = amount;
  }
  /** Apaga el halo. Se llama siempre tras dibujar, para que no se filtre. */
  private clearGlow(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
  private drawBackground(ctx: CanvasRenderingContext2D) {
    // Río.
    ctx.fillStyle = this.palette.water;
    ctx.fillRect(
      0,
      RIVER_ROWS[0] * CELL_PX,
      FROGGER_WIDTH,
      RIVER_ROWS.length * CELL_PX,
    );
    // Carretera.
    ctx.fillStyle = this.palette.road;
    ctx.fillRect(
      0,
      ROAD_ROWS[0] * CELL_PX,
      FROGGER_WIDTH,
      ROAD_ROWS.length * CELL_PX,
    );
    // Líneas discontinuas entre carriles de carretera.
    ctx.strokeStyle = this.palette.laneMark;
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
    ctx.fillStyle = this.palette.safe;
    ctx.fillRect(0, MEDIAN_ROW * CELL_PX, FROGGER_WIDTH, CELL_PX);
    ctx.fillRect(0, START_ROW * CELL_PX, FROGGER_WIDTH, CELL_PX);
    this.drawHomeRow(ctx);
  }
  /** Fila 0: matorral continuo con cinco nenúfares recortados encima. */
  private drawHomeRow(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.palette.bush;
    ctx.fillRect(0, HOME_ROW * CELL_PX, FROGGER_WIDTH, CELL_PX);
    HOME_COLS.forEach((col, slot) => {
      const x = col * CELL_PX;
      const y = HOME_ROW * CELL_PX;
      ctx.fillStyle = this.palette.home;
      ctx.fillRect(x, y, CELL_PX, CELL_PX);
      ctx.fillStyle = this.palette.homeLily;
      this.setGlow(ctx, this.palette.homeLily, this.palette.glow.lily);
      ctx.beginPath();
      ctx.arc(x + CELL_PX / 2, y + CELL_PX / 2, CELL_PX * 0.34, 0, Math.PI * 2);
      ctx.fill();
      this.clearGlow(ctx);
      // Casa ocupada: se ve la rana dentro, y saltar ahí vuelve a ser muerte.
      if (this.homes[slot]) this.drawFrogAt(ctx, x, y);
    });
  }
  /** Barra de tiempo de la rana actual, pegada al borde inferior del canvas. */
  private drawTimer(ctx: CanvasRenderingContext2D) {
    const totalMs = TIMER_SECONDS * 1000;
    const ratio = Math.max(0, Math.min(1, this.timerMs / totalMs));
    const height = 6;
    const y = FROGGER_HEIGHT - height;
    ctx.fillStyle = this.palette.timerTrack;
    ctx.fillRect(0, y, FROGGER_WIDTH, height);
    // Se vacía desde la izquierda y avisa en rojo el último cuarto.
    const fill = ratio < 0.25 ? this.palette.timerLow : this.palette.timerFill;
    ctx.fillStyle = fill;
    this.setGlow(ctx, fill, this.palette.glow.timer);
    ctx.fillRect(0, y, FROGGER_WIDTH * ratio, height);
    this.clearGlow(ctx);
  }
  private drawLog(ctx: CanvasRenderingContext2D, entity: Entity, y: number) {
    const top = y + 8;
    const height = CELL_PX - 16;
    ctx.fillStyle = this.palette.log;
    this.setGlow(ctx, this.palette.log, this.palette.glow.platform);
    ctx.fillRect(entity.x, top, entity.widthPx, height);
    this.clearGlow(ctx);
    ctx.fillStyle = this.palette.logDark;
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
      ctx.fillStyle = this.palette.turtle;
      this.setGlow(ctx, this.palette.turtle, this.palette.glow.platform);
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_PX * 0.36, 0, Math.PI * 2);
      ctx.fill();
      this.clearGlow(ctx);
      ctx.fillStyle = this.palette.turtleShell;
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
    const { car, truck } = this.palette;
    const body = isTruck ? truck : car[(lane.row + entity.index) % car.length];
    ctx.fillStyle = body;
    this.setGlow(ctx, body, this.palette.glow.vehicle);
    ctx.fillRect(entity.x, top, entity.widthPx, height);
    this.clearGlow(ctx);
    // Parabrisas del lado hacia el que avanza el vehículo.
    ctx.fillStyle = this.palette.vehicleGlass;
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
  /**
   * Rana procedural: cuerpo, ojos y las cuatro patas. Sin assets. Recibe la
   * esquina superior izquierda de su celda, así sirve tanto para la rana viva
   * como para las que ya descansan en un nenúfar.
   */
  private drawFrogAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const pad = 7;
    const size = CELL_PX - pad * 2;
    ctx.fillStyle = this.palette.frog;
    this.setGlow(ctx, this.palette.frog, this.palette.glow.frog);
    ctx.fillRect(x + pad, y + pad, size, size);
    this.clearGlow(ctx);
    // Patas: dos arriba, dos abajo, hacia afuera del cuerpo.
    ctx.fillStyle = this.palette.frogLeg;
    const legW = 9;
    const legH = 6;
    ctx.fillRect(x + pad - 3, y + pad + 3, legW, legH);
    ctx.fillRect(x + CELL_PX - pad - legW + 3, y + pad + 3, legW, legH);
    ctx.fillRect(x + pad - 3, y + CELL_PX - pad - legH - 3, legW, legH);
    ctx.fillRect(
      x + CELL_PX - pad - legW + 3,
      y + CELL_PX - pad - legH - 3,
      legW,
      legH,
    );
    // Ojos, mirando siempre hacia arriba (la dirección de avance del juego).
    ctx.fillStyle = this.palette.frogEye;
    ctx.fillRect(x + pad + 5, y + pad + 4, 6, 6);
    ctx.fillRect(x + CELL_PX - pad - 11, y + pad + 4, 6, 6);
  }
  /** Rana rosa esperando sobre su tronco. */
  private drawLady(ctx: CanvasRenderingContext2D) {
    if (!this.lady) return;
    const x = this.lady.entity.x + this.lady.offsetPx;
    const y = this.lady.row * CELL_PX;
    ctx.fillStyle = this.palette.lady;
    this.setGlow(ctx, this.palette.lady, this.palette.glow.bonus);
    ctx.fillRect(x + 10, y + 10, CELL_PX - 20, CELL_PX - 20);
    this.clearGlow(ctx);
    ctx.fillStyle = this.palette.frogEye;
    ctx.fillRect(x + 16, y + 15, 5, 5);
    ctx.fillRect(x + CELL_PX - 21, y + 15, 5, 5);
  }
  /** Mosca posada en un nenúfar libre. */
  private drawFly(ctx: CanvasRenderingContext2D) {
    if (!this.fly) return;
    const x = HOME_COLS[this.fly.slot] * CELL_PX;
    const y = HOME_ROW * CELL_PX;
    const cx = x + CELL_PX / 2;
    const cy = y + CELL_PX / 2;
    ctx.fillStyle = this.palette.fly;
    this.setGlow(ctx, this.palette.fly, this.palette.glow.bonus);
    ctx.fillRect(cx - 5, cy - 4, 10, 8);
    this.clearGlow(ctx);
    // Alas, a los lados del cuerpo.
    ctx.fillStyle = this.palette.flyWing;
    ctx.fillRect(cx - 12, cy - 6, 6, 5);
    ctx.fillRect(cx + 6, cy - 6, 6, 5);
  }
  /** La rana rosa a cuestas se dibuja encima de la rana que la lleva. */
  private drawCarriedLady(ctx: CanvasRenderingContext2D) {
    if (!this.carryingLady) return;
    ctx.fillStyle = this.palette.lady;
    this.setGlow(ctx, this.palette.lady, this.palette.glow.bonus);
    ctx.fillRect(this.frog.x + 17, this.frog.row * CELL_PX + 17, 16, 16);
    this.clearGlow(ctx);
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.drawBackground(ctx);
    this.drawLanes(ctx);
    this.drawLady(ctx);
    this.drawFly(ctx);
    this.drawFrogAt(ctx, this.frog.x, this.frog.row * CELL_PX);
    this.drawCarriedLady(ctx);
    this.drawTimer(ctx);
  }
}
