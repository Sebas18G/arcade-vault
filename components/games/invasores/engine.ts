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
/**
 * Progresión de oleadas. La spec deja el descenso por oleada como "pendiente
 * de confirmar" con ROW_STEP por oleada y tope tras 8; con ROW_STEP entero la
 * oleada 6 nacería ya a la altura de los búnkeres y la partida terminaría
 * sola. Se conserva la rampa de 8 oleadas y se parte el paso a la mitad: la
 * oleada 8 en adelante nace con su fila inferior 40px sobre los búnkeres.
 */
export const WAVE_DROP = ROW_STEP / 2;
export const WAVE_DROP_MAX_LEVEL = 8;
/** Vida extra, una sola vez por partida, al alcanzar este puntaje. */
export const EXTRA_LIFE_SCORE = 1500;
export const CANNON_Y = 540;
export const CANNON_W = 40;
export const CANNON_H = 20;
/** Velocidad horizontal del canon, en px/s. */
export const CANNON_SPEED = 320;
/** Proyectil del jugador: uno solo en pantalla a la vez. */
export const BULLET_W = 3;
export const BULLET_H = 12;
export const BULLET_SPEED = 620; // px/s hacia arriba
/**
 * Disparos alienígenas. La spec deja la cadencia exacta del original como
 * "pendiente de confirmar" (el arcade usa tablas de columnas preferidas por
 * tipo de disparo) y pide fijar los valores acá. Regla implementada: columna
 * viva al azar, siempre el invasor más bajo de esa columna, máximo 3 en
 * pantalla. Cadencia y velocidad escalan con el nivel hasta un tope, para que
 * la oleada 10 sea difícil y no imposible.
 */
export const ALIEN_BULLET_W = 3;
export const ALIEN_BULLET_H = 12;
export const ALIEN_BULLET_SPEED_BASE = 200; // px/s en la oleada 1
export const ALIEN_BULLET_SPEED_STEP = 26; // px/s extra por oleada
export const ALIEN_BULLET_SPEED_MAX = 420;
export const ALIEN_FIRE_MS_BASE = 900; // ms entre disparos en la oleada 1
export const ALIEN_FIRE_MS_STEP = 80; // ms menos por oleada
export const ALIEN_FIRE_MS_MIN = 260;
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
/**
 * UFO de bonus. La spec deja "cadencia exacta de aparición y velocidad de
 * cruce" como pendiente de confirmar y pide fijarlas acá.
 */
