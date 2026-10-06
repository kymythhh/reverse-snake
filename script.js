/**
 * 1. Base Class: GameObject
 * Demonstrates Abstraction & Inheritance.
 */
class GameObject {
  constructor(x, y, gridLimit) {
    this.x = x;
    this.y = y;
    this.gridLimit = gridLimit;
  }

  // Polymorphic interface to be overridden by child entities
  render(ctx, tileSize) {
    throw new Error("render() must be implemented by child classes");
  }
}

/**
 * 2. Child Class: Snake (Player 1)
 * Encapsulates segment data, directional physics, self-collision stun, and growth.
 */
class Snake extends GameObject {
  constructor(x, y, gridLimit, initialDirection = { x: 1, y: 0 }) {
    super(x, y, gridLimit);
    this.dir = initialDirection;
    this.nextDir = initialDirection;
    // Build initial 3 segments trailing behind the movement vector
    this.segments = [
      { x: x, y: y },
      { x: (x - this.dir.x + gridLimit) % gridLimit, y: (y - this.dir.y + gridLimit) % gridLimit },
      { x: (x - this.dir.x * 2 + gridLimit) % gridLimit, y: (y - this.dir.y * 2 + gridLimit) % gridLimit }
    ];
    this.stunTicks = 0;
    this.score = 0;
  }

  setDirection(direction) {
    // Prevent immediate 180-degree reversal into own neck
    if (this.dir.x + direction.x !== 0 || this.dir.y + direction.y !== 0) {
      this.nextDir = direction;
    }
  }

  update() {
    if (this.stunTicks > 0) {
      this.stunTicks--;
      return false; // Stunned; skip step
    }

    this.dir = { ...this.nextDir };
    const head = {
      x: (this.segments[0].x + this.dir.x + this.gridLimit) % this.gridLimit,
      y: (this.segments[0].y + this.dir.y + this.gridLimit) % this.gridLimit
    };

    // Self-collision detection: triggers temporary freeze penalty
    const hitSelf = this.segments.slice(1).some(seg => seg.x === head.x && seg.y === head.y);
    if (hitSelf) {
      this.stunTicks = 12; // ~1.2s stun
      return false;
    }

    this.segments.unshift(head);
    this.x = head.x;
    this.y = head.y;
    return true;
  }

  // Helper method: checks if any segment (head or body) occupies coordinates (x, y)
  occupies(x, y) {
    return this.segments.some(seg => seg.x === x && seg.y === y);
  }

  grow() {
    this.score += 50;
    // Tail segment is left intact, causing the snake to grow
  }

  shrinkAndStun() {
    this.score = Math.max(0, this.score - 10);
    this.stunTicks = 15; // ~1.5s stun
    if (this.segments.length > 3) {
      this.segments.splice(Math.max(3, this.segments.length - 3));
    }
  }

  popTail() {
    this.segments.pop();
  }

  render(ctx, tileSize) {
    this.segments.forEach((seg, i) => {
      if (i === 0) {
        ctx.fillStyle = this.stunTicks > 0 ? "#90e0ef" : "#00b4d8"; // Paler cyan when stunned
      } else {
        ctx.fillStyle = "#0077b6";
      }
      ctx.fillRect(seg.x * tileSize + 1, seg.y * tileSize + 1, tileSize - 2, tileSize - 2);
    });
  }
}

/**
 * 3. Child Class: Fruit (Player 2)
 * Encapsulates movement, respawn coordinates, invulnerability, and trap resource storage.
 */
class Fruit extends GameObject {
  constructor(x, y, gridLimit) {
    super(x, y, gridLimit);
    this.dir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    this.score = 0;
    this.trapsAvailable = 0;
    this.invulnerableTicks = 0;
  }

  setDirection(direction) {
    this.nextDir = direction;
  }

  update() {
    this.dir = { ...this.nextDir };
    this.x = (this.x + this.dir.x + this.gridLimit) % this.gridLimit;
    this.y = (this.y + this.dir.y + this.gridLimit) % this.gridLimit;

    if (this.invulnerableTicks > 0) {
      this.invulnerableTicks--;
    }
  }

  respawn(forbiddenCheck = () => false) {
    let candidate;
    let attempts = 0;
    do {
      candidate = {
        x: Math.floor(Math.random() * this.gridLimit),
        y: Math.floor(Math.random() * this.gridLimit)
      };
      attempts++;
    } while (forbiddenCheck(candidate.x, candidate.y) && attempts < 100);

    this.x = candidate.x;
    this.y = candidate.y;
    this.invulnerableTicks = 15; // ~1.5s invulnerability shield
  }

  collectSeed() {
    this.score += 10;
    this.trapsAvailable++;
  }

  createTrap() {
    if (this.trapsAvailable <= 0) return null;
    this.trapsAvailable--;
    return new Trap(this.x, this.y, this.gridLimit, 150); // Active for 150 ticks (~15 seconds)
  }

