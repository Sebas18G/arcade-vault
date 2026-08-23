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
const themeSwitch = document.getElementById('theme-switch');
const nextLabelEl = document.getElementById('next-label');
const powerupToastEl = document.getElementById('powerup-toast');
const freezeStatusSection = document.getElementById('freeze-status-section');
const freezeStatusEl = document.getElementById('freeze-status');

const THEME_KEY = 'tetris-theme';
let gridColor = '#22222e';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePowerUp, powerUpThreshold, lastPowerUpType, freezeRemaining, toastTimeoutId;

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
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
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
  }
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
  clearLines();
  spawn();
}

function spawn() {
  current = next;
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
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
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
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
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
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
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
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

init();
