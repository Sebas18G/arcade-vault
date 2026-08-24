const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const BLOCK_COLORS = [ 'gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const GRID_COLS = 10;
const GRID_ROWS = 6;
const BLOCK_SCORE = 10;

const state = {
  screen: 'playing', // 'playing' | 'gameover' | 'victory'
  lives: 3,
  score: 0,
  paddle: { x: 350, y: 570, w: 100, h: 16 },
  ball: { x: 400, y: 300, vx: 4, vy: -4, r: 8 },
  blocks: [], // { row, col, x, y, w, h, color, alive: true }
};

const PADDLE_SPEED = 7;
const keys = { left: false, right: false };

function clampPaddleX( x ) {
  return Math.max( 0, Math.min( canvas.width - state.paddle.w, x ) );
}

window.addEventListener( 'keydown', ( e ) => {
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = true;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = true;
} );

window.addEventListener( 'keyup', ( e ) => {
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = false;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = false;
} );

canvas.addEventListener( 'mousemove', ( e ) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  state.paddle.x = clampPaddleX( mouseX - state.paddle.w / 2 );
} );

function updatePaddle() {
  if ( keys.left ) state.paddle.x = clampPaddleX( state.paddle.x - PADDLE_SPEED );
  if ( keys.right ) state.paddle.x = clampPaddleX( state.paddle.x + PADDLE_SPEED );
}

function updateBall() {
  const b = state.ball;
  b.x += b.vx;
  b.y += b.vy;

  if ( b.x - b.r <= 0 ) {
    b.x = b.r;
    b.vx *= -1;
  } else if ( b.x + b.r >= canvas.width ) {
    b.x = canvas.width - b.r;
    b.vx *= -1;
  }

  if ( b.y - b.r <= 0 ) {
    b.y = b.r;
    b.vy *= -1;
  }
}

function draw() {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
  const b = state.ball;
  drawSprite( ctx, 'ball', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2 );
}

function loop() {
  updatePaddle();
  updateBall();
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
