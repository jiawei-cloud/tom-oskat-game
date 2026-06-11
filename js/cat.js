// 3D 猫角色:GLB 模型(Kenney CC0)+ AnimationMixer + 触摸交互
import * as THREE from './lib/three.module.min.js';
import { GLTFLoader } from './lib/GLTFLoader.js';

export const handlers = { onPoke: null, onPet: null, onHit: null, onKnockdown: null };

let renderer, scene, camera, canvas;
let rootTilt;          // parent group: hit-tilt applied here
let mixer;
let actions = {};      // clip name → AnimationAction
let active = null;     // currently-playing action
let dirtMat, accHat, accBowtie;

const S = {
  t: 0,
  expr: 'happy',
  sleeping: false, eating: false, bathing: false, petting: false,
  pokeT: -1, jumpT: -1,
  staggerT: -1,
  knockedDown: false, knockedDownT: 0,
  gettingUpT: -1,
  knockSide: 1,
  hitCount: 0, lastHitTime: 0,
};

// ── animation helpers ──────────────────────────────────────────────

function fadeTo(name, dur = 0.2) {
  if (!mixer || !actions[name]) return;
  const next = actions[name];
  if (active === next && next.isRunning()) return;
  if (active) active.fadeOut(dur);
  next.loop = THREE.LoopRepeat;
  next.clampWhenFinished = false;
  next.reset().fadeIn(dur).play();
  active = next;
}

function playOnce(name, cb) {
  if (!mixer || !actions[name]) return;
  const act = actions[name];
  if (active && active !== act) active.fadeOut(0.12);
  act.loop = THREE.LoopOnce;
  act.clampWhenFinished = true;
  act.reset().fadeIn(0.1).play();
  active = act;
  if (cb) {
    const fin = (e) => {
      if (e.action === act) { mixer.removeEventListener('finished', fin); cb(); }
    };
    mixer.addEventListener('finished', fin);
  }
}

function idleAnim() {
  if (S.knockedDown || S.gettingUpT >= 0) return;
  if (S.sleeping)    fadeTo('static', 0.4);
  else if (S.eating) fadeTo('eat',    0.15);
  else               fadeTo('idle',   0.25);
}

// ── scene setup ────────────────────────────────────────────────────

export function init() {
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'touch-action:none;display:block;width:100%';

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1 / 1.18, 0.1, 30);
  camera.position.set(0, 1.1, 4.2);
  camera.lookAt(0, 0.85, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x889aaa, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2.5, 5, 4); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.7);
  fill.position.set(-3, 2, 2); scene.add(fill);

  const shMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 32),
    new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.16 })
  );
  shMesh.rotation.x = -Math.PI / 2;
  shMesh.position.y = 0.01;
  scene.add(shMesh);

  rootTilt = new THREE.Group();
  scene.add(rootTilt);

  buildDirt();
  buildAccessories();
  loadModel();
  bindPointer();

  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    if (document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    mixer?.update(dt);
    frame(dt);
    renderer.render(scene, camera);
  });
}

function loadModel() {
  const url = new URL('../models/cat.glb', import.meta.url).href;
  new GLTFLoader().load(url, (gltf) => {
    const m = gltf.scene;
    const box = new THREE.Box3().setFromObject(m);
    const h   = box.getSize(new THREE.Vector3()).y;
    m.scale.setScalar(2.1 / h);
    m.position.y = 0;
    rootTilt.add(m);

    mixer = new THREE.AnimationMixer(m);
    for (const clip of gltf.animations) {
      const a = mixer.clipAction(clip);
      a.loop = THREE.LoopRepeat;
      actions[clip.name] = a;
    }
    fadeTo('idle', 0);

    // Reposition accessories now that we know scaled height (~2.1)
    accBowtie.position.set(0, 0.90, 0.50);
    accHat.position.set(0,   2.05, 0.18);
  }, undefined, (err) => {
    console.warn('GLB load failed:', err.message || err);
  });
}

// ── accessories & dirt ─────────────────────────────────────────────

const RED = 0xe74c3c, REDD = 0xc0392b;
const sm = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

