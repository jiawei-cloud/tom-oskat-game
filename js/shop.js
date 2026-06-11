// 商店:商品数据 + 购买/装备

import * as state from './state.js';
import * as cat from './cat.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

export const FOODS = {
  apple: { name: '苹果', emoji: '🍎', price: 5, hunger: 10, desc: '饥饿 +10' },
  milk: { name: '牛奶', emoji: '🥛', price: 10, hunger: 5, energy: 10, desc: '饥饿 +5 能量 +10' },
  fish: { name: '小鱼', emoji: '🐟', price: 15, hunger: 25, desc: '饥饿 +25' },
  chicken: { name: '鸡腿', emoji: '🍗', price: 22, hunger: 35, desc: '饥饿 +35' },
  cake: { name: '蛋糕', emoji: '🧁', price: 30, hunger: 40, mood: 8, desc: '饥饿 +40 心情 +8' },
};

export const ACCESSORIES = {
  bowtie: { name: '红领结', emoji: '🎀', price: 150, desc: '帅气的红色领结' },
  hat: { name: '小红帽', emoji: '🧢', price: 200, desc: '可爱的红色帽子' },
};

export function init() {
  render();
  state.onChange(render);
  // 已购配饰恢复装备状态
  const s = state.get();
  for (const id of Object.keys(ACCESSORIES)) {
    cat.setAccessory(id, !!s.equipped[id]);
  }
}

let rendering = false;

function render() {
  if (rendering) return;
  rendering = true;
  requestAnimationFrame(() => {
    rendering = false;
    doRender();
  });
}

function doRender() {
  const grid = document.getElementById('shop-grid');
  const s = state.get();
  grid.innerHTML = '';

  for (const [id, item] of Object.entries(FOODS)) {
    const card = document.createElement('div');
    card.className = 'shop-card';
    const owned = s.inventory[id] || 0;
    card.innerHTML = `
      <span class="shop-emoji">${item.emoji}</span>
      <span class="shop-name">${item.name}</span>
      <span class="shop-desc">${item.desc}</span>
      <span class="shop-owned">${owned > 0 ? '拥有 ×' + owned : '&nbsp;'}</span>`;
    const btn = document.createElement('button');
    btn.textContent = `🪙 ${item.price}`;
    btn.disabled = s.coins < item.price;
    btn.addEventListener('click', () => buyFood(id));
    card.appendChild(btn);
    grid.appendChild(card);
  }

  for (const [id, item] of Object.entries(ACCESSORIES)) {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <span class="shop-emoji">${item.emoji}</span>
      <span class="shop-name">${item.name}</span>
      <span class="shop-desc">${item.desc}</span>
      <span class="shop-owned">${s.accessories[id] ? '已拥有' : '&nbsp;'}</span>`;
    const btn = document.createElement('button');
    if (!s.accessories[id]) {
      btn.textContent = `🪙 ${item.price}`;
      btn.disabled = s.coins < item.price;
      btn.addEventListener('click', () => buyAccessory(id));
    } else if (s.equipped[id]) {
      btn.textContent = '卸下';
      btn.className = 'equipped-btn';
      btn.addEventListener('click', () => toggleEquip(id, false));
    } else {
      btn.textContent = '装备';
      btn.className = 'equip-btn';
      btn.addEventListener('click', () => toggleEquip(id, true));
    }
    card.appendChild(btn);
    grid.appendChild(card);
  }
}

function buyFood(id) {
  const item = FOODS[id];
  if (!state.spendCoins(item.price)) {
    toast('金币不够啦,去玩小游戏赚金币吧!');
    return;
  }
  state.addItem(id);
  sfx.coin();
  toast(`已购买 ${item.emoji} ${item.name},去厨房喂给${state.get().catName}吧!`);
}

function buyAccessory(id) {
  const item = ACCESSORIES[id];
  if (!state.spendCoins(item.price)) {
    toast('金币不够啦,去玩小游戏赚金币吧!');
    return;
  }
  state.setAccessoryOwned(id);
  state.setEquipped(id, true);
  cat.setAccessory(id, true);
  sfx.levelup();
  toast(`已购买并装备 ${item.emoji} ${item.name}!`);
}

function toggleEquip(id, on) {
  state.setEquipped(id, on);
  cat.setAccessory(id, on);
  sfx.pop();
}