  render(ctx, tileSize) {
    // Blinking effect during invulnerability
    if (this.invulnerableTicks % 4 >= 2) return;

    // Body
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.arc(
      this.x * tileSize + tileSize / 2,
      this.y * tileSize + tileSize / 2,
      tileSize / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Stem
    ctx.fillStyle = "#2a9d8f";
    ctx.fillRect(this.x * tileSize + tileSize / 2 - 2, this.y * tileSize + 1, 4, 4);
  }
}

/**
 * 4. Child Class: Seed
 * Neutral collectible items that reward the Fruit player.
 */
class Seed extends GameObject {
  constructor(x, y, gridLimit) {
    super(x, y, gridLimit);
  }

  render(ctx, tileSize) {
    ctx.fillStyle = "#ffb703";
    ctx.beginPath();
    ctx.arc(
      this.x * tileSize + tileSize / 2,
      this.y * tileSize + tileSize / 2,
      tileSize / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

/**
 * 5. Child Class: Trap
 * Defensive hazards dropped by the Fruit player.
 */
class Trap extends GameObject {
  constructor(x, y, gridLimit, duration = 150) {
    super(x, y, gridLimit);
    this.duration = duration;
  }

  update() {
    this.duration--;
    return this.duration > 0;
  }

  render(ctx, tileSize) {
    ctx.fillStyle = "#8338ec";
    ctx.fillRect(this.x * tileSize + 4, this.y * tileSize + 4, tileSize - 8, tileSize - 8);
  }
}

/**
 * 6. Orchestrator Class: GameManager
 * Encapsulates setup, game loop execution, event listening, and collision dispatching.
 */
class GameManager {
  constructor(canvas, uiElements) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = uiElements;

    this.tileSize = 20;
    this.gridLimit = this.canvas.width / this.tileSize;

    this.snake = null;
    this.fruit = null;
    this.seeds = [];
    this.traps = [];

    this.timeLeft = 60;
    this.isRunning = false;
    this.gameInterval = null;
    this.timerInterval = null;
    this.passivePointInterval = null;

    this.init();
    this.bindEvents();
  }

  init() {
    this.stopLoops();
    this.isRunning = false;
    this.ui.banner.style.display = "none";
    this.timeLeft = parseInt(this.ui.roundDurationInput.value, 10);
    this.ui.timerDisplay.textContent = this.timeLeft;

    // 1. Randomized Spawn for Snake
    const snakeHead = {
      x: Math.floor(Math.random() * (this.gridLimit - 6)) + 3,
      y: Math.floor(Math.random() * (this.gridLimit - 6)) + 3
    };
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    const randomSnakeDir = directions[Math.floor(Math.random() * directions.length)];
    this.snake = new Snake(snakeHead.x, snakeHead.y, this.gridLimit, randomSnakeDir);

    // 2. Randomized Spawn for Fruit (ensures safe distance from Snake)
    let fruitSpawn;
    let attempts = 0;
    do {
      fruitSpawn = {
        x: Math.floor(Math.random() * this.gridLimit),
        y: Math.floor(Math.random() * this.gridLimit)
      };
      const distance = Math.hypot(fruitSpawn.x - snakeHead.x, fruitSpawn.y - snakeHead.y);
      attempts++;
      if (distance >= 5 && !this.snake.occupies(fruitSpawn.x, fruitSpawn.y)) {
        break;
      }
    } while (attempts < 100);

    this.fruit = new Fruit(fruitSpawn.x, fruitSpawn.y, this.gridLimit);

    this.traps = [];
    this.seeds = [];
    this.spawnSeeds(3);

    this.updateHUD();
    this.render();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.ui.banner.style.display = "none";

    // Main Engine Tick: 100ms
    this.gameInterval = setInterval(() => this.gameStep(), 100);

    // Countdown Timer
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.ui.timerDisplay.textContent = this.timeLeft;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    // Passive Fruit Survival Bonus (+1 pt/sec)
    this.passivePointInterval = setInterval(() => {
      this.fruit.score += 1;
      this.updateHUD();
    }, 1000);
  }

  stopLoops() {
    clearInterval(this.gameInterval);
    clearInterval(this.timerInterval);
    clearInterval(this.passivePointInterval);
  }

  endGame() {
    this.stopLoops();
    this.isRunning = false;

    let resultMsg = "";
    if (this.fruit.score > this.snake.score) {
      resultMsg = `🏆 Fruit Wins! (${this.fruit.score} vs ${this.snake.score})`;
    } else if (this.snake.score > this.fruit.score) {
      resultMsg = `🏆 Snake Wins! (${this.snake.score} vs ${this.fruit.score})`;
    } else {
      resultMsg = `🤝 It's a Tie! (${this.snake.score} - ${this.fruit.score})`;
    }

    this.ui.banner.innerHTML = `${resultMsg}<br><br><small style="font-size: 0.9rem; color: #bbb;">Click Reset to start a new match</small>`;
    this.ui.banner.style.display = "block";
  }

  spawnSeeds(targetCount) {
    while (this.seeds.length < targetCount) {
      const candidate = {
        x: Math.floor(Math.random() * this.gridLimit),
        y: Math.floor(Math.random() * this.gridLimit)
      };

      const collidesWithSnake = this.snake.occupies(candidate.x, candidate.y);
      const collidesWithFruit = this.fruit.x === candidate.x && this.fruit.y === candidate.y;
      const collidesWithTraps = this.traps.some(t => t.x === candidate.x && t.y === candidate.y);

      if (!collidesWithSnake && !collidesWithFruit && !collidesWithTraps) {
        this.seeds.push(new Seed(candidate.x, candidate.y, this.gridLimit));
      }
    }
  }

  gameStep() {
    // 1. Move Fruit
    this.fruit.update();

    // 2. Fruit/Seed Collision
    const seedIndex = this.seeds.findIndex(s => s.x === this.fruit.x && s.y === this.fruit.y);
    if (seedIndex !== -1) {
      this.seeds.splice(seedIndex, 1);
      this.fruit.collectSeed();
      this.spawnSeeds(3);
    }

    // 3. Move Snake
    const moved = this.snake.update();

    // 4. Full Collision Check: Head or any Body Segment hitting the Fruit
    let caughtFruit = false;
    if (this.fruit.invulnerableTicks === 0 && this.snake.occupies(this.fruit.x, this.fruit.y)) {
      this.snake.grow();
      this.fruit.respawn((rx, ry) => this.snake.occupies(rx, ry));
      caughtFruit = true;
    }

    // If snake moved and did NOT grow from eating the fruit, remove tail segment
    if (moved && !caughtFruit) {
      this.snake.popTail();
    }

    // 5. Trap Collision: Snake Head hits a Fruit's trap
    if (moved) {
      const trapHitIndex = this.traps.findIndex(t => t.x === this.snake.x && t.y === this.snake.y);
      if (trapHitIndex !== -1) {
        this.traps.splice(trapHitIndex, 1);
        this.fruit.score += 20;
        this.snake.shrinkAndStun();
      }
    }

    // 6. Update Traps (filter out expired instances)
    this.traps = this.traps.filter(trap => trap.update());

    this.updateHUD();
    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Canvas Background Grid
    this.ctx.strokeStyle = "#1b1b22";
    for (let i = 0; i < this.canvas.width; i += this.tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }

    // Polymorphic batch render: invokes each object's render() implementation
    this.seeds.forEach(seed => seed.render(this.ctx, this.tileSize));
    this.traps.forEach(trap => trap.render(this.ctx, this.tileSize));
    this.snake.render(this.ctx, this.tileSize);
    this.fruit.render(this.ctx, this.tileSize);
  }

  updateHUD() {
    this.ui.snakeScore.textContent = this.snake.score;
    this.ui.fruitScore.textContent = this.fruit.score;
    this.ui.trapCharges.textContent = this.fruit.trapsAvailable;
  }

  handleKeyDown(e) {
    const key = e.key.toLowerCase();

    // Player 1 (Snake): W, A, S, D
    if (key === "w") this.snake.setDirection({ x: 0, y: -1 });
    if (key === "s") this.snake.setDirection({ x: 0, y: 1 });
    if (key === "a") this.snake.setDirection({ x: -1, y: 0 });
    if (key === "d") this.snake.setDirection({ x: 1, y: 0 });

    // Player 2 (Fruit): Arrow Keys
    if (e.key === "ArrowUp") this.fruit.setDirection({ x: 0, y: -1 });
    if (e.key === "ArrowDown") this.fruit.setDirection({ x: 0, y: 1 });
    if (e.key === "ArrowLeft") this.fruit.setDirection({ x: -1, y: 0 });
    if (e.key === "ArrowRight") this.fruit.setDirection({ x: 1, y: 0 });

    // Player 2 Action: Drop Trap
    if (e.key === "Shift" || e.key === "Enter") {
      const newTrap = this.fruit.createTrap();
      if (newTrap) {
        this.traps.push(newTrap);
        this.updateHUD();
      }
    }
  }

  bindEvents() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    this.ui.startBtn.addEventListener("click", () => this.start());
    this.ui.resetBtn.addEventListener("click", () => this.init());
  }
}

// Initialization Entry Point
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const uiElements = {
    snakeScore: document.getElementById("snakeScore"),
    fruitScore: document.getElementById("fruitScore"),
    trapCharges: document.getElementById("trapCharges"),
    timerDisplay: document.getElementById("timerDisplay"),
    roundDurationInput: document.getElementById("roundDuration"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    banner: document.getElementById("banner")
  };

  new GameManager(canvas, uiElements);
});