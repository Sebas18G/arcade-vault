'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

const overlay = document.getElementById('overlay');
const continueBtn = document.getElementById('continue-btn');
const restartBtn = document.getElementById('restart-btn');

const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const startLeaderboardEl = document.getElementById('start-leaderboard');
const resetRecordsBtn = document.getElementById('reset-records-btn');

const gameoverOverlay = document.getElementById('gameover-overlay');
const gameoverScoreEl = document.getElementById('gameover-score');
const gameoverStatsEl = document.getElementById('gameover-stats');
const qualifyMsg = document.getElementById('qualify-msg');
const nameEntryBox = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const gameoverLeaderboardEl = document.getElementById('gameover-leaderboard');
const gameoverRestartBtn = document.getElementById('gameover-restart-btn');
const resetRecordsBtn2 = document.getElementById('reset-records-btn-2');

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  keys[e.code] = false;
});

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Siluetas fijas (vértices normalizados a radio 1) para asteroides grandes.
const ASTEROID_SHAPES = [
  [
    [-0.128, -0.953],
    [ 0.409, -0.765],
    [ 0.309, -0.201],
    [ 0.879, -0.047],
    [ 0.678,  0.557],
    [ 0.275,  0.490],
    [ 0.020,  0.893],
    [-0.644,  0.591],
    [-1.000, -0.013],
    [-0.819, -0.564],
  ],
];
const BIG_ASTEROID_FIXED_SHAPE_CHANCE = 0.5;

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular (o silueta fija, solo para asteroides grandes)
    if (size === 3 && Math.random() < BIG_ASTEROID_FIXED_SHAPE_CHANCE) {
      const shape = ASTEROID_SHAPES[randInt(0, ASTEROID_SHAPES.length - 1)];
      this.verts = shape.map(([x, y]) => [x * this.radius, y * this.radius]);
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

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
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
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting       = false;
    this.invincible      = 3;
    this.shootCooldown   = 0;
    this.tripleShotTimer = 0;
    this.shieldTimer     = 0;
    this.slowMoTimer     = 0;
    this.hyperTimer      = 0;
    this.dead            = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible     > 0) this.invincible     -= dt;
    if (this.shootCooldown  > 0) this.shootCooldown  -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer    > 0) this.shieldTimer    -= dt;
    if (this.slowMoTimer    > 0) this.slowMoTimer    -= dt;
    if (this.hyperTimer     > 0) this.hyperTimer     -= dt;

    const hyperActive = this.hyperTimer > 0;
    const ROT    = 3.5;                        // rad/s
    const THRUST = hyperActive ? 260 * 2.2 : 260; // px/s² — hiperpropulsión: aceleración drástica
    const DRAG   = hyperActive ? 0.994 : 0.987;   // menos arrastre → velocidad máxima más alta

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
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

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor (más larga e intensa con hiperpropulsión activa)
    if (this.thrusting && Math.random() > 0.35) {
      const hyperActive = this.hyperTimer > 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(...(hyperActive ? [16, 30] : [6, 14])), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = hyperActive ? 'rgba(170, 90, 255, 0.9)' : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();

    // Escudo temporal: círculo de energía alrededor de la nave
    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const pulse = 0.75 + 0.25 * Math.sin(this.shieldTimer * 10);
      ctx.strokeStyle = `rgba(80, 200, 255, ${pulse.toFixed(2)})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (disparo triple / escudo temporal / slow motion / bomba nova / hiperpropulsión) ─
const POWERUP_STYLES = {
  triple: { color: '#0ff', label: '3x',   shape: 'diamond' },
  shield: { color: '#5c8', label: 'ESC',  shape: 'diamond' },
  slowmo: { color: '#fc5', label: 'x½',   shape: 'diamond' },
  // grabRadius amplio: el mayor radio de colisión letal (asteroide grande, ~41px + radio
  // de la nave) supera el radio visual del ítem, así que sin esto la nave suele morir
  // contra un asteroide cercano antes de llegar a tocar la bomba.
  nova:   { color: '#ff5252', label: 'NOVA', shape: 'hexagon', blink: true, grabRadius: 44 },
  hyper:  { color: '#a5f', label: 'HIP',   shape: 'hexagon' },
};
const POWERUP_TYPES = Object.keys(POWERUP_STYLES);
const randomPowerUpType = () => POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)];

class PowerUp {
  constructor(x, y, type = 'triple') {
    this.x      = x;
    this.y      = y;
    this.type   = type;
    this.radius = 10;
    this.ttl    = 8;
    this.rot    = 0;
    this.dead   = false;
  }

  update(dt) {
    this.rot += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const style = POWERUP_STYLES[this.type];

    // Parpadeo: el ítem se apaga en ciclos alternos para llamar la atención.
    if (style.blink && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = style.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    if (style.shape === 'hexagon') {
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const a  = (i / sides) * Math.PI * 2;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    } else {
      ctx.moveTo( this.radius, 0);
      ctx.lineTo(0,  this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Etiqueta sin rotar, para que se lea siempre derecha
    ctx.save();
    ctx.fillStyle = style.color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.label, this.x, this.y);
    ctx.restore();
  }
}

// ── Tabla de récords (localStorage) ─────────────────────────────────────────────
const LEADERBOARD_KEY  = 'asteroids_leaderboard_v1';
const PLAYER_NAME_KEY  = 'asteroids_player_name';
const MAX_ENTRIES       = 5;
const COMBO_WINDOW      = 1.5; // segundos entre kills para mantener vivo el combo

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLeaderboardList(list) {
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list)); } catch { /* localStorage no disponible */ }
}

function loadPlayerName() {
  try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; } catch { return ''; }
}

function savePlayerName(name) {
  try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch { /* localStorage no disponible */ }
}

// Puesto (1-based) que ocuparía `score` en el top 5 actual, o null si no entra.
function getRankForScore(sc) {
  const list = loadLeaderboard();
  if (list.length < MAX_ENTRIES) return list.length + 1;
  for (let i = 0; i < list.length; i++) {
    if (sc > list[i].score) return i + 1;
  }
  return null;
}

function addLeaderboardEntry(name, sc, lvl, destroyed, combo) {
  const entry = { id: Date.now() + Math.random(), name, score: sc, level: lvl, destroyed, combo };
  const list = loadLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, MAX_ENTRIES);
  saveLeaderboardList(list);
  return entry;
}

function resetRecords() {
  if (!confirm('¿Seguro que quieres borrar todos los récords guardados?')) return;
  saveLeaderboardList([]);
  renderLeaderboard(startLeaderboardEl, null);
  renderLeaderboard(gameoverLeaderboardEl, null);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderLeaderboard(container, highlightId) {
  const list = loadLeaderboard();
  if (list.length === 0) {
    container.innerHTML = '<p class="leaderboard-empty">Sin récords todavía — ¡sé el primero!</p>';
    return;
  }
  const rows = list.map((e, i) => `
    <tr class="${e.id === highlightId ? 'highlight' : ''}">
      <td>${i + 1}</td>
      <td>${escapeHtml(e.name)}</td>
      <td>${e.score}</td>
      <td>${e.level}</td>
      <td>${e.destroyed}</td>
      <td>x${e.combo}</td>
    </tr>`).join('');
  container.innerHTML = `
    <table class="leaderboard-table">
      <thead>
        <tr><th>#</th><th>Nombre</th><th>Puntaje</th><th>Nivel</th><th>Destr.</th><th>Combo</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state = 'start'; // 'start' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let paused = false;
let powerupsSpawnedThisLevel; // cuántos power-ups han salido ya en el nivel actual
let maxPowerupsThisLevel;     // tope de power-ups para el nivel actual (escala con la dificultad)
let novaFlash = 0;     // temporizador de la onda expansiva visual de la bomba nova
let novaOrigin = null; // punto donde se activó la última bomba nova
let comboCount = 0;          // racha actual de kills seguidos dentro de la ventana de combo
let comboTimer = 0;          // tiempo restante antes de que la racha se rompa
let bestCombo = 0;           // mayor combo alcanzado en la partida actual
let asteroidsDestroyed = 0;  // total de asteroides destruidos en la partida actual

// A más nivel, más power-ups pueden aparecer: sube 1 cada 3 niveles, con un tope de 5.
function computeMaxPowerups(lvl) {
  return Math.min(1 + Math.floor((lvl - 1) / 3), 5);
}

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerupsSpawnedThisLevel = 0;
  maxPowerupsThisLevel     = computeMaxPowerups(level);
  novaFlash  = 0;
  novaOrigin = null;
  comboCount = 0;
  comboTimer = 0;
  bestCombo  = 0;
  asteroidsDestroyed = 0;
  spawnAsteroids(4);
}

