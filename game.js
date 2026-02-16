// Initialize kaboom (provided globally by script tag in index.html)
kaboom({
  global: true,
  // No width/height specified = fullscreen
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

// Calculate text size based on screen height (responsive)
function getTextSize() {
  return Math.max(24, height() * 0.04);
}

const scoreLabel = add([
  text("Score: 0", { size: getTextSize() }),
  pos(32, 24),
  color(255, 255, 255),
  fixed(),
]);

let levelLabel = add([
  text("Level: 1", { size: getTextSize() }),
  pos(32, 60),
  color(255, 255, 255),
  fixed(),
]);

let gameOverLabel = null;
let isGameOver = false;
let restartListener = null;
let gameOverTabOpened = false; // Prevent multiple tab opens

function showGameOver() {
  if (gameOverLabel) return;

  gameOverLabel = add([
    text("Game Over\nPress Tab or any key to continue", {
      size: Math.max(32, height() * 0.06),
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
// Uses functions to calculate positions based on screen size for fullscreen support
function getLevels() {
  const w = width();
  const h = height();
  const groundY = h - 20;
  const platformHeight = 24;
  
  return [
    {
      start: vec2(80, 0),
      platforms: [
        // ground
        { pos: vec2(0, groundY), size: vec2(w, 40) },
        // floating platforms
        { pos: vec2(w * 0.125, groundY - 100), size: vec2(w * 0.167, platformHeight) },
        { pos: vec2(w * 0.375, groundY - 160), size: vec2(w * 0.188, platformHeight) },
        { pos: vec2(w * 0.667, groundY - 200), size: vec2(w * 0.167, platformHeight) },
        { pos: vec2(w * 0.271, groundY - 240), size: vec2(w * 0.146, platformHeight) },
        { pos: vec2(w * 0.542, groundY - 280), size: vec2(w * 0.167, platformHeight) },
      ],
      coins: [
        vec2(w * 0.177, groundY - 140),
        vec2(w * 0.219, groundY - 140),
        vec2(w * 0.417, groundY - 200),
        vec2(w * 0.458, groundY - 200),
        vec2(w * 0.708, groundY - 240),
        vec2(w * 0.750, groundY - 240),
        vec2(w * 0.313, groundY - 280),
        vec2(w * 0.563, groundY - 320),
        vec2(w * 0.604, groundY - 320),
      ],
      enemies: [
        { pos: vec2(w * 0.375, groundY - 200), range: w * 0.083, speed: 80 },
        { pos: vec2(w * 0.667, groundY - 240), range: w * 0.083, speed: 80 },
        { pos: vec2(w * 0.271, groundY - 280), range: w * 0.083, speed: 80 },
      ],
    },
    {
      // Level 2: different layout, more coins / enemies
      start: vec2(80, 0),
      platforms: [
        { pos: vec2(0, groundY), size: vec2(w, 40) },
        { pos: vec2(w * 0.146, groundY - 90), size: vec2(w * 0.125, platformHeight) },
        { pos: vec2(w * 0.354, groundY - 140), size: vec2(w * 0.146, platformHeight) },
        { pos: vec2(w * 0.604, groundY - 190), size: vec2(w * 0.188, platformHeight) },
        { pos: vec2(w * 0.792, groundY - 240), size: vec2(w * 0.125, platformHeight) },
        { pos: vec2(w * 0.271, groundY - 260), size: vec2(w * 0.125, platformHeight) },
        { pos: vec2(w * 0.458, groundY - 310), size: vec2(w * 0.146, platformHeight) },
      ],
      coins: [
        vec2(w * 0.167, groundY - 130),
        vec2(w * 0.208, groundY - 130),
        vec2(w * 0.375, groundY - 180),
        vec2(w * 0.417, groundY - 180),
        vec2(w * 0.646, groundY - 230),
        vec2(w * 0.688, groundY - 230),
        vec2(w * 0.813, groundY - 280),
        vec2(w * 0.313, groundY - 300),
        vec2(w * 0.479, groundY - 350),
        vec2(w * 0.521, groundY - 350),
      ],
      enemies: [
        { pos: vec2(w * 0.354, groundY - 180), range: w * 0.104, speed: 90 },
        { pos: vec2(w * 0.604, groundY - 230), range: w * 0.104, speed: 100 },
        { pos: vec2(w * 0.792, groundY - 280), range: w * 0.063, speed: 110 },
      ],
    },
  ];
}

let levels = [];

let currentLevel = 0;
let playerStart = vec2(80, 0);
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

    // Check if all coins collected - use a small delay to ensure coin is destroyed
    wait(0.1, () => {
      if (isGameOver) return;
      const remainingCoins = get("coin").length;
      if (remainingCoins === 0) {
        // Move to next level (2 levels total: 0 and 1)
        const nextLevel = currentLevel + 1;
        if (nextLevel < levels.length) {
          startLevel(nextLevel);
        } else {
          // All levels completed - restart from level 0
          startLevel(0);
        }
      }
    });
  });

  // Hit enemy: game over
  obj.onCollide("enemy", () => {
    triggerGameOver();
  });

  // Fall off: game over
  obj.onUpdate(() => {
    if (!isGameOver && obj.pos.y > height() + 100) {
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
  // Update levels based on current screen size
  levels = getLevels();
  currentLevel = index;
  const def = levels[index];
  
  // Update level indicator
  levelLabel.text = `Level: ${index + 1}`;
  
  // Reset game over tab flag when starting a new level
  gameOverTabOpened = false;

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
  
  // Immediately open game over page in a new tab (only once)
  if (!gameOverTabOpened && typeof window !== "undefined" && window.location) {
    gameOverTabOpened = true;
    const gameOverUrl = new URL("gameover.html", window.location.href).href;
    window.open(gameOverUrl, "_blank");
  }
}

// Start the first level
startLevel(0);

