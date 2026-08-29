'use strict';
/* ============================================================
   《墨境：千面残章》core.js —— 常量 / 工具 / 输入 / 全局状态
   ============================================================ */
const W = 1280, H = 720, TAU = Math.PI * 2;

/* ---------- 数学工具 ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const chance = p => Math.random() < p;
const sgn = v => v < 0 ? -1 : 1;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const easeT = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = t => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); };
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function setFont(ctx, size, bold) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px "KaiTi","STKaiti","KaiTi SC","SimKai","Noto Serif SC",serif';
}

/* ---------- 输入 ---------- */
const In = (() => {
  const k = {}, h = {};
  const MAP = {
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'down', s: 'down', S: 'down',
    j: 'light', J: 'light', k: 'heavy', K: 'heavy', Shift: 'dash',
    e: 'interact', E: 'interact', q: 'cancel', Q: 'cancel',
    Enter: 'start', h: 'help', H: 'help', p: 'pause', P: 'pause', Escape: 'pause',
    m: 'dbgzone', M: 'dbgzone', b: 'dbgboss', B: 'dbgboss', l: 'dbgsoul', L: 'dbgsoul',
    r: 'restart', R: 'restart', '0': 'mute',
    '1': 'page1', '2': 'page2', '3': 'page3', '4': 'page4', '5': 'page5', '6': 'page6', '7': 'page7'
  };
  window.addEventListener('keydown', ev => {
    const a = MAP[ev.key] !== undefined ? MAP[ev.key] : MAP[ev.code];
    if (a) {
      if (!ev.repeat) { k[a] = true; h[a] = true; }
      ev.preventDefault();
      Sfx.ensure();
    }
  });
  window.addEventListener('keyup', ev => {
    const a = MAP[ev.key] !== undefined ? MAP[ev.key] : MAP[ev.code];
    if (a) k[a] = false;
  });
  window.addEventListener('blur', () => { for (const key in k) k[key] = false; });
  window.addEventListener('mousedown', () => Sfx.ensure());
  return { k, h, down: a => !!k[a], hit: a => !!h[a], clear: () => { for (const key in h) delete h[key]; } };
})();

/* ---------- 全局状态 ---------- */
const G = {
  state: 'title', t: 0, dt: 0, frame: 0,
  cam: { x: 0, y: 180, shake: 0 },
  player: null, enemies: [], projs: [], parts: [], texts: [],
  washes: [], stains: [], platforms: [], inter: [], spawns: [], hints: [],
  decos: { sky: [], far: [], mid: [] },
  zones: [], zone: null,
  overlay: null, overlayT: 0, pages: {}, soul: 40, soulMax: 100, hpMax: 100,
  freeze: 0, wipe: null, dialog: null,
  toastStr: '', toastT: 0, helpOpen: false, paused: false,
  boss: null, bossOn: false, bossDead: false, choiceDelay: 0,
  pixMix: 0,
  checkpoint: { x: 120, y: 640 },
  deadT: 0, hurtT: 0, flashT: 0,
  stats: { t: 0, kills: 0, deaths: 0 },
  worldW: 15100, worldH: 900, GB: 640, ZLEN: 1900,
  titleT: 0, titleIdx: -1,
  choiceSel: 0, endT: 0, endType: null,
  introIdx: 0, gateTalked: false,
  promptStr: '',
  cvs: null, ctx: null,
};

/* 当前画风：残页覆盖 > Boss强制水墨 > 区域画风 */
function curStyle() {
  if (G.overlay) return G.overlay;
  if (G.bossOn || G.bossDead) return 'ink';
  return G.zone ? G.zone.style : 'ink';
}
/* 敌人当前所处画风语境（用于“残页期间敌人获得对应画风能力”） */
function emStyle() { return G.overlay || (G.zone ? G.zone.style : 'ink'); }

/* ---------- 相机 / 特效 ---------- */
function addShake(m) { G.cam.shake = Math.max(G.cam.shake, m); }
function toast(s) { G.toastStr = s; G.toastT = 2.6; }
function addText(x, y, str, col) { G.texts.push({ x, y, str, col: col || '#fff', t: 0, life: .9 }); }
function updateTexts(dt) {
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i]; t.t += dt; t.y -= 42 * dt;
    if (t.t > t.life) G.texts.splice(i, 1);
  }
}
function spawnPart(o) {
  G.parts.push(Object.assign({
    x: 0, y: 0, vx: 0, vy: 0, g: 0, life: .6, t: 0, size: 4,
    col: '#333', type: 'dot', rot: rnd(0, TAU), vr: rnd(-4, 4), alpha: 1, drag: 0
  }, o));
}
function burst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), s = rnd(o.sp0 || 40, o.sp1 || 230);
    spawnPart(Object.assign({}, o, {
      x: x + rnd(-8, 8), y: y + rnd(-8, 8),
      vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0) - (o.up || 0),
      life: rnd(o.lf0 || .3, o.lf1 || .8), size: rnd(o.s0 || 2, o.s1 || 6),
      rot: rnd(0, TAU), vr: rnd(-7, 7)
    }));
  }
}
function updateParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.t += dt;
    if (p.t >= p.life) { G.parts.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= (1 - (p.drag || 0) * dt); p.rot += p.vr * dt;
  }
}
/* 屏幕空间墨渍（水墨区攻击晕染画面） */
function addStain(x, y, r, a) {
  G.stains.push({ x, y, r, a: a || .45, t: 0, life: 9, seed: rnd(0, 999) });
  if (G.stains.length > 36) G.stains.shift();
}
/* 世界空间色彩晕染（水彩区） */
function addWash(x, y, r, col) {
  G.washes.push({ x, y, r, col, t: 0, life: 7 });
  if (G.washes.length > 50) G.washes.shift();
}
function updateFx(dt) {
  for (let i = G.stains.length - 1; i >= 0; i--) { const s = G.stains[i]; s.t += dt; if (s.t > s.life) G.stains.splice(i, 1); }
  for (let i = G.washes.length - 1; i >= 0; i--) { const w = G.washes[i]; w.t += dt; if (w.t > w.life) G.washes.splice(i, 1); }
}
function updateCam(dt, snap) {
  const p = G.player; if (!p) return;
  const tx = clamp(p.x + p.face * 80 - W * .45, 0, G.worldW - W);
  G.cam.x = snap ? tx : lerp(G.cam.x, tx, 1 - Math.pow(.002, dt));
  const ty = clamp(p.y - H * .62, -40, G.worldH - H);
  G.cam.y = snap ? ty : lerp(G.cam.y, ty, 1 - Math.pow(.02, dt));
  G.cam.shake = Math.max(0, G.cam.shake - dt * 26);
}
function zoneAt(x) {
  for (const z of G.zones) if (x >= z.x0 && x < z.x1) return z;
  return G.zones[G.zones.length - 1];
}
/* 实体碰撞盒：实体用 (中心x, 脚底y) */
function ebox(e) { return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }; }