function buildDirt() {
  dirtMat = new THREE.MeshStandardMaterial({ color: 0x7a5c38, transparent: true, opacity: 0, roughness: 0.9 });
  [[0.35, 1.4, 0.45], [-0.38, 0.9, 0.4], [0.1, 0.45, 0.5],
   [-0.28, 1.9, 0.45], [0.38, 1.55, 0.5]].forEach(([x, y, z]) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 7), dirtMat);
    d.scale.z = 0.3; d.position.set(x, y, z); rootTilt.add(d);
  });
}

function buildAccessories() {
  accBowtie = new THREE.Group();
  [-1, 1].forEach(s => {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), sm(RED));
    w.rotation.z = s * Math.PI / 2; w.scale.z = 0.5; w.position.x = s * 0.14;
    accBowtie.add(w);
  });
  accBowtie.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), sm(REDD)));
  accBowtie.position.set(0, 1.0, 0.5);
  accBowtie.visible = false;
  rootTilt.add(accBowtie);

  accHat = new THREE.Group();
  accHat.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), sm(RED)));
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24, 1, false, -0.6, 1.2), sm(REDD));
  brim.scale.set(1.4, 1, 1.4); brim.position.set(0, 0, 0.18);
  accHat.add(brim);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffd54f }));
  pom.position.y = 0.42; accHat.add(pom);
  accHat.position.set(0, 2.05, 0.18);
  accHat.rotation.x = -0.12;
  accHat.visible = false;
  rootTilt.add(accHat);
}

// ── resize / scene mount ───────────────────────────────────────────