export const UFO_W = 40;
export const UFO_H = 18;
export const UFO_Y = 52; // cruza por encima de FORMATION_TOP
export const UFO_SPEED = 130; // px/s
export const UFO_SPAWN_MS = 18000; // tiempo entre apariciones
/** Búnker como máscara de celdas erosionables, no como rectángulo entero. */
export const BUNKER_COUNT = 4;
export const BUNKER_CELL = 3; // px por celda de la máscara
export const BUNKER_COLS = 22; // 66px de ancho
export const BUNKER_ROWS = 16; // 48px de alto
/** Radio del cráter, en celdas. El disparo alienígena erosiona más. */
export const BLAST_PLAYER = 2;
export const BLAST_ALIEN = 3;
export const BUNKER_W = BUNKER_COLS * BUNKER_CELL;
export const BUNKER_H = BUNKER_ROWS * BUNKER_CELL;
type Bunker = {
  x: number;
  y: number;
  /** true = celda intacta. Un impacto apaga las celdas dentro de un radio. */
  cells: boolean[][];
  /** Ya arrasado por un invasor: evita rebarrer la máscara en cada tick. */
  crushed: boolean;
};
type Invader = {
  row: number; // fija la especie y los puntos vía ROW_POINTS
  col: number;
  x: number;
  y: number;
  alive: boolean;
};
/** Entradas normalizadas por el wrapper: el motor nunca ve un KeyboardEvent. */
export type InvasoresInput = "LEFT" | "RIGHT" | "FIRE";
type Bullet = { x: number; y: number };
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
  playerBullet: "#eaffea",
  alienBullet: "#ff6b6b",
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
const SPRITE_UFO = [
  ".....XXXXXX.....",
  "...XXXXXXXXXX...",
  "..XXXXXXXXXXXX..",
  ".XX.XX.XX.XX.XX.",
  "XXXXXXXXXXXXXXXX",
  "..XXX..XX..XXX..",
  "...X........X...",
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
  /** Estado de las teclas mantenidas; lo alimenta el wrapper. */
  private keys: Record<InvasoresInput, boolean> = {
    LEFT: false,
    RIGHT: false,
    FIRE: false,
  };
  /** null = no hay disparo del jugador en vuelo, así que se puede disparar. */
  private playerBullet: Bullet | null = null;
  /** Disparos alienígenas en vuelo; nunca más de MAX_ALIEN_BULLETS. */
  private alienBullets: Bullet[] = [];
  /** UFO en pantalla, o null entre apariciones. */
  private ufo: { x: number; dir: 1 | -1 } | null = null;
  /** ms que faltan para la próxima aparición del UFO. */
  private ufoSpawnMs = UFO_SPAWN_MS;
  /** El UFO alterna el lado por el que entra en cada aparición. */
  private ufoNextDir: 1 | -1 = 1;
  /** ms que faltan para el próximo disparo alienígena. */
  private alienFireMs = ALIEN_FIRE_MS_BASE;
  /** La vida extra de EXTRA_LIFE_SCORE se otorga una sola vez por partida. */
  private extraLifeAwarded = false;
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
    this.extraLifeAwarded = false;
    this.aliensKilled = 0;
    this.ufosHit = 0;
    this.shotsFired = 0;
    this.cannonX = (INVASORES_WIDTH - CANNON_W) / 2;
    this.dir = 1;
    this.moveIndex = 0;
    this.pendingDrop = false;
    this.accMs = 0;
    this.keys = { LEFT: false, RIGHT: false, FIRE: false };
    this.playerBullet = null;
    this.alienBullets = [];
    this.alienFireMs = this.alienFireIntervalMs();
    this.ufo = null;
    this.ufoSpawnMs = UFO_SPAWN_MS;
    this.ufoNextDir = 1;
    this.buildFormation();
    this.buildBunkers();
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
  }
  keyDown(input: InvasoresInput) {
    this.keys[input] = true;
  }
  keyUp(input: InvasoresInput) {
    this.keys[input] = false;
  }
  /** y de la fila 0 para la oleada actual, con tope en WAVE_DROP_MAX_LEVEL. */
  private formationTop(): number {
    const steps = Math.min(this.level, WAVE_DROP_MAX_LEVEL) - 1;
    return FORMATION_TOP + steps * WAVE_DROP;
  }
  /** Los 55 invasores en su grilla de 5 filas x 11 columnas. */
  private buildFormation() {
    const top = this.formationTop();
    this.invaders = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.invaders.push({
          row,
          col,
          x: FORMATION_LEFT + col * COL_STEP,
          y: top + row * ROW_STEP,
          alive: true,
        });
      }
    }
  }
  /** Los 4 búnkeres, repartidos en cuartos iguales del ancho del canvas. */
  private buildBunkers() {
    const slot = INVASORES_WIDTH / BUNKER_COUNT;
    this.bunkers = [];
    for (let i = 0; i < BUNKER_COUNT; i++) {
      this.bunkers.push({
        x: Math.round(slot * i + (slot - BUNKER_W) / 2),
        y: BUNKER_Y,
        cells: buildBunkerCells(),
        crushed: false,
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
      this.tick();
    }
  }
  private tick() {
    this.stepFormation();
    this.updateCannon();
    this.updatePlayerBullet();
    this.updateAlienBullets();
    this.updateAlienFire();
    this.updateUfo();
    this.crushBunkers();
    this.checkFormationReachedBunkers();
    this.checkWaveCleared();
  }
  /**
   * Fin de partida inmediato, sin importar las vidas restantes, si la
   * formación desciende hasta la altura de los búnkeres.
   */
  private checkFormationReachedBunkers() {
    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      if (invader.y + INVADER_H >= BUNKER_Y) {
        this.gameOver();
        return;
      }
    }
  }
  /** Oleada limpia: sube el nivel y regenera la formación más abajo. */
  private checkWaveCleared() {
    if (this.invaders.some((invader) => invader.alive)) return;
    this.level++;
    this.callbacks.onLevelChange(this.level);
    this.dir = 1;
    this.moveIndex = 0;
    this.pendingDrop = false;
    this.playerBullet = null;
    this.alienBullets = [];
    this.alienFireMs = this.alienFireIntervalMs();
    this.buildFormation();
  }
  /** Vida extra al cruzar el umbral de puntaje, una única vez por partida. */
  private checkExtraLife() {
    if (this.extraLifeAwarded || this.score < EXTRA_LIFE_SCORE) return;
    this.extraLifeAwarded = true;
    this.lives++;
    this.callbacks.onLivesChange(this.lives);
  }
  private updateUfo() {
    if (!this.ufo) {
      this.ufoSpawnMs -= TICK_MS;
      if (this.ufoSpawnMs > 0) return;
      this.ufoSpawnMs = UFO_SPAWN_MS;
      const dir = this.ufoNextDir;
      this.ufoNextDir = dir === 1 ? -1 : 1;
      this.ufo = { x: dir === 1 ? -UFO_W : INVASORES_WIDTH, dir };
      return;
    }
    this.ufo.x += (UFO_SPEED * TICK_MS * this.ufo.dir) / 1000;
    if (this.ufo.x > INVASORES_WIDTH || this.ufo.x + UFO_W < 0) {
      this.ufo = null;
    }
  }
  /**
   * Valor del UFO derribado. No es aleatorio: sale de la secuencia fija
   * `UFO_TABLE`, indexada por el número ordinal del disparo que lo derriba.
   * `shotsFired` ya cuenta el disparo en vuelo, así que el índice del disparo
   * n-ésimo es `n - 1`: el disparo 23 cae en `UFO_TABLE[7]` = 300 puntos, que
   * es el truco clásico del arcade y el criterio de aceptación de la spec.
   */
  private ufoValue(): number {
    return UFO_TABLE[(this.shotsFired - 1) % UFO_TABLE.length];
  }
  /** Cadencia de disparo alienígena para la oleada actual, en ms. */
  private alienFireIntervalMs(): number {
    return Math.max(
      ALIEN_FIRE_MS_MIN,
      ALIEN_FIRE_MS_BASE - (this.level - 1) * ALIEN_FIRE_MS_STEP,
    );
  }
  /** Velocidad de los disparos alienígenas para la oleada actual, en px/s. */
  private alienBulletSpeed(): number {
    return Math.min(
      ALIEN_BULLET_SPEED_MAX,
      ALIEN_BULLET_SPEED_BASE + (this.level - 1) * ALIEN_BULLET_SPEED_STEP,
    );
  }
  private updateAlienFire() {
    this.alienFireMs -= TICK_MS;
    if (this.alienFireMs > 0) return;
    this.alienFireMs = this.alienFireIntervalMs();
    if (this.alienBullets.length >= MAX_ALIEN_BULLETS) return;
    const shooter = this.pickShooter();
    if (!shooter) return;
    this.alienBullets.push({
      x: shooter.x + INVADER_W / 2 - ALIEN_BULLET_W / 2,
      y: shooter.y + INVADER_H,
    });
  }
  /** Invasor más bajo de una columna con invasores vivos, elegida al azar. */
  private pickShooter(): Invader | null {
    const columns = new Set<number>();
    for (const invader of this.invaders) {
      if (invader.alive) columns.add(invader.col);
    }
    if (columns.size === 0) return null;
    const pool = [...columns];
    const col = pool[Math.floor(Math.random() * pool.length)];
    let lowest: Invader | null = null;
    for (const invader of this.invaders) {
      if (!invader.alive || invader.col !== col) continue;
      if (!lowest || invader.y > lowest.y) lowest = invader;
    }
    return lowest;
  }
  private updateAlienBullets() {
    const step = (this.alienBulletSpeed() * TICK_MS) / 1000;
    for (let i = this.alienBullets.length - 1; i >= 0; i--) {
      const bullet = this.alienBullets[i];
      bullet.y += step;
      if (bullet.y > INVASORES_HEIGHT) {
        this.alienBullets.splice(i, 1);
        continue;
      }
      if (
        this.hitBunker(
          bullet.x,
          bullet.y,
          ALIEN_BULLET_W,
          ALIEN_BULLET_H,
          BLAST_ALIEN,
          1,
        )
      ) {
        this.alienBullets.splice(i, 1);
        continue;
      }
      if (
        bullet.x + ALIEN_BULLET_W >= this.cannonX &&
        bullet.x <= this.cannonX + CANNON_W &&
        bullet.y + ALIEN_BULLET_H >= CANNON_Y &&
        bullet.y <= CANNON_Y + CANNON_H
      ) {
        this.alienBullets.splice(i, 1);
        this.loseLife();
        return;
      }
    }
  }
  /**
   * Impacto de un proyectil contra los búnkeres. `dirY` es hacia dónde viaja
   * el disparo (-1 sube, 1 baja): se busca la primera celda intacta desde el
   * lado por el que entra, para que un hueco ya abierto lo deje pasar.
   * Devuelve true si erosionó algo, y entonces el disparo se consume.
   */
  private hitBunker(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    dirY: -1 | 1,
  ): boolean {
    for (const bunker of this.bunkers) {
      if (
        x + w < bunker.x ||
        x > bunker.x + BUNKER_W ||
        y + h < bunker.y ||
        y > bunker.y + BUNKER_H
      ) {
        continue;
      }
      const c0 = Math.max(0, Math.floor((x - bunker.x) / BUNKER_CELL));
      const c1 = Math.min(
        BUNKER_COLS - 1,
        Math.floor((x + w - bunker.x) / BUNKER_CELL),
      );
      const r0 = Math.max(0, Math.floor((y - bunker.y) / BUNKER_CELL));
      const r1 = Math.min(
        BUNKER_ROWS - 1,
        Math.floor((y + h - bunker.y) / BUNKER_CELL),
      );
      // El disparo que sube entra por abajo, así que se recorre de r1 a r0.
      const from = dirY === -1 ? r1 : r0;
      const to = dirY === -1 ? r0 : r1;
      for (let r = from; dirY === -1 ? r >= to : r <= to; r += dirY) {
        for (let c = c0; c <= c1; c++) {
          if (!bunker.cells[r][c]) continue;
          this.eraseBunkerCells(bunker, c, r, radius);
          return true;
        }
      }
    }
    return false;
  }
  /** Apaga las celdas dentro de un radio circular del punto de impacto. */
  private eraseBunkerCells(
    bunker: Bunker,
    cx: number,
    cy: number,
    radius: number,
  ) {
    for (let r = cy - radius; r <= cy + radius; r++) {
      for (let c = cx - radius; c <= cx + radius; c++) {
        if (r < 0 || r >= BUNKER_ROWS || c < 0 || c >= BUNKER_COLS) continue;
        const dx = c - cx;
        const dy = r - cy;
        if (dx * dx + dy * dy > radius * radius + radius) continue;
        bunker.cells[r][c] = false;
      }
    }
  }
  /**
   * Un invasor que alcanza un búnker lo arrasa entero. Se evalúa en cada tick
   * y no solo al bajar la formación: el invasor también lo puede atravesar
   * lateralmente, barriendo a la altura del búnker.
   */
  private crushBunkers() {
    for (const bunker of this.bunkers) {
      if (bunker.crushed) continue;
      for (const invader of this.invaders) {
        if (!invader.alive) continue;
        if (
          invader.x + INVADER_W < bunker.x ||
          invader.x > bunker.x + BUNKER_W ||
          invader.y + INVADER_H < bunker.y ||
          invader.y > bunker.y + BUNKER_H
        ) {
          continue;
        }
        bunker.cells = bunker.cells.map((row) => row.map(() => false));
        bunker.crushed = true;
        break;
      }
    }
  }
  /** Un impacto en el cañón: limpia la pantalla de disparos y recentra. */
  private loseLife() {
    this.lives--;
    this.callbacks.onLivesChange(this.lives);
    this.alienBullets = [];
    this.playerBullet = null;
    this.cannonX = (INVASORES_WIDTH - CANNON_W) / 2;
    if (this.lives <= 0) this.gameOver();
  }
  private gameOver() {
    this.screen = "gameover";
    this.callbacks.onGameOver({
      score: this.score,
      level: this.level,
      aliensKilled: this.aliensKilled,
      ufosHit: this.ufosHit,
      shotsFired: this.shotsFired,
    });
  }
  private updateCannon() {
    const step = (CANNON_SPEED * TICK_MS) / 1000;
    if (this.keys.LEFT) this.cannonX -= step;
    if (this.keys.RIGHT) this.cannonX += step;
    this.cannonX = Math.max(
      EDGE_MARGIN,
      Math.min(INVASORES_WIDTH - EDGE_MARGIN - CANNON_W, this.cannonX),
    );
    // Un solo proyectil en pantalla: mientras haya uno en vuelo, FIRE no hace
    // nada. Mantener la tecla vuelve a disparar en cuanto el anterior se va.
    if (this.keys.FIRE && !this.playerBullet) {
      this.playerBullet = {
        x: this.cannonX + CANNON_W / 2 - BULLET_W / 2,
        y: CANNON_Y - BULLET_H,
      };
      this.shotsFired++;
    }
  }
  private updatePlayerBullet() {
    const bullet = this.playerBullet;
    if (!bullet) return;
    bullet.y -= (BULLET_SPEED * TICK_MS) / 1000;
    if (bullet.y + BULLET_H < 0) {
      this.playerBullet = null;
      return;
    }
    if (
      this.ufo &&
      bullet.x + BULLET_W >= this.ufo.x &&
      bullet.x <= this.ufo.x + UFO_W &&
      bullet.y <= UFO_Y + UFO_H &&
      bullet.y + BULLET_H >= UFO_Y
    ) {
      this.score += this.ufoValue();
      this.ufosHit++;
      this.callbacks.onScoreChange(this.score);
      this.checkExtraLife();
      this.ufo = null;
      this.ufoSpawnMs = UFO_SPAWN_MS;
      this.playerBullet = null;
      return;
    }
    if (this.hitBunker(bullet.x, bullet.y, BULLET_W, BULLET_H, BLAST_PLAYER, -1)) {
      this.playerBullet = null;
      return;
    }
    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      if (
        bullet.x + BULLET_W < invader.x ||
        bullet.x > invader.x + INVADER_W ||
        bullet.y + BULLET_H < invader.y ||
        bullet.y > invader.y + INVADER_H
      ) {
        continue;
      }
      invader.alive = false;
      this.aliensKilled++;
      this.score += ROW_POINTS[invader.row];
      this.callbacks.onScoreChange(this.score);
      this.checkExtraLife();
      this.playerBullet = null;
      return;
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
    if (this.ufo) {
      drawSprite(
        ctx,
        SPRITE_UFO,
        this.ufo.x,
        UFO_Y,
        UFO_W,
        UFO_H,
        COLORS.ufo,
      );
    }
    this.drawInvaders(ctx);
    this.drawBunkers(ctx);
    this.drawCannon(ctx);
    if (this.playerBullet) {
      ctx.fillStyle = COLORS.playerBullet;
      ctx.fillRect(
        this.playerBullet.x,
        this.playerBullet.y,
        BULLET_W,
        BULLET_H,
      );
    }
    ctx.fillStyle = COLORS.alienBullet;
    for (const bullet of this.alienBullets) {
      ctx.fillRect(bullet.x, bullet.y, ALIEN_BULLET_W, ALIEN_BULLET_H);
    }
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
