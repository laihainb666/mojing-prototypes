'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》render.js —— 渲染管线 / 笔迹 / 黑暗 / 像素混合
   ============================================================ */
let pixCv = null, pixCtx = null, darkCv = null, darkCtx = null;
const PIXS = 6;
function initSurfaces() {
  initTextures();
  pixCv = document.createElement('canvas');
  pixCv.width = Math.ceil(W / PIXS); pixCv.height = Math.ceil(H / PIXS);
  pixCtx = pixCv.getContext('2d');
  darkCv = document.createElement('canvas'); darkCv.width = W; darkCv.height = H;
  darkCtx = darkCv.getContext('2d');
}
function inView(e, cam, pad) {
  pad = pad || 160;
  return e.x > cam.x - pad && e.x < cam.x + W + pad;
}

/* ---------- 主入口：按当前画风渲染整个世界 ---------- */
function renderScene(ctx) {
  const cam = G.cam;
  const sx = (Math.random() - .5) * cam.shake, sy = (Math.random() - .5) * cam.shake;
  ctx.imageSmoothingEnabled = false;
  if (curStyle() === 'pixel' || G.forcePixel) {
    pixCtx.setTransform(1, 0, 0, 1, 0, 0);
    pixCtx.clearRect(0, 0, pixCv.width, pixCv.height);
    pixCtx.scale(1 / PIXS, 1 / PIXS);
    pixCtx.translate(-cam.x + sx, -cam.y + sy);
    drawWorld(pixCtx, cam);
    ctx.filter = 'saturate(1.3) contrast(1.18)';
    ctx.drawImage(pixCv, 0, 0, W, H);
    ctx.filter = 'none';
  } else {
    ctx.save();
    ctx.translate(-cam.x + sx, -cam.y + sy);
    drawWorld(ctx, cam);
    ctx.restore();
  }
  /* 混合污染（水墨×像素） */
  if (G.pixMix > .02 && curStyle() !== 'pixel' && !G.forcePixel) renderPixMix(ctx, cam);
  stylePost(ctx);
  /* 黑暗（电路失明 / 空白之心） */
  if (G.dark > .01) renderDarkness(ctx);
}
function renderDarkness(ctx) {
  const d = darkCtx;
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.clearRect(0, 0, W, H);
  d.fillStyle = 'rgba(8,8,14,' + clamp(G.dark, 0, 1) * .93 + ')';
  d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  const punch = (wx, wy, r, str) => {
    const sx = wx - G.cam.x, sy = wy - G.cam.y;
    if (sx < -300 || sx > W + 300 || sy < -300 || sy > H + 300) return;
    const g = d.createRadialGradient(sx, sy, r * .18, sx, sy, r);
    g.addColorStop(0, 'rgba(0,0,0,' + (str || 1) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath(); d.arc(sx, sy, r, 0, TAU); d.fill();
  };
  if (G.player) punch(G.player.x, G.player.y - 30, 170, .96);
  for (const s of G.strokes) if (s.tool === 'highlight') punch(s.cx, s.cy, 150, .9);
  for (const it of G.inter) if (it.type === 'spark' && !it.taken) punch(it.x, it.y, 90, .8);
  if (G.bossOn && G.boss) punch(G.boss.x, G.boss.y, 190, .9);
  for (const e of G.enemies) if (!e.dead) punch(e.x, e.y - 20, 70, .5);
  d.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCv, 0, 0);
}
function renderPixMix(ctx, cam) {
  pixCtx.setTransform(1, 0, 0, 1, 0, 0);
  pixCtx.clearRect(0, 0, pixCv.width, pixCv.height);
  pixCtx.scale(1 / PIXS, 1 / PIXS);
  pixCtx.translate(-cam.x, -cam.y);
  drawWorld(pixCtx, cam);
  const bs = 64, cols = Math.ceil(W / bs), rows = Math.ceil(H / bs);
  const t = G.t;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const n = Math.sin(i * 12.9898 + j * 78.233 + t * 1.7) * 43758.5453;
    const f = n - Math.floor(n);
    const wave = clamp(G.pixMix * 1.5 - Math.abs(i / cols - .5) * .8, 0, 1);
    if (f < wave) ctx.drawImage(pixCv, i * bs / PIXS, j * bs / PIXS, bs / PIXS, bs / PIXS, i * bs, j * bs, bs, bs);
  }
}

