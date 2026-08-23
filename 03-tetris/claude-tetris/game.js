'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
  '#f06292', // PLUS - rosa (pentominó)
  '#7986cb', // U - índigo (pentominó)
  '#dce775', // Y - lima (pentominó)
  '#ffd700', // SINGLE - dorado (recompensa Tetris)
  '#78909c', // HOLLOW - gris azulado (reto)
  '#ff5722', // BOMB - naranja fuego
  '#fff176', // LIGHTNING - amarillo eléctrico
  '#e040fb', // DYE - magenta comodín
  '#8d6e63', // GRAVITY - marrón tierra
  '#4fc3f7', // FREEZE - celeste hielo
];

// Paleta suave usada por el skin "Pastel" (mismos índices 1-17 que COLORS, solo reinterpreta el color).
const PASTEL_COLORS = [
  null,
  '#a8dadc', // I
  '#ffe8a3', // O
  '#d8bfd8', // T
  '#b5e8b0', // S
  '#f5b8b8', // Z
  '#b8d4f0', // J
  '#ffcc99', // L
  '#f7c6d9', // PLUS
  '#c5cae9', // U
  '#eef2a8', // Y
  '#fff2b2', // SINGLE
  '#c8d0d8', // HOLLOW
  '#ffb3a1', // BOMB
  '#fff6b3', // LIGHTNING
  '#f0b3f7', // DYE
  '#d2b8a8', // GRAVITY
  '#b3e0f7', // FREEZE
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // PLUS (pentominó, 5 bloques)
  [[9,0,9],[9,9,9]],                          // U (pentominó, 5 bloques)
  [[0,10],[10,10],[0,10],[0,10]],             // Y (pentominó, 5 bloques)
  [[11]],                                     // SINGLE (recompensa tras Tetris, 1 bloque)
  [[12,12,12],[12,0,12],[12,12,12]],          // HOLLOW 3x3 (reto, 8 bloques con hueco central)
  [[13]],                                     // BOMB (power-up, 1 bloque)
  [[14]],                                     // LIGHTNING (power-up, 1 bloque)
  [[15]],                                     // DYE (power-up, 1 bloque)
  [[16]],                                     // GRAVITY (power-up, 1 bloque)
  [[17]],                                     // FREEZE (power-up, 1 bloque)
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
const POWERUP_TYPES = [BOMB_TYPE, LIGHTNING_TYPE, DYE_TYPE, GRAVITY_TYPE, FREEZE_TYPE];
const POWERUP_LABELS = {
  [BOMB_TYPE]: '💣 BOMBA',
  [LIGHTNING_TYPE]: '⚡ RAYO',
  [DYE_TYPE]: '🎨 TINTE',
  [GRAVITY_TYPE]: '⬇️ GRAVEDAD',
  [FREEZE_TYPE]: '❄️ CONGELAR',
};
const FREEZE_DURATION = 5000;

const SPAWN_WEIGHTS = [
  ...NORMAL_TYPES.map(type => ({ type, weight: 10 })),
  ...PENTOMINO_TYPES.map(type => ({ type, weight: 3 })),
  ...CHALLENGE_TYPES.map(type => ({ type, weight: 2 })),
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const T_SPIN_SCORES = [400, 800, 1200, 1600]; // índice = líneas limpiadas (0 = T-spin sin línea)
const T_SPIN_LABELS = { 0: 'T-SPIN', 1: 'T-SPIN SINGLE', 2: 'T-SPIN DOUBLE', 3: 'T-SPIN TRIPLE' };
const PERFECT_CLEAR_SCORES = [0, 800, 1200, 1800, 2000]; // índice = líneas limpiadas
const T_TYPE = 3;
const B2B_BONUS_RATIO = 0.5;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const continueBtn = document.getElementById('continue-btn');
const themeSwitch = document.getElementById('theme-switch');
const skinSelect = document.getElementById('skin-select');
const nextLabelEl = document.getElementById('next-label');
const powerupToastEl = document.getElementById('powerup-toast');
const freezeStatusSection = document.getElementById('freeze-status-section');
const freezeStatusEl = document.getElementById('freeze-status');
const comboStatusSection = document.getElementById('combo-status-section');
const comboStatusEl = document.getElementById('combo-status');
const comboToastEl = document.getElementById('combo-toast');
const pauseMenu = document.getElementById('pause-menu');
const startLevelSelect = document.getElementById('start-level-select');
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const pauseControlsList = document.getElementById('pause-controls-list');

const THEME_KEY = 'tetris-theme';
const START_LEVEL_KEY = 'tetris-start-level';
let gridColor = '#22222e';
let startLevel = 1;

const SKIN_KEY = 'tetris-skin';
const VALID_SKINS = ['retro', 'neon', 'pastel', 'pixel'];
let currentSkin = 'retro';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePowerUp, powerUpThreshold, lastPowerUpType, freezeRemaining, toastTimeoutId;
let comboCount, backToBackActive, lastActionRotation, comboToastTimeoutId, boardFlashTimeoutId, audioCtx;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function createPiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function weightedRandomType() {
  const total = SPAWN_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * total;
  for (const w of SPAWN_WEIGHTS) {
    if (r < w.weight) return w.type;
    r -= w.weight;
  }
  return SPAWN_WEIGHTS[0].type;
}

function randomPiece() {
  return createPiece(weightedRandomType());
}

function dropIntervalForLevel(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function rollPowerUpThreshold(lvl) {
  const maxLines = Math.max(4, 12 - lvl);
  const minLines = Math.max(2, maxLines - 3);
  return minLines + Math.floor(Math.random() * (maxLines - minLines + 1));
}

function pickPowerUpType() {
  const choices = POWERUP_TYPES.filter(t => t !== lastPowerUpType);
  return choices[Math.floor(Math.random() * choices.length)];
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastActionRotation = true;
      return;
    }
  }
}

// Regla simplificada de "3 esquinas": el centro de la pieza T (fijo en shape[1][1],
// ya que su matriz 3x3 nunca se recorta) debe tener al menos 3 de sus 4 esquinas
// diagonales ocupadas (por bloques fijados o por el borde del tablero), y la última
// acción antes de fijar la pieza debe haber sido una rotación.
function detectTSpin() {
  if (current.type !== T_TYPE || !lastActionRotation) return false;
  const cy = current.y + 1;
  const cx = current.x + 1;
  const corners = [[cy - 1, cx - 1], [cy - 1, cx + 1], [cy + 1, cx - 1], [cy + 1, cx + 1]];
  let filled = 0;
  for (const [r, c] of corners) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c]) filled++;
  }
  return filled >= 3;
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines(isTSpin) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }

  if (cleared === 0) {
    if (comboCount > 0) {
      comboCount = 0;
      updateComboHUD();
    }
    if (isTSpin) {
      score += T_SPIN_SCORES[0] * level;
      updateHUD();
      triggerClearEffects({ cleared: 0, isTSpin: true, comboCount: 0, isB2B: false, perfectClear: false });
    }
    return;
  }

  lines += cleared;
  comboCount++;

  let clearScore = ((isTSpin ? T_SPIN_SCORES[cleared] : LINE_SCORES[cleared]) || 0) * level;
  clearScore *= comboCount;

  const isB2BEligible = cleared === 4 || isTSpin;
  const isB2B = isB2BEligible && backToBackActive;
  if (isB2B) clearScore += Math.round(clearScore * B2B_BONUS_RATIO);
  backToBackActive = isB2BEligible;

  score += clearScore;

  const perfectClear = board.every(row => row.every(v => v === 0));
  if (perfectClear) {
    score += (PERFECT_CLEAR_SCORES[cleared] || PERFECT_CLEAR_SCORES[4]) * level;
  }

  level = startLevel + Math.floor(lines / 10);
  dropInterval = dropIntervalForLevel(level);
  linesSincePowerUp += cleared;

  if (cleared === 4) {
    next = createPiece(REWARD_TYPE);
    drawNext();
  } else if (linesSincePowerUp >= powerUpThreshold) {
    linesSincePowerUp = 0;
    powerUpThreshold = rollPowerUpThreshold(level);
    const type = pickPowerUpType();
    lastPowerUpType = type;
    next = createPiece(type);
    drawNext();
  }

  updateHUD();
  updateComboHUD();
  triggerClearEffects({ cleared, isTSpin, comboCount, isB2B, perfectClear });
}

