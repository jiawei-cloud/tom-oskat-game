// 说话复读:按住录音 → 变调回放(花栗鼠声)
// 用 ScriptProcessorNode 采集原始 PCM,绕开 iOS MediaRecorder 的编码兼容问题

import { getCtx } from './audio.js';
import * as cat from './cat.js';
import { toast, speechBubble } from './ui.js';

const PLAYBACK_RATE = 1.6;
const MAX_RECORD_MS = 10000;

let btn;
let stream = null;       // 已授权的麦克风流(缓存复用)
let recording = false;
let playing = false;
let chunks = [];
let source = null;
let processor = null;
let silentGain = null;
let maxTimer = null;
let playSource = null;

export function init() {
  btn = document.getElementById('btn-talk');

  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
    btn.disabled = true;
    btn.textContent = '🔇 需要 HTTPS 才能说话';
    return;
  }

  btn.addEventListener('pointerdown', startRecord);
  btn.addEventListener('pointerup', stopRecord);
  btn.addEventListener('pointercancel', stopRecord);
  btn.addEventListener('pointerleave', stopRecord);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

async function startRecord(e) {
  e.preventDefault();
  if (recording || playing) return;

  const ctx = getCtx();
  if (!ctx) return;

  if (!stream) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      btn.disabled = true;
      btn.textContent = '🔇 麦克风不可用';
      toast('麦克风权限被拒绝,无法使用说话功能');
      return;
    }
  }

  recording = true;
  chunks = [];
  btn.classList.add('recording');
  btn.textContent = '🔴 松开复读';

  source = ctx.createMediaStreamSource(stream);
  processor = ctx.createScriptProcessor(4096, 1, 1);
  silentGain = ctx.createGain();
  silentGain.gain.value = 0; // 避免录音时产生回声

  processor.onaudioprocess = (ev) => {
    if (recording) chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(ctx.destination);

  clearTimeout(maxTimer);
  maxTimer = setTimeout(stopRecord, MAX_RECORD_MS);
}

function stopRecord() {
  if (!recording) return;
  recording = false;
  clearTimeout(maxTimer);
  btn.classList.remove('recording');
  btn.textContent = '🎤 按住说话';

  source?.disconnect();
  processor?.disconnect();
  silentGain?.disconnect();
  source = processor = silentGain = null;

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const ctx = getCtx();
  if (!ctx || total < ctx.sampleRate * 0.25) {
    if (total > 0) speechBubble('再说长一点~');
    chunks = [];
    return;
  }

  // 拼接 PCM → AudioBuffer
  const buffer = ctx.createBuffer(1, total, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let offset = 0;
  for (const c of chunks) {
    data.set(c, offset);
    offset += c.length;
  }
  chunks = [];

  setTimeout(() => play(buffer), 300);
}

function play(buffer) {
  const ctx = getCtx();
  if (!ctx) return;
  playing = true;
  btn.disabled = true;
  cat.setTalking(true);

  playSource = ctx.createBufferSource();
  playSource.buffer = buffer;
  playSource.playbackRate.value = PLAYBACK_RATE;

  const gain = ctx.createGain();
  gain.gain.value = 1.4;
  playSource.connect(gain).connect(ctx.destination);

  playSource.onended = () => {
    playing = false;
    btn.disabled = false;
    cat.setTalking(false);
    playSource = null;
  };
  playSource.start();
}
