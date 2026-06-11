// 3D 猫角色:Three.js 程序化建模 + 动画控制
// 对外接口与旧版一致:init/moveTo/setExpression/setDirty/setSleeping/
// setEating/setTalking/setBathing/setAccessory/poke/jump/smile/handlers

import * as THREE from './lib/three.module.min.js';

export const handlers = { onPoke: null, onPet: null, onHit: null, onKnockdown: null };

const COLOR = {
  fur: 0x8b93a2,
  furDark: 0x6e7686,
  belly: 0xf3f1ec,
  innerEar: 0xf2a9bb,
  iris: 0x3fae3a,
  pupil: 0x15181c,
  nose: 0xe87b9a,
  mouthDark: 0x3a3f47,
  mouthInner: 0x8e2f3a,
  tongue: 0xf08aa4,
  red: 0xe74c3c,
  redDark: 0xc0392b,
  dirt: 0x7a5c38,
};

let renderer, scene, camera, canvas;
let root, body, head, tailGroup, earL, earR, eyeL, eyeR;
let armL, armR;
let mouthSmile, mouthNeutral, mouthSad, mouthOpenGroup;
let dirtMat, accHat, accBowtie;

const anim = {
  t: 0,
  blinkAt: 2.5,
  blinkT: -1,
  earKick: 0,
  earSide: 1,
  earAt: 4,
  pokeT: -1,
  jumpT: -1,
  mouth: 'idle',
  chewSpeed: 0,
  expr: 'happy',
  sleeping: false,
  bathing: false,
  petting: false,
  eyesClosed: false,
  // 打击系统
  staggerT: -1,        // 单次打击踉跄进度
  knockedDown: false,  // 是否倒地
  knockedDownT: 0,     // 倒地计时
  gettingUpT: -1,      // 爬起来进度
  knockSide: 1,        // 倒向哪边
  hitCount: 0,
  lastHitTime: 0,
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
}

function sphere(r, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat(color, opts));
  return m;
}

// ---------- 建模 ----------

function buildCat() {
  root = new THREE.Group();

  // 影子
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  root.add(shadow);

  // ----- 身体 -----
  body = new THREE.Group();
  root.add(body);

  const torso = sphere(1, COLOR.fur);
  torso.scale.set(0.85, 1.0, 0.72);
  torso.position.y = 0.82;
  body.add(torso);

  const belly = sphere(1, COLOR.belly);
  belly.scale.set(0.56, 0.74, 0.5);
  belly.position.set(0, 0.74, 0.3);
  body.add(belly);

  // 脚
  for (const s of [-1, 1]) {
    const foot = sphere(1, COLOR.belly);
    foot.scale.set(0.34, 0.2, 0.46);
    foot.position.set(s * 0.4, 0.16, 0.3);
    body.add(foot);
    const leg = sphere(1, COLOR.fur);
    leg.scale.set(0.3, 0.34, 0.3);
    leg.position.set(s * 0.42, 0.36, 0.02);
    body.add(leg);
  }

  // 手臂 + 白手套
  armL = new THREE.Group();
  armR = new THREE.Group();
  for (const [g, s] of [[armL, -1], [armR, 1]]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 8, 16), mat(COLOR.fur));
    arm.rotation.z = s * 0.5;
    arm.position.set(s * 0.25, -0.25, 0);
    g.add(arm);
    const paw = sphere(0.2, COLOR.belly);
    paw.position.set(s * 0.42, -0.5, 0.04);
    g.add(paw);
    g.position.set(s * 0.62, 1.25, 0.12);
    body.add(g);
  }

  // 尾巴(沿曲线的管道)
  tailGroup = new THREE.Group();
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.45, 0.05, -0.25),
    new THREE.Vector3(0.85, 0.35, -0.15),
    new THREE.Vector3(0.95, 0.85, 0.05),
    new THREE.Vector3(0.7, 1.05, 0.15),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, 0.11, 12), mat(COLOR.fur));
  const tailTip = sphere(0.12, COLOR.belly);
  tailTip.position.copy(tailCurve.getPoint(1));
  tailGroup.add(tail, tailTip);
  tailGroup.position.set(0.35, 0.25, -0.55);
  body.add(tailGroup);

  // ----- 头 -----
  head = new THREE.Group();
  head.position.y = 2.05;
  root.add(head);

  const skull = sphere(0.95, COLOR.fur);
  skull.scale.set(1.0, 0.92, 0.88);
  head.add(skull);

  // 额头斑纹(贴着头顶表面)
  for (let i = -1; i <= 1; i++) {
    const stripe = sphere(1, COLOR.furDark);
    stripe.scale.set(0.05, 0.16, 0.02);
    const dir = new THREE.Vector3(i * 0.3, 0.85, 0.5).normalize();
    stripe.position.set(dir.x * 0.93, dir.y * 0.86, dir.z * 0.82);
    stripe.lookAt(dir.x * 3, dir.y * 3, dir.z * 3);
    head.add(stripe);
  }

  // 白色口鼻区
  const muzzle = sphere(1, COLOR.belly);
  muzzle.scale.set(0.58, 0.4, 0.34);
  muzzle.position.set(0, -0.32, 0.62);
  head.add(muzzle);
  for (const s of [-1, 1]) {
    const cheek = sphere(1, COLOR.belly);
    cheek.scale.set(0.3, 0.26, 0.22);
    cheek.position.set(s * 0.3, -0.28, 0.66);
    head.add(cheek);
  }

  // 耳朵
  earL = makeEar(-1);
  earR = makeEar(1);
  head.add(earL, earR);

  // 眼睛(整组缩放实现眨眼/闭眼)
  eyeL = makeEye(-1);
  eyeR = makeEye(1);
  head.add(eyeL, eyeR);

  // 鼻子
  const nose = sphere(1, COLOR.nose, { roughness: 0.4 });
  nose.scale.set(0.13, 0.095, 0.08);
  nose.position.set(0, -0.13, 0.88);
  head.add(nose);

  // 嘴巴各形态
  mouthSmile = makeSmile(0.2, false);
  mouthSmile.position.set(0, -0.34, 0.97);
  mouthNeutral = makeSmile(0.13, false);
  mouthNeutral.position.set(0, -0.36, 0.97);
  mouthSad = makeSmile(0.16, true);
  mouthSad.position.set(0, -0.46, 0.97);

  mouthOpenGroup = new THREE.Group();
  const mouthIn = sphere(1, COLOR.mouthInner, { roughness: 0.5 });
  mouthIn.scale.set(0.24, 0.18, 0.1);
  const tongue = sphere(1, COLOR.tongue, { roughness: 0.5 });
  tongue.scale.set(0.14, 0.07, 0.08);
  tongue.position.set(0, -0.1, 0.04);
  mouthOpenGroup.add(mouthIn, tongue);
  mouthOpenGroup.position.set(0, -0.44, 0.88);

  head.add(mouthSmile, mouthNeutral, mouthSad, mouthOpenGroup);

  // 胡须
  const whiskerMat = mat(0xcfd4dc, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6), whiskerMat);
      w.rotation.z = Math.PI / 2 + s * (0.12 - i * 0.12);
      w.position.set(s * 0.62, -0.28 + i * 0.07 - 0.07, 0.6);
      head.add(w);
    }
  }

  // ----- 脏污 -----
  dirtMat = mat(COLOR.dirt, { transparent: true, opacity: 0 });
  const dirtSpots = [
    [0.45, 1.4, 0.5, 0.18], [-0.5, 0.9, 0.45, 0.22], [0.1, 0.45, 0.55, 0.16],
    [-0.35, 2.5, 0.55, 0.16], [0.5, 2.1, 0.6, 0.14],
  ];
  for (const [x, y, z, r] of dirtSpots) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), dirtMat);
    d.scale.z = 0.3;
    d.position.set(x, y, z);
    d.lookAt(x * 2, y, z * 2);
    root.add(d);
  }

  // ----- 配饰 -----
  accBowtie = new THREE.Group();
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), mat(COLOR.red, { roughness: 0.5 }));
    wing.rotation.z = s * Math.PI / 2;
    wing.scale.z = 0.5;
    wing.position.x = s * 0.18;
    accBowtie.add(wing);
  }
  const knot = sphere(0.09, COLOR.redDark, { roughness: 0.5 });
  accBowtie.add(knot);
  accBowtie.position.set(0, 1.22, 0.62);
  accBowtie.visible = false;
  root.add(accBowtie);

  accHat = new THREE.Group();
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(COLOR.red, { roughness: 0.6 })
  );
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24, 1, false, -0.6, 1.2), mat(COLOR.redDark, { roughness: 0.6 }));
  brim.scale.set(1.4, 1, 1.4);
  brim.position.set(0, 0.0, 0.25);
  const pom = sphere(0.1, 0xffd54f, { roughness: 0.5 });
  pom.position.y = 0.55;
  accHat.add(cap, brim, pom);
  accHat.position.set(0, 0.72, 0);
  accHat.rotation.x = -0.12;
  accHat.visible = false;
  head.add(accHat);

  applyMouth();
  return root;
}

function makeEar(s) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.78, 24), mat(COLOR.fur));
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.58, 24), mat(COLOR.innerEar, { roughness: 0.7 }));
  inner.position.set(0, -0.04, 0.11);
  g.add(outer, inner);
  g.position.set(s * 0.55, 0.92, -0.05);
  g.rotation.z = s * -0.38;
  return g;
}

function makeEye(s) {
  const g = new THREE.Group();
  const ball = sphere(0.27, 0xffffff, { roughness: 0.25 });
  ball.scale.set(0.9, 1.15, 0.7);
  const iris = sphere(0.13, COLOR.iris, { roughness: 0.3 });
  iris.scale.z = 0.5;
  iris.position.set(s * -0.02, -0.05, 0.2);
  const pupil = sphere(0.065, COLOR.pupil, { roughness: 0.2 });
  pupil.scale.z = 0.5;
  pupil.position.set(s * -0.02, -0.05, 0.26);
  const glint = sphere(0.03, 0xffffff, { roughness: 0.1 });
  glint.position.set(s * -0.02 + 0.04, 0.0, 0.29);
  g.add(ball, iris, pupil, glint);
  g.position.set(s * 0.32, 0.05, 0.68);
  g.rotation.y = s * 0.18;
  return g;
}

// 弯月形微笑(arc>0 上弯,sad=true 下弯)
function makeSmile(radius, sad) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.022, 8, 24, Math.PI * 0.85),
    mat(COLOR.mouthDark, { roughness: 0.4 })
  );
  m.rotation.z = sad ? Math.PI * 0.075 : Math.PI + Math.PI * 0.075;
  return m;
}

// ---------- 渲染初始化 ----------

export function init() {
  canvas = document.createElement('canvas');
  canvas.id = 'cat';
  canvas.style.touchAction = 'none';
  canvas.style.display = 'block';
  canvas.style.width = '100%';

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1 / 1.18, 0.1, 30);
  camera.position.set(0, 1.65, 5.8);
  camera.lookAt(0, 1.55, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8898aa, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(2.5, 5, 4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.5);
  fill.position.set(-3, 2, 2);
  scene.add(fill);

  scene.add(buildCat());

  bindPointer();
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    if (document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frame(dt);
    renderer.render(scene, camera);
  });
}

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
  if (slot && canvas) {
    slot.appendChild(canvas);
    requestAnimationFrame(resize);
  }
}

export function el() { return canvas; }

// ---------- 每帧动画 ----------

function easeOut3(p) { return 1 - Math.pow(1 - Math.min(p, 1), 3); }

function frame(dt) {
  anim.t += dt;
  const t = anim.t;

  // 倒地 & 爬起来优先处理 root 旋转,其他动画在倒地期间暂停
  const knocked = anim.knockedDown || anim.gettingUpT >= 0;

  if (anim.knockedDown) {
    anim.knockedDownT += dt;
    const fallP = easeOut3(Math.min(anim.knockedDownT / 0.35, 1));
    root.rotation.z = fallP * Math.PI * 0.52 * anim.knockSide;
    root.position.y = -fallP * 0.35;
    // 倒地 2.4s 后开始爬起
    if (anim.knockedDownT > 2.4 && anim.gettingUpT < 0) {
      anim.gettingUpT = 0;
      anim.knockedDown = false;
      anim.knockedDownT = 0;
    }
  }

  if (anim.gettingUpT >= 0) {
    anim.gettingUpT += dt;
    const p = Math.min(anim.gettingUpT / 0.65, 1);
    // 弹簧回弹:超调一点再回正
    const spring = easeOut3(p) + Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.18;
    const remain = 1 - Math.min(spring, 1);
    root.rotation.z = remain * Math.PI * 0.52 * anim.knockSide;
    root.position.y = -remain * 0.35;
    if (p >= 1) {
      anim.gettingUpT = -1;
      root.rotation.z = 0;
      root.position.y = 0;
      anim.hitCount = 0;
      anim.eyesClosed = false;
      setMouth(anim.expr === 'sad' ? 'sad' : 'idle');
    }
  }

  if (knocked) {
    // 倒地期间只做最小动画
    body.scale.set(1, 1, 1);
    head.rotation.x = 0.15;
    head.rotation.z = 0;
    head.position.y = 2.05;
    head.scale.set(1, 1, 1);
    tailGroup.rotation.y = 0;
    return;
  }

  // 呼吸
  const breathe = anim.sleeping ? Math.sin(t * 1.6) * 0.03 : Math.sin(t * 2.4) * 0.015;
  body.scale.set(1, 1 + breathe, 1);

  // 轻微转体
  root.rotation.y = Math.sin(t * 0.45) * 0.1;

  // 踉跄(单次打击)
  let staggerZ = 0;
  if (anim.staggerT >= 0) {
    anim.staggerT += dt;
    const p = anim.staggerT / 0.55;
    if (p >= 1) { anim.staggerT = -1; }
    else {
      staggerZ = Math.sin(p * Math.PI * 3.5) * (1 - p) * 0.32 * anim.knockSide;
      root.rotation.z = staggerZ;
    }
  } else if (!anim.bathing) {
    root.rotation.z = 0;
  }

  // 头部
  let headRotX = anim.sleeping ? 0.22 : Math.sin(t * 1.1) * 0.02;
  let headRotZ = anim.petting ? Math.sin(t * 5) * 0.08 : Math.sin(t * 0.7) * 0.03;
  let headY = 2.05 + Math.sin(t * 1.3) * 0.015;
  let headScaleY = 1;

  if (anim.pokeT >= 0) {
    anim.pokeT += dt;
    const p = anim.pokeT / 0.4;
    if (p >= 1) anim.pokeT = -1;
    else headScaleY = 1 - Math.sin(p * Math.PI) * 0.22;
  }
  head.rotation.x = headRotX;
  head.rotation.z = headRotZ + staggerZ * 0.5;
  head.position.y = 2.05 - (1 - headScaleY) * 0.5 + Math.sin(t * 1.3) * 0.015;
  head.scale.set(1 + (1 - headScaleY) * 0.45, headScaleY, 1 + (1 - headScaleY) * 0.45);

  // 跳跃
  if (anim.jumpT >= 0) {
    anim.jumpT += dt;
    const p = anim.jumpT / 0.55;
    if (p >= 1) { anim.jumpT = -1; root.position.y = 0; }
    else root.position.y = Math.sin(p * Math.PI) * 0.6;
  }

  // 洗澡摇摆
  if (anim.bathing) root.rotation.z = Math.sin(t * 5) * 0.06;

  // 尾巴
  const wagSpeed = anim.sleeping ? 0.6 : anim.expr === 'happy' ? 4.5 : anim.expr === 'sad' ? 1 : 2.5;
  tailGroup.rotation.y = Math.sin(t * wagSpeed) * 0.45;

  // 手臂轻摆
  const armSwing = Math.sin(t * 1.8) * 0.06;
  armL.rotation.x = armSwing;
  armR.rotation.x = -armSwing;

  // 眨眼 / 闭眼
  let eyeScale = 1;
  if (anim.eyesClosed || anim.sleeping || anim.petting || anim.bathing) {
    eyeScale = 0.06;
  } else {
    if (t > anim.blinkAt) { anim.blinkT = 0; anim.blinkAt = t + 2.5 + Math.random() * 3; }
    if (anim.blinkT >= 0) {
      anim.blinkT += dt;
      const p = anim.blinkT / 0.18;
      if (p >= 1) anim.blinkT = -1;
      else eyeScale = Math.max(0.06, 1 - Math.sin(p * Math.PI));
    }
  }
  eyeL.scale.y = eyeR.scale.y = eyeScale;

  // 耳朵抖动
  if (t > anim.earAt) {
    anim.earKick = 1;
    anim.earSide = Math.random() < 0.5 ? -1 : 1;
    anim.earAt = t + 3 + Math.random() * 5;
  }
  if (anim.earKick > 0) {
    anim.earKick = Math.max(0, anim.earKick - dt * 4);
    const k = Math.sin(anim.earKick * Math.PI) * 0.3;
    if (anim.earSide < 0) earL.rotation.z = -0.38 - k;
    else earR.rotation.z = 0.38 + k;
  } else {
    // 悲伤时耳朵下垂
    const sad = anim.expr === 'sad' && !anim.sleeping;
    earL.rotation.z = -0.38 - (sad ? 0.35 : 0);
    earR.rotation.z = 0.38 + (sad ? 0.35 : 0);
  }

  // 嘴巴开合(吃饭/说话)
  if (anim.chewSpeed > 0) {
    mouthOpenGroup.scale.y = 0.35 + Math.abs(Math.sin(t * anim.chewSpeed)) * 0.75;
  } else {
    mouthOpenGroup.scale.y = 1;
  }
}

// ---------- 嘴巴形态 ----------