function updateComboHUD() {
  if (comboCount > 1) {
    comboStatusSection.hidden = false;
    comboStatusEl.textContent = `x${comboCount}`;
    comboStatusEl.classList.remove('combo-value');
    void comboStatusEl.offsetWidth; // reinicia la animación CSS
    comboStatusEl.classList.add('combo-value');
  } else {
    comboStatusSection.hidden = true;
  }
}

function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, delay = 0, type = 'square', volume = 0.15) {
  const ctxA = getAudioCtx();
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

function playClearSound({ cleared, isTSpin, comboCount: combo, isB2B, perfectClear }) {
  try {
    if (perfectClear) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.25, i * 0.08, 'triangle', 0.18));
      return;
    }
    if (isTSpin) {
      playTone(440, 0.12, 0, 'sawtooth', 0.15);
      playTone(660, 0.15, 0.06, 'sawtooth', 0.15);
    } else if (cleared === 4) {
      [392, 523.25, 659.25].forEach((f, i) => playTone(f, 0.18, i * 0.05, 'square', 0.15));
    } else if (cleared > 0) {
      playTone(330 + cleared * 40, 0.1, 0, 'square', 0.12);
    }
    if (isB2B) playTone(880, 0.1, 0.12, 'sine', 0.12);
    if (combo > 1) playTone(220 + combo * 30, 0.08, (isTSpin || cleared === 4) ? 0.18 : 0.06, 'triangle', 0.1);
  } catch (e) {
    // audio no soportado o bloqueado: efecto silencioso, no bloquea el juego
  }
}

