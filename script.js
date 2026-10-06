const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const snakeScoreEl = document.getElementById("snakeScore");
const fruitScoreEl = document.getElementById("fruitScore");
const trapChargesEl = document.getElementById("trapCharges");
const timerDisplayEl = document.getElementById("timerDisplay");
const roundDurationInput = document.getElementById("roundDuration");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const banner = document.getElementById("banner");

const GRID_SIZE = 20;
const TILES = canvas.width / GRID_SIZE;

// Game State
let snake = [];
let snakeDir = { x: 0, y: 0 };
let snakeNextDir = { x: 0, y: 0 };
let snakeScore = 0;
let snakeStunTicks = 0;

let fruit = { x: 0, y: 0 };
let fruitDir = { x: 0, y: 0 };
let fruitNextDir = { x: 0, y: 0 };
let fruitScore = 0;
let fruitTraps = 0;
let fruitInvulnerableTicks = 0;

let seeds = [];
let traps = [];

let timeLeft = 60;
let gameInterval = null;
let timerInterval = null;
let passivePointInterval = null;
let isRunning = false;

function initGame() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  clearInterval(passivePointInterval);

  isRunning = false;
  banner.style.display = "none";
  timeLeft = parseInt(roundDurationInput.value, 10);
  timerDisplayEl.textContent = timeLeft;

  // Reset Snake (Player 1) at Top-Left
  snake = [
    { x: 4, y: 4 },
    { x: 3, y: 4 },
    { x: 2, y: 4 },
  ];
  snakeDir = { x: 1, y: 0 };
  snakeNextDir = { x: 1, y: 0 };
  snakeScore = 0;
  snakeStunTicks = 0;

  // Reset Fruit (Player 2) at Bottom-Right
  fruit = { x: TILES - 5, y: TILES - 5 };
  fruitDir = { x: 0, y: 0 };
  fruitNextDir = { x: 0, y: 0 };
  fruitScore = 0;
  fruitTraps = 0;
  fruitInvulnerableTicks = 0;

  traps = [];
  seeds = [];
  spawnSeeds(3);

  updateHud();
  draw();
}

function startGame() {
  if (isRunning) return;
  isRunning = true;
  banner.style.display = "none";

  // Game step: 100ms per tick
  gameInterval = setInterval(gameStep, 100);

  // Countdown timer
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplayEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  // Passive survival points for the Fruit: +1 point every second
  passivePointInterval = setInterval(() => {
    fruitScore += 1;
    updateHud();
  }, 1000);
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  clearInterval(passivePointInterval);
  isRunning = false;

  let outcome = "";
  if (fruitScore > snakeScore) {
    outcome = `🏆 Fruit Wins! (${fruitScore} vs ${snakeScore})`;
  } else if (snakeScore > fruitScore) {
    outcome = `🏆 Snake Wins! (${snakeScore} vs ${fruitScore})`;
  } else {
    outcome = `🤝 It's a Tie! (${snakeScore} - ${fruitScore})`;
  }

  banner.innerHTML = `${outcome}<br><br><small style="font-size: 0.9rem; color: #bbb;">Click Reset or change settings to play again</small>`;
  banner.style.display = "block";
}

function spawnSeeds(targetCount) {
  while (seeds.length < targetCount) {
    const candidate = {
      x: Math.floor(Math.random() * TILES),
      y: Math.floor(Math.random() * TILES),
    };
    const collidesWithSnake = snake.some(s => s.x === candidate.x && s.y === candidate.y);
    const collidesWithFruit = fruit.x === candidate.x && fruit.y === candidate.y;
    const collidesWithTraps = traps.some(t => t.x === candidate.x && t.y === candidate.y);

    if (!collidesWithSnake && !collidesWithFruit && !collidesWithTraps) {
      seeds.push(candidate);
    }
  }
}

function placeTrap() {
  if (fruitTraps <= 0) return;
  fruitTraps--;
  traps.push({ x: fruit.x, y: fruit.y, duration: 150 }); // persists ~15 seconds
  updateHud();
}

