'use strict';
/* ============================================================
   《墨境：千面残章》render.js —— 世界渲染管线 / 像素低清缓冲 / 混合污染
   ============================================================ */
let pixCv = null, pixCtx = null;
const PIXS = 6;
function initSurfaces() {
  initTextures();
  pixCv = document.createElement('canvas');
  pixCv.width = Math.ceil(W / PIXS); pixCv.height = Math.ceil(H / PIXS);
  pixCtx = pixCv.getContext('2d');
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
  if (curStyle() === 'pixel') {
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
  /* Boss 二阶段：水墨×像素 混合污染 */
  if (G.pixMix > .02 && curStyle() !== 'pixel') renderPixMix(ctx, cam);
  stylePost(ctx);
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
    }
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
    if (it.x < cam.x - 200 || it.x > cam.x + W + 200) continue;
    if (it.type === 'shrine') {
      const y = it.y;
      Paint.fill(ctx, c => roughRectPath(c, it.x - 16, y - 86, 32, 86, 4, it.x, 14), shade(pal.near, -8), { hR: 120, sp: 8 });
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(it.x - 30, y - 86); c.quadraticCurveTo(it.x, y - 108, it.x + 30, y - 86); c.lineTo(it.x + 22, y - 78); c.lineTo(it.x - 22, y - 78); c.closePath(); }, shade(pal.ink, 6), {});
      /* 灯火 */
      ctx.fillStyle = it.taken ? pal.accent : 'rgba(255,220,140,.9)';
      ctx.beginPath(); ctx.arc(it.x, y - 62, 5 + Math.sin(G.t * 5 + it.x) * 1.2, 0, TAU); ctx.fill();
      if (!it.taken) {
        const bob = Math.sin(G.t * 2.4) * 7;
        pageIcon(ctx, it.style, it.x, y - 148 + bob, 22, true);
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(it.x, y - 148 + bob, 20 + Math.sin(G.t * 3) * 3, 0, TAU); ctx.stroke();
      }
    } else if (it.type === 'lever') {
      Paint.fill(ctx, c => roughRectPath(c, it.x - 14, it.y - 34, 28, 34, 3, it.x + 5, 12), shade(pal.plat, 6), {});
      const ang = it.on ? -.7 : .7;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(it.x, it.y - 30); c.lineTo(it.x + Math.sin(ang) * 30, it.y - 30 - Math.cos(ang) * 30); }, pal.accent, 5, {});
      ctx.fillStyle = pal.accent;
      ctx.beginPath(); ctx.arc(it.x + Math.sin(ang) * 30, it.y - 30 - Math.cos(ang) * 30, 6, 0, TAU); ctx.fill();
    } else if (it.type === 'fold') {
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(it.x, it.y - 260); ctx.lineTo(it.x, it.y); ctx.stroke();
      ctx.setLineDash([]);
      const bob = Math.sin(G.t * 3) * 4;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.moveTo(it.x - 10, it.y - 270 + bob); ctx.lineTo(it.x, it.y - 284 + bob); ctx.lineTo(it.x + 10, it.y - 270 + bob); ctx.closePath(); ctx.fill();
    } else if (it.type === 'orb') {
      if (it.taken) continue;
      const bob = Math.sin(G.t * 3 + it.x) * 6;
      ctx.fillStyle = getStyle('ink').pal.accent;
      ctx.beginPath(); ctx.arc(it.x, it.y + bob, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.arc(it.x - 3, it.y + bob - 3, 3.5, 0, TAU); ctx.fill();
    } else if (it.type === 'gate') {
      Paint.fill(ctx, c => roughRectPath(c, it.x - 60, it.y - 240, 16, 240, 4, it.x, 16), shade(pal.ink, 4), {});
      Paint.fill(ctx, c => roughRectPath(c, it.x + 44, it.y - 240, 16, 240, 4, it.x + 9, 16), shade(pal.ink, 4), {});
      Paint.fill(ctx, c => roughRectPath(c, it.x - 78, it.y - 256, 156, 18, 4, it.x + 3, 16), pal.accent, {});
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