function showComboToast(text) {
  comboToastEl.textContent = text;
  comboToastEl.classList.remove('hidden');
  comboToastEl.classList.add('show');
  clearTimeout(comboToastTimeoutId);
  comboToastTimeoutId = setTimeout(() => {
    comboToastEl.classList.remove('show');
  }, 1100);
}

function flashBoard(className) {
  canvas.classList.remove('flash-normal', 'flash-tspin', 'flash-tetris', 'flash-b2b', 'flash-perfect');
  void canvas.offsetWidth; // reinicia la animación CSS
  canvas.classList.add(className);
  clearTimeout(boardFlashTimeoutId);
  boardFlashTimeoutId = setTimeout(() => canvas.classList.remove(className), 600);
}

function triggerClearEffects({ cleared, isTSpin, comboCount: combo, isB2B, perfectClear }) {
  const messages = [];
  let flashClass = null;

  if (isTSpin) {
    messages.push(T_SPIN_LABELS[cleared] || 'T-SPIN');
    flashClass = 'flash-tspin';
  } else if (cleared === 4) {
    messages.push('TETRIS');
    flashClass = 'flash-tetris';
  } else if (cleared > 0) {
    flashClass = 'flash-normal';
  }

  if (isB2B) {
    messages.push('BACK-TO-BACK');
    flashClass = 'flash-b2b';
  }

  if (combo > 1) messages.push(`COMBO x${combo}`);

  if (perfectClear) {
    messages.push('PERFECT CLEAR');
    flashClass = 'flash-perfect';
  }

  if (messages.length) showComboToast(messages.join(' · '));
  if (flashClass) flashBoard(flashClass);
  playClearSound({ cleared, isTSpin, comboCount: combo, isB2B, perfectClear });
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function clearCell(r, c) {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
}

function applyGravityCompact() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c]) {
        board[write][c] = board[r][c];
        if (write !== r) board[r][c] = 0;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) board[r][c] = 0;
  }
}

