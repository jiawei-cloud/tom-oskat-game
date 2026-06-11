// 小游戏「接食物」:canvas + 触摸拖动

import * as state from './state.js';
import * as scenes from './scenes.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

const FOOD_EMOJIS = ['🍎', '🐟', '🧁', '🥛', '🍗', '🍌'];
const BOMB = '💣';

let canvas, ctx, overlay, overlayTitle, overlayText, startBtn, scoreEl, livesEl;
let W = 0, H = 0;
let running = false;
let rafId = 0;
let basketX = 0;
let items = [];
let score = 0;
let lives = 3;
let speed = 130;       // 像素/秒
let spawnGap = 1100;   // 毫秒
let lastSpawn = 0;
let lastTime = 0;

export function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  overlay = document.getElementById('game-overlay');
  overlayTitle = document.getElementById('game-overlay-title');
  overlayText = document.getElementById('game-overlay-text');
  startBtn = document.getElementById('btn-game-start');
  scoreEl = document.getElementById('game-score');
  livesEl = document.getElementById('game-lives');

  startBtn.addEventListener('click', start);

  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', onPointer);

  scenes.registerHooks('game', {
    enter: resize,
    exit: stop,
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  window.addEventListener('resize', () => {
    if (scenes.currentScene() === 'game') resize();
  });
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = rect.width;
  H = rect.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  basketX = W / 2;
  draw();
}

function onPointer(e) {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  basketX = Math.max(30, Math.min(W - 30, e.clientX - rect.left));
}

function start() {
  resize();
  score = 0;
  lives = 3;
  speed = 130;
  spawnGap = 1100;
  items = [];
  lastSpawn = 0;
  lastTime = performance.now();
  running = true;
  overlay.classList.add('hidden');
  updateHud();
  rafId = requestAnimationFrame(loop);
}

function stop() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(rafId);
  // 中途退出按已得分结算
  if (score > 0) reward();
  showStart();
}

function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // 生成新物品
  if (now - lastSpawn > spawnGap) {
    lastSpawn = now;
    const isBomb = Math.random() < 0.16;
    items.push({
      x: 28 + Math.random() * (W - 56),
      y: -24,
      char: isBomb ? BOMB : FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)],
      bomb: isBomb,
    });
  }

  const basketY = H - 46;
  for (const it of items) {
    it.y += speed * dt;
    if (!it.done && it.y > basketY - 26 && it.y < basketY + 20 && Math.abs(it.x - basketX) < 38) {
      it.done = true;
      if (it.bomb) {
        lives -= 1;
        sfx.fail();
      } else {
        score += 1;
        sfx.coin();
        // 难度递增
        speed += 4;
        spawnGap = Math.max(450, spawnGap - 12);
      }
    }
    if (!it.done && !it.bomb && it.y > H + 20) {
      it.done = true;
      lives -= 1;
      sfx.pop();
    }
  }
  items = items.filter((it) => !it.done && it.y < H + 40);

  updateHud();
  draw();

  if (lives <= 0) {
    gameOver();
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function updateHud() {
  scoreEl.textContent = '得分: ' + score;
  livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '30px sans-serif';
  for (const it of items) {
    ctx.fillText(it.char, it.x, it.y);
  }

  ctx.font = '52px sans-serif';
  ctx.fillText('🧺', basketX, H - 40);
}

function gameOver() {
  running = false;
  cancelAnimationFrame(rafId);
  const coins = reward();
  overlayTitle.textContent = '游戏结束!';
  overlayText.innerHTML = `得分 <b>${score}</b> 分<br>奖励 🪙 ${coins} 金币 + ⭐️ ${score * 2} 经验`;
  startBtn.textContent = '再玩一次';
  overlay.classList.remove('hidden');
}

function reward() {
  const coins = score;
  if (coins > 0) {
    state.addCoins(coins);
    state.addXp(score * 2);
    state.changeStat('mood', 10);
    toast(`小游戏奖励:🪙 +${coins}`);
  }
  const r = coins;
  score = 0;
  return r;
}

function showStart() {
  overlayTitle.textContent = '🍎 接食物';
  overlayText.innerHTML = '左右拖动篮子,接住掉落的食物!<br>小心炸弹💣,漏接 3 次游戏结束。';
  startBtn.textContent = '开始游戏';
  overlay.classList.remove('hidden');
}
