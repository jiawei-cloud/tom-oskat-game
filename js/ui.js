// 通用 UI:toast 提示、漂浮特效

let toastTimer = null;

export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// 在当前场景的特效层漂浮一个 emoji
export function floatEmoji(char, opts = {}) {
  const scene = document.querySelector('.scene.active .fx-layer');
  if (!scene) return;
  const el = document.createElement('span');
  el.className = 'fx-float';
  el.textContent = char;
  const x = opts.x ?? 30 + Math.random() * 40; // 百分比
  const y = opts.y ?? 30 + Math.random() * 30;
  el.style.left = x + '%';
  el.style.top = y + '%';
  if (opts.size) el.style.fontSize = opts.size + 'px';
  scene.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// 猫头顶气泡
let bubbleTimer = null;

export function speechBubble(text, ms = 1600) {
  const area = document.querySelector('.scene.active .cat-area');
  if (!area) return;
  const old = area.querySelector('.speech-bubble');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'speech-bubble';
  el.textContent = text;
  area.appendChild(el);
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => el.remove(), ms);
}
