// 场景切换 + 底部导航

import * as cat from './cat.js';

const CAT_SCENES = ['living', 'kitchen', 'bathroom', 'bedroom'];
const hooks = {}; // { sceneName: { enter, exit } }
let current = 'living';

export function registerHooks(name, h) {
  hooks[name] = h;
}

export function currentScene() { return current; }

export function goto(name) {
  if (name === current) return;
  const prev = current;
  hooks[prev]?.exit?.();
  current = name;

  document.querySelectorAll('.scene').forEach((el) => {
    el.classList.toggle('active', el.id === 'scene-' + name);
  });
  document.getElementById('stats-panel').classList.add('hidden');
  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scene === name);
  });

  if (CAT_SCENES.includes(name)) {
    cat.moveTo(document.getElementById('scene-' + name));
  }
  hooks[name]?.enter?.();
}

export function init() {
  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.addEventListener('click', () => goto(btn.dataset.scene));
  });
  document.querySelector('#nav button[data-scene="living"]').classList.add('active');
  cat.moveTo(document.getElementById('scene-living'));
  hooks['living']?.enter?.();
}

// 低状态红点:stat → 对应导航按钮
const BADGE_MAP = { hunger: 'kitchen', hygiene: 'bathroom', bladder: 'bathroom', energy: 'bedroom', mood: 'game' };

export function updateBadges(stats) {
  const flagged = new Set();
  for (const [stat, scene] of Object.entries(BADGE_MAP)) {
    if (stats[stat] < 30) flagged.add(scene);
  }
  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.classList.toggle('has-badge', flagged.has(btn.dataset.scene));
  });
}
