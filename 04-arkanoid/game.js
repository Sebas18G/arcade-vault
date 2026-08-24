const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const BG_COLOR = '#1414a0';

const BLOCK_COLORS = [ 'gray', 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const GRID_COLS = 10;
const GRID_ROWS = 6;
const BLOCK_SCORE = 10;

const BLOCK_W = 76;
const BLOCK_H = 24;
const BLOCK_GAP = 4;
const BLOCK_MARGIN_X = 2;
const BLOCK_MARGIN_TOP = 60;

const INITIAL_PADDLE = { x: 350, y: 570, w: 100, h: 16 };
const INITIAL_BALL = { x: 400, y: 300, vx: 4, vy: -4, r: 8 };

const state = {
  screen: 'playing', // 'playing' | 'gameover' | 'victory'
  lives: 3,
  score: 0,
  paddle: { ...INITIAL_PADDLE },
  ball: { ...INITIAL_BALL },
  blocks: [], // { row, col, x, y, w, h, color, alive: true }
  explosions: [], // { x, y, w, h, color, startTime }
  pendingVictory: false,
};

function resetPositions() {
  state.paddle = { ...INITIAL_PADDLE };
  state.ball = { ...INITIAL_BALL };
}

function resetGame() {
  state.lives = 3;
  state.score = 0;
  state.blocks = generateBlocks();
  state.explosions = [];
  state.pendingVictory = false;
  state.screen = 'playing';
  resetPositions();
}

function generateBlocks() {
  const blocks = [];
  for ( let row = 0; row < GRID_ROWS; row++ ) {
    for ( let col = 0; col < GRID_COLS; col++ ) {
      blocks.push( {
        row,
        col,
        x: BLOCK_MARGIN_X + col * ( BLOCK_W + BLOCK_GAP ),
        y: BLOCK_MARGIN_TOP + row * ( BLOCK_H + BLOCK_GAP ),
        w: BLOCK_W,
        h: BLOCK_H,
        color: BLOCK_COLORS[ Math.floor( Math.random() * BLOCK_COLORS.length ) ],
        alive: true,
      } );
    }
  }
  return blocks;
}

state.blocks = generateBlocks();

const PADDLE_SPEED = 7;
const keys = { left: false, right: false };

function clampPaddleX( x ) {
  return Math.max( 0, Math.min( canvas.width - state.paddle.w, x ) );
}

window.addEventListener( 'keydown', ( e ) => {
  if ( e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ) keys.left = true;
  if ( e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ) keys.right = true;
  if ( ( state.screen === 'gameover' || state.screen === 'victory' ) && ( e.key === 'Enter' || e.key === ' ' ) ) {
    resetGame();
  }
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

  if ( b.vy > 0 && collidesWithRect( b, state.paddle ) ) {
    b.y = state.paddle.y - b.r;
    b.vy *= -1;
  }

  checkBlockCollisions();

  if ( b.y - b.r > canvas.height ) {
    state.lives -= 1;
    if ( state.lives <= 0 ) {
      state.screen = 'gameover';
    }
    resetPositions();
  }
}

function collidesWithRect( b, r ) {
  const closestX = Math.max( r.x, Math.min( b.x, r.x + r.w ) );
  const closestY = Math.max( r.y, Math.min( b.y, r.y + r.h ) );
  const dx = b.x - closestX;
  const dy = b.y - closestY;
  return ( dx * dx + dy * dy ) <= b.r * b.r;
}

function bounceOffBlock( b, block ) {
  const overlapLeft = ( b.x + b.r ) - block.x;
  const overlapRight = ( block.x + block.w ) - ( b.x - b.r );
  const overlapTop = ( b.y + b.r ) - block.y;
  const overlapBottom = ( block.y + block.h ) - ( b.y - b.r );
  const minOverlapX = Math.min( overlapLeft, overlapRight );
  const minOverlapY = Math.min( overlapTop, overlapBottom );

  if ( minOverlapX < minOverlapY ) {
    b.vx *= -1;
  } else {
    b.vy *= -1;
  }
}

function checkBlockCollisions() {
  const b = state.ball;
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    if ( !collidesWithRect( b, block ) ) continue;
    block.alive = false;
    state.score += BLOCK_SCORE;
    state.explosions.push( {
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      color: block.color,
      startTime: performance.now(),
    } );
    bounceOffBlock( b, block );
    if ( state.blocks.every( ( bl ) => !bl.alive ) ) {
      state.pendingVictory = true;
    }
    break;
  }
}

function updateExplosions() {
  state.explosions = state.explosions.filter( ( ex ) => {
    const elapsed = performance.now() - ex.startTime;
    return elapsed < EXPLOSION_DURATION;
  } );

  if ( state.pendingVictory && state.explosions.length === 0 ) {
    state.screen = 'victory';
  }
}

function drawExplosions() {
  for ( const ex of state.explosions ) {
    const elapsed = performance.now() - ex.startTime;
    const frameIndex = Math.min( 3, Math.floor( elapsed / ( EXPLOSION_DURATION / 4 ) ) );
    const frame = EXPLOSION_FRAMES[ ex.color ][ frameIndex ];
    drawFrame( ctx, frame, ex.x, ex.y, ex.w, ex.h );
  }
}

function draw() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
  const b = state.ball;
  drawSprite( ctx, 'ball', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2 );
  for ( const block of state.blocks ) {
    if ( !block.alive ) continue;
    drawSprite( ctx, `block_${ block.color }`, block.x, block.y, block.w, block.h );
  }
  drawExplosions();
  drawHUD();

  if ( state.screen === 'gameover' ) {
    drawGameOverScreen();
  }
  if ( state.screen === 'victory' ) {
    drawVictoryScreen();
  }
}

function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px sans-serif';
  ctx.fillText( 'GAME OVER', canvas.width / 2, canvas.height / 2 - 30 );
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Presiona Enter o Espacio para reiniciar', canvas.width / 2, canvas.height / 2 + 20 );
}

function drawVictoryScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px sans-serif';
  ctx.fillText( '¡VICTORIA!', canvas.width / 2, canvas.height / 2 - 30 );
  ctx.font = '20px sans-serif';
  ctx.fillText( 'Presiona Enter o Espacio para reiniciar', canvas.width / 2, canvas.height / 2 + 20 );
}

function drawHUD() {
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 6;

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText( `PUNTAJE ${ state.score }`, 10, 10 );

  ctx.fillStyle = '#ff3b3b';
  ctx.textAlign = 'right';
  ctx.fillText( `VIDAS ${ state.lives }`, canvas.width - 10, 10 );

  ctx.shadowBlur = 0;
}

function loop() {
  if ( state.screen === 'playing' ) {
    updatePaddle();
    updateBall();
    updateExplosions();
  }
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