/* ---------- 世界各层 ---------- */
function drawWorld(ctx, cam) {
  styleBG(ctx, cam);
  /* 世界色彩晕染 */
  for (const w of G.washes) {
    const f = 1 - w.t / w.life;
    ctx.save(); ctx.globalAlpha = .22 * f; ctx.fillStyle = w.col;
    ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * (1.3 - f * .3), w.r * .8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  drawPlatforms(ctx, cam);
  drawStrokes(ctx, cam);
  drawRoller(ctx, cam);
  drawMud(ctx, cam);
  drawInter(ctx, cam);
  if (G.state !== 'title') drawHints(ctx, cam);
  for (const e of G.enemies) if (!e.dead && inView(e, cam)) drawEnemy(ctx, e);
  if (G.bossOn && G.boss) drawBoss(ctx);
  if (G.player) drawPlayer(ctx);
  drawProjs(ctx);
  drawParts(ctx);
  drawTexts(ctx);
}
function drawTexts(ctx) {
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const a = 1 - t.t / t.life;
    ctx.globalAlpha = a;
    setFont(ctx, 22, true);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,18,24,.75)';
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}
function drawParts(ctx) {
  for (const p of G.parts) {
    const a = clamp(1 - p.t / p.life, 0, 1) * (p.alpha != null ? p.alpha : 1);
    ctx.save(); ctx.globalAlpha = a;
    if (p.type === 'rect' || p.type === 'chip') {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66);
    } else if (p.type === 'petal') {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * .5, 0, 0, TAU); ctx.fill();
    } else if (p.type === 'line') {
      ctx.strokeStyle = p.col; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * .04, p.y - p.vy * .04); ctx.stroke();
    } else if (p.type === 'ring') {
      ctx.strokeStyle = p.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.t * 4), 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- 平台 / 机关绘制 ---------- */
