'use strict';
/* ============================================================
   《墨境：千面残章》styles.js —— 七种画风：调色板 / 笔触绘制器 / 背景 / 后处理
   核心思路：实体只提供几何路径，Paint.fill 按当前画风以不同方式“上墨”。
   ============================================================ */
const STYLES = {
  ink: { key: 'ink', zh: '水墨', en: 'INK WASH', weapon: '毛笔 · 泼墨',
    pal: { paper: '#f2eddd', sky: '#eae4d0', far: '#c9c2ab', mid: '#a09a84', near: '#7c7666',
      ground: '#2c2a2f', groundHi: '#57534a', plat: '#3b393e', platHi: '#5d5950',
      ink: '#222126', accent: '#b23a2e', soft: '#8d8778', player: '#26252b' } },
  water: { key: 'water', zh: '水彩', en: 'WATERCOLOR', weapon: '水彩笔 · 凝珠',
    pal: { paper: '#fbf7ee', sky: '#dceaf2', far: '#b5d6c9', mid: '#f0c6bf', near: '#9fc3b8',
      ground: '#6fa397', groundHi: '#93c2b0', plat: '#7fb3a5', platHi: '#a9d2c0',
      ink: '#4a7f8c', accent: '#e8836a', soft: '#c8dde0', player: '#39618e' } },
  sketch: { key: 'sketch', zh: '素描', en: 'SKETCH', weapon: '炭笔 · 擦除',
    pal: { paper: '#f6f4ef', sky: '#efede7', far: '#d8d5cd', mid: '#b9b6ad', near: '#8f8c84',
      ground: '#4a4842', groundHi: '#6e6b63', plat: '#5a574f', platHi: '#83806f',
      ink: '#3a3936', accent: '#a8443c', soft: '#c5c2b8', player: '#33322e' } },
  oil: { key: 'oil', zh: '油画', en: 'OIL PAINT', weapon: '刮刀 · 削层',
    pal: { paper: '#3a4d63', sky: '#2c4460', far: '#5d6d4a', mid: '#7a4b33', near: '#4c3826',
      ground: '#3f2f22', groundHi: '#8a5a33', plat: '#54402c', platHi: '#96703d',
      ink: '#1f1a14', accent: '#d9a13b', soft: '#c8b08a', player: '#23262e' } },
  print: { key: 'print', zh: '版画', en: 'WOODCUT', weapon: '刻刀 · 雕痕',
    pal: { paper: '#f0e9d8', sky: '#f0e9d8', far: '#1a1a20', mid: '#1a1a20', near: '#1a1a20',
      ground: '#151519', groundHi: '#f0e9d8', plat: '#1a1a20', platHi: '#f0e9d8',
      ink: '#17171c', accent: '#c2352a', soft: '#8a8578', player: '#141419' } },
  pixel: { key: 'pixel', zh: '像素', en: 'PIXEL', weapon: '激光笔 · 点射',
    pal: { paper: '#9ad3ea', sky: '#8ecbe8', far: '#5cab67', mid: '#3f8f52', near: '#2e7243',
      ground: '#8a5a3a', groundHi: '#b07a4a', plat: '#7a4c30', platHi: '#a5713f',
      ink: '#2a2a3a', accent: '#ffd23e', soft: '#c9e8f2', player: '#e2483d' } },
  paper: { key: 'paper', zh: '剪纸', en: 'PAPERCUT', weapon: '剪刀 · 断折',
    pal: { paper: '#f6e8d0', sky: '#f2d8ae', far: '#d95f4a', mid: '#b23a2e', near: '#8a271f',
      ground: '#6f1d16', groundHi: '#e8b04a', plat: '#8a271f', platHi: '#e8b04a',
      ink: '#33201a', accent: '#e8b04a', soft: '#f2c9a0', player: '#2c1c16' } },
  blank: { key: 'blank', zh: '纯白', en: 'BLANK', weapon: '万具匣 · 造物',
    pal: { paper: '#ffffff', sky: '#ffffff', far: '#f1f1f1', mid: '#e7e7e7', near: '#dcdcdc',
      ground: '#e3e3e3', groundHi: '#bdbdbd', plat: '#ececec', platHi: '#c4c4c4',
      ink: '#8f8f96', accent: '#5a5a64', soft: '#f3f3f3', player: '#4a4a52' } },
};
const ZONE_ORDER = ['ink', 'water', 'sketch', 'oil', 'print', 'pixel', 'paper'];
function getStyle(k) { return STYLES[k] || STYLES.ink; }