function resize() {
  const slot = canvas.parentElement;
  if (!slot) return;
  const w = slot.clientWidth || 300;
  const h = Math.round(w * 1.18);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function moveTo(sceneEl) {
  const slot = sceneEl.querySelector('.cat-slot');
  if (slot && canvas) { slot.appendChild(canvas); requestAnimationFrame(resize); }
}

export function el() { return canvas; }

// ── per-frame update ───────────────────────────────────────────────

function easeOut3(p) { return 1 - Math.pow(1 - Math.min(p, 1), 3); }

function frame(dt) {
  S.t += dt;
  const t = S.t;
  const knocked = S.knockedDown || S.gettingUpT >= 0;

  // knockdown fall & get-up
  if (S.knockedDown) {
    S.knockedDownT += dt;
    const p = easeOut3(Math.min(S.knockedDownT / 0.35, 1));
    rootTilt.rotation.z = p * Math.PI * 0.52 * S.knockSide;
    rootTilt.position.y = -p * 0.4;
    if (S.knockedDownT > 2.4 && S.gettingUpT < 0) {
      S.gettingUpT = 0; S.knockedDown = false; S.knockedDownT = 0;
    }
  }

  if (S.gettingUpT >= 0) {
    S.gettingUpT += dt;
    const p = Math.min(S.gettingUpT / 0.65, 1);
    const spring = easeOut3(p) + Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.18;
    const rem = 1 - Math.min(spring, 1);
    rootTilt.rotation.z = rem * Math.PI * 0.52 * S.knockSide;
    rootTilt.position.y = -rem * 0.4;
    if (p >= 1) {
      S.gettingUpT = -1;
      rootTilt.rotation.z = 0; rootTilt.position.y = 0;
      S.hitCount = 0;
      idleAnim();
    }
  }

  if (knocked) return;

  // stagger wobble (single hit)
  if (S.staggerT >= 0) {
    S.staggerT += dt;
    const p = S.staggerT / 0.55;
    if (p >= 1) { S.staggerT = -1; rootTilt.rotation.z = 0; }
    else rootTilt.rotation.z = Math.sin(p * Math.PI * 3.5) * (1 - p) * 0.28 * S.knockSide;
  } else if (!S.bathing) {
    rootTilt.rotation.y = Math.sin(t * 0.45) * 0.08;
    rootTilt.rotation.z = 0;
  }

  // jump arc
  if (S.jumpT >= 0) {
    S.jumpT += dt;
    const p = S.jumpT / 0.55;
    if (p >= 1) { S.jumpT = -1; rootTilt.position.y = 0; }
    else rootTilt.position.y = Math.sin(p * Math.PI) * 0.5;
  }

  // bathing wobble
  if (S.bathing) rootTilt.rotation.z = Math.sin(t * 5) * 0.06;

  // poke side-nudge
  if (S.pokeT >= 0) {
    S.pokeT += dt;
    const p = S.pokeT / 0.3;
    if (p >= 1) { S.pokeT = -1; rootTilt.position.x = 0; }
    else rootTilt.position.x = Math.sin(p * Math.PI * 2) * 0.12;
  }
}

// ── public API ─────────────────────────────────────────────────────

export function setExpression(expr) { S.expr = expr; }
export function setDirty(l)        { if (dirtMat) dirtMat.opacity = Math.min(0.9, l); }

export function setSleeping(b) {
  S.sleeping = b;
  b ? fadeTo('static', 0.5) : fadeTo('idle', 0.5);
}

export function setEating(b) {
  S.eating = b;
  b ? fadeTo('eat', 0.15) : fadeTo('idle', 0.3);
}

export function setTalking(_b) { /* GLB model — no morph-target mouth */ }

export function setBathing(b) { S.bathing = b; }

export function setAccessory(id, on) {
  if (id === 'hat')    accHat.visible    = on;
  if (id === 'bowtie') accBowtie.visible = on;
}

export function poke() { S.pokeT = 0; }

export function hit() {
  if (S.knockedDown || S.gettingUpT >= 0) return;
  const now = Date.now();
  if (now - S.lastHitTime > 2500) S.hitCount = 0;  // 2.5s window
  S.hitCount++;
  S.lastHitTime = now;
  S.knockSide = S.hitCount % 2 === 0 ? -1 : 1;

  if (S.hitCount >= 4) {
    S.knockedDown = true; S.knockedDownT = 0; S.gettingUpT = -1;
    playOnce('gesture-negative');
    handlers.onKnockdown?.();
  } else {
    S.staggerT = 0;
    playOnce('gesture-negative', () => { if (!S.knockedDown) idleAnim(); });
    handlers.onHit?.();
  }
}

export function jump() {
  S.jumpT = 0;
  playOnce('dance', () => idleAnim());
}

export function smile(ms = 1200) {
  fadeTo('gesture-positive');
  setTimeout(() => { if (!S.eating && !S.sleeping) idleAnim(); }, ms);
}

// ── pointer events ─────────────────────────────────────────────────

function bindPointer() {
  let dn = false, moved = 0, netDy = 0, lx = 0, ly = 0, sx = 0, sy = 0, t0 = 0, petT = 0;

  canvas.addEventListener('pointerdown', e => {
    if (S.sleeping) return;
    dn = true; moved = 0; netDy = 0;
    sx = lx = e.clientX; sy = ly = e.clientY; t0 = Date.now();
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (!dn) return;
    const ddx = e.clientX - lx, ddy = e.clientY - ly;
    moved += Math.abs(ddx) + Math.abs(ddy); netDy += ddy;
    lx = e.clientX; ly = e.clientY;

    // Don't switch to petting mode if this looks like a downward hit swipe
    const el = Date.now() - t0;
    const looksLikeHit = netDy > 18 && el > 0 && netDy / el > 0.20;

    if (moved > 28 && !looksLikeHit && !S.knockedDown && S.gettingUpT < 0) {
      if (!S.petting) { S.petting = true; fadeTo('gesture-positive'); }
      const now = Date.now();
      if (now - petT > 600) { petT = now; handlers.onPet?.(); }
    }
  });

  const up = (e) => {
    if (!dn) return;
    dn = false;

    // Use final touch position (more reliable for fast swipes where pointermove may be sparse)
    const finalDy = e.clientY - sy;
    const finalDist = Math.abs(e.clientX - sx) + Math.abs(finalDy);
    const el = Date.now() - t0;
    const isHit = finalDy > 20 && finalDist > 22 && el > 0 && el < 500 && finalDy / el > 0.20;

    if (isHit && !S.knockedDown && S.gettingUpT < 0) {
      S.petting = false;
      hit();
      return;
    }

    const wasPet = S.petting;
    if (wasPet) {
      S.petting = false;
      setTimeout(() => { if (!S.eating && !S.sleeping) idleAnim(); }, 500);
      return;
    }

    if (S.knockedDown || S.gettingUpT >= 0) return;
    if (moved <= 22 && finalDist <= 22) { poke(); handlers.onPoke?.(); }
  };

  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { dn = false; S.petting = false; });
}
