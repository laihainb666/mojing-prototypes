'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》core.js —— 常量 / 工具 / 输入(键鼠) / 全局状态
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
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
    '`': 'debug', 'F2': 'debug',
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

/* ---------- 鼠标（画笔模式） ---------- */
const Mouse = {
  x: 0, y: 0, wx: 0, wy: 0, inside: false, down: false, click: false,
  bind(cvs) {
    const toLocal = ev => {
      const r = cvs.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
    };
    cvs.addEventListener('mousemove', ev => { const p = toLocal(ev); Mouse.x = p.x; Mouse.y = p.y; Mouse.inside = true; });
    cvs.addEventListener('mouseleave', () => { Mouse.inside = false; });
    cvs.addEventListener('mousedown', ev => { if (ev.button === 0) { Mouse.down = true; Mouse.click = true; const p = toLocal(ev); Mouse.x = p.x; Mouse.y = p.y; } });
    window.addEventListener('mouseup', ev => { if (ev.button === 0) Mouse.down = false; });
    cvs.addEventListener('contextmenu', ev => ev.preventDefault());
  },
};

/* ---------- 全局状态 ---------- */
const G = {
  state: 'title', t: 0, dt: 0, frame: 0,
  cam: { x: 0, y: 60, shake: 0 },
  player: null, enemies: [], projs: [], parts: [], texts: [],
  washes: [], stains: [], platforms: [], inter: [], spawns: [], hints: [],
  strokes: [],            /* 玩家画出的笔迹（可碰撞平台） */
  decos: { sky: [], far: [], mid: [] },
  level: null,            /* 当前关卡定义 */
  zone: null,             /* 兼容旧渲染引用 */
  overlay: null, overlayT: 0, pages: {}, soul: 40, soulMax: 100, hpMax: 100,
  ink: 100, inkMax: 100,  /* 绘画资源 */
  tools: [], toolIdx: 0,  /* 携带的工具与当前选中 */
  freeze: 0, wipe: null, dialog: null,
  toastStr: '', toastT: 0, helpOpen: false, paused: false,
  boss: null, bossOn: false, bossDead: false, choiceDelay: 0,
  pixMix: 0, forcePixel: false,
  grav: 1,                /* 重力方向（1 正 / -1 反） */
  mirror: false,          /* 倒影世界 */
  dark: 0,                /* 黑暗度（荧光笔照明） */
  turn: null,             /* 回合制模式状态 */
  liquid: null,           /* 液态颜料区 {x,y,w,h} */
  mechT: 0,               /* 关卡机制计时 */
  mechFired: {},
  checkpoint: { x: 120, y: 640 },
  deadT: 0, hurtT: 0, flashT: 0,
  clearT: 0,              /* 过关演出计时 */
  stats: { t: 0, kills: 0, deaths: 0 },
  worldW: 2600, worldH: 760, GB: 620,
  titleT: 0, titleIdx: -1,
  mapSel: 0,
  progress: {},           /* { '1-1': true } 已通关 */
  endless: null,          /* 无尽回廊状态 */
  promptStr: '',
  dbg: { open: false, inv: false, ohk: false, ink: false, boxes: false, slow: false },
  fps: 60, bestScore: 0,
  cvs: null, ctx: null,
};

/* 当前画风：Boss 阶段 > 关卡画风 */
function curStyle() {
  if (G.overlay) return G.overlay;
  if (G.bossOn && G.boss && G.boss.style) return G.boss.style;
  return G.level ? G.level.style : 'ink';
}
function emStyle() { return curStyle(); }
function tool() { return TOOLS[G.tools[G.toolIdx]] || TOOLS.brush; }

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
