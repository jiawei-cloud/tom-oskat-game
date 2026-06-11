// 猫角色:SVG 模板 + 表情/姿势/反应控制

const CAT_SVG = `
<svg id="cat" viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg"
     data-expr="happy" data-eyes="open" data-mouth="idle">
  <!-- 尾巴 -->
  <g id="cat-tail">
    <path d="M68 218 Q26 224 22 192 Q20 170 38 168 Q52 167 50 180 Q49 189 40 188"
          fill="none" stroke="#7d838e" stroke-width="14" stroke-linecap="round"/>
  </g>

  <!-- 身体 -->
  <g id="cat-body">
    <ellipse cx="100" cy="192" rx="50" ry="46" fill="#7d838e"/>
    <ellipse cx="100" cy="200" rx="32" ry="33" fill="#eceae6"/>
    <ellipse cx="56" cy="186" rx="12" ry="22" fill="#7d838e" transform="rotate(15 56 186)"/>
    <ellipse cx="144" cy="186" rx="12" ry="22" fill="#7d838e" transform="rotate(-15 144 186)"/>
    <ellipse cx="74" cy="234" rx="16" ry="11" fill="#8d93a0"/>
    <ellipse cx="126" cy="234" rx="16" ry="11" fill="#8d93a0"/>
    <g id="acc-bowtie" class="acc">
      <path d="M100 150 L80 139 L80 161 Z" fill="#e74c3c"/>
      <path d="M100 150 L120 139 L120 161 Z" fill="#e74c3c"/>
      <circle cx="100" cy="150" r="5.5" fill="#c0392b"/>
    </g>
  </g>

  <!-- 头 -->
  <g id="cat-head">
    <g id="ear-l">
      <path d="M50 58 L60 10 L88 38 Z" fill="#7d838e"/>
      <path d="M58 49 L63 25 L78 39 Z" fill="#f2b8c6"/>
    </g>
    <g id="ear-r">
      <path d="M150 58 L140 10 L112 38 Z" fill="#7d838e"/>
      <path d="M142 49 L137 25 L122 39 Z" fill="#f2b8c6"/>
    </g>
    <ellipse cx="100" cy="92" rx="58" ry="54" fill="#7d838e"/>
    <ellipse cx="100" cy="113" rx="36" ry="25" fill="#eceae6"/>

    <g id="cat-eyes">
      <g class="eyes-open">
        <ellipse cx="77" cy="84" rx="14" ry="16" fill="#ffffff"/>
        <ellipse cx="123" cy="84" rx="14" ry="16" fill="#ffffff"/>
        <circle cx="79" cy="87" r="8" fill="#3da639"/>
        <circle cx="121" cy="87" r="8" fill="#3da639"/>
        <circle cx="79" cy="87" r="4.2" fill="#1c1c1c"/>
        <circle cx="121" cy="87" r="4.2" fill="#1c1c1c"/>
        <circle cx="81.5" cy="84" r="2" fill="#ffffff"/>
        <circle cx="123.5" cy="84" r="2" fill="#ffffff"/>
      </g>
      <g class="eyes-closed">
        <path d="M64 86 Q77 95 90 86" stroke="#2f3338" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M110 86 Q123 95 136 86" stroke="#2f3338" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      </g>
    </g>

    <path d="M93 103 L107 103 L100 112 Z" fill="#f08aa4"/>

    <g id="cat-mouth">
      <path class="mouth-idle" d="M90 118 Q100 126 110 118"
            stroke="#2f3338" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="mouth-happy" d="M86 116 Q100 134 114 116 Z"
            stroke="#2f3338" stroke-width="3" fill="#b3404a" stroke-linecap="round" stroke-linejoin="round"/>
      <g class="mouth-open">
        <path d="M86 115 Q100 142 114 115 Q100 122 86 115" fill="#a83a44" stroke="#2f3338" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M93 129 Q100 137 107 129 Q100 133 93 129" fill="#f08aa4"/>
      </g>
      <path class="mouth-sad" d="M90 124 Q100 114 110 124"
            stroke="#2f3338" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>

    <g stroke="#5d626b" stroke-width="2" stroke-linecap="round">
      <path d="M38 102 L60 107"/><path d="M38 116 L60 113"/>
      <path d="M162 102 L140 107"/><path d="M162 116 L140 113"/>
    </g>

    <g id="acc-hat" class="acc">
      <path d="M64 38 Q100 0 136 38 L138 47 Q100 28 62 47 Z" fill="#e74c3c"/>
      <path d="M62 47 Q100 28 138 47 L152 54 Q100 35 48 54 Z" fill="#c0392b"/>
    </g>
  </g>

  <!-- 脏污 -->
  <g id="cat-dirt" opacity="0">
    <ellipse cx="68" cy="170" rx="10" ry="6" fill="#8b6b43"/>
    <ellipse cx="132" cy="202" rx="12" ry="7" fill="#7a5c38"/>
    <ellipse cx="122" cy="60" rx="9" ry="5" fill="#8b6b43"/>
    <ellipse cx="78" cy="132" rx="8" ry="5" fill="#7a5c38"/>
    <ellipse cx="100" cy="228" rx="11" ry="5" fill="#8b6b43"/>
  </g>
</svg>`;

