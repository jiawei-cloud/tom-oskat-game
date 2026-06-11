// 照料动作:喂食 / 洗澡 / 上厕所 / 睡觉 / 抚摸 / 戳

import * as state from './state.js';
import * as cat from './cat.js';
import * as scenes from './scenes.js';
import { sfx } from './audio.js';
import { toast, floatEmoji, speechBubble } from './ui.js';
import { FOODS } from './shop.js';

let busy = false; // 动作进行中(吃饭/洗澡)防止重入

export function init() {
  // 戳
  cat.handlers.onPoke = () => {
    cat.poke();
    sfx.meow();
    speechBubble(['喵!', '喵呜~', '干嘛戳我!', '嘿嘿~'][Math.floor(Math.random() * 4)]);
    state.changeStat('mood', 1);
    state.addXp(1);
  };

  // 抚摸
  cat.handlers.onPet = () => {
    floatEmoji('❤️', { x: 35 + Math.random() * 30, y: 25 + Math.random() * 20 });
    sfx.pop();
    state.changeStat('mood', 2);
    state.addXp(1);
  };

  // 单次打击:踉跄
  cat.handlers.onHit = () => {
    sfx.hit();
    const msgs = ['哎哟!', '你打我!', '痛痛痛!', '喵?!'];
    speechBubble(msgs[Math.floor(Math.random() * msgs.length)]);
    state.changeStat('mood', -5);
  };

  // 4连击:倒地
  cat.handlers.onKnockdown = () => {
    sfx.fail();
    speechBubble('x_x', 800);
    // 持续漂浮星星
    const starTimer = setInterval(() => {
      floatEmoji(['⭐', '💫', '✨'][Math.floor(Math.random() * 3)],
        { x: 30 + Math.random() * 40, y: 20 + Math.random() * 30, size: 20 + Math.random() * 12 });
    }, 450);
    state.changeStat('mood', -15);
    // 2.4s 后倒地结束,再 0.65s 爬起
    setTimeout(() => {
      clearInterval(starTimer);
      sfx.meow();
      speechBubble(['哼!', '好吧你赢了!', '喵~~~'][Math.floor(Math.random() * 3)]);
    }, 3200);
  };

  // 厨房食物托盘
  renderTray();
  state.onChange(renderTrayThrottled);

  // 浴室
  document.getElementById('btn-bath').addEventListener('click', bath);
  document.getElementById('btn-toilet').addEventListener('click', toilet);

  // 卧室
  document.getElementById('btn-lamp').addEventListener('click', toggleSleep);
  scenes.registerHooks('bedroom', { enter: syncBedroom });
  syncBedroom();

  // 升级庆祝
  state.onLevelUp((level) => {
    sfx.levelup();
    cat.jump();
    floatEmoji('🎉', { x: 30, y: 25 });
    floatEmoji('⭐️', { x: 60, y: 30 });
    toast(`🎉 升到 ${level} 级!奖励 ${level * 20} 金币!`);
  });
}

// ---------- 喂食 ----------

let trayTimer = null;
function renderTrayThrottled() {
  clearTimeout(trayTimer);
  trayTimer = setTimeout(renderTray, 100);
}

function renderTray() {
  const tray = document.getElementById('food-tray');
  const inv = state.get().inventory;
  tray.innerHTML = '';
  const ids = Object.keys(inv).filter((id) => FOODS[id] && inv[id] > 0);
  if (ids.length === 0) {
    tray.innerHTML = '<div class="tray-empty">没有食物了,去商店买一些吧 🛒</div>';
    return;
  }
  for (const id of ids) {
    const item = FOODS[id];
    const btn = document.createElement('button');
    btn.className = 'food-item';
    btn.type = 'button';
    btn.innerHTML = `<span class="food-emoji">${item.emoji}</span><span class="food-count">×${inv[id]}</span>`;
    btn.addEventListener('click', () => feed(id));
    tray.appendChild(btn);
  }
}

function feed(id) {
  if (busy) return;
  const s = state.get();
  if (s.isSleeping) { toast(`${s.catName}在睡觉,先去卧室开灯叫醒它吧`); return; }
  if (s.stats.hunger >= 98) {
    speechBubble('我吃饱啦~');
    sfx.meow();
    return;
  }
  const item = FOODS[id];
  if (!state.useItem(id)) return;

  busy = true;
  cat.setEating(true);
  sfx.eat();
  floatEmoji(item.emoji, { x: 48, y: 45, size: 30 });

  setTimeout(() => {
    cat.setEating(false);
    cat.smile();
    busy = false;
    state.changeStat('hunger', item.hunger || 0);
    if (item.energy) state.changeStat('energy', item.energy);
    state.changeStat('mood', (item.mood || 0) + 2);
    state.addXp(5);
    state.addCoins(1);
    speechBubble('真好吃!');
  }, 1500);
}

// ---------- 洗澡 / 上厕所 ----------

function bath() {
  if (busy) return;
  const s = state.get();
  if (s.isSleeping) { toast(`${s.catName}在睡觉呢`); return; }
  if (s.stats.hygiene >= 98) { speechBubble('我已经很干净啦~'); return; }

  busy = true;
  cat.setBathing(true);
  const bubbles = setInterval(() => {
    sfx.bubble();
    floatEmoji('🫧', { x: 25 + Math.random() * 50, y: 30 + Math.random() * 35, size: 20 + Math.random() * 16 });
  }, 350);

  setTimeout(() => {
    clearInterval(bubbles);
    cat.setBathing(false);
    busy = false;
    state.changeStat('hygiene', 100);
    state.changeStat('mood', 5);
    state.addXp(8);
    state.addCoins(2);
    cat.setDirty(0);
    cat.smile();
    speechBubble('好舒服呀~');
    sfx.meow();
  }, 2600);
}

function toilet() {
  if (busy) return;
  const s = state.get();
  if (s.isSleeping) { toast(`${s.catName}在睡觉呢`); return; }
  if (s.stats.bladder >= 90) { speechBubble('现在不想去~'); return; }

  busy = true;
  setTimeout(() => {
    busy = false;
    state.changeStat('bladder', 100);
    state.addXp(5);
    state.addCoins(1);
    sfx.pop();
    floatEmoji('💨', { x: 50, y: 50 });
    cat.smile();
    speechBubble('轻松多了~');
  }, 900);
}

// ---------- 睡觉 ----------

let zzzTimer = null;

function toggleSleep() {
  const s = state.get();
  if (s.isSleeping) wake();
  else sleep();
}

function sleep() {
  const s = state.get();
  if (s.stats.energy >= 95) { speechBubble('我还不困~'); return; }
  state.setSleeping(true);
  sfx.yawn();
  syncBedroom();
}

function wake() {
  state.setSleeping(false);
  sfx.meow();
  speechBubble('早上好!');
  syncBedroom();
}

// 能量满自动醒(由 main 的 tick 调用)
export function onAutoWake() {
  toast(`${state.get().catName}睡饱了,自己醒来啦!`);
  sfx.meow();
  syncBedroom();
}

export function syncBedroom() {
  const sleeping = state.get().isSleeping;
  const sceneEl = document.getElementById('scene-bedroom');
  sceneEl.classList.toggle('lights-off', sleeping);
  document.getElementById('btn-lamp').textContent = sleeping ? '💡 开灯叫醒' : '💡 关灯睡觉';
  cat.setSleeping(sleeping);

  clearInterval(zzzTimer);
  if (sleeping) {
    zzzTimer = setInterval(() => {
      if (scenes.currentScene() === 'bedroom') {
        floatEmoji('💤', { x: 56, y: 28, size: 26 });
      }
    }, 1800);
  }
}
