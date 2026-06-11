// 入口:初始化所有模块 + 游戏 tick + HUD 渲染

import * as state from './state.js';
import * as cat from './cat.js';
import * as scenes from './scenes.js';
import * as actions from './actions.js';
import * as shop from './shop.js';
import * as minigame from './minigame.js';
import * as voice from './voice.js';
import { installUnlock } from './audio.js';
import { toast } from './ui.js';

const TICK_MS = 5000;
let lastTickTime = Date.now();

function renderHud() {
  const s = state.get();
  document.getElementById('level-label').textContent = 'Lv.' + s.level;
  document.getElementById('coin-label').textContent = s.coins;
  document.getElementById('xp-fill').style.width =
    Math.min(100, (s.xp / state.xpNeeded(s.level)) * 100) + '%';

  document.querySelectorAll('.stat-row').forEach((row) => {
    const key = row.dataset.stat;
    const v = s.stats[key];
    const fill = row.querySelector('.stat-fill');
    fill.style.width = v + '%';
    fill.classList.toggle('low', v < 50 && v >= 25);
    fill.classList.toggle('critical', v < 25);
  });

  scenes.updateBadges(s.stats);
  cat.setExpression(state.expression());
  cat.setDirty((100 - s.stats.hygiene) / 100);
}

function tick() {
  const now = Date.now();
  const elapsed = now - lastTickTime;
  lastTickTime = now;
  const autoWoke = state.applyDecay(elapsed);
  if (autoWoke) actions.onAutoWake();
}

function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + ' 分钟';
  return Math.floor(mins / 60) + ' 小时' + (mins % 60 > 0 ? (mins % 60) + ' 分钟' : '');
}

function initApp() {
  // 离线结算(在猫初始化前更新数据)
  const offlineMs = state.settleOffline();

  cat.init();
  scenes.init();
  actions.init();
  shop.init();
  minigame.init();
  voice.init();
  installUnlock();

  state.onChange(renderHud);
  renderHud();

  // 状态面板开关
  const panel = document.getElementById('stats-panel');
  document.getElementById('stats-toggle').addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });

  // 游戏 tick
  setInterval(tick, TICK_MS);
  lastTickTime = Date.now();

  // 页面隐藏时立即存档(iOS 上 beforeunload 不可靠)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.save();
  });
  window.addEventListener('pagehide', () => state.save());

  // 防止页面橡皮筋滚动(商店列表除外)
  document.getElementById('scenes').addEventListener('touchmove', (e) => {
    if (!e.target.closest('#shop-grid') && !e.target.closest('#food-tray')) e.preventDefault();
  }, { passive: false });

  // 启动提示
  const s = state.get();
  setTimeout(() => {
    if (offlineMs > 5 * 60 * 1000) {
      toast(`你离开了 ${formatDuration(offlineMs)},${s.catName}有点想你了~`, 3000);
    }
    const daily = state.claimDaily();
    if (daily > 0) {
      setTimeout(() => toast(`📅 每日登录奖励:🪙 +${daily}`, 2500), offlineMs > 5 * 60 * 1000 ? 3200 : 400);
    }
  }, 600);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