function effectBomb(cy, cx) {
  for (let r = cy - 1; r <= cy + 1; r++)
    for (let c = cx - 1; c <= cx + 1; c++)
      clearCell(r, c);
}

function effectLightning(cy, cx) {
  for (let c = 0; c < COLS; c++) clearCell(cy, c);
  for (let r = 0; r < ROWS; r++) clearCell(r, cx);
}

function effectDye() {
  const presentColors = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (v && v !== REWARD_TYPE && !POWERUP_TYPES.includes(v)) presentColors.add(v);
    }
  if (presentColors.size === 0) return;
  const colors = [...presentColors];
  const target = colors[Math.floor(Math.random() * colors.length)];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === target) board[r][c] = 0;
  applyGravityCompact();
}

function effectFreeze() {
  freezeRemaining = FREEZE_DURATION;
}

function showPowerUpToast(text) {
  powerupToastEl.textContent = text;
  powerupToastEl.classList.remove('hidden');
  powerupToastEl.classList.add('show');
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    powerupToastEl.classList.remove('show');
  }, 1200);
}

function applyPowerUpEffect(type, cy, cx) {
  clearCell(cy, cx);
  switch (type) {
    case BOMB_TYPE:
      effectBomb(cy, cx);
      break;
    case LIGHTNING_TYPE:
      effectLightning(cy, cx);
      break;
    case DYE_TYPE:
      effectDye();
      break;
    case GRAVITY_TYPE:
      applyGravityCompact();
      break;
    case FREEZE_TYPE:
      effectFreeze();
      applyGravityCompact();
      break;
  }
  showPowerUpToast(POWERUP_LABELS[type]);
}

function lockPiece() {
  merge();
  if (POWERUP_TYPES.includes(current.type)) {
    applyPowerUpEffect(current.type, current.y, current.x);
  }
  const isTSpin = detectTSpin();
  clearLines(isTSpin);
  spawn();
}

function spawn() {
  current = next;
  lastActionRotation = false;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  switch (currentSkin) {
    case 'neon':
      drawBlockNeon(context, x, y, colorIndex, size, alpha);
      break;
    case 'pastel':
      drawBlockPastel(context, x, y, colorIndex, size, alpha);
      break;
    case 'pixel':
      drawBlockPixel(context, x, y, colorIndex, size, alpha);
      break;
    default:
      drawBlockRetro(context, x, y, colorIndex, size, alpha);
      break;
  }
}

// Skin "Retro": comportamiento original de drawBlock, sin cambios.
function drawBlockRetro(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Skin "Neon": fondo negro (ver drawBackground) + resplandor (shadowBlur/shadowColor) alrededor de cada bloque.
function drawBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowBlur = size * 0.5;
  context.shadowColor = color;
  context.fillStyle = color;
  context.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255,255,255,0.7)';
  context.lineWidth = 1;
  context.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.restore();
}

// Skin "Pastel": paleta suave (PASTEL_COLORS) + bordes redondeados (ctx.roundRect, con fallback manual).
function drawBlockPastel(context, x, y, colorIndex, size, alpha) {
  const color = PASTEL_COLORS[colorIndex] || COLORS[colorIndex];
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
  // highlight suave en la mitad superior
  context.fillStyle = 'rgba(255,255,255,0.35)';
  roundedRectPath(context, px, py, w, Math.max(2, h * 0.35), r);
  context.fill();
  context.restore();
}

// Traza un rectángulo con esquinas redondeadas en `context`, usando ctx.roundRect si está
// disponible y un fallback manual con quadraticCurveTo si no (Safari antiguo, etc.).
function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
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