// Oculta ambos overlays de menú y arranca (o reinicia) la partida.
function startGame() {
  startOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  initGame();
}

// Registra un asteroide destruido: alimenta tanto el contador total como el combo.
function registerKill() {
  asteroidsDestroyed++;
  comboCount++;
  comboTimer = COMBO_WINDOW;
  if (comboCount > bestCombo) bestCombo = comboCount;
}

function onGameOver() {
  gameoverScoreEl.textContent = `PUNTAJE: ${score}`;
  gameoverStatsEl.textContent =
    `NIVEL MÁXIMO: ${level}   ·   ASTEROIDES DESTRUIDOS: ${asteroidsDestroyed}   ·   MEJOR COMBO: x${bestCombo}`;

  const rank = getRankForScore(score);
  if (rank) {
    qualifyMsg.textContent = `¡Nuevo récord! Entraste al puesto #${rank}. Ingresa tu nombre:`;
    nameEntryBox.classList.remove('hidden');
    playerNameInput.value = loadPlayerName();
    renderLeaderboard(gameoverLeaderboardEl, null);
    setTimeout(() => playerNameInput.focus(), 0);
  } else {
    qualifyMsg.textContent = 'No alcanzaste el Top 5 esta vez.';
    nameEntryBox.classList.add('hidden');
    renderLeaderboard(gameoverLeaderboardEl, null);
  }

  gameoverOverlay.classList.remove('hidden');
}