/* ---------- 粗糙轮廓（木刻/毛笔的抖动边缘，种子稳定） ---------- */
function roughRectPath(ctx, x, y, w, h, amp, seed, step) {
  const r = mulberry32(seed | 0);
  step = step || 26;
  const pts = [];
  const seg = (x1, y1, x2, y2) => {
    const n = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([lerp(x1, x2, t) + (r() - .5) * amp, lerp(y1, y2, t) + (r() - .5) * amp]);
    }
  };
  seg(x, y, x + w, y); seg(x + w, y, x + w, y + h); seg(x + w, y + h, x, y + h); seg(x, y + h, x, y);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function roughLine(ctx, x1, y1, x2, y2, amp, seed, step) {
  const r = mulberry32(seed | 0);
  step = step || 18;
  const n = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / step));
  ctx.beginPath(); ctx.moveTo(x1 + (r() - .5) * amp, y1 + (r() - .5) * amp);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    ctx.lineTo(lerp(x1, x2, t) + (r() - .5) * amp, lerp(y1, y2, t) + (r() - .5) * amp);
  }
}
/* 排线填充（素描/版画）：pathFn 构建 clip 路径 */
function hatchFill(ctx, pathFn, cx, cy, R, ang, sp, col, alpha, lw) {
  ctx.save();
  pathFn(ctx); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = lw || 1.1;
  ctx.beginPath();
  for (let d = -R; d <= R; d += sp) { ctx.moveTo(-R, d); ctx.lineTo(R, d); }
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* ---------- 风格化上墨 ---------- */
const Paint = {
  fill(ctx, pathFn, col, o = {}) {
    col = col || '#222';
    switch (curStyle()) {
      case 'ink': {
        ctx.fillStyle = col; ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = shade(col, -28); ctx.lineWidth = 2.5; ctx.globalAlpha = .8;
        pathFn(ctx); ctx.stroke();
        ctx.save(); ctx.translate(1.5, 2); ctx.lineWidth = 1.1; ctx.globalAlpha = .35;
        pathFn(ctx); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
        break;
      }
      case 'water': {
        const A = o.alpha != null ? o.alpha : 1;
        ctx.globalAlpha = .68 * A; ctx.fillStyle = col; pathFn(ctx); ctx.fill();
        ctx.globalAlpha = .3 * A; ctx.fillStyle = shade(col, 36);
        ctx.save(); ctx.translate(-3, -4); pathFn(ctx); ctx.fill(); ctx.restore();
        ctx.strokeStyle = shade(col, -20); ctx.lineWidth = 3; ctx.globalAlpha = .3 * A;
        pathFn(ctx); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 'sketch': {
        const A = o.alpha != null ? o.alpha : 1;
        ctx.fillStyle = '#f2f0ea'; ctx.globalAlpha = .92 * A; pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        const R = o.hR || 170;
        ctx.save(); pathFn(ctx); ctx.clip();
        ctx.strokeStyle = col; ctx.globalAlpha = .5 * A; ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let d = -R; d <= R; d += (o.sp || 7)) { ctx.moveTo(d - R, -R); ctx.lineTo(d + R, R); }
        ctx.stroke();
        ctx.globalAlpha = .2 * A; ctx.lineWidth = .8; ctx.beginPath();
        for (let d = -R; d <= R; d += (o.sp || 7) * 2) { ctx.moveTo(d + R, -R); ctx.lineTo(d - R, R); }
        ctx.stroke(); ctx.restore();
        ctx.strokeStyle = shade(col, -15); ctx.lineWidth = 1.6; ctx.globalAlpha = .75 * A;
        pathFn(ctx); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 'oil': {
        const A = o.alpha != null ? o.alpha : 1;
        ctx.fillStyle = col; ctx.globalAlpha = A; pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        ctx.save(); pathFn(ctx); ctx.clip();
        ctx.translate(5, 7); ctx.fillStyle = shade(col, -32); ctx.globalAlpha = .5 * A;
        pathFn(ctx); ctx.fill();
        ctx.translate(-9, -11); ctx.fillStyle = shade(col, 34); ctx.globalAlpha = .38 * A;
        pathFn(ctx); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
        ctx.strokeStyle = shade(col, -45); ctx.lineWidth = 3.5; ctx.globalAlpha = .8 * A;
        pathFn(ctx); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 'print': {
        ctx.fillStyle = '#17171c'; ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        if (o.cut) {
          ctx.save(); pathFn(ctx); ctx.clip();
          ctx.strokeStyle = '#f0e9d8'; ctx.lineWidth = 2; o.cut(ctx);
          ctx.restore();
        }
        break;
      }
      case 'pixel': {
        ctx.fillStyle = col; ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = shade(col, -30); ctx.lineWidth = 2;
        pathFn(ctx); ctx.stroke();
        break;
      }
      case 'paper': {
        ctx.save(); ctx.translate(6, 8); ctx.fillStyle = 'rgba(60,24,12,.3)';
        pathFn(ctx); ctx.fill(); ctx.restore();
        ctx.fillStyle = col; ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff7ea'; ctx.lineWidth = 2; ctx.globalAlpha = .9;
        pathFn(ctx); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 'blank': {
        ctx.fillStyle = o.hollow ? 'rgba(255,255,255,.0)' : '#fdfdfd';
        ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
        pathFn(ctx); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = o.lw || 2;
        pathFn(ctx); ctx.stroke();
        break;
      }
    }
  },
  stroke(ctx, pathFn, col, w, o = {}) {
    const key = curStyle();
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (key === 'ink') {
      ctx.lineWidth = w; ctx.globalAlpha = .9; pathFn(ctx); ctx.stroke();
      ctx.lineWidth = w * .5; ctx.globalAlpha = .5;
      ctx.save(); ctx.translate(1, 1.5); pathFn(ctx); ctx.stroke(); ctx.restore();
    } else if (key === 'water') {
      ctx.lineWidth = w; ctx.globalAlpha = .7; pathFn(ctx); ctx.stroke();
    } else if (key === 'sketch') {
      ctx.lineWidth = Math.max(1, w * .6); ctx.globalAlpha = .8; pathFn(ctx); ctx.stroke();
      ctx.save(); ctx.translate(1.4, -1); ctx.lineWidth = Math.max(.8, w * .35); ctx.globalAlpha = .4;
      pathFn(ctx); ctx.stroke(); ctx.restore();
    } else if (key === 'oil') {
      ctx.lineWidth = w * 1.25; ctx.globalAlpha = .95; pathFn(ctx); ctx.stroke();
      ctx.strokeStyle = shade(col, 40); ctx.lineWidth = w * .4; ctx.globalAlpha = .5;
      ctx.save(); ctx.translate(-1.5, -2); pathFn(ctx); ctx.stroke(); ctx.restore();
    } else if (key === 'paper') {
      ctx.lineWidth = w; ctx.globalAlpha = .95; pathFn(ctx); ctx.stroke();
    } else {
      ctx.lineWidth = w; ctx.globalAlpha = .9; pathFn(ctx); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};

/* ---------- 背景（天空 + 视差远山/树木） ---------- */
function styleBG(ctx, cam) {
  const st = getStyle(curStyle()), pal = st.pal;
  const vx = cam.x, vy = cam.y;
  ctx.fillStyle = pal.sky;
  ctx.fillRect(vx - 8, vy - 8, W + 16, H + 16);
  drawSkyDeco(ctx, st, vx, vy);
  ctx.save(); ctx.translate(cam.x * .65, cam.y * .75);
  for (const d of G.decos.far) if (d.x > vx - 500 && d.x < vx + W + 500) drawHill(ctx, st, d);
  ctx.restore();
  ctx.save(); ctx.translate(cam.x * .3, cam.y * .5);
  for (const d of G.decos.mid) if (d.x > vx - 300 && d.x < vx + W + 300) drawTree(ctx, st, d);
  ctx.restore();
}
function drawSkyDeco(ctx, st, vx, vy) {
  const pal = st.pal, sx = vx + W * .78, sy = vy + 120;
  switch (st.key) {
    case 'ink':
      ctx.strokeStyle = 'rgba(90,86,72,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 42, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(120,114,96,.12)';
      ctx.beginPath(); ctx.ellipse(vx + W * .3, vy + 90, 260, 46, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(vx + W * .62, vy + 190, 320, 60, 0, 0, TAU); ctx.fill();
      break;
    case 'water':
      for (let i = 3; i >= 1; i--) {
        ctx.fillStyle = 'rgba(250,225,180,' + (.08 * (4 - i)) + ')';
        ctx.beginPath(); ctx.arc(sx, sy, 30 * i, 0, TAU); ctx.fill();
      }
      break;
    case 'sketch':
      ctx.strokeStyle = 'rgba(80,78,70,.4)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(vx, vy + 350); ctx.lineTo(vx + W, vy + 350); ctx.stroke();
      ctx.globalAlpha = .25;
      hatchFill(ctx, c => { c.beginPath(); c.ellipse(vx + W * .3, vy + 110, 90, 26, 0, 0, TAU); }, vx + W * .3, vy + 110, 120, .5, 8, '#6a675e', .5, 1);
      hatchFill(ctx, c => { c.beginPath(); c.ellipse(vx + W * .68, vy + 70, 70, 20, 0, 0, TAU); }, vx + W * .68, vy + 70, 110, .5, 9, '#6a675e', .5, 1);
      ctx.globalAlpha = 1;
      break;
    case 'oil':
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = i % 2 ? shade(pal.sky, 26) : shade(pal.sky, -20);
        ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.globalAlpha = .5;
        const yy = vy + 40 + i * 62;
        ctx.beginPath(); ctx.moveTo(vx - 40, yy);
        ctx.quadraticCurveTo(vx + W * .5, yy + (i % 2 ? 18 : -18), vx + W + 40, yy + (i % 2 ? 8 : -8));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    case 'print': {
      ctx.fillStyle = pal.accent;
      ctx.beginPath(); ctx.arc(sx, sy, 52, 0, TAU); ctx.fill();
      ctx.strokeStyle = pal.paper; ctx.lineWidth = 7;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * 58, sy + Math.sin(a) * 58);
        ctx.lineTo(sx + Math.cos(a) * 92, sy + Math.sin(a) * 92);
        ctx.stroke();
      }
      break;
    }
    case 'pixel': {
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(sx - 26, sy - 26, 52, 52);
      ctx.fillStyle = '#ffffff';
      const cy1 = vy + 100, cy2 = vy + 190;
      ctx.fillRect(vx + 160, cy1, 150, 34); ctx.fillRect(vx + 190, cy1 - 24, 90, 26);
      ctx.fillRect(vx + 720, cy2, 180, 34); ctx.fillRect(vx + 760, cy2 - 24, 100, 26);
      break;
    }
    case 'paper':
      Paint.fill(ctx, c => { c.beginPath(); c.arc(sx, sy, 56, 0, TAU); }, pal.accent, {});
      ctx.save(); ctx.translate(8, 10);
      ctx.fillStyle = 'rgba(255,250,235,.75)';
      ctx.beginPath(); ctx.ellipse(vx + W * .25, vy + 130, 90, 30, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(vx + W * .55, vy + 70, 70, 24, 0, 0, TAU); ctx.fill();
      ctx.restore();
      break;
  }
}
function drawHill(ctx, st, d) {
  const path = c => {
    c.beginPath();
    c.moveTo(d.x - d.w / 2, d.y + d.h);
    c.quadraticCurveTo(d.x, d.y - d.h * .7, d.x + d.w / 2, d.y + d.h);
    c.closePath();
  };
  if (st.key === 'print') {
    Paint.fill(ctx, path, '#1a1a20', { cut: c => {
      c.beginPath();
      c.moveTo(d.x - d.w / 2 + 20, d.y + d.h * .5); c.lineTo(d.x + d.w / 2 - 20, d.y + d.h * .5);
      c.moveTo(d.x - d.w / 4, d.y + d.h * .8); c.lineTo(d.x + d.w / 2 - 40, d.y + d.h * .8);
      c.stroke();
    } });
  } else if (st.key === 'sketch') {
    Paint.fill(ctx, path, d.col, { hR: 260, sp: 11 });
  } else {
    Paint.fill(ctx, path, d.col, { alpha: st.key === 'water' ? .55 : 1 });
  }
}
function drawTree(ctx, st, d) {
  const pal = st.pal, s = d.s;
  const trunk = c => {
    c.beginPath();
    c.moveTo(d.x - 4 * s, d.y);
    c.quadraticCurveTo(d.x - 2 * s, d.y - 30 * s, d.x - 1 * s, d.y - 46 * s);
    c.lineTo(d.x + 2 * s, d.y - 46 * s);
    c.quadraticCurveTo(d.x + 3 * s, d.y - 28 * s, d.x + 5 * s, d.y);
    c.closePath();
  };
  if (st.key === 'print') Paint.fill(ctx, trunk, '#17171c', {});
  else if (st.key === 'pixel') { ctx.fillStyle = '#6b4226'; ctx.fillRect(d.x - 4 * s, d.y - 44 * s, 8 * s, 44 * s); }
  else Paint.fill(ctx, trunk, shade(pal.near, -12), { hR: 90, sp: 5 });
  const cx = d.x, cy = d.y - 58 * s;
  switch (st.key) {
    case 'ink': {
      const rr = mulberry32(d.seed);
      ctx.fillStyle = pal.ink;
      for (let i = 0; i < 14; i++) {
        const a = rr() * TAU, r2 = rr() * 26 * s;
        ctx.globalAlpha = .45 + rr() * .4;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * .7, (3 + 6 * rr()) * s, (2 + 4 * rr()) * s, rr() * 3, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1; break;
    }
    case 'water':
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(cx, cy, 30 * s, 22 * s, 0, 0, TAU); c.ellipse(cx - 18 * s, cy + 8 * s, 18 * s, 14 * s, 0, 0, TAU); }, pal.mid, { alpha: .8 });
      break;
    case 'sketch':
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(cx, cy - 34 * s); c.lineTo(cx + 26 * s, cy + 16 * s); c.lineTo(cx - 26 * s, cy + 16 * s); c.closePath(); }, pal.mid, { hR: 120, sp: 6 });
      break;
    case 'oil':
      Paint.fill(ctx, c => { c.beginPath(); c.arc(cx, cy, 26 * s, 0, TAU); c.arc(cx - 20 * s, cy + 10 * s, 16 * s, 0, TAU); c.arc(cx + 20 * s, cy + 8 * s, 17 * s, 0, TAU); }, pal.mid, {});
      break;
    case 'print':
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(cx, cy - 36 * s); c.lineTo(cx + 30 * s, cy + 18 * s); c.lineTo(cx - 30 * s, cy + 18 * s); c.closePath(); }, '#17171c', { cut: c => {
        c.beginPath();
        for (let i = -2; i <= 2; i++) { c.moveTo(cx + i * 10 * s, cy + 14 * s); c.lineTo(cx + i * 4 * s, cy - i * 6 * s); }
        c.stroke();
      } });
      break;
    case 'pixel':
      ctx.fillStyle = pal.mid; ctx.fillRect(cx - 24 * s, cy - 16 * s, 48 * s, 32 * s);
      ctx.fillStyle = pal.far; ctx.fillRect(cx - 16 * s, cy - 30 * s, 32 * s, 16 * s);
      break;
    case 'paper':
      Paint.fill(ctx, c => { c.beginPath(); c.arc(cx, cy, 26 * s, 0, TAU); }, pal.mid, {});
      ctx.strokeStyle = '#fff7ea'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - 26 * s); ctx.lineTo(cx, cy + 26 * s); ctx.stroke();
      break;
  }
}

