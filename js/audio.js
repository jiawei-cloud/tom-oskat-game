// Web Audio:AudioContext 单例(首次手势解锁)+ 合成音效

let ctx = null;

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 在首个用户手势中解锁(iOS 要求)
export function installUnlock() {
  const unlock = () => {
    getCtx();
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
}

function tone({ freq = 440, to = null, dur = 0.15, type = 'sine', vol = 0.25, delay = 0 }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  coin() {
    tone({ freq: 988, dur: 0.09, type: 'square', vol: 0.12 });
    tone({ freq: 1319, dur: 0.18, type: 'square', vol: 0.12, delay: 0.08 });
  },
  pop() {
    tone({ freq: 420, to: 120, dur: 0.12, type: 'sine', vol: 0.3 });
  },
  eat() {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 300 - i * 40, to: 120, dur: 0.08, type: 'triangle', vol: 0.25, delay: i * 0.14 });
    }
  },
  meow() {
    tone({ freq: 520, to: 760, dur: 0.18, type: 'sawtooth', vol: 0.12 });
    tone({ freq: 760, to: 420, dur: 0.28, type: 'sawtooth', vol: 0.12, delay: 0.16 });
  },
  bubble() {
    tone({ freq: 320, to: 640, dur: 0.14, type: 'sine', vol: 0.2 });
  },
  levelup() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'square', vol: 0.12, delay: i * 0.11 }));
  },
  fail() {
    tone({ freq: 300, to: 140, dur: 0.3, type: 'sawtooth', vol: 0.15 });
  },
  yawn() {
    tone({ freq: 360, to: 180, dur: 0.5, type: 'triangle', vol: 0.18 });
  },
};