let svg = null;
let earTimer = null;

// 由 actions.js 注入的交互回调
export const handlers = { onPoke: null, onPet: null };

export function init() {
  const tpl = document.createElement('div');
  tpl.innerHTML = CAT_SVG;
  svg = tpl.firstElementChild;
  bindPointer();
  startEarTwitch();
}

// 把猫移动到指定场景的 cat-slot
export function moveTo(sceneEl) {
  const slot = sceneEl.querySelector('.cat-slot');
  if (slot && svg) slot.appendChild(svg);
}

export function el() { return svg; }

function startEarTwitch() {
  clearTimeout(earTimer);
  const loop = () => {
    const delay = 3000 + Math.random() * 5000;
    earTimer = setTimeout(() => {
      const ear = svg.querySelector(Math.random() < 0.5 ? '#ear-l' : '#ear-r');
      ear.classList.add('ear-twitch');
      ear.addEventListener('animationend', () => ear.classList.remove('ear-twitch'), { once: true });
      loop();
    }, delay);
  };
  loop();
}

// ---------- 表情 / 状态 ----------

export function setExpression(expr) {
  // expr: happy / neutral / sad
  svg.dataset.expr = expr;
  if (svg.classList.contains('sleeping') || svg.classList.contains('eating') || svg.classList.contains('talking')) return;
  svg.dataset.mouth = expr === 'sad' ? 'sad' : 'idle';
}

export function setDirty(level) {
  // level: 0(干净)~ 1(很脏)
  svg.querySelector('#cat-dirt').setAttribute('opacity', String(Math.min(0.85, level)));
}

export function setSleeping(b) {
  svg.classList.toggle('sleeping', b);
  svg.dataset.eyes = b ? 'closed' : 'open';
  if (!b) setExpression(svg.dataset.expr);
}

export function setEating(b) {
  svg.classList.toggle('eating', b);
  svg.dataset.mouth = b ? 'open' : (svg.dataset.expr === 'sad' ? 'sad' : 'idle');
}

export function setTalking(b) {
  svg.classList.toggle('talking', b);
  svg.dataset.mouth = b ? 'open' : (svg.dataset.expr === 'sad' ? 'sad' : 'idle');
}

export function setBathing(b) {
  svg.classList.toggle('bathing', b);
  if (b) { svg.dataset.eyes = 'closed'; svg.dataset.mouth = 'happy'; }
  else { svg.dataset.eyes = 'open'; setExpression(svg.dataset.expr); }
}

export function setAccessory(id, on) {
  const node = svg.querySelector('#acc-' + id);
  if (node) node.classList.toggle('on', on);
}

// ---------- 反应 ----------

function replayClass(cls) {
  svg.classList.remove(cls);
  void svg.getBBox(); // 强制重排以重新触发动画
  svg.classList.add(cls);
  svg.addEventListener('animationend', () => svg.classList.remove(cls), { once: true });
}

export function poke() {
  replayClass('poked');
}

export function jump() {
  replayClass('jumping');
}

export function smile(ms = 1200) {
  svg.dataset.mouth = 'happy';
  setTimeout(() => {
    if (!svg.classList.contains('eating') && !svg.classList.contains('talking')) {
      svg.dataset.mouth = svg.dataset.expr === 'sad' ? 'sad' : 'idle';
    }
  }, ms);
}

// ---------- 触摸交互:点 = 戳,按住滑动 = 抚摸 ----------

function bindPointer() {
  let down = false;
  let moved = 0;
  let lastX = 0, lastY = 0;
  let petTick = 0;

  svg.addEventListener('pointerdown', (e) => {
    if (svg.classList.contains('sleeping')) return;
    down = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    svg.setPointerCapture?.(e.pointerId);
  });

  svg.addEventListener('pointermove', (e) => {
    if (!down) return;
    moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
    if (moved > 24) {
      if (!svg.classList.contains('petting')) {
        svg.classList.add('petting');
        svg.dataset.eyes = 'closed';
        svg.dataset.mouth = 'happy';
      }
      // 抚摸过程中节流触发回调
      const now = Date.now();
      if (now - petTick > 600) {
        petTick = now;
        handlers.onPet?.();
      }
    }
  });

  const end = () => {
    if (!down) return;
    const wasPetting = svg.classList.contains('petting');
    down = false;
    if (wasPetting) {
      svg.classList.remove('petting');
      svg.dataset.eyes = 'open';
      svg.dataset.mouth = svg.dataset.expr === 'sad' ? 'sad' : 'idle';
    } else if (moved <= 24) {
      handlers.onPoke?.();
    }
  };

  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