// Skin "Pixel art": relleno plano + patrón de dithering (cuadrícula fina a cuadros) encima.
function drawBlockPixel(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, w, h);
  const cell = Math.max(2, Math.floor(size / 8));
  context.fillStyle = 'rgba(0,0,0,0.18)';
  for (let iy = 0; iy < h; iy += cell) {
    for (let ix = 0; ix < w; ix += cell) {
      if (((ix / cell) + (iy / cell)) % 2 === 0) {
        context.fillRect(px + ix, py + iy, Math.min(cell, w - ix), Math.min(cell, h - iy));
      }
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
  context.restore();
}

// Skin "Neon": pinta el fondo de negro antes de la cuadrícula/bloques.
function drawBackground(context, w, h) {
  if (currentSkin === 'neon') {
    context.fillStyle = '#000000';
    context.fillRect(0, 0, w, h);
  }
}

function drawGrid() {
  ctx.strokeStyle = currentSkin === 'neon' ? 'rgba(255,255,255,0.08)' : gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(ctx, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawBackground(nextCtx, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  nextLabelEl.textContent = POWERUP_LABELS[next.type] || '';
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  continueBtn.hidden = true;
  pauseMenu.classList.add('hidden');
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    continueBtn.hidden = false;
    pauseMenu.classList.remove('hidden');
    pauseControlsList.classList.add('hidden');
    controlsToggleBtn.textContent = 'Ver controles ▾';
    overlay.classList.remove('hidden');
  }
}

function updateFreezeStatus() {
  if (freezeRemaining > 0) {
    freezeStatusSection.hidden = false;
    freezeStatusEl.textContent = `❄️ ${(freezeRemaining / 1000).toFixed(1)}s`;
  } else {
    freezeStatusSection.hidden = true;
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  updateFreezeStatus();
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = dropIntervalForLevel(level);
  dropAccum = 0;
  lastTime = performance.now();
  linesSincePowerUp = 0;
  powerUpThreshold = rollPowerUpThreshold(level);
  lastPowerUpType = null;
  freezeRemaining = 0;
  freezeStatusSection.hidden = true;
  clearTimeout(toastTimeoutId);
  powerupToastEl.classList.remove('show');
  powerupToastEl.classList.add('hidden');
  comboCount = 0;
  backToBackActive = false;
  lastActionRotation = false;
  clearTimeout(comboToastTimeoutId);
  comboToastEl.classList.remove('show');
  comboToastEl.classList.add('hidden');
  comboStatusSection.hidden = true;
  clearTimeout(boardFlashTimeoutId);
  canvas.classList.remove('flash-normal', 'flash-tspin', 'flash-tetris', 'flash-b2b', 'flash-perfect');
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastActionRotation = false; }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastActionRotation = false; }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
continueBtn.addEventListener('click', () => { if (paused) togglePause(); });

controlsToggleBtn.addEventListener('click', () => {
  const isHidden = pauseControlsList.classList.toggle('hidden');
  controlsToggleBtn.textContent = isHidden ? 'Ver controles ▾' : 'Ocultar controles ▴';
});

function applyStartLevel(lvl) {
  startLevel = lvl;
  startLevelSelect.value = String(lvl);
}

startLevelSelect.addEventListener('change', () => {
  const lvl = parseInt(startLevelSelect.value, 10);
  applyStartLevel(lvl);
  localStorage.setItem(START_LEVEL_KEY, String(lvl));
});

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  themeSwitch.checked = theme === 'light';
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
}

themeSwitch.addEventListener('change', () => {
  const theme = themeSwitch.checked ? 'light' : 'dark';
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, theme);
});

applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

const storedStartLevel = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
applyStartLevel(Number.isInteger(storedStartLevel) && storedStartLevel >= 1 && storedStartLevel <= 10 ? storedStartLevel : 1);

function applySkin(skin) {
  currentSkin = VALID_SKINS.includes(skin) ? skin : 'retro';
  if (skinSelect) skinSelect.value = currentSkin;
  // Si el juego ya está inicializado, refleja el cambio de skin en el próximo frame
  // forzando un redibujado inmediato (sin esperar al loop, por si está en pausa).
  if (board && current) draw();
  if (next) drawNext();
}

skinSelect.addEventListener('change', () => {
  const skin = skinSelect.value;
  applySkin(skin);
  localStorage.setItem(SKIN_KEY, skin);
});

applySkin(localStorage.getItem(SKIN_KEY));

init();