function gameStep() {
  // 1. Process Snake Movement (if not stunned)
  if (snakeStunTicks > 0) {
    snakeStunTicks--;
  } else {
    snakeDir = { ...snakeNextDir };
    const head = {
      x: (snake[0].x + snakeDir.x + TILES) % TILES,
      y: (snake[0].y + snakeDir.y + TILES) % TILES,
    };

    // Snake self-collision -> Stun penalty
    const selfHit = snake.slice(1).some(seg => seg.x === head.x && seg.y === head.y);
    if (selfHit) {
      snakeStunTicks = 12; // ~1.2s freeze
    } else {
      snake.unshift(head);

      // Check if Snake hits Fruit
      if (head.x === fruit.x && head.y === fruit.y && fruitInvulnerableTicks === 0) {
        snakeScore += 50;
        // Grow snake: keep tail, relocate fruit
        fruit = {
          x: Math.floor(Math.random() * TILES),
          y: Math.floor(Math.random() * TILES),
        };
        fruitInvulnerableTicks = 15; // 1.5s invulnerability
      } else {
        snake.pop(); // regular movement trims tail
      }

      // Check if Snake hits a Trap
      const trapHitIndex = traps.findIndex(t => t.x === head.x && t.y === head.y);
      if (trapHitIndex !== -1) {
        traps.splice(trapHitIndex, 1);
        fruitScore += 20;
        snakeScore = Math.max(0, snakeScore - 10);
        snakeStunTicks = 15; // Stun snake
        // Cut snake down to a minimum of 3 segments
        if (snake.length > 3) {
          snake.splice(Math.max(3, snake.length - 3));
        }
      }
    }
  }

  // 2. Process Fruit Movement
  fruitDir = { ...fruitNextDir };
  fruit.x = (fruit.x + fruitDir.x + TILES) % TILES;
  fruit.y = (fruit.y + fruitDir.y + TILES) % TILES;

  if (fruitInvulnerableTicks > 0) fruitInvulnerableTicks--;

  // Fruit collects Seeds
  const seedIndex = seeds.findIndex(s => s.x === fruit.x && s.y === fruit.y);
  if (seedIndex !== -1) {
    seeds.splice(seedIndex, 1);
    fruitScore += 10;
    fruitTraps++;
    spawnSeeds(3);
  }

  // 3. Update trap durations
  for (let i = traps.length - 1; i >= 0; i--) {
    traps[i].duration--;
    if (traps[i].duration <= 0) {
      traps.splice(i, 1);
    }
  }

  updateHud();
  draw();
}

function updateHud() {
  snakeScoreEl.textContent = snakeScore;
  fruitScoreEl.textContent = fruitScore;
  trapChargesEl.textContent = fruitTraps;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Grid Guide
  ctx.strokeStyle = "#1b1b22";
  for (let i = 0; i < canvas.width; i += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Draw Seeds (Yellow Pellets)
  seeds.forEach(seed => {
    ctx.fillStyle = "#ffb703";
    ctx.beginPath();
    ctx.arc(seed.x * GRID_SIZE + GRID_SIZE / 2, seed.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Traps (Spikes/Webs)
  traps.forEach(trap => {
    ctx.fillStyle = "#8338ec";
    ctx.fillRect(trap.x * GRID_SIZE + 4, trap.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);
  });

  // Draw Snake (Cyan to Deep Blue body)
  snake.forEach((seg, i) => {
    if (i === 0) {
      ctx.fillStyle = snakeStunTicks > 0 ? "#90e0ef" : "#00b4d8"; // Pale if stunned
    } else {
      ctx.fillStyle = "#0077b6";
    }
    ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
  });

  // Draw Fruit (Red, pulses when invulnerable)
  if (fruitInvulnerableTicks % 4 < 2) {
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.arc(fruit.x * GRID_SIZE + GRID_SIZE / 2, fruit.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.fillStyle = "#2a9d8f";
    ctx.fillRect(fruit.x * GRID_SIZE + GRID_SIZE / 2 - 2, fruit.y * GRID_SIZE + 1, 4, 4);
  }
}

// Input Listener
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  // Player 1: Snake (W, A, S, D)
  if (key === "w" && snakeDir.y === 0) snakeNextDir = { x: 0, y: -1 };
  if (key === "s" && snakeDir.y === 0) snakeNextDir = { x: 0, y: 1 };
  if (key === "a" && snakeDir.x === 0) snakeNextDir = { x: -1, y: 0 };
  if (key === "d" && snakeDir.x === 0) snakeNextDir = { x: 1, y: 0 };

  // Player 2: Fruit (Arrows)
  if (e.key === "ArrowUp") fruitNextDir = { x: 0, y: -1 };
  if (e.key === "ArrowDown") fruitNextDir = { x: 0, y: 1 };
  if (e.key === "ArrowLeft") fruitNextDir = { x: -1, y: 0 };
  if (e.key === "ArrowRight") fruitNextDir = { x: 1, y: 0 };

  // Player 2 Action: Place Trap
  if (e.key === "Shift" || e.key === "Enter") {
    placeTrap();
  }
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", initGame);

initGame();