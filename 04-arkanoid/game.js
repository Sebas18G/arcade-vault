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

function draw() {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
}

function loop() {
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
