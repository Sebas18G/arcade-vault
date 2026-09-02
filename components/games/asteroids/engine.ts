import type { AsteroidsGameOverResult } from "@/components/games/shared/types";
import type { GameSkin } from "@/components/games/shared/skins";
import {
  ASTEROIDS_SKIN_PALETTES,
  type AsteroidsPalette,
  type AsteroidsPowerUpType,
} from "@/components/games/asteroids/skins";
export const ASTEROIDS_WIDTH = 800;
export const ASTEROIDS_HEIGHT = 600;
const W = ASTEROIDS_WIDTH;
const H = ASTEROIDS_HEIGHT;
// ── Brillo (skin neón) ────────────────────────────────────────────────────────
// El motor nunca lee del DOM: la paleta entra por `setSkin()`.
function setGlow(
  ctx: CanvasRenderingContext2D,
  palette: AsteroidsPalette,
  color: string,
  scale = 1,
) {
  if (palette.glow <= 0) return;
  ctx.shadowBlur = palette.glow * scale;
  ctx.shadowColor = color;
}
function clearGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
}
// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;
  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    ctx.fillStyle = palette.bullet;
    setGlow(ctx, palette, palette.bullet, 0.8);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    clearGlow(ctx);
  }
}
// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño
// Siluetas fijas (vértices normalizados a radio 1) para asteroides grandes.
const ASTEROID_SHAPES = [
  [
    [-0.128, -0.953],
    [0.409, -0.765],
    [0.309, -0.201],
    [0.879, -0.047],
    [0.678, 0.557],
    [0.275, 0.49],
    [0.02, 0.893],
    [-0.644, 0.591],
    [-1.0, -0.013],
    [-0.819, -0.564],
  ],
];
const BIG_ASTEROID_FIXED_SHAPE_CHANCE = 0.5;
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: number[][];
  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    if (size === 3 && Math.random() < BIG_ASTEROID_FIXED_SHAPE_CHANCE) {
      const shape = ASTEROID_SHAPES[randInt(0, ASTEROID_SHAPES.length - 1)];
      this.verts = shape.map(([vx, vy]) => [
        vx * this.radius,
        vy * this.radius,
      ]);
    } else {
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = palette.asteroid;
    setGlow(ctx, palette, palette.asteroid);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}
// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  tripleShotTimer = 0;
  shieldTimer = 0;
  slowMoTimer = 0;
  hyperTimer = 0;
  dead = false;
  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.tripleShotTimer = 0;
    this.shieldTimer = 0;
    this.slowMoTimer = 0;
    this.hyperTimer = 0;
    this.dead = false;
  }
  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.slowMoTimer > 0) this.slowMoTimer -= dt;
    if (this.hyperTimer > 0) this.hyperTimer -= dt;
    const hyperActive = this.hyperTimer > 0;
    const ROT = 3.5; // rad/s
    const THRUST = hyperActive ? 260 * 2.2 : 260; // px/s²
    const DRAG = hyperActive ? 0.994 : 0.987;
    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;
    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer > 0) {
      const SPREAD = Math.PI / 12; // 15°
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = palette.ship;
    setGlow(ctx, palette, palette.ship);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.stroke();
    if (this.thrusting && Math.random() > 0.35) {
      const hyperActive = this.hyperTimer > 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      const flameRange: [number, number] = hyperActive ? [16, 30] : [6, 14];
      ctx.lineTo(-8 - rand(...flameRange), 0);
      ctx.lineTo(-8, 4);
      const flameColor = hyperActive
        ? palette.shipFlameHyper
        : palette.shipFlame;
      ctx.strokeStyle = flameColor;
      setGlow(ctx, palette, flameColor);
      ctx.stroke();
    }
    ctx.restore();
    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const pulse = 0.75 + 0.25 * Math.sin(this.shieldTimer * 10);
      ctx.strokeStyle = `rgba(${palette.shieldRgb}, ${pulse.toFixed(2)})`;
      setGlow(ctx, palette, `rgb(${palette.shieldRgb})`, 1.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${palette.particleRgb},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
// ── Power-up (disparo triple / escudo temporal / slow motion / bomba nova / hiperpropulsión) ─
type PowerUpType = AsteroidsPowerUpType;
// La geometría y las etiquetas no dependen de la skin; el color sale de la paleta.
const POWERUP_STYLES: Record<
  PowerUpType,
  {
    label: string;
    shape: "diamond" | "hexagon";
    blink?: boolean;
    grabRadius?: number;
  }
> = {
  triple: { label: "3x", shape: "diamond" },
  shield: { label: "ESC", shape: "diamond" },
  slowmo: { label: "x½", shape: "diamond" },
  nova: {
    label: "NOVA",
    shape: "hexagon",
    blink: true,
    grabRadius: 44,
  },
  hyper: { label: "HIP", shape: "hexagon" },
};
const POWERUP_TYPES = Object.keys(POWERUP_STYLES) as PowerUpType[];
const randomPowerUpType = () =>
  POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)];
class PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  radius = 10;
  ttl = 8;
  rot = 0;
  dead = false;
  constructor(x: number, y: number, type: PowerUpType = "triple") {
    this.x = x;
    this.y = y;
    this.type = type;
  }
  update(dt: number) {
    this.rot += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    const style = POWERUP_STYLES[this.type];
    const color = palette.powerups[this.type];
    if (style.blink && Math.floor(this.ttl * 6) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = color;
    setGlow(ctx, palette, color, 0.9);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (style.shape === "hexagon") {
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else {
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(style.label, this.x, this.y);
    ctx.restore();
  }
}
const COMBO_WINDOW = 1.5; // segundos entre kills para mantener vivo el combo
const NOVA_BLAST_RADIUS = 420;
// A más nivel, más power-ups pueden aparecer: sube 1 cada 3 niveles, con un tope de 5.
function computeMaxPowerups(lvl: number) {
  return Math.min(1 + Math.floor((lvl - 1) / 3), 5);
}
export type AsteroidsEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (result: AsteroidsGameOverResult) => void;
};
type EngineState = "playing" | "dead" | "gameover";
export class AsteroidsEngine {
  private callbacks: AsteroidsEngineCallbacks;
  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};
  private paused = false;
  private ship = new Ship();
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerups: PowerUp[] = [];
  private score = 0;
  private lives = 3;
  private level = 1;
  private state: EngineState = "playing";
  private deadTimer = 0;
  private powerupsSpawnedThisLevel = 0;
  private maxPowerupsThisLevel = 0;
  private novaFlash = 0;
  private novaOrigin: { x: number; y: number } | null = null;
  private comboCount = 0;
  private comboTimer = 0;
  private bestCombo = 0;
  private asteroidsDestroyed = 0;
  private skin: GameSkin = "classic";
  private palette: AsteroidsPalette = ASTEROIDS_SKIN_PALETTES.classic;
  constructor(callbacks: AsteroidsEngineCallbacks) {
    this.callbacks = callbacks;
    this.initGame();
  }
  setSkin(skin: GameSkin) {
    this.skin = skin;
    this.palette =
      ASTEROIDS_SKIN_PALETTES[skin] ?? ASTEROIDS_SKIN_PALETTES.classic;
  }
  getSkin(): GameSkin {
    return this.skin;
  }
  restart() {
    this.initGame();
  }
  setPaused(paused: boolean) {
    const wasPaused = this.paused;
    this.paused = paused;
    if (wasPaused && !paused) {
      this.keys = {};
      this.justPressed = {};
    }
  }
  keyDown(code: string) {
    this.justPressed[code] = !this.keys[code];
    this.keys[code] = true;
  }
  keyUp(code: string) {
    this.keys[code] = false;
  }
  private pressed(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }
  private initGame() {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerups = [];
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.powerupsSpawnedThisLevel = 0;
    this.maxPowerupsThisLevel = computeMaxPowerups(this.level);
    this.novaFlash = 0;
    this.novaOrigin = null;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.asteroidsDestroyed = 0;
    this.spawnAsteroids(3 + this.level);
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
  }
  private spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }
  private registerKill() {
    this.asteroidsDestroyed++;
    this.comboCount++;
    this.comboTimer = COMBO_WINDOW;
    if (this.comboCount > this.bestCombo) this.bestCombo = this.comboCount;
  }
  private explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y));
  }
  private triggerNovaBomb() {
    for (const a of this.asteroids) {
      if (a.dead) continue;
      if (dist(this.ship, a) > NOVA_BLAST_RADIUS) continue;
      a.dead = true;
      this.addScore(POINTS[a.size]);
      this.registerKill();
      this.explode(a.x, a.y, a.size * 6);
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead);
    this.novaOrigin = { x: this.ship.x, y: this.ship.y };
    this.novaFlash = 0.4;
  }
  private killShip() {
    this.explode(this.ship.x, this.ship.y, 14);
    this.ship.dead = true;
    this.lives--;
    this.callbacks.onLivesChange(this.lives);
    if (this.lives <= 0) {
      this.state = "gameover";
      this.callbacks.onGameOver({
        score: this.score,
        level: this.level,
        asteroidsDestroyed: this.asteroidsDestroyed,
        bestCombo: this.bestCombo,
      });
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }
  private nextLevel() {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.ship.reset();
    this.powerupsSpawnedThisLevel = 0;
    this.maxPowerupsThisLevel = computeMaxPowerups(this.level);
    this.spawnAsteroids(3 + this.level);
    this.callbacks.onLevelChange(this.level);
  }
  private addScore(points: number) {
    this.score += points;
    this.callbacks.onScoreChange(this.score);
  }
  update(dt: number) {
    if (this.paused) return;
    if (this.state === "gameover") {
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      return;
    }
    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }
    if (this.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    const asteroidDt = this.ship.slowMoTimer > 0 ? dt * 0.5 : dt;
    this.ship.update(dt, this.keys);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(asteroidDt));
    this.particles.forEach((p) => p.update(dt));
    this.powerups.forEach((p) => p.update(dt));
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerups = this.powerups.filter((p) => !p.dead);
    // Bala vs asteroide
    const POWERUP_CHANCE = 0.2;
    const newAsteroids: Asteroid[] = [];
    let lastKillPos: { x: number; y: number } | null = null;
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.addScore(POINTS[a.size]);
          this.registerKill();
          this.explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          lastKillPos = { x: a.x, y: a.y };
          if (
            this.powerupsSpawnedThisLevel < this.maxPowerupsThisLevel &&
            Math.random() < POWERUP_CHANCE
          ) {
            this.powerups.push(new PowerUp(a.x, a.y, randomPowerUpType()));
            this.powerupsSpawnedThisLevel++;
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);
    if (
      this.asteroids.length === 0 &&
      this.powerupsSpawnedThisLevel === 0 &&
      lastKillPos
    ) {
      this.powerups.push(
        new PowerUp(lastKillPos.x, lastKillPos.y, randomPowerUpType()),
      );
      this.powerupsSpawnedThisLevel++;
    }
    if (!this.ship.dead) {
      for (const p of this.powerups) {
        const pickupRadius = POWERUP_STYLES[p.type].grabRadius ?? p.radius;
        if (!p.dead && dist(this.ship, p) < this.ship.radius + pickupRadius) {
          p.dead = true;
          if (p.type === "shield") this.ship.shieldTimer = 5;
          else if (p.type === "slowmo") this.ship.slowMoTimer = 6;
          else if (p.type === "nova") this.triggerNovaBomb();
          else if (p.type === "hyper") this.ship.hyperTimer = 8;
          else this.ship.tripleShotTimer = 8;
        }
      }
    }
    this.powerups = this.powerups.filter((p) => !p.dead);
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          if (this.ship.shieldTimer > 0) {
            this.ship.shieldTimer = 0;
            this.ship.invincible = 1;
            this.explode(this.ship.x, this.ship.y, 10);
          } else {
            this.killShip();
          }
          break;
        }
      }
    }
    if (this.novaFlash > 0) this.novaFlash -= dt;
    if (this.state === "playing" && this.asteroids.length === 0)
      this.nextLevel();
  }
  private drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = this.palette.lifeIcon;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  private drawHUD(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.palette.hudText;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, W / 2, 26);
    for (let i = 0; i < this.lives; i++)
      this.drawLifeIcon(ctx, W - 16 - i * 22, 18);
    ctx.textAlign = "right";
    ctx.font = "12px monospace";
    ctx.fillStyle = this.palette.hudTextDim;
    ctx.fillText(`MEJOR COMBO x${this.bestCombo}`, W - 14, 44);
    ctx.fillText(`DESTRUIDOS ${this.asteroidsDestroyed}`, W - 14, 60);
    ctx.font = "13px monospace";
    let statusY = 46;
    ctx.textAlign = "left";
    if (this.comboCount > 1) {
      ctx.fillStyle = this.palette.hudCombo;
      ctx.fillText(`COMBO x${this.comboCount}`, 14, statusY);
      statusY += 18;
    }
    if (this.ship.tripleShotTimer > 0) {
      ctx.fillStyle = this.palette.powerups.triple;
      ctx.fillText(
        `TRIPLE SHOT ${this.ship.tripleShotTimer.toFixed(1)}s`,
        14,
        statusY,
      );
      statusY += 18;
    }
    if (this.ship.shieldTimer > 0) {
      ctx.fillStyle = this.palette.powerups.shield;
      ctx.fillText(`ESCUDO ${this.ship.shieldTimer.toFixed(1)}s`, 14, statusY);
      statusY += 18;
    }
    if (this.ship.slowMoTimer > 0) {
      ctx.fillStyle = this.palette.powerups.slowmo;
      ctx.fillText(
        `SLOW MOTION ${this.ship.slowMoTimer.toFixed(1)}s`,
        14,
        statusY,
      );
      statusY += 18;
    }
    if (this.ship.hyperTimer > 0) {
      ctx.fillStyle = this.palette.powerups.hyper;
      ctx.fillText(
        `HIPERPROPULSIÓN ${this.ship.hyperTimer.toFixed(1)}s`,
        14,
        statusY,
      );
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    const palette = this.palette;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);
    this.particles.forEach((p) => p.draw(ctx, palette));
    this.asteroids.forEach((a) => a.draw(ctx, palette));
    this.bullets.forEach((b) => b.draw(ctx, palette));
    this.powerups.forEach((p) => p.draw(ctx, palette));
    this.ship.draw(ctx, palette);
    if (this.novaFlash > 0 && this.novaOrigin) {
      const t = 1 - this.novaFlash / 0.4;
      const alpha = 1 - t;
      ctx.save();
      ctx.strokeStyle = `rgba(${palette.novaFlashRgb}, ${alpha.toFixed(2)})`;
      setGlow(ctx, palette, `rgb(${palette.novaFlashRgb})`, 1.4);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        this.novaOrigin.x,
        this.novaOrigin.y,
        t * NOVA_BLAST_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
    this.drawHUD(ctx);
  }
}
