// Initialize kaboom (provided globally by script tag in index.html)
kaboom({
  global: true,
  width: 960,
  height: 540,
  canvas: null,
  root: document.querySelector("#game"),
  background: [0, 0, 140], // deep blue
});

const MOVE_SPEED = 260;
const JUMP_FORCE = 550;
const GRAVITY = 1600;

setGravity(GRAVITY);

// ----- UI: score + game over -----

let score = 0;

const scoreLabel = add([
  text("Score: 0", { size: 28 }),
  pos(32, 24),
  color(255, 255, 255),
  fixed(),
]);

let gameOverLabel = null;
let isGameOver = false;
let restartListener = null;

function showGameOver() {
  if (gameOverLabel) return;

  gameOverLabel = add([
    text("Game Over\nPress any key (Space / Tab) to restart", {
      size: 32,
      align: "center",
    }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(255, 255, 255),
    outline(4, rgb(0, 0, 0)),
    fixed(),
  ]);
}

function hideGameOver() {
  if (gameOverLabel) {
    destroy(gameOverLabel);
    gameOverLabel = null;
  }
}

// Level definitions (platforms, coins, enemies, player start)
const levels = [
  {
    start: vec2(80, 0),
    platforms: [
      // ground
      { pos: vec2(0, 520), size: vec2(960, 40) },
      // floating platforms
      { pos: vec2(120, 420), size: vec2(160, 24) },
      { pos: vec2(360, 360), size: vec2(180, 24) },
      { pos: vec2(640, 320), size: vec2(160, 24) },
      { pos: vec2(260, 280), size: vec2(140, 24) },
      { pos: vec2(520, 240), size: vec2(160, 24) },
    ],
    coins: [
      vec2(170, 380),
      vec2(210, 380),
      vec2(400, 320),
      vec2(440, 320),
      vec2(680, 280),
      vec2(720, 280),
      vec2(300, 240),
      vec2(540, 200),
      vec2(580, 200),
    ],
    enemies: [
      { pos: vec2(360, 320), range: 80, speed: 80 },
      { pos: vec2(640, 280), range: 80, speed: 80 },
      { pos: vec2(260, 240), range: 80, speed: 80 },
    ],
  },
  {
    // Level 2: different layout, more coins / enemies
    start: vec2(80, 0),
    platforms: [
      { pos: vec2(0, 520), size: vec2(960, 40) },
      { pos: vec2(140, 430), size: vec2(120, 24) },
      { pos: vec2(340, 380), size: vec2(140, 24) },
      { pos: vec2(580, 330), size: vec2(180, 24) },
      { pos: vec2(760, 280), size: vec2(120, 24) },
      { pos: vec2(260, 260), size: vec2(120, 24) },
      { pos: vec2(440, 210), size: vec2(140, 24) },
    ],
    coins: [
      vec2(160, 390),
      vec2(200, 390),
      vec2(360, 340),
      vec2(400, 340),
      vec2(620, 290),
      vec2(660, 290),
      vec2(780, 240),
      vec2(300, 220),
      vec2(460, 170),
      vec2(500, 170),
    ],
    enemies: [
      { pos: vec2(340, 340), range: 100, speed: 90 },
      { pos: vec2(580, 290), range: 100, speed: 100 },
      { pos: vec2(760, 240), range: 60, speed: 110 },
    ],
  },
];

let currentLevel = 0;
let playerStart = levels[0].start.clone();
let player = null;

// ---- helpers to spawn things ----

function spawnPlatform(p) {
  add([
    rect(p.size.x, p.size.y),
    pos(p.pos),
    area(),
    body({ isStatic: true }),
    color(0, 255, 0),
    outline(2, rgb(0, 120, 0)),
    "platform",
  ]);
}

function spawnCoin(posVec) {
  return add([
    rect(14, 14),
    pos(posVec),
    area(),
    color(255, 220, 0),
    outline(2, rgb(140, 110, 0)),
    "coin",
  ]);
}

function spawnEnemy(def) {
  const startPos = def.pos;
  const enemy = add([
    rect(26, 26),
    pos(startPos),
    area(),
    body(),
    color(0, 200, 120),
    outline(3, rgb(0, 80, 40)),
    "enemy",
    {
      dir: 1,
      rangeLeft: startPos.x - def.range,
      rangeRight: startPos.x + def.range,
      moveSpeed: def.speed,
    },
  ]);

  enemy.onUpdate(() => {
    if (isGameOver) return;
    enemy.move(enemy.dir * enemy.moveSpeed, 0);
    if (enemy.pos.x < enemy.rangeLeft) {
      enemy.pos.x = enemy.rangeLeft;
      enemy.dir = 1;
    } else if (enemy.pos.x > enemy.rangeRight) {
      enemy.pos.x = enemy.rangeRight;
      enemy.dir = -1;
    }
  });
}

function createPlayer(startPos) {
  const obj = add([
    rect(32, 32),
    pos(startPos),
    area(),
    body({ jumpForce: JUMP_FORCE }),
    doubleJump(),
    color(255, 255, 255),
    outline(3, rgb(0, 0, 0)),
    anchor("center"),
  ]);

  // Movement
  onKeyDown("left", () => {
    if (isGameOver) return;
    obj.move(-MOVE_SPEED, 0);
  });
  onKeyDown("a", () => {
    if (isGameOver) return;
    obj.move(-MOVE_SPEED, 0);
  });
  onKeyDown("right", () => {
    if (isGameOver) return;
    obj.move(MOVE_SPEED, 0);
  });
  onKeyDown("d", () => {
    if (isGameOver) return;
    obj.move(MOVE_SPEED, 0);
  });

  // Jump (with double jump)
  function tryJump() {
    if (isGameOver) return;
    obj.doubleJump();
  }
  onKeyPress("space", tryJump);
  onKeyPress("up", tryJump);
  onKeyPress("w", tryJump);

  // Collect coins
  obj.onCollide("coin", (coin) => {
    if (isGameOver) return;
    destroy(coin);
    score += 1;
    scoreLabel.text = `Score: ${score}`;

    // If all coins for this level are gone, go to next level
    if (get("coin").length === 0) {
      // next level (wrap around to level 0 after last)
      const next = (currentLevel + 1) % levels.length;
      startLevel(next);
    }
  });

  // Hit enemy: game over
  obj.onCollide("enemy", () => {
    triggerGameOver();
  });

  // Fall off: game over
  obj.onUpdate(() => {
    if (!isGameOver && obj.pos.y > 800) {
      triggerGameOver();
    }
  });

  return obj;
}

function resetPlayerToStart() {
  player.pos = playerStart.clone();
  player.vel = vec2(0, 0);
}

function startLevel(index) {
  currentLevel = index;
  const def = levels[index];

  // Clear old level objects
  destroyAll("platform");
  destroyAll("coin");
  destroyAll("enemy");

  // Spawn level geometry
  def.platforms.forEach(spawnPlatform);
  def.coins.forEach(spawnCoin);
  def.enemies.forEach(spawnEnemy);

  // Reset player
  playerStart = def.start.clone();
  if (!player) {
    player = createPlayer(playerStart);
  } else {
    resetPlayerToStart();
  }

  // Reset game over state
  isGameOver = false;
  hideGameOver();
  if (restartListener) {
    restartListener.cancel();
    restartListener = null;
  }
}

function triggerGameOver() {
  if (isGameOver) return;
  isGameOver = true;
  shake(6);
  showGameOver();

  // Listen once for "any key" to restart current level
  if (restartListener) restartListener.cancel();
  restartListener = onKeyPress(() => {
    restartListener.cancel();
    restartListener = null;
    score = 0;
    scoreLabel.text = "Score: 0";
    startLevel(currentLevel);
  });
}

// Start the first level
startLevel(0);