function drawPlatforms(ctx, cam) {
  const pal = getStyle(curStyle()).pal;
  const vx0 = cam.x - 100, vx1 = cam.x + W + 100;
  for (const p of G.platforms) {
    if (p.x + p.w < vx0 || p.x > vx1) continue;
    if (p.kind === 'ground') {
      const path = c => roughRectPath(c, p.x, p.y, p.w, p.h + 80, 5, p.x * .13 + 7, 30);
      Paint.fill(ctx, path, pal.ground, { hR: 300, sp: 10 });
      /* 顶部亮边 */
      Paint.stroke(ctx, c => roughLine(c, p.x + 4, p.y + 2, p.x + p.w - 4, p.y + 2, 4, p.x * .17 + 3, 34), pal.groundHi, 5, {});
      if (curStyle() === 'pixel') {
        ctx.fillStyle = pal.groundHi;
        for (let gx = p.x; gx < p.x + p.w; gx += 24) ctx.fillRect(gx, p.y + 4, 20, 10);
      }
    } else if (p.kind === 'plat') {
      const path = c => roughRectPath(c, p.x, p.y, p.w, p.h, 4, p.x * .31 + 11, 20);
      Paint.fill(ctx, path, pal.plat, { hR: 160, sp: 8 });
      Paint.stroke(ctx, c => roughLine(c, p.x + 3, p.y + 2, p.x + p.w - 3, p.y + 2, 3, p.x * .7 + 1, 22), pal.platHi, 4, {});
      if (p.morph) { /* 机关桥梁的刻纹 */
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
        for (let gx = p.x + 16; gx < p.x + p.w - 8; gx += 34) {
          ctx.beginPath(); ctx.moveTo(gx, p.y + 4); ctx.lineTo(gx - 8, p.y + p.h - 4); ctx.stroke();
        }
      }
    } else if (p.kind === 'bounce') {
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h, 0, 0, TAU); }, pal.accent, {});
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      const bob = Math.sin(G.t * 4) * 3;
      for (let i = 0; i < 2; i++) {
        const ax = p.x + p.w / 2 - 8 + i * 16, ay = p.y - 14 + bob + i * 6;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 6, ay - 9); ctx.lineTo(ax + 12, ay); ctx.closePath(); ctx.fill();
      }
    } else if (p.kind === 'gwall') {
      drawGWall(ctx, p, pal);
    } else if (p.kind === 'wall') {
      Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 6, p.x * .5 + 3, 24), shade(pal.ground, -14), {});
    } else if (p.kind === 'brittle') { /* 炭条脆平台 */
      const a = p.crumbT > 0 ? .5 + .5 * Math.abs(Math.sin(G.t * 20)) : 1;
      ctx.globalAlpha = a;
      Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 3, p.x * .9 + 5, 12), '#4a443c', { sp: 4, hR: 90 });
      ctx.globalAlpha = 1;
    } else if (p.kind === 'sink') { /* 承重厚涂 */
      const f = clamp(p.sink / (p.sinkMax || 60), 0, 1);
      Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 5, p.x * .6 + 2, 18), f > .7 ? '#7a3020' : '#a24a2c', {});
      Paint.stroke(ctx, c => roughLine(c, p.x + 3, p.y + 2, p.x + p.w - 3, p.y + 2, 3, p.x * .8 + 1, 20), '#d9a13b', 5, {});
      if (f > .3) { /* 裂纹 */
        ctx.strokeStyle = 'rgba(30,14,8,.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let gx = p.x + 14; gx < p.x + p.w - 8; gx += 30) { ctx.moveTo(gx, p.y + 4); ctx.lineTo(gx + 8, p.y + Math.min(p.h - 4, 10 + f * 26)); }
        ctx.stroke();
      }
    } else if (p.kind === 'mirrorOnly') { /* 倒影平台 */
      const on = G.mirror;
      ctx.globalAlpha = on ? .95 : .28;
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h, 0, 0, TAU); }, on ? '#3f6f9e' : '#9fc3b8', {});
      ctx.globalAlpha = on ? .8 : .35;
      ctx.strokeStyle = '#bfe2ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x + 6, p.y + p.h / 2); ctx.lineTo(p.x + p.w - 6, p.y + p.h / 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.kind === 'hidden') { /* 隐藏平台：荧光笔显形 */
      const seen = p.revealT > 0;
      ctx.globalAlpha = seen ? (.6 + .3 * Math.sin(G.t * 6)) : .07;
      Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 3, p.x * .4 + 9, 14), '#ffe86a', {});
      ctx.globalAlpha = 1;
    } else if (p.kind === 'ice') {
      Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 3, p.x * .2 + 3, 14), '#cfe8f8', {});
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x + 4, p.y + 3); ctx.lineTo(p.x + p.w - 4, p.y + 3); ctx.stroke();
    } else if (p.kind === 'liquid') {
      const wob = Math.sin(G.t * 2.2) * 4;
      Paint.fill(ctx, c => {
        c.beginPath();
        c.moveTo(p.x, p.y + wob);
        for (let gx = p.x; gx <= p.x + p.w; gx += 40) c.quadraticCurveTo(gx + 20, p.y + wob * 2, gx + 40, p.y + wob);
        c.lineTo(p.x + p.w, p.y + p.h + 60); c.lineTo(p.x, p.y + p.h + 60); c.closePath();
      }, p.col || '#c86a34', { alpha: .88 });
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      for (let gx = p.x + 12; gx < p.x + p.w; gx += 90) {
        const gy = p.y + 14 + Math.sin(G.t * 1.7 + gx) * 5;
        ctx.beginPath(); ctx.ellipse(gx, gy, 26, 4, 0, 0, TAU); ctx.fill();
      }
    }
  }
}
/* ---------- 印刷滚筒（5-35） ---------- */
function drawRoller(ctx, cam) {
  const R = G.roller;
  if (!R || R.done) return;
  if (R.x + R.w < cam.x - 100 || R.x > cam.x + W + 100) return;
  const pal = getStyle('print').pal;
  Paint.fill(ctx, c => roughRectPath(c, R.x, R.y, R.w, R.h, 4, 55, 20), pal.ground, {});
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x + 2, R.y + 2, R.w - 4, R.h - 4); ctx.clip();
  ctx.strokeStyle = '#f0e9d8'; ctx.lineWidth = 5;
  const off = (G.t * 240) % 40;
  for (let gx = R.x - 44 + off; gx < R.x + R.w + 40; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, R.y - 2); ctx.lineTo(gx - 16, R.y + R.h + 2); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(R.x - 2, R.y + 4); ctx.lineTo(R.x - 2, R.y + R.h - 4); ctx.stroke();
}
/* ---------- 泥浆带（8-50） ---------- */
function drawMud(ctx, cam) {
  const M = G.mud;
  if (!M) return;
  if (M.x1 < cam.x - 60 || M.x0 > cam.x + W + 60) return;
  ctx.save();
  ctx.fillStyle = 'rgba(88,62,38,.32)';
  ctx.beginPath();
  ctx.moveTo(M.x0, 150);
  for (let gx = M.x0; gx <= M.x1; gx += 60) ctx.quadraticCurveTo(gx + 30, 138 + Math.sin(gx / 90 + G.t) * 7, gx + 60, 150);
  ctx.lineTo(M.x1, G.worldH);
  ctx.lineTo(M.x0, G.worldH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(60,42,24,.5)';
  for (let gx = M.x0 + 20; gx < M.x1 - 10; gx += 90) {
    const gy = 168 + Math.sin(G.t * 1.4 + gx) * 5;
    ctx.beginPath(); ctx.ellipse(gx, gy, 15, 5, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
/* ---------- 玩家笔迹（画出的平台） ---------- */
function drawStrokes(ctx, cam) {
  for (const s of G.strokes) {
    if (s.dead) continue;
    const vx0 = cam.x - 60, vx1 = cam.x + W + 60;
    let a = 1;
    if (s.ttl > 0 && s.ttl < 1.6) a = s.ttl / 1.6;
    if (s.fade) a *= s.fade;
    ctx.save();
    ctx.globalAlpha = a * (s.ghost ? .4 : .95);
    ctx.strokeStyle = s.col;
    ctx.lineWidth = s.lw;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    /* 崩坏笔迹（Boss 复制）抖动 */
    const jx = s.hostile ? Math.sin(G.t * 30 + s.id) * 1.5 : 0;
    ctx.translate(jx, 0);
    ctx.beginPath();
    ctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
    ctx.stroke();
    if (s.glow) {
      ctx.globalAlpha = a * .35;
      ctx.lineWidth = s.lw * 3;
      ctx.stroke();
    }
    if (s.hostile) {
      ctx.globalAlpha = a * .8;
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#ff4a8c';
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawGWall(ctx, p, pal) {
  const hpF = p.hp / p.hpMax;
  if (p.gs === 'sketch') {
    Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 4, p.seed, 18), '#d9d5cb', { hR: 260, sp: 7 });
    /* 擦除的破洞 */
    const holes = Math.round((1 - hpF) * 5);
    const rr = mulberry32(p.seed + 99);
    ctx.fillStyle = '#f6f4ef';
    for (let i = 0; i < holes; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x + 10 + rr() * (p.w - 20), p.y + 20 + rr() * (p.h - 40), 14 + rr() * 16, 18 + rr() * 20, rr() * 3, 0, TAU);
      ctx.fill();
    }
  } else {
    Paint.fill(ctx, c => roughRectPath(c, p.x, p.y, p.w, p.h, 6, p.seed, 20), '#a24a2c', {});
    Paint.fill(ctx, c => roughRectPath(c, p.x + 6, p.y + 8, p.w - 24, p.h - 40, 6, p.seed + 5, 18), '#c86a34', { alpha: .8 });
    const chips = Math.round((1 - hpF) * 4);
    const rr = mulberry32(p.seed + 7);
    ctx.fillStyle = '#3f2f22';
    for (let i = 0; i < chips; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x + 12 + rr() * (p.w - 24), p.y + 30 + rr() * (p.h - 60), 16 + rr() * 14, 22 + rr() * 18, rr() * 3, 0, TAU);
      ctx.fill();
    }
  }
}
function pageIcon(ctx, key, x, y, s, unlocked) {
  const st = getStyle(key), pal = st.pal;
  ctx.save(); ctx.translate(x, y);
  if (!unlocked) ctx.globalAlpha = .22;
  ctx.fillStyle = pal.ink; ctx.strokeStyle = pal.ink;
  switch (key) {
    case 'ink': ctx.beginPath(); ctx.arc(0, 0, s * .5, 0, TAU); ctx.fill(); break;
    case 'water': ctx.beginPath(); ctx.moveTo(0, -s * .55); ctx.quadraticCurveTo(s * .5, s * .1, 0, s * .55); ctx.quadraticCurveTo(-s * .5, s * .1, 0, -s * .55); ctx.fill(); break;
    case 'sketch': ctx.lineWidth = 1.6; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * .3 - s * .3, s * .4); ctx.lineTo(i * s * .3 + s * .3, -s * .4); ctx.stroke(); } break;
    case 'oil': ctx.lineWidth = s * .3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, s * .35, .6, TAU - .6); ctx.stroke(); break;
    case 'print': ctx.fillRect(-s * .45, -s * .45, s * .9, s * .9);
      ctx.fillStyle = '#f0e9d8'; setFont(ctx, s * 1.1, true); ctx.textAlign = 'center'; ctx.fillText('印', 0, s * .4); break;
    case 'pixel': ctx.fillRect(-s * .5, -s * .5, s * .4, s * .4); ctx.fillRect(s * .05, -s * .5, s * .4, s * .4); ctx.fillRect(-s * .5, s * .05, s * .4, s * .4); ctx.fillRect(s * .05, s * .05, s * .4, s * .4); break;
    case 'paper': ctx.beginPath(); ctx.moveTo(0, -s * .5); ctx.lineTo(s * .55, s * .4); ctx.lineTo(-s * .55, s * .4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff7ea'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -s * .5); ctx.lineTo(0, s * .4); ctx.stroke(); break;
  }
  ctx.restore();
}
function drawInter(ctx, cam) {
  const pal = getStyle(curStyle()).pal;
  for (const it of G.inter) {
    if (it.x < cam.x - 220 || it.x > cam.x + W + 220) continue;
    if (it.type === 'exit') {
      const open = it.locked !== true;
      const bob = Math.sin(G.t * 2) * 5;
      ctx.save();
      ctx.globalAlpha = open ? 1 : .35;
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(it.x, it.y - 52 + bob, 34, 52, 0, 0, TAU); }, pal.accent, {});
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(it.x, it.y - 52 + bob, 20, 36, 0, 0, TAU); }, pal.paper, {});
      ctx.globalAlpha = (open ? .6 : .15) * (.6 + .4 * Math.sin(G.t * 3));
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(it.x, it.y - 52 + bob, 44 + Math.sin(G.t * 2.4) * 5, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'center';
      setFont(ctx, 16, true);
      ctx.fillStyle = open ? 'rgba(40,36,30,.85)' : 'rgba(40,36,30,.5)';
      ctx.fillText(open ? (it.label || '出口') : (it.lockHint || '未解锁'), it.x, it.y - 116);
      ctx.textAlign = 'left';
    } else if (it.type === 'checkpoint') {
      Paint.fill(ctx, c => roughRectPath(c, it.x - 4, it.y - 78, 8, 78, 2, it.x, 10), shade(pal.near, -6), {});
      ctx.fillStyle = it.on ? '#7fb0c8' : 'rgba(150,150,150,.6)';
      ctx.beginPath();
      ctx.moveTo(it.x + 4, it.y - 76);
      ctx.lineTo(it.x + 34 + Math.sin(G.t * 2) * 3, it.y - 66);
      ctx.lineTo(it.x + 4, it.y - 54);
      ctx.closePath(); ctx.fill();
    } else if (it.type === 'node') { /* 电路节点 / 缺失像素 */
      if (it.missing) {
        if (!it.filled) {
          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = 'rgba(255,210,62,.85)'; ctx.lineWidth = 2.5;
          ctx.strokeRect(it.x - it.gapW / 2 + 4, it.y - 42, it.gapW - 8, 40);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255,210,62,' + (.5 + .4 * Math.sin(G.t * 5)) + ')';
          for (let i = 0; i < 4; i++) ctx.fillRect(it.x - 24 + i * 13, it.y - 26 + (i % 2) * 8, 9, 9);
          ctx.textAlign = 'center'; setFont(ctx, 14, true);
          ctx.fillStyle = 'rgba(255,210,62,.9)';
          ctx.fillText('缺失像素 · 马克笔 J 标记', it.x, it.y - 54);
          ctx.textAlign = 'left';
        }
      } else {
        const on = it.powered;
        ctx.strokeStyle = on ? '#ffd23e' : 'rgba(220,214,200,.8)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(it.x, it.y - 26, 15, 0, TAU); ctx.stroke();
        ctx.fillStyle = on ? '#ffd23e' : 'rgba(220,214,200,.6)';
        ctx.beginPath(); ctx.arc(it.x, it.y - 26, 6 + (on ? Math.sin(G.t * 8) * 1.5 : 0), 0, TAU); ctx.fill();
        if (on) for (let i = 0; i < 4; i++) {
          const a = G.t * 2 + i * TAU / 4;
          ctx.fillRect(it.x + Math.cos(a) * 22 - 2, it.y - 26 + Math.sin(a) * 22 - 2, 4, 4);
        }
        ctx.textAlign = 'center'; setFont(ctx, 15, true);
        ctx.fillStyle = on ? '#ffd23e' : 'rgba(220,214,200,.8)';
        ctx.fillText('节点 ' + it.node, it.x, it.y - 52);
        ctx.textAlign = 'left';
      }
    } else if (it.type === 'spark') {
      if (it.taken) continue;
      const bob = Math.sin(G.t * 3 + it.x) * 7;
      ctx.fillStyle = '#ffe86a';
      ctx.globalAlpha = .5 + .4 * Math.sin(G.t * 5 + it.x);
      ctx.beginPath(); ctx.arc(it.x, it.y + bob, 12, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(it.x, it.y + bob, 5, 0, TAU); ctx.fill();
    } else if (it.type === 'pool') { /* 可进入的倒影水潭 */
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(it.x, it.y, it.w / 2, it.h, 0, 0, TAU); }, G.mirror ? '#7fb0c8' : '#6fa397', { alpha: .8 });
      const r = (G.t * 26) % 44;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(it.x, it.y, it.w * .3 + r, it.h * .4 + r * .3, 0, 0, TAU); ctx.stroke();
      ctx.textAlign = 'center'; setFont(ctx, 15, true);
      ctx.fillStyle = 'rgba(40,50,60,.8)';
      ctx.fillText(G.mirror ? 'E — 浮出水面' : 'S / E — 潜入倒影', it.x, it.y - 44);
      ctx.textAlign = 'left';
    } else if (it.type === 'fold') {
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(it.x, it.y - 240); ctx.lineTo(it.x, it.y); ctx.stroke();
      ctx.setLineDash([]);
      const bob = Math.sin(G.t * 3) * 4;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.moveTo(it.x - 10, it.y - 250 + bob); ctx.lineTo(it.x, it.y - 264 + bob); ctx.lineTo(it.x + 10, it.y - 250 + bob); ctx.closePath(); ctx.fill();
    } else if (it.type === 'lever') {
      Paint.fill(ctx, c => roughRectPath(c, it.x - 14, it.y - 34, 28, 34, 3, it.x + 5, 12), shade(pal.plat, 6), {});
      const ang = it.used ? -.7 : .7;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(it.x, it.y - 30); c.lineTo(it.x + Math.sin(ang) * 30, it.y - 30 - Math.cos(ang) * 30); }, pal.accent, 5, {});
      ctx.fillStyle = pal.accent;
      ctx.beginPath(); ctx.arc(it.x + Math.sin(ang) * 30, it.y - 30 - Math.cos(ang) * 30, 6, 0, TAU); ctx.fill();
      if (!it.used) {
        ctx.textAlign = 'center'; setFont(ctx, 15, true);
        ctx.fillStyle = 'rgba(40,36,30,.85)';
        ctx.fillText('E — 翻面 · 滚筒启动', it.x, it.y - 78);
        ctx.textAlign = 'left';
      }
    } else if (it.type === 'seal') { /* 剪刀可剪的封印绳 */
      if (it.cut) continue;
      ctx.strokeStyle = '#c2352a'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(it.x, it.y - it.len);
      ctx.quadraticCurveTo(it.x + Math.sin(G.t * 3) * 5, it.y - it.len / 2, it.x, it.y);
      ctx.stroke();
      ctx.fillStyle = '#c2352a';
      ctx.beginPath(); ctx.arc(it.x, it.y - it.len, 6, 0, TAU); ctx.fill();
    }
  }
}
function drawHints(ctx, cam) {
  ctx.textAlign = 'center';
  for (const h of G.hints) {
    if (h.x < cam.x - 100 || h.x > cam.x + W + 100) continue;
    setFont(ctx, 19, false);
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(250,246,235,.85)';
    ctx.strokeText(h.str, h.x, h.y);
    ctx.fillStyle = 'rgba(46,42,38,.95)';
    ctx.fillText(h.str, h.x, h.y);
  }
  ctx.textAlign = 'left';
}
