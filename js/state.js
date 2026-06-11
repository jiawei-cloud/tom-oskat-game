// 游戏状态:模型、持久化、随时间衰减

const SAVE_KEY = 'tom-cat-save-v1';
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 离线衰减上限 8 小时

const DEFAULTS = {
  version: 1,
  stats: { hunger: 80, energy: 80, hygiene: 80, mood: 80, bladder: 80 },
  coins: 100,
  xp: 0,
  level: 1,
  inventory: { apple: 2 },
  accessories: { hat: false, bowtie: false },
  equipped: { hat: false, bowtie: false },
  isSleeping: false,
  lastTick: Date.now(),
  lastDaily: '',
  catName: '汤姆',
};

// 每分钟衰减速率(清醒时)
const DECAY_PER_MIN = { hunger: 1.2, energy: 0.8, hygiene: 0.6, mood: 0.6, bladder: 1.5 };
const SLEEP_ENERGY_PER_MIN = 8;

let s = load();
const changeListeners = [];
const levelUpListeners = [];
let saveTimer = null;

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    const merged = structuredClone(DEFAULTS);
    Object.assign(merged, saved);
    merged.stats = { ...DEFAULTS.stats, ...(saved.stats || {}) };
    merged.inventory = { ...(saved.inventory || DEFAULTS.inventory) };
    merged.accessories = { ...DEFAULTS.accessories, ...(saved.accessories || {}) };
    merged.equipped = { ...DEFAULTS.equipped, ...(saved.equipped || {}) };
    return merged;
  } catch (e) {
    return structuredClone(DEFAULTS);
  }
}

export function save() {
  s.lastTick = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* 存储不可用时忽略 */ }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1000);
}

function emitChange() {
  scheduleSave();
  for (const fn of changeListeners) fn(s);
}

export function onChange(fn) { changeListeners.push(fn); }
export function onLevelUp(fn) { levelUpListeners.push(fn); }

export function get() { return s; }

const clamp = (v) => Math.max(0, Math.min(100, v));

export function changeStat(key, delta) {
  s.stats[key] = clamp(s.stats[key] + delta);
  emitChange();
}

export function addCoins(n) {
  s.coins += n;
  emitChange();
}

export function spendCoins(n) {
  if (s.coins < n) return false;
  s.coins -= n;
  emitChange();
  return true;
}

export function xpNeeded(level) {
  return Math.round(50 * Math.pow(level, 1.3));
}

export function addXp(n) {
  s.xp += n;
  let leveled = false;
  while (s.xp >= xpNeeded(s.level)) {
    s.xp -= xpNeeded(s.level);
    s.level += 1;
    s.coins += s.level * 20;
    leveled = true;
  }
  emitChange();
  if (leveled) for (const fn of levelUpListeners) fn(s.level);
}

export function addItem(id, n = 1) {
  s.inventory[id] = (s.inventory[id] || 0) + n;
  emitChange();
}

export function useItem(id) {
  if (!s.inventory[id]) return false;
  s.inventory[id] -= 1;
  if (s.inventory[id] <= 0) delete s.inventory[id];
  emitChange();
  return true;
}

export function setSleeping(b) {
  s.isSleeping = b;
  emitChange();
}

export function setAccessoryOwned(id) {
  s.accessories[id] = true;
  emitChange();
}

export function setEquipped(id, on) {
  s.equipped[id] = on;
  emitChange();
}

// 应用 elapsedMs 时长的状态衰减;返回是否触发了自动醒来
export function applyDecay(elapsedMs) {
  const mins = elapsedMs / 60000;
  if (mins <= 0) return false;
  let autoWake = false;

  if (s.isSleeping) {
    s.stats.energy = clamp(s.stats.energy + SLEEP_ENERGY_PER_MIN * mins);
    s.stats.hunger = clamp(s.stats.hunger - DECAY_PER_MIN.hunger * 0.5 * mins);
    s.stats.hygiene = clamp(s.stats.hygiene - DECAY_PER_MIN.hygiene * 0.5 * mins);
    s.stats.bladder = clamp(s.stats.bladder - DECAY_PER_MIN.bladder * 0.5 * mins);
    if (s.stats.energy >= 100) {
      s.isSleeping = false;
      autoWake = true;
    }
  } else {
    for (const k of Object.keys(DECAY_PER_MIN)) {
      s.stats[k] = clamp(s.stats[k] - DECAY_PER_MIN[k] * mins);
    }
    // 其他状态过低时心情额外下降
    const others = ['hunger', 'energy', 'hygiene', 'bladder'];
    if (others.some((k) => s.stats[k] < 30)) {
      s.stats.mood = clamp(s.stats.mood - 0.6 * mins);
    }
  }
  emitChange();
  return autoWake;
}

// 启动时结算离线时间;返回离线时长(ms),供 UI 提示
export function settleOffline() {
  const elapsed = Math.min(Date.now() - (s.lastTick || Date.now()), MAX_OFFLINE_MS);
  if (elapsed > 60 * 1000) applyDecay(elapsed);
  s.lastTick = Date.now();
  return elapsed;
}

// 每日登录奖励;返回奖励金额(0 表示今天已领)
export function claimDaily() {
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastDaily === today) return 0;
  s.lastDaily = today;
  s.coins += 20;
  emitChange();
  return 20;
}

// 综合表情:sad / neutral / happy
export function expression() {
  const st = s.stats;
  if (st.hunger < 25 || st.energy < 25 || st.hygiene < 25 || st.bladder < 25 || st.mood < 25) return 'sad';
  if (st.mood >= 60) return 'happy';
  return 'neutral';
}