function applyMouth() {
  const m = anim.mouth;
  mouthSmile.visible = m === 'happy' || (m === 'idle' && anim.expr === 'happy');
  mouthNeutral.visible = m === 'idle' && anim.expr !== 'happy' && anim.expr !== 'sad';
  mouthSad.visible = m === 'sad' || (m === 'idle' && anim.expr === 'sad');
  mouthOpenGroup.visible = m === 'open';
}

function setMouth(m) {
  anim.mouth = m;
  applyMouth();
}

// ---------- 对外 API ----------

export function setExpression(expr) {
  anim.expr = expr;
  if (!anim.sleeping && anim.chewSpeed === 0) {
    setMouth(expr === 'sad' ? 'sad' : 'idle');
  } else {
    applyMouth();
  }
}

export function setDirty(level) {
  if (dirtMat) dirtMat.opacity = Math.min(0.9, level);
}

export function setSleeping(b) {
  anim.sleeping = b;
  anim.eyesClosed = b;
  if (!b) setExpression(anim.expr);
}

export function setEating(b) {
  anim.chewSpeed = b ? 10 : 0;
  setMouth(b ? 'open' : (anim.expr === 'sad' ? 'sad' : 'idle'));
}

export function setTalking(b) {
  anim.chewSpeed = b ? 16 : 0;
  setMouth(b ? 'open' : (anim.expr === 'sad' ? 'sad' : 'idle'));
}

export function setBathing(b) {
  anim.bathing = b;
  setMouth(b ? 'happy' : (anim.expr === 'sad' ? 'sad' : 'idle'));
}

export function setAccessory(id, on) {
  if (id === 'hat' && accHat) accHat.visible = on;
  if (id === 'bowtie' && accBowtie) accBowtie.visible = on;
}

export function poke() {
  anim.pokeT = 0;
}

export function hit() {
  if (anim.knockedDown || anim.gettingUpT >= 0) return;
  const now = Date.now();
  if (now - anim.lastHitTime > 1800) anim.hitCount = 0;
  anim.hitCount++;
  anim.lastHitTime = now;
  anim.knockSide = anim.hitCount % 2 === 0 ? -1 : 1;

  if (anim.hitCount >= 4) {
    // 倒地!
    anim.knockedDown = true;
    anim.knockedDownT = 0;
    anim.gettingUpT = -1;
    anim.eyesClosed = true;
    setMouth('sad');
    handlers.onKnockdown?.();
  } else {
    // 踉跄
    anim.staggerT = 0;
    anim.pokeT = 0;
    anim.eyesClosed = true;
    setTimeout(() => { if (!anim.knockedDown) anim.eyesClosed = false; }, 280);
    handlers.onHit?.();
  }
}

export function jump() {
  anim.jumpT = 0;
}

export function smile(ms = 1200) {
  setMouth('happy');
  setTimeout(() => {
    if (anim.chewSpeed === 0 && !anim.bathing) {
      setMouth(anim.expr === 'sad' ? 'sad' : 'idle');
    }
  }, ms);
}

// ---------- 触摸:点 = 戳,按住滑动 = 抚摸 ----------

function bindPointer() {
  let down = false;
  let moved = 0;
  let totalDy = 0;
  let lastX = 0, lastY = 0;
  let downX = 0, downY = 0, downTime = 0;
  let petTick = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (anim.sleeping) return;
    down = true;
    moved = 0;
    totalDy = 0;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    downTime = Date.now();
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    totalDy += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    if (moved > 28 && !anim.knockedDown && anim.gettingUpT < 0) {
      if (!anim.petting) {
        anim.petting = true;
        setMouth('happy');
      }
      const now = Date.now();
      if (now - petTick > 600) {
        petTick = now;
        handlers.onPet?.();
      }
    }
  });

  const end = (e) => {
    if (!down) return;
    const wasPetting = anim.petting;
    down = false;

    if (wasPetting) {
      anim.petting = false;
      setMouth(anim.expr === 'sad' ? 'sad' : 'idle');
      return;
    }

    // 倒地/爬起期间点击无效
    if (anim.knockedDown || anim.gettingUpT >= 0) return;

    const elapsed = Date.now() - downTime;
    // 快速向下滑动 → 打击!条件:位移>28px、向下、速度>0.35px/ms
    if (moved > 28 && totalDy > 18 && elapsed < 400 && totalDy / elapsed > 0.35) {
      hit();
    } else if (moved <= 22) {
      // 轻点
      if (anim.sleeping) return;
      handlers.onPoke?.();
    }
  };

  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