/* ---------- 后处理：纸纹 / 画布纹理 / 暗角 / 屏幕墨渍 ---------- */
let grainCv = null, weaveCv = null;
function initTextures() {
  grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 320;
  const gc = grainCv.getContext('2d');
  gc.fillStyle = '#fff'; gc.fillRect(0, 0, 320, 320);
  for (let i = 0; i < 5200; i++) {
    const v = 200 + Math.random() * 55 | 0;
    gc.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 8) + ',.5)';
    gc.fillRect(Math.random() * 320, Math.random() * 320, 1.6, 1.6);
  }
  weaveCv = document.createElement('canvas'); weaveCv.width = weaveCv.height = 64;
  const wc = weaveCv.getContext('2d');
  wc.fillStyle = '#888'; wc.fillRect(0, 0, 64, 64);
  wc.fillStyle = '#999';
  for (let i = 0; i < 64; i += 4) { wc.fillRect(i, 0, 2, 64); wc.fillRect(0, i, 64, 2); }
}
function tileTex(ctx, tex) {
  for (let y = 0; y < H; y += tex.height)
    for (let x = 0; x < W; x += tex.width)
      ctx.drawImage(tex, x, y);
}
function drawStain(ctx, s) {
  const rr = mulberry32(s.seed | 0);
  let fade = s.t < 1 ? s.t : Math.max(0, 1 - (s.t - (s.life - 2)) / 2);
  fade = clamp(fade, 0, 1);
  ctx.save();
  ctx.globalAlpha = s.a * .8 * fade;
  ctx.fillStyle = '#1c1a20';
  for (let i = 0; i < 6; i++) {
    const a = rr() * TAU, d2 = rr() * s.r;
    ctx.beginPath();
    ctx.ellipse(s.x + Math.cos(a) * d2, s.y + Math.sin(a) * d2, s.r * (.5 + rr() * .7), s.r * (.4 + rr() * .6), rr() * 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function stylePost(ctx) {
  const key = curStyle();
  if (key !== 'pixel') {
    ctx.save();
    ctx.globalAlpha = ({ ink: .07, water: .05, sketch: .05, print: .08, paper: .06, oil: 0, pixel: 0 })[key] || 0;
    ctx.globalCompositeOperation = 'multiply';
    tileTex(ctx, grainCv);
    ctx.restore();
  }
  if (key === 'oil') {
    ctx.save(); ctx.globalAlpha = .05; tileTex(ctx, weaveCv); ctx.restore();
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * .78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, key === 'pixel' ? 'rgba(0,0,0,.15)' : 'rgba(18,14,8,.24)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (key === 'ink' || G.overlay === 'ink')
    for (const s of G.stains) drawStain(ctx, s);
}