function saveScore() {
  const name = (playerNameInput.value || '').trim().slice(0, 12).toUpperCase() || 'JUGADOR';
  savePlayerName(name);
  const entry = addLeaderboardEntry(name, score, level, asteroidsDestroyed, bestCombo);
  nameEntryBox.classList.add('hidden');
  qualifyMsg.textContent = `¡Guardado, ${name}!`;
  renderLeaderboard(gameoverLeaderboardEl, entry.id);
  renderLeaderboard(startLeaderboardEl, entry.id);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  ship.reset();
  powerupsSpawnedThisLevel = 0;
  maxPowerupsThisLevel     = computeMaxPowerups(level);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Bomba Nova: destruye de golpe, sin fragmentarlos, los asteroides dentro del radio de la
// onda expansiva (mismo radio que dibuja la animación, NOVA_BLAST_RADIUS).
const NOVA_BLAST_RADIUS = 420;
function triggerNovaBomb() {
  for (const a of asteroids) {
    if (a.dead) continue;
    if (dist(ship, a) > NOVA_BLAST_RADIUS) continue;
    a.dead = true;
    score += POINTS[a.size];
    registerKill();
    explode(a.x, a.y, a.size * 6);
  }
  asteroids = asteroids.filter(a => !a.dead);
  novaOrigin = { x: ship.x, y: ship.y };
  novaFlash  = 0.4;
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
    onGameOver();
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

function togglePause() {
  if (state === 'gameover' || state === 'start') return;
  paused = !paused;
  overlay.classList.toggle('hidden', !paused);
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'start') {
    if (pressed('Space')) startGame();
    return;
  }

  if (pressed('KeyP')) togglePause();
  if (paused) return;

  if (state === 'gameover') {
    if (pressed('Space')) startGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) comboCount = 0;
  }

  const asteroidDt = ship.slowMoTimer > 0 ? dt * 0.5 : dt;

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(asteroidDt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const POWERUP_CHANCE = 0.2;
  const newAsteroids = [];
  let lastKillPos = null;
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        registerKill();
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        lastKillPos = { x: a.x, y: a.y };

        if (powerupsSpawnedThisLevel < maxPowerupsThisLevel && Math.random() < POWERUP_CHANCE) {
          powerups.push(new PowerUp(a.x, a.y, randomPowerUpType()));
          powerupsSpawnedThisLevel++;
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Garantía: si el nivel se limpia sin que haya salido ningún power-up, forzar al menos uno
  if (asteroids.length === 0 && powerupsSpawnedThisLevel === 0 && lastKillPos) {
    powerups.push(new PowerUp(lastKillPos.x, lastKillPos.y, randomPowerUpType()));
    powerupsSpawnedThisLevel++;
  }

  // Nave vs power-up (antes que nave vs asteroide: así el escudo o la bomba nova
  // recogidos en el mismo frame alcanzan a proteger a la nave)
  if (!ship.dead) {
    for (const p of powerups) {
      const pickupRadius = POWERUP_STYLES[p.type].grabRadius ?? p.radius;
      if (!p.dead && dist(ship, p) < ship.radius + pickupRadius) {
        p.dead = true;
        if (p.type === 'shield') ship.shieldTimer = 5;
        else if (p.type === 'slowmo') ship.slowMoTimer = 6;
        else if (p.type === 'nova') triggerNovaBomb();
        else if (p.type === 'hyper') ship.hyperTimer = 8;
        else ship.tripleShotTimer = 8;
      }
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldTimer > 0) {
          // El escudo absorbe el impacto: se rompe y da un respiro breve de invencibilidad
          ship.shieldTimer = 0;
          ship.invincible  = 1;
          explode(ship.x, ship.y, 10);
        } else {
          killShip();
        }
        break;
      }
    }
  }

  if (novaFlash > 0) novaFlash -= dt;

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Estadísticas de la partida: mejor combo y total de asteroides destruidos
  ctx.textAlign = 'right';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`MEJOR COMBO x${bestCombo}`, W - 14, 44);
  ctx.fillText(`DESTRUIDOS ${asteroidsDestroyed}`, W - 14, 60);

  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('P: PAUSA', 14, H - 12);

  ctx.font = '13px monospace';
  let statusY = 46;
  if (comboCount > 1) {
    ctx.fillStyle = '#ff9d3f';
    ctx.fillText(`COMBO x${comboCount}`, 14, statusY);
    statusY += 18;
  }
  if (ship.tripleShotTimer > 0) {
    ctx.fillStyle = '#0ff';
    ctx.fillText(`TRIPLE SHOT ${ship.tripleShotTimer.toFixed(1)}s`, 14, statusY);
    statusY += 18;
  }
  if (ship.shieldTimer > 0) {
    ctx.fillStyle = '#5c8';
    ctx.fillText(`ESCUDO ${ship.shieldTimer.toFixed(1)}s`, 14, statusY);
    statusY += 18;
  }
  if (ship.slowMoTimer > 0) {
    ctx.fillStyle = '#fc5';
    ctx.fillText(`SLOW MOTION ${ship.slowMoTimer.toFixed(1)}s`, 14, statusY);
    statusY += 18;
  }
  if (ship.hyperTimer > 0) {
    ctx.fillStyle = '#a5f';
    ctx.fillText(`HIPERPROPULSIÓN ${ship.hyperTimer.toFixed(1)}s`, 14, statusY);
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'start') return; // la pantalla de inicio la maneja el overlay DOM

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  if (novaFlash > 0 && novaOrigin) {
    const t     = 1 - novaFlash / 0.4; // 0 → 1
    const alpha = 1 - t;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 82, 82, ${alpha.toFixed(2)})`;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(novaOrigin.x, novaOrigin.y, t * NOVA_BLAST_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawHUD();
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

continueBtn.addEventListener('click', () => { if (paused) togglePause(); });
restartBtn.addEventListener('click', () => {
  paused = false;
  overlay.classList.add('hidden');
  startGame();
});

startBtn.addEventListener('click', startGame);
resetRecordsBtn.addEventListener('click', resetRecords);
resetRecordsBtn2.addEventListener('click', resetRecords);
gameoverRestartBtn.addEventListener('click', startGame);
saveScoreBtn.addEventListener('click', saveScore);
playerNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveScore(); }
});

renderLeaderboard(startLeaderboardEl, null);
requestAnimationFrame(loop);
