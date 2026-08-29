'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》boss2.js —— 最终 Boss「无面绘世者」
   一阶段（水墨）：墨浪与扑击
   二阶段（素描）：橡皮之潮，擦掉你画出的一切
   三阶段（融合）：像素乱射 + 复制你的笔迹反噬其主
   ============================================================ */
function startBoss2() {
  if (G.bossOn || G.bossDead) return;
  G.bossOn = true;
  G.boss = {
    x: G.worldW - 420, y: 300, hp: 700, hpMax: 700, phase: 1,
    style: 'ink', t: 0, state: 'intro', stT: 0, atkCd: 2, flash: 0,
    dir: -1, name: '无面绘世者', copyCd: 4.5, hitCd: 0, sweepDir: 1,
  };
  Sfx.play('roar'); addShake(10);
  toast('「无面绘世者」—— 他不记得自己的脸');
}
function hitBoss(dmg, o) {
  const d = G.boss;
  if (!d || d.state === 'intro' || d.state === 'dying') return;
  let v = dmg;
  if (d.mark > 0) v *= 2;
  d.hp -= v; d.flash = .1;
  addText(d.x + rnd(-20, 20), d.y - 60, Math.round(v), '#fff');
  burst(d.x, d.y - 20, 7, { col: '#22212a', s0: 3, s1: 7, sp1: 240, g: 260, drag: 2 });
  Sfx.play('hit');
  if (d.hp <= d.hpMax * .66 && d.phase === 1) {
    d.phase = 2; d.style = 'sketch'; d.state = 'rage'; d.stT = 0;
    Sfx.play('roar'); addShake(12); G.flashT = .4;
    toast('他撕下素描的一页 —— 「橡皮之潮」');
  } else if (d.hp <= d.hpMax * .33 && d.phase === 2) {
    d.phase = 3; d.style = 'blank'; d.state = 'rage'; d.stT = 0;
    Sfx.play('roar'); addShake(14); G.flashT = .5;
    toast('所有画风在他身上融合 —— 小心你画下的每一笔');
  }
  if (d.hp <= 0) {
    d.hp = 0; d.state = 'dying'; d.stT = 0;
    Sfx.play('roar'); addShake(12);
  }
}
function bossCopyStrokes() {
  const cands = G.strokes.filter(s => !s.dead && !s.hostile && s.pts.length > 2);
  if (!cands.length) return false;
  const src = cands[rndi(0, cands.length - 1)];
  const c = {
    pts: src.pts.map(p => ({ x: p.x + rnd(-30, 30), y: p.y + rnd(-40, 10) })),
    tool: src.tool, col: '#3a3a44', lw: src.lw + 2, glow: false, noclip: false,
    ttl: 6.5, id: STROKE_ID++, boxes: [], t: 0, hostile: true, hostileT: 6.5,
  };
  let cx = 0, cy = 0;
  for (const p of c.pts) { cx += p.x; cy += p.y; }
  c.cx = cx / c.pts.length; c.cy = cy / c.pts.length;
  addStrokeBoxes(c);
  for (const b of c.boxes) b.hostile = true;
  G.strokes.push(c);
  addText(c.cx, c.cy - 24, '被夺走了!', '#ff4a8c');
  Sfx.play('roar');
  return true;
}
function updateBoss2(dt) {
  const d = G.boss, p = G.player;
  if (!d) return;
  d.t += dt; d.stT += dt; d.flash -= dt; d.hitCd -= dt;
  switch (d.state) {
    case 'intro':
      d.x = lerp(d.x, G.worldW - 480, 1.6 * dt);
      d.y = 290 + Math.sin(d.t * 2) * 14;
      if (d.stT > 1.6) { d.state = 'hover'; d.stT = 0; d.atkCd = 1.2; }
      break;
    case 'hover': {
      d.y = 285 + Math.sin(d.t * 1.5) * 26;
      d.x = lerp(d.x, G.worldW - 470 + Math.sin(d.t * .4) * 130, .6 * dt);
      d.dir = p ? sgn(p.x - d.x) : -1;
      d.atkCd -= dt;
      if (d.atkCd <= 0) {
        const pool = d.phase === 1 ? ['volley', 'sweep', 'volley']
          : d.phase === 2 ? ['eraser', 'sweep', 'volley']
          : ['copy', 'pixring', 'eraser', 'sweep'];
        let a = pool[rndi(0, pool.length - 1)];
        if (a === d.lastAtk) a = pool[rndi(0, pool.length - 1)];
        d.lastAtk = a;
        d.state = a; d.stT = 0; d.atkCd = rnd(1.6, 2.4);
        if (a === 'sweep') { d.sweepDir = sgn(p.x - d.x) || -1; }
      }
      if (d.phase >= 3) {
        d.copyCd -= dt;
        if (d.copyCd <= 0) { d.copyCd = 4.5; if (bossCopyStrokes()) toast('「无面者」复制了你的笔迹！'); }
      }
      break;
    }
    case 'volley':
      d.y = lerp(d.y, 270, 3 * dt);
      if (d.stT > .5 && !d.fired) {
        d.fired = true;
        const n = d.phase >= 3 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const dx = (p ? p.x : 300) - d.x, t2 = .9 + i * .16;
          spawnProj({ type: 'blot', x: d.x, y: d.y + 30, vx: dx / t2 + rnd(-50, 50), vy: -300, g: 880, dmg: 12, from: 'e', ttl: 2.4 });
        }
        Sfx.play('wave');
      }
      if (d.stT > 1.1) { d.state = 'hover'; d.fired = false; }
      break;
    case 'pixring':
      if (d.stT > .45 && !d.fired) {
        d.fired = true;
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + d.t;
          spawnProj({ type: 'pix', x: d.x, y: d.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dmg: 9, from: 'e', ttl: 1.6 });
        }
        Sfx.play('shoot');
      }
      if (d.stT > 1) { d.state = 'hover'; d.fired = false; }
      break;
    case 'eraser':
      d.y = lerp(d.y, 250, 3 * dt);
      if (d.stT > .55 && !d.fired) {
        d.fired = true;
        spawnProj({ type: 'eraserWave', x: d.x + d.dir * 60, y: GB - 46, vx: d.dir * 300, vy: 0, dmg: 14, from: 'e', ttl: 5 });
        Sfx.play('erase');
        toast('橡皮之潮 —— 它会擦掉你的画！');
      }
      if (d.stT > 1.2) { d.state = 'hover'; d.fired = false; }
      break;
    case 'sweep':
      if (d.stT < .6) d.x += Math.sin(d.stT * 40) * 2;
      else {
        d.x += d.sweepDir * 660 * dt;
        d.y = GB - 110;
        if (d.x < 240 || d.x > G.worldW - 240) { d.state = 'hover'; d.atkCd = rnd(1.4, 2); }
      }
      if (d.hitCd <= 0 && p && dist(d.x, d.y, p.x, p.y - 26) < 64) { d.hitCd = .8; damagePlayer(16, d.x); }
      break;
    case 'rage':
      d.y = 260 + Math.sin(d.t * 6) * 10;
      if (chance(.4)) burst(d.x + rnd(-90, 90), d.y + rnd(-50, 50), 3, { col: getStyle(d.style).pal.accent, s0: 3, s1: 8, sp1: 220 });
      if (d.stT > 1.5) { d.state = 'hover'; d.atkCd = .9; }
      break;
    case 'dying': {
      if (chance(.85)) {
        burst(d.x + rnd(-70, 70), d.y + rnd(-70, 70), 4, {
          col: chance(.5) ? '#22212a' : '#ffe86a', s0: 3, s1: 9, sp1: 260, g: 140, drag: 1.5, life: rnd(.8, 1.6),
        });
      }
      d.y = lerp(d.y, 430, .5 * dt);
      if (d.stT > 2.4 && !d.dissolved) {
        d.dissolved = true;
        G.bossOn = false; G.boss = null;
        G.bossDead = true;
        G.flashT = .6;
        Sfx.play('shrine');
        G.state = 'win'; G.winT = 0;
      }
      break;
    }
  }
  /* 悬停接触 */
  if ((d.state === 'hover' || d.state === 'volley') && d.hitCd <= 0 && p && dist(d.x, d.y, p.x, p.y - 26) < 58) {
    d.hitCd = .9; damagePlayer(15, d.x);
  }
}
function drawBoss(ctx) {
  const d = G.boss;
  if (!d) return;
  const pal = getStyle(d.style).pal;
  const dyingA = d.state === 'dying' ? clamp(1 - d.stT / 2.4, 0, 1) : 1;
  ctx.save();
  ctx.globalAlpha = dyingA;
  /* 披风长袍 */
  const robe = c => {
    c.beginPath();
    c.moveTo(d.x - 44, d.y + 92);
    c.quadraticCurveTo(d.x - 56, d.y - 20, d.x - 26, d.y - 52);
    c.lineTo(d.x + 26, d.y - 52);
    c.quadraticCurveTo(d.x + 56, d.y - 20, d.x + 44, d.y + 92);
    c.quadraticCurveTo(d.x, d.y + 104, d.x - 44, d.y + 92);
    c.closePath();
  };
  Paint.fill(ctx, robe, d.flash > 0 ? '#fff' : pal.ink, {});
  /* 无面的脸 */
  const face = c => { c.beginPath(); c.ellipse(d.x + d.dir * 4, d.y - 66, 22, 26, 0, 0, TAU); };
  Paint.fill(ctx, face, '#fdfdf8', {});
  ctx.strokeStyle = 'rgba(120,116,110,.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(d.x + d.dir * 4, d.y - 66, 22, 26, 0, 0, TAU); ctx.stroke();
  /* 三阶段脸上的画风裂痕 */
  if (d.phase >= 2) {
    ctx.strokeStyle = d.phase >= 3 ? '#ff4a8c' : '#3a3936'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d.x + d.dir * 4 - 14, d.y - 74); ctx.lineTo(d.x + d.dir * 4 - 2, d.y - 62); ctx.lineTo(d.x + d.dir * 4 - 10, d.y - 50);
    ctx.stroke();
  }
  if (d.phase >= 3) {
    ctx.fillStyle = '#8ecbe8';
    for (let i = 0; i < 4; i++) ctx.fillRect(d.x - 16 + i * 9, d.y - 84 + (i % 2) * 4, 6, 6);
  }
  /* 手中的万具匣 */
  const bx = d.x + d.dir * 40, by = d.y + 6;
  Paint.fill(ctx, c => roughRectPath(ctx, bx - 20, by - 16, 40, 30, 3, 77, 12), '#6b5138', {});
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(bx - 12, by - 8, 24, 5);
  /* 悬浮墨环 */
  if (d.phase >= 2) {
    ctx.strokeStyle = d.phase >= 3 ? 'rgba(255,74,140,.5)' : 'rgba(58,57,54,.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(d.x, d.y + 30, 66 + Math.sin(d.t * 2) * 6, 16, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
