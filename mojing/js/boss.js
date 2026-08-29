'use strict';
/* ============================================================
   《墨境：千面残章》boss.js —— 终章 Boss：墨龙「未尽」
   一阶段：纯水墨（墨弹 / 横扫 / 墨雨 / 召唤）
   二阶段：水墨×像素 混合（格式光柱 / 错误方块），画面被像素逐步污染
   ============================================================ */
function startBoss() {
  if (G.bossOn || G.bossDead) return;
  G.bossOn = true;
  G.boss = {
    x: 14700, y: 420, hp: 900, hpMax: 900, phase: 1,
    t: 0, state: 'intro', stT: 0, atkCd: 2.4, flash: 0,
    segs: [], dir: -1, name: '墨龙 ·「未尽」',
    pending: [], ctele: [], beams: [],
    summoned: {}, sweepDir: 1, hitCd: 0,
  };
  G.platforms.push({ x: 13260, y: G.worldH - 340, w: 40, h: 340, kind: 'wall' });
  G.platforms.push({ x: 15060, y: G.worldH - 340, w: 40, h: 340, kind: 'wall' });
  Sfx.play('roar'); addShake(10);
  toast('终章 · 画师之心');
}
function hitBoss(dmg, o) {
  const d = G.boss;
  if (!d || d.state === 'intro' || d.state === 'dying') return;
  let v = dmg;
  const vuln = d.state === 'rain' || d.state === 'columns' || d.state === 'rage';
  if (vuln) v *= 1.5;
  d.hp -= v; d.flash = .1;
  addText(d.x + rnd(-20, 20), d.y - 50, Math.round(v) + (vuln ? '!' : ''), vuln ? '#ffd23e' : '#fff');
  burst(d.x, d.y - 20, 8, { col: '#22212a', s0: 3, s1: 8, sp1: 260, g: 300, drag: 2 });
  Sfx.play('hit');
  if (d.hp <= 450 && d.phase === 1) {
    d.phase = 2; d.state = 'rage'; d.stT = 0;
    Sfx.play('roar'); addShake(14); G.flashT = .4;
    toast('「未尽」撕开了格式 —— 水墨 × 像素');
  }
  if (d.hp <= 0) {
    d.hp = 0; d.state = 'dying'; d.stT = 0;
    Sfx.play('roar'); addShake(12);
    G.stats.kills++;
  }
}
function bossPick(d) {
  const p = G.player;
  const pool = d.phase === 1
    ? ['volley', 'sweep', 'rain']
    : ['volley', 'sweep', 'columns', 'blocks', 'rain'];
  let a = pool[rndi(0, pool.length - 1)];
  if (a === d.lastAtk) a = pool[rndi(0, pool.length - 1)];
  d.lastAtk = a;
  d.state = a; d.stT = 0;
  if (a === 'sweep') { d.sweepDir = sgn(p.x - d.x) || -1; d.y = G.GB - 80; }
  if (a === 'rain') {
    for (let i = 0; i < 8; i++) {
      const x = clamp(p.x + rnd(-420, 420), 13400, 15000);
      d.pending.push({ x, t: .4 + i * .16, type: 'rain' });
    }
  }
  if (a === 'columns') {
    for (let i = -1; i <= 1; i++) d.ctele.push({ x: clamp(p.x + i * 190, 13400, 15000), t: .9, fired: false });
  }
  if (a === 'blocks') {
    for (let i = 0; i < 5; i++) d.pending.push({ x: clamp(p.x + rnd(-320, 320), 13400, 15000), t: .5 + i * .18, type: 'glit' });
  }
}
function updateBoss(dt) {
  const d = G.boss, p = G.player;
  if (!d) return;
  d.t += dt; d.stT += dt; d.flash -= dt; d.hitCd -= dt;
  /* 段迹 */
  d.segs.unshift({ x: d.x, y: d.y });
  if (d.segs.length > 60) d.segs.pop();
  /* 二阶段像素污染度 */
  if (d.phase === 2 && d.state !== 'dying') G.pixMix = .42 + .3 * Math.sin(d.t * 1.35) + .12 * Math.sin(d.t * 3.7);

  switch (d.state) {
    case 'intro':
      d.x = lerp(d.x, 14400, 1.4 * dt);
      d.y = 420 + Math.sin(d.t * 2) * 16;
      if (d.stT > 1.8) { d.state = 'hover'; d.stT = 0; d.atkCd = 1.2; }
      break;
    case 'hover': {
      d.y = 415 + Math.sin(d.t * 1.5) * 26;
      d.x = lerp(d.x, 14400 + Math.sin(d.t * .4) * 200, .6 * dt);
      d.face = sgn(p.x - d.x);
      d.atkCd -= dt;
      if (d.atkCd <= 0) { bossPick(d); d.atkCd = rnd(1.7, 2.5); }
      /* 召唤增援 */
      if (d.hp < 600 && !d.summoned.a) { d.summoned.a = 1; bossSummon(); }
      if (d.hp < 260 && !d.summoned.b) { d.summoned.b = 1; bossSummon(); }
      break;
    }
    case 'volley':
      d.y = lerp(d.y, 400, 3 * dt);
      if (d.stT > .5 && !d.fired) {
        d.fired = true;
        for (let i = 0; i < 3; i++) {
          const dx = p.x - d.x, t2 = .9 + i * .18;
          spawnProj({ type: 'blot', x: d.x, y: d.y, vx: dx / t2 + rnd(-40, 40), vy: -320, g: 900, dmg: 12, from: 'e', ttl: 2.4 });
        }
        Sfx.play('wave');
      }
      if (d.stT > 1.2) { d.state = 'hover'; d.fired = false; }
      break;
    case 'sweep':
      if (d.stT < .7) { d.x += Math.sin(d.stT * 40) * 2; } /* 蓄势抖动 */
      else {
        d.x += d.sweepDir * 720 * dt;
        d.y = G.GB - 80;
        if (chance(.5)) addWash(d.x, G.GB - 6, 26, '#26252b');
        if (d.x < 13340 || d.x > 15020) { d.state = 'hover'; d.atkCd = rnd(1.4, 2); }
      }
      if (d.hitCd <= 0 && dist(d.x, d.y, p.x, p.y - 26) < 62) { d.hitCd = .8; damagePlayer(18, d.x); }
      break;
    case 'rain':
      if (d.stT > 2.4) d.state = 'hover';
      break;
    case 'columns':
      for (const c of d.ctele) {
        c.t -= dt;
        if (c.t <= 0 && !c.fired) { c.fired = true; d.beams.push({ x: c.x, t: .38, hit: false }); Sfx.play('crit'); addShake(4); }
      }
      d.ctele = d.ctele.filter(c => !c.fired || c.t > -.2);
      if (d.stT > 2.6) { d.beams.length = 0; d.state = 'hover'; }
      break;
    case 'blocks':
      if (d.stT > 2.4) d.state = 'hover';
      break;
    case 'rage':
      G.pixMix = Math.min(1, d.stT / 1.2);
      d.y = 380 + Math.sin(d.t * 6) * 10;
      if (chance(.3)) burst(d.x + rnd(-160, 160), d.y + rnd(-40, 40), 3, { col: '#8ecbe8', type: 'rect', s0: 3, s1: 8, sp1: 200 });
      if (d.stT > 1.6) { d.state = 'hover'; d.atkCd = 1; }
      break;
    case 'dying': {
      G.pixMix = Math.max(0, G.pixMix - dt * .5);
      if (chance(.8)) {
        const s = d.segs[rndi(0, d.segs.length - 1)] || d;
        burst(s.x + rnd(-30, 30), s.y + rnd(-30, 30), 4, {
          col: chance(.5) ? '#22212a' : '#8ecbe8',
          type: chance(.5) ? 'dot' : 'rect', s0: 3, s1: 9, sp1: 260, g: 160, drag: 1.5, life: rnd(.8, 1.6),
        });
      }
      d.y = lerp(d.y, 460, .5 * dt);
      if (d.stT > 2.6 && !d.dissolved) {
        d.dissolved = true;
        G.bossOn = false; G.boss = null;
        G.enemies.length = 0;
        G.bossDead = true;
        G.choiceDelay = 2.2;
        G.flashT = .5;
        Sfx.play('shrine');
      }
      break;
    }
  }
  /* 待发弹幕 */
  for (const pd of d.pending) {
    pd.t -= dt;
    if (pd.t <= 0 && !pd.done) {
      pd.done = true;
      if (pd.type === 'rain') spawnProj({ type: 'blot', x: pd.x, y: G.cam.y - 30, vx: 0, vy: 430, dmg: 12, from: 'e', ttl: 3 });
      else spawnProj({ type: 'glit', x: pd.x, y: G.cam.y - 20, vx: 0, vy: 470, dmg: 14, from: 'e', ttl: 3 });
    }
  }
  d.pending = d.pending.filter(pd => !pd.done);
  /* 光柱伤害 */
  for (const b of d.beams) {
    b.t -= dt;
    if (!b.hit && b.t > 0 && Math.abs(p.x - b.x) < 50) { b.hit = true; damagePlayer(20, b.x); }
  }
  d.beams = d.beams.filter(b => b.t > 0);
  /* 悬停接触伤害 */
  if ((d.state === 'hover' || d.state === 'volley') && d.hitCd <= 0 && dist(d.x, d.y, p.x, p.y - 26) < 56) {
    d.hitCd = .9; damagePlayer(16, d.x);
  }
}
function bossSummon() {
  const d = G.boss;
  for (let i = 0; i < 2; i++) {
    const e = makeEnemy({ type: 'floater', zone: 99, x: d.x + rnd(-200, 200), y: d.y + rnd(0, 80), zs: 'ink' });
    G.enemies.push(e);
    burst(e.x, e.y, 10, { col: '#22212a', s0: 3, s1: 7, sp1: 200, g: 200 });
  }
  toast('墨龙唤出了两缕残念');
}
function drawBoss(ctx) {
  const d = G.boss;
  if (!d) return;
  const pal = getStyle('ink').pal;
  const dyingA = d.state === 'dying' ? clamp(1 - d.stT / 2.6, 0, 1) : 1;
  ctx.save();
  ctx.globalAlpha = dyingA;
  /* 身躯分节 */
  const nseg = 8;
  for (let i = nseg; i >= 1; i--) {
    const s = d.segs[Math.min(d.segs.length - 1, i * 7)];
    if (!s) continue;
    const r = 30 - i * 2.4;
    const wob = Math.sin(i * .8 - d.t * 3) * 12;
    if (d.phase === 2 && d.state !== 'dying') {
      ctx.fillStyle = d.flash > 0 ? '#fff' : (i % 2 ? '#22212a' : '#2a2a3a');
      ctx.fillRect(s.x - r, s.y + wob - r, r * 2, r * 2);
      ctx.fillStyle = 'rgba(142,203,232,.5)';
      ctx.fillRect(s.x - r + 6, s.y + wob - r + 6, 8, 8);
    } else {
      const sy = s.y + wob;
      Paint.fill(ctx, c => { c.beginPath(); c.arc(s.x, sy, r, 0, TAU); }, d.flash > 0 ? '#fff' : '#22212a', { alpha: .95 });
      /* 背鳍墨线 */
      ctx.strokeStyle = 'rgba(253,246,232,.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, sy, r - 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
  }
  /* 头 */
  const hx = d.x, hy = d.y;
  if (d.phase === 2 && d.state !== 'dying') {
    ctx.fillStyle = d.flash > 0 ? '#fff' : '#22212a';
    ctx.fillRect(hx - 36, hy - 40, 72, 76);
    ctx.fillStyle = '#ff4a8c';
    ctx.fillRect(hx - 36, hy - 40, 72, 8);
  } else {
    Paint.fill(ctx, c => { c.beginPath(); c.ellipse(hx, hy, 36, 34, 0, 0, TAU); }, d.flash > 0 ? '#fff' : '#22212a', {});
    /* 龙角 */
    Paint.stroke(ctx, c => {
      c.beginPath();
      c.moveTo(hx - 18, hy - 24); c.quadraticCurveTo(hx - 34, hy - 52, hx - 20, hy - 62);
      c.moveTo(hx + 14, hy - 26); c.quadraticCurveTo(hx + 30, hy - 56, hx + 16, hy - 64);
    }, '#22212a', 6, {});
  }
  /* 眼 */
  const eo = d.face * 10;
  if (d.state === 'dying') {
    ctx.strokeStyle = '#fdf6e8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx + eo - 8, hy - 8); ctx.lineTo(hx + eo + 8, hy + 4); ctx.moveTo(hx + eo + 8, hy - 8); ctx.lineTo(hx + eo - 8, hy + 4); ctx.stroke();
  } else {
    ctx.fillStyle = d.phase === 2 ? '#ff4a8c' : '#fdf6e8';
    ctx.beginPath(); ctx.ellipse(hx + eo, hy - 6, 7, d.state === 'sweep' ? 3 : 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#17171c';
    ctx.beginPath(); ctx.arc(hx + eo + d.face * 2, hy - 6, 3.4, 0, TAU); ctx.fill();
  }
  /* 须 */
  Paint.stroke(ctx, c => {
    c.beginPath();
    c.moveTo(hx + d.face * 26, hy + 8);
    c.quadraticCurveTo(hx + d.face * 70, hy + 4 + Math.sin(d.t * 3) * 8, hx + d.face * 96, hy + 26 + Math.sin(d.t * 2.3) * 10);
  }, d.phase === 2 ? '#ff4a8c' : '#22212a', 2.5, {});
  /* 张口 */
  if (d.state === 'volley' && d.stT > .2) {
    ctx.fillStyle = '#17171c';
    ctx.beginPath(); ctx.ellipse(hx + d.face * 30, hy + 14, 12, 8, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  /* 光柱 */
  for (const c of d.ctele) {
    if (c.fired) continue;
    const a = .25 + .2 * Math.sin(G.t * 14);
    ctx.fillStyle = 'rgba(255,74,140,' + a + ')';
    ctx.fillRect(c.x - 34, G.cam.y, 68, H);
    ctx.fillStyle = 'rgba(255,74,140,.7)';
    ctx.fillRect(c.x - 3, G.cam.y, 6, H);
  }
  for (const b of d.beams) {
    const a = clamp(b.t / .38, 0, 1);
    ctx.fillStyle = 'rgba(255,74,140,' + (.5 * a + .3) + ')';
    ctx.fillRect(b.x - 44, G.cam.y, 88, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x - 16, G.cam.y, 32, H);
  }
  /* 待落点预警 */
  for (const pd of d.pending) {
    ctx.strokeStyle = pd.type === 'rain' ? 'rgba(34,33,38,.5)' : 'rgba(142,203,232,.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(pd.x, G.GB - 6);
    ctx.lineTo(pd.x + 44, G.GB - 6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
