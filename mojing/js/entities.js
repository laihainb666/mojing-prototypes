'use strict';
/* ============================================================
   《墨境：千面残章》entities.js —— 玩家（万化笔七形态）/ 七境敌人 / 弹道
   ============================================================ */

/* ---------- 万化笔：各画风武器参数 ---------- */
const WEAPONS = {
  ink:    { name: '毛笔 · 泼墨',   light: { cd: .34, dmg: 15, range: 100, h: 76, blind: 2.4 },
            heavy: { cd: .8,  type: 'wave',   dmg: 26 } },
  water:  { name: '水彩笔 · 凝珠', light: { cd: .26, dmg: 12, range: 88,  h: 70, reveal: true },
            heavy: { cd: .85, type: 'drop',   dmg: 24 } },
  sketch: { name: '炭笔 · 擦除',   light: { cd: .22, dmg: 13, range: 80,  h: 64, eraseArm: true },
            heavy: { cd: .75, type: 'swipe',  dmg: 24, erase: true } },
  oil:    { name: '刮刀 · 削层',   light: { cd: .42, dmg: 17, range: 92,  h: 80 },
            heavy: { cd: .95, type: 'scrape', dmg: 30, armorStrip: true } },
  print:  { name: '刻刀 · 雕痕',   light: { cd: .24, dmg: 12, range: 84,  h: 66 },
            heavy: { cd: .85, type: 'carve',  dmg: 20, mark: 3 } },
  pixel:  { name: '激光笔 · 点射', light: { cd: .16, type: 'laser', dmg: 9 },
            heavy: { cd: 1.15, type: 'beam',  dmg: 30 } },
  paper:  { name: '剪刀 · 断折',   light: { cd: .24, dmg: 13, range: 90,  h: 70, execute: 16 },
            heavy: { cd: .8,  type: 'cross',  dmg: 28, execute: 30 } },
};

/* ============================================================
   玩家（绘世者）
   ============================================================ */
function makePlayer() {
  return {
    x: 120, y: G.GB, w: 30, h: 52, vx: 0, vy: 0, face: 1,
    onG: false, jumps: 0, coyote: 0, jbuf: 0, anim: 0, squash: 0,
    atkCd: 0, atkT: 0, atkKind: '', swing: 0,
    dashT: 0, dashCd: 0, dashDir: 1, dashTrail: [],
    iframe: 0, hp: G.hpMax, bindT: 0, slowT: 0, dead: false,
    beamT: 0, beamDir: 1, dustT: 0, runT: 0,
  };
}
function pbox(p) { return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }; }

function updatePlayer(dt) {
  const p = G.player;
  if (!p) return;
  if (p.dead) return;
  p.coyote -= dt; p.jbuf -= dt; p.atkCd -= dt; p.dashCd -= dt;
  p.iframe -= dt; p.bindT -= dt; p.slowT -= dt; p.beamT -= dt;
  p.anim += dt; p.squash = lerp(p.squash, 0, Math.min(1, 12 * dt));
  const w = WEAPONS[curStyle()];

  /* 移动 */
  let mx = 0;
  if (In.down('left')) mx -= 1;
  if (In.down('right')) mx += 1;
  let spd = 330 * (p.bindT > 0 ? .45 : 1) * (p.slowT > 0 ? .62 : 1);
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashDir * 640; p.vy = 0;
    p.dashTrail.push({ x: p.x, y: p.y, face: p.face });
    if (p.dashTrail.length > 6) p.dashTrail.shift();
  } else {
    p.dashTrail.length = 0;
    if (mx) p.face = mx;
    p.vx = lerp(p.vx, mx * spd, 1 - Math.pow(.0001, dt));
    if (!mx && p.onG) p.vx = lerp(p.vx, 0, 1 - Math.pow(.001, dt));
    p.runT = Math.abs(p.vx) > 30 && p.onG ? p.runT + dt : 0;
    if (p.runT > .16) { p.runT = 0; spawnPart({ x: p.x - p.face * 10, y: p.y - 2, vx: -p.face * 40, vy: -30, life: .4, size: rnd(3, 6), col: 'rgba(120,115,100,.5)' }); }
  }
  /* 冲刺（耗墨魂） */
  if (In.hit('dash') && p.dashCd <= 0 && p.bindT <= 0) {
    if (G.soul >= 8) {
      G.soul -= 8; p.dashT = .16; p.dashCd = .5; p.dashDir = mx || p.face;
      p.iframe = Math.max(p.iframe, .22);
      Sfx.play('dash');
      burst(p.x, p.y - 20, 6, { col: 'rgba(80,78,90,.6)', s0: 2, s1: 5, sp1: 120 });
    } else { Sfx.play('deny'); toast('墨魂不足'); }
  }
  /* 跳跃（二段） */
  if (In.hit('jump')) p.jbuf = .12;
  if (p.jbuf > 0) {
    if (p.onG || p.coyote > 0) {
      p.vy = -700; p.onG = false; p.jumps = 1; p.jbuf = 0; p.coyote = 0;
      Sfx.play('jump');
    } else if (p.jumps < 2) {
      p.vy = -640; p.jumps = 2; p.jbuf = 0;
      Sfx.play('djump');
      burst(p.x, p.y - 10, 8, { col: 'rgba(255,255,255,.55)', s0: 2, s1: 5, sp1: 150 });
    }
  }
  if (!In.down('jump') && p.vy < -260) p.vy = -260;
  p.vy += 2200 * dt; p.vy = Math.min(p.vy, 1300);
  moveAndCollide(p, dt);

  /* 攻击 */
  if (In.hit('light') && p.atkCd <= 0) doLight(p, w);
  if (In.hit('heavy') && p.atkCd <= 0) doHeavy(p, w);

  /* 被线条捆住时的挣扎 */
  if (p.bindT > 0 && (In.hit('left') || In.hit('right') || In.hit('jump'))) p.bindT -= .2;
}
function moveAndCollide(p, dt) {
  const solids = G.platforms;
  const prevFeet = p.y;
  /* X 轴 */
  p.x += p.vx * dt;
  let box = pbox(p);
  for (const pl of solids) {
    if (pl.hp !== undefined && pl.hp <= 0) continue;
    if (!aabb(box, pl)) continue;
    const feet = p.y, top = pl.y;
    if (feet - top > 0 && feet - top <= 20 && p.vy >= 0) { p.y = top; box = pbox(p); continue; } /* 小台阶自动上 */
    if (p.vx > 0) p.x = pl.x - p.w / 2; else if (p.vx < 0) p.x = pl.x + pl.w + p.w / 2;
    p.vx = 0; box = pbox(p);
  }
  /* Y 轴 */
  p.y += p.vy * dt;
  box = pbox(p);
  const wasG = p.onG;
  p.onG = false;
  for (const pl of solids) {
    if (pl.hp !== undefined && pl.hp <= 0) continue;
    if (!aabb(box, pl)) continue;
    if (p.vy >= 0 && prevFeet <= pl.y + 10) {
      p.y = pl.y;
      if (pl.kind === 'bounce') {
        p.vy = -1060; Sfx.play('bounce'); p.squash = .35;
        addWash(p.x, pl.y, 50, getStyle('water').pal.accent);
        burst(p.x, pl.y, 10, { col: getStyle('water').pal.accent, s0: 3, s1: 7, sp1: 180, up: 60 });
      } else {
        if (!wasG && p.vy > 500) { p.squash = .3; burst(p.x, p.y, 6, { col: 'rgba(120,115,100,.5)', s0: 2, s1: 5, sp1: 100 }); }
        p.vy = 0;
      }
      p.onG = true; p.jumps = 0; p.coyote = .1;
      box = pbox(p);
    } else if (p.vy < 0) {
      p.y = pl.y + pl.h + p.h; p.vy = 0; box = pbox(p);
    }
  }
  if (p.onG) p.coyote = .1;
}

/* ---------- 攻击 ---------- */
function meleeBox(p, range, h) {
  const cx = p.x + p.face * (range / 2 + 12), cy = p.y - p.h * .55;
  return { x: cx - range / 2, y: cy - h / 2, w: range, h };
}
function doLight(p, w) {
  const L = w.light;
  p.atkCd = L.cd; p.atkT = .2; p.atkKind = 'light'; p.swing++;
  const st = curStyle();
  if (L.type === 'laser') {
    spawnProj({ type: 'laser', x: p.x + p.face * 22, y: p.y - 30, vx: p.face * 900, vy: 0, dmg: L.dmg, from: 'p', ttl: .8 });
    Sfx.play('shoot');
    spawnPart({ x: p.x + p.face * 24, y: p.y - 30, vx: p.face * 60, life: .15, size: 5, col: getStyle('pixel').pal.accent });
    return;
  }
  Sfx.play('swing');
  const box = meleeBox(p, L.range, L.h);
  const pal = getStyle(st).pal;
  /* 各画风轻击特效 */
  if (st === 'ink') { burst(p.x + p.face * 46, p.y - 32, 12, { col: pal.ink, s0: 3, s1: 9, sp1: 260, drag: 3 }); addWash(p.x + p.face * 50, p.y - 30, 46, pal.ink); }
  else if (st === 'water') { burst(p.x + p.face * 44, p.y - 30, 10, { col: pal.accent, s0: 3, s1: 8, sp1: 220, drag: 3 }); addWash(p.x + p.face * 46, p.y - 28, 44, pal.accent); }
  else if (st === 'sketch') { burst(p.x + p.face * 42, p.y - 30, 8, { col: '#5a5750', type: 'line', s0: 2, s1: 4, sp1: 200 }); }
  else if (st === 'oil') { burst(p.x + p.face * 44, p.y - 32, 9, { col: pal.accent, type: 'chip', s0: 3, s1: 7, sp1: 240, g: 600 }); }
  else if (st === 'print') { burst(p.x + p.face * 42, p.y - 30, 8, { col: '#17171c', type: 'chip', s0: 2, s1: 6, sp1: 230, g: 500 }); }
  else if (st === 'paper') { burst(p.x + p.face * 44, p.y - 30, 8, { col: '#fdf6e8', type: 'petal', s0: 4, s1: 8, sp1: 200, g: 300, drag: 2 }); }
  applyMelee(box, L.dmg, {
    style: st, dir: p.face, blind: L.blind, reveal: L.reveal,
    eraseArm: L.eraseArm, execute: L.execute, knock: true
  });
}
function doHeavy(p, w) {
  const Hv = w.heavy;
  p.atkCd = Hv.cd; p.atkT = .32; p.atkKind = 'heavy'; p.swing++;
  const st = curStyle();
  switch (Hv.type) {
    case 'wave':
      spawnProj({ type: 'wave', x: p.x + p.face * 26, y: p.y - 34, vx: p.face * 520, vy: 0, dmg: Hv.dmg, from: 'p', ttl: 1.3, pierce: true, hitSet: {} });
      Sfx.play('wave'); addShake(2);
      break;
    case 'drop':
      spawnProj({ type: 'drop', x: p.x + p.face * 20, y: p.y - 44, vx: p.face * 380, vy: -420, g: 1400, dmg: Hv.dmg, from: 'p', ttl: 2 });
      Sfx.play('swing');
      break;
    case 'swipe': {
      Sfx.play('erase');
      applyMelee(meleeBox(p, 140, 96), Hv.dmg, { style: st, dir: p.face, erase: true, knock: true });
      burst(p.x + p.face * 60, p.y - 34, 14, { col: '#e8e4da', type: 'rect', s0: 3, s1: 8, sp1: 260, drag: 3 });
      break;
    }
    case 'scrape': {
      Sfx.play('scrape'); addShake(3);
      applyMelee(meleeBox(p, 106, 90), Hv.dmg, { style: st, dir: p.face, armorStrip: true, knock: true });
      burst(p.x + p.face * 50, p.y - 34, 12, { col: '#c86a34', type: 'chip', s0: 3, s1: 8, sp1: 260, g: 700 });
      break;
    }
    case 'carve':
      Sfx.play('swing');
      applyMelee(meleeBox(p, 96, 80), Hv.dmg, { style: st, dir: p.face, mark: Hv.mark, knock: true });
      break;
    case 'beam': {
      p.beamT = .2; p.beamDir = p.face;
      Sfx.play('crit'); addShake(4);
      const b = { x: p.face > 0 ? p.x : p.x - 560, y: p.y - 52, w: 560, h: 30 };
      applyMelee(b, Hv.dmg, { style: st, dir: p.face, knock: true });
      break;
    }
    case 'cross':
      Sfx.play('swing'); addShake(2);
      applyMelee(meleeBox(p, 116, 100), Hv.dmg, { style: st, dir: p.face, execute: Hv.execute, knock: true });
      burst(p.x + p.face * 50, p.y - 34, 10, { col: '#fdf6e8', type: 'petal', s0: 4, s1: 9, sp1: 260, g: 300, drag: 2 });
      break;
  }
}
function applyMelee(box, dmg, o) {
  let hitAny = false;
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (!aabb(box, ebox(e))) continue;
    if (e.lastSwing === p.swing) continue;
    e.lastSwing = p.swing;
    damageEnemy(e, dmg, o);
    hitAny = true;
  }
  /* Boss */
  if (G.bossOn && G.boss && G.boss.state !== 'dying') {
    const d = G.boss;
    if (aabb(box, { x: d.x - 44, y: d.y - 60, w: 88, h: 130 })) { hitBoss(dmg, o); hitAny = true; }
  }
  /* 可破坏墙 */
  for (let i = G.platforms.length - 1; i >= 0; i--) {
    const pl = G.platforms[i];
    if (pl.kind !== 'gwall' || !aabb(box, pl)) continue;
    let hitWall = false;
    if (pl.gs === 'sketch' && (o.style === 'sketch')) {
      pl.hp -= o.erase ? 2 : 1; hitWall = true; Sfx.play('erase');
      burst(pl.x + pl.w / 2, box.y + box.h / 2, 8, { col: '#f6f4ef', type: 'rect', s0: 3, s1: 7, sp1: 200, g: 400 });
    } else if (pl.gs === 'oil' && o.armorStrip) {
      pl.hp -= 1; hitWall = true; Sfx.play('scrape');
      burst(pl.x + pl.w / 2, box.y + box.h / 2, 8, { col: '#c86a34', type: 'chip', s0: 3, s1: 7, sp1: 200, g: 500 });
    }
    if (hitWall) {
      hitAny = true;
      if (pl.hp <= 0) {
        G.platforms.splice(i, 1);
        burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 22, { col: pl.gs === 'sketch' ? '#e8e4da' : '#a24a2c', type: pl.gs === 'sketch' ? 'rect' : 'chip', s0: 4, s1: 10, sp1: 320, g: 600 });
        toast(pl.gs === 'sketch' ? '纸墙被擦开了' : '厚涂被削穿了');
        Sfx.play('boom'); addShake(5);
      }
    }
  }
  /* 擦除敌方弹幕 */
  if (o.erase) for (const pr of G.projs) if (pr.from === 'e' && aabb(box, { x: pr.x - 10, y: pr.y - 10, w: 20, h: 20 })) pr.ttl = 0;
  if (hitAny) { G.freeze = Math.max(G.freeze, .05); addShake(3); }
}
function damageEnemy(e, dmg, o) {
  if (e.dead) return;
  if (e.hidden) { e.hidden = false; e.revealT = 3; }
  let d = dmg, crit = false;
  const st = o.style || curStyle();
  if (st === 'pixel' && e.type === 'tele' && e.vulnT > 0) { d *= 3; crit = true; addText(e.x, e.y - 66, '像素暴击!', '#ffd23e'); }
  if (e.mark > 0) { d *= 2; e.mark--; addText(e.x, e.y - 60, '雕痕×2', '#e05a4a'); }
  if (e.revealT > 0) d *= 1.3;
  let knock = o.knock !== false && !e.cloneOf;
  if (e.armor > 0 && !o.armorStrip) { d *= .3; knock = false; }
  else if (e.armor > 0 && o.armorStrip) {
    e.armor--; d *= .6; knock = true;
    if (e.armor === 0) addText(e.x, e.y - 64, '削层!', '#d9a13b');
  }
  if (o.eraseArm && e.type === 'binder' && e.hasArm) { e.hasArm = false; d += 8; addText(e.x, e.y - 62, '擦除手臂!', '#a8443c'); }
  e.hp -= d; e.flash = .12; e.showHpT = 2;
  if (knock) { e.vx = (o.dir || 1) * 260; e.vy = -160; }
  if (o.blind) e.blind = Math.max(e.blind || 0, o.blind);
  if (o.mark) e.mark = Math.max(e.mark || 0, o.mark);
  if (o.execute && e.hp <= o.execute && e.hp > 0) e.hp = 0;
  /* 版画残页期间：受击的敌人印出分身 */
  if (G.overlay === 'print' && !e.cloneOf && chance(.4)) spawnClone(e);
  addText(e.x + rnd(-8, 8), e.y - e.h - 6, Math.round(d) + (crit ? '!' : ''), crit ? '#ffd23e' : '#fff');
  const pal = getStyle(emStyle()).pal;
  burst(e.x, e.y - e.h * .5, crit ? 14 : 8, { col: pal.ink, s0: 2, s1: 6, sp1: 220, g: 400 });
  Sfx.play(crit ? 'crit' : 'hit');
  if (e.hp <= 0) killEnemy(e, o);
}
function killEnemy(e, o) {
  if (e.dead) return;
  e.dead = true;
  G.stats.kills++;
  G.soul = clamp(G.soul + 12, 0, G.soulMax);
  addText(e.x, e.y - e.h - 20, '+墨魂', '#7fb0c8');
  const st = e.zs, pal = getStyle(st).pal;
  if (st === 'ink') burst(e.x, e.y - e.h / 2, 16, { col: pal.ink, s0: 3, s1: 9, sp1: 280, g: 300, drag: 2 });
  else if (st === 'water') burst(e.x, e.y - e.h / 2, 16, { col: pal.accent, s0: 3, s1: 8, sp1: 260, g: 400, drag: 2 });
  else if (st === 'sketch') burst(e.x, e.y - e.h / 2, 14, { col: '#5a5750', type: 'line', s0: 2, s1: 5, sp1: 260, g: 300 });
  else if (st === 'oil') burst(e.x, e.y - e.h / 2, 16, { col: pal.accent, type: 'chip', s0: 3, s1: 9, sp1: 300, g: 700 });
  else if (st === 'print') burst(e.x, e.y - e.h / 2, 14, { col: '#17171c', type: 'chip', s0: 3, s1: 8, sp1: 300, g: 500 });
  else if (st === 'pixel') burst(e.x, e.y - e.h / 2, 14, { col: '#8ecbe8', type: 'rect', s0: 3, s1: 7, sp1: 280, g: 500 });
  else burst(e.x, e.y - e.h / 2, 16, { col: '#fdf6e8', type: 'petal', s0: 4, s1: 9, sp1: 260, g: 350, drag: 2 });
  Sfx.play('kill');
  if (e.type === 'cloner') for (const c of G.enemies) if (c.cloneOf === e.id) c.hp = 0, c.dead = true;
}
function damagePlayer(d, sx, opts = {}) {
  const p = G.player;
  if (!p || p.dead || p.iframe > 0 || p.dashT > 0 || G.state !== 'play') return;
  p.hp -= d; p.iframe = 1.1; G.hurtT = .3;
  p.vx = (p.x < sx ? -1 : 1) * 300; p.vy = -280; p.onG = false;
  addShake(7); Sfx.play('hurt');
  burst(p.x, p.y - 30, 10, { col: getStyle(curStyle()).pal.accent, s0: 2, s1: 6, sp1: 240, g: 500 });
  if ((curStyle() === 'ink' || G.overlay === 'ink') && !opts.silent)
    addStain(clamp(p.x - G.cam.x, 0, W), clamp(p.y - 40 - G.cam.y, 0, H), rnd(26, 60), .5);
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true; G.deadT = 1.6; G.stats.deaths++;
    burst(p.x, p.y - 30, 26, { col: '#26252b', s0: 3, s1: 10, sp1: 340, g: 400, drag: 2 });
    Sfx.play('boom');
  }
}

/* ============================================================
   玩家绘制：绘世者 + 万化笔（随画风改变形态）
   ============================================================ */
function drawWeapon(ctx, style, kind, prog) {
  /* 以手为原点，+x 朝面前 */
  const dark = '#26252b';
  switch (style) {
    case 'ink': { /* 毛笔 */
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-6, -2); c.lineTo(16, 2); }, '#5a4632', 5, {});
      const tip = c => { c.beginPath(); c.moveTo(15, -1); c.quadraticCurveTo(34, 2, 40, 6); c.quadraticCurveTo(30, 10, 15, 6); c.closePath(); };
      Paint.fill(ctx, tip, dark, {});
      ctx.fillStyle = 'rgba(34,33,38,.6)';
      ctx.beginPath(); ctx.arc(42, 8 + Math.sin(G.t * 6) * 2, 2.2, 0, TAU); ctx.fill();
      break;
    }
    case 'water': { /* 水彩笔 */
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-6, -1); c.lineTo(16, 1); }, '#7a8ca0', 5, {});
      const tip = c => { c.beginPath(); c.moveTo(15, -2); c.lineTo(30, 0); c.lineTo(15, 5); c.closePath(); };
      Paint.fill(ctx, tip, '#e8836a', {});
      break;
    }
    case 'sketch': { /* 炭笔 */
      const stick = c => { c.beginPath(); c.moveTo(-4, -3); c.lineTo(26, -1); c.lineTo(26, 3); c.lineTo(-4, 3); c.closePath(); };
      Paint.fill(ctx, stick, dark, { hR: 60, sp: 5 });
      break;
    }
    case 'oil': { /* 刮刀 */
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-6, 0); c.lineTo(12, 2); }, '#6b5138', 5, {});
      const blade = c => { c.beginPath(); c.moveTo(12, -5); c.lineTo(30, -9); c.lineTo(34, 8); c.lineTo(12, 6); c.closePath(); };
      Paint.fill(ctx, blade, '#c8ccd4', {});
      break;
    }
    case 'print': { /* 刻刀 */
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-6, -1); c.lineTo(14, 1); }, '#5a4632', 5, {});
      const blade = c => { c.beginPath(); c.moveTo(14, -4); c.lineTo(34, 2); c.lineTo(14, 5); c.closePath(); };
      Paint.fill(ctx, blade, '#d9dde4', {});
      break;
    }
    case 'pixel': { /* 激光笔 */
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-4, -3, 26, 6); }, '#e8e8f0', {});
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(26, 0, 3.5 + Math.sin(G.t * 12) * .8, 0, TAU); ctx.fill();
      break;
    }
    case 'paper': { /* 剪刀 */
      const open = prog >= 0 ? .5 : .22 + Math.sin(G.t * 3) * .06;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-4, 3); c.lineTo(22, -2 - open * 22); }, '#b8bdc6', 3.5, {});
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-4, 3); c.lineTo(22, 6 + open * 22); }, '#b8bdc6', 3.5, {});
      ctx.fillStyle = '#b23a2e';
      ctx.beginPath(); ctx.arc(-7, 0, 4.5, 0, TAU); ctx.fill();
      break;
    }
  }
}
function drawPlayer(ctx) {
  const p = G.player;
  if (!p || p.dead) return;
  const st = getStyle(curStyle()), pal = st.pal;
  const col = curStyle() === 'print' ? '#141419' : pal.player;
  /* 冲刺残影 */
  if (p.dashTrail.length) {
    for (const d of p.dashTrail) {
      ctx.save();
      ctx.globalAlpha = .18;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(d.x, d.y - 26, 12, 24, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  ctx.save();
  if (p.iframe > 0 && (G.frame & 2)) ctx.globalAlpha = .45;
  if (p.bindT > 0) { /* 被线条缠绕 */
    ctx.strokeStyle = 'rgba(58,57,54,.9)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 26, 20 + i * 4, 30 - i * 6, Math.sin(G.t * 6 + i) * .3, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.translate(p.x, p.y);
  ctx.scale(p.face * (1 + p.squash * .6), 1 - p.squash * .5);
  const run = Math.abs(p.vx) > 30 && p.onG;
  const t = p.anim;
  const legA = run ? Math.sin(t * 14) : 0;
  const bob = run ? Math.abs(Math.sin(t * 14)) * 3 : Math.sin(t * 2.2) * 1.5;
  const air = !p.onG;
  /* 腿 */
  Paint.stroke(ctx, c => {
    c.beginPath();
    c.moveTo(0, -19 - bob * .3);
    c.lineTo(legA * 9 + (air ? -5 : 0), air ? -13 : -2);
    c.moveTo(0, -19 - bob * .3);
    c.lineTo(-legA * 9 + (air ? 6 : 0), air ? -9 : -2);
  }, col, 4.5, {});
  /* 身体 */
  const body = c => {
    c.beginPath();
    c.moveTo(-6.5, -18 - bob * .3);
    c.quadraticCurveTo(-8, -34 - bob, -5.5, -42 - bob);
    c.lineTo(5.5, -42 - bob);
    c.quadraticCurveTo(8, -34 - bob, 6.5, -18 - bob * .3);
    c.closePath();
  };
  Paint.fill(ctx, body, col, { hR: 80, sp: 6 });
  /* 围巾 */
  const scarf = c => {
    c.beginPath();
    c.moveTo(-3, -40 - bob);
    c.quadraticCurveTo(-14 - run * 3, -37 - bob + Math.sin(t * 6) * 3, -24 - Math.abs(p.vx) * .03, -33 + Math.sin(t * 5) * 5);
  };
  Paint.stroke(ctx, scarf, curStyle() === 'pixel' ? '#ffd23e' : pal.accent, 4, {});
  /* 头 + 斗笠 */
  const head = c => { c.beginPath(); c.arc(1, -49 - bob, 8.5, 0, TAU); };
  Paint.fill(ctx, head, col, {});
  const hat = c => { c.beginPath(); c.moveTo(-13, -53 - bob); c.quadraticCurveTo(1, -66 - bob, 15, -53 - bob); c.closePath(); };
  Paint.fill(ctx, hat, shade(col, 30), {});
  ctx.fillStyle = '#fdf6e8';
  ctx.beginPath(); ctx.arc(5.5, -50 - bob, 1.8, 0, TAU); ctx.fill();
  /* 手臂 + 武器 */
  const prog = p.atkT > 0 ? 1 - p.atkT / (p.atkKind === 'heavy' ? .32 : .2) : -1;
  const armAng = prog >= 0 ? lerp(-1.5, 1.05, prog) : .45 + (run ? Math.sin(t * 14 + Math.PI) * .35 : Math.sin(t * 2) * .06);
  ctx.save();
  ctx.translate(4, -38 - bob);
  ctx.rotate(armAng);
  Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(0, 0); c.lineTo(13, 3); }, col, 4, {});
  ctx.translate(13, 3);
  drawWeapon(ctx, curStyle(), p.atkKind, prog);
  ctx.restore();
  ctx.restore();
  /* 残页光环 */
  if (G.overlay) {
    ctx.save();
    ctx.strokeStyle = getStyle(G.overlay).pal.accent;
    ctx.globalAlpha = .5 + .3 * Math.sin(G.t * 5);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 26, 30, 40, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/* ============================================================
   敌人（每境一种标志性敌人 + 通用杂兵）
   ============================================================ */
let ENEMY_ID = 1;
const ETYPE = {
  floater:  { hp: 34,  w: 46, h: 52, touch: 12, zh: '墨灵' },
  ambusher: { hp: 40,  w: 64, h: 30, touch: 10, zh: '渍灵' },
  binder:   { hp: 46,  w: 34, h: 58, touch: 10, zh: '线偶' },
  armored:  { hp: 70,  w: 70, h: 62, touch: 16, zh: '厚涂傀' },
  cloner:   { hp: 50,  w: 48, h: 56, touch: 8,  zh: '印影' },
  tele:     { hp: 36,  w: 44, h: 44, touch: 10, zh: '网格哨兵' },
  flyer:    { hp: 38,  w: 54, h: 36, touch: 12, zh: '纸鹤兵' },
  walker:   { hp: 40,  w: 38, h: 52, touch: 10, zh: '杂卒' },
};
function makeEnemy(s) {
  const base = ETYPE[s.type];
  const e = {
    id: ENEMY_ID++, type: s.type, zone: s.zone, zs: s.zs || 'ink',
    x: s.x, y: s.y, w: base.w, h: base.h,
    vx: 0, vy: 0, hp: base.hp, hpMax: base.hp, touch: base.touch,
    face: -1, t: rnd(0, 9), state: 'idle', stT: 0, cd: rnd(1, 2.5),
    homeX: s.x, bound0: s.x - 170, bound1: s.x + 170,
    gy: s.y, dead: false, flash: 0, showHpT: 0,
    blind: 0, mark: 0, revealT: 0, hidden: !!s.hidden,
    hasArm: true, armor: s.type === 'armored' ? 3 : 0,
    touchCd: 0, vulnT: 0, cloneOf: s.cloneOf || 0,
    axis: 'x', dir: -1, segT: 0, alpha: 1, oilBuffed: false, tpCd: 1,
    lastSwing: -1,
  };
  return e;
}
function spawnClone(src) {
  const cnt = G.enemies.filter(e => !e.dead && (e.cloneOf === src.id || e.cloneOf === src.cloneOf)).length;
  if (cnt >= 2) return;
  const c = makeEnemy({ type: src.type, zone: src.zone, x: src.x + rnd(-70, 70), y: src.y, zs: src.zs, cloneOf: src.id });
  c.hp = 1; c.hpMax = 1; c.touch = 6; c.w = src.w * .92; c.h = src.h * .92;
  G.enemies.push(c);
  burst(c.x, c.y - c.h / 2, 8, { col: '#17171c', type: 'chip', s0: 2, s1: 5, sp1: 180, g: 300 });
}
/* 残页期间敌人获得对应画风能力的通用层 */
function applyOverlayCommon(e, dt) {
  const ov = G.overlay;
  if (!ov) { e.alpha = lerp(e.alpha, e.hidden ? .14 : 1, 8 * dt); return; }
  if (ov === 'water') e.alpha = lerp(e.alpha, .55, 5 * dt);
  else e.alpha = lerp(e.alpha, e.hidden ? .14 : 1, 8 * dt);
  if (ov === 'pixel') {
    e.tpCd -= dt;
    if (e.tpCd <= 0) {
      e.tpCd = 1.1;
      const p = G.player;
      e.x += clamp(p.x - e.x, -46, 46);
      e.y += clamp((p.y - 20) - e.y, -40, 40);
      e.vulnT = .3;
      burst(e.x, e.y - e.h / 2, 5, { col: '#8ecbe8', type: 'rect', s0: 2, s1: 5, sp1: 120 });
    }
  }
  if (ov === 'paper') e.spdMul = 1.5; else e.spdMul = 1;
}
function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (Math.abs(e.x - p.x) > 1500) continue; /* 只更新视野附近 */
    e.t += dt; e.stT += dt; e.flash -= dt; e.showHpT -= dt;
    e.touchCd -= dt; e.vulnT -= dt; e.cd -= dt;
    if (e.blind > 0) e.blind -= dt;
    if (e.revealT > 0) e.revealT -= dt;
    applyOverlayCommon(e, dt);
    const spd = (e.spdMul || 1);
    const toP = sgn(p.x - e.x), dP = dist(e.x, e.y, p.x, p.y);
    switch (e.type) {
      case 'floater': {
        if (e.blind > 0) { e.vx = Math.sin(e.t * 2.2) * 60; e.vy = Math.cos(e.t * 1.7) * 40; }
        else {
          if (dP < 480) { e.vx = lerp(e.vx, toP * 130 * spd, 2 * dt); e.vy = lerp(e.vy, clamp((p.y - 40 - e.y) * 1.2, -90, 90), 2 * dt); }
          else { e.vx = Math.sin(e.t) * 40; e.vy = Math.sin(e.t * .7) * 30; }
          if (e.cd <= 0 && dP < 320) { e.state = 'lunge'; e.stT = 0; e.cd = 2.2; e.lungeDir = toP; }
          if (e.state === 'lunge') { e.vx = e.lungeDir * 430; if (e.stT > .35) e.state = 'idle'; }
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.y = clamp(e.y, 240, G.GB - 10);
        break;
      }
      case 'ambusher': {
        if (e.hidden) {
          e.x += clamp(p.x - e.x, -26, 26) * dt * .7;
          if (dP < 140 || e.revealT > 0) { e.hidden = false; e.revealT = 4; }
        } else {
          e.vy += 2000 * dt;
          if (e.cd <= 0 && dP < 340) { e.vy = -540; e.vx = toP * 220 * spd; e.cd = 1.15; }
          e.x += e.vx * dt; e.y += e.vy * dt;
          const g = groundBelow(e.x, e.y);
          if (e.y >= g) { e.y = g; e.vy = 0; e.vx *= .6; }
          if (e.revealT <= 0 && e.hp > e.hpMax * .5) { e.hidden = true; }
        }
        break;
      }
      case 'binder': {
        e.vy += 2000 * dt;
        let mvx = 0;
        if (e.blind > 0) mvx = Math.sin(e.t * 2) * 50;
        else if (dP < 320) mvx = toP * 62 * spd;
        else mvx = Math.sin(e.t * .8) > 0 ? 40 : -40;
        e.x += mvx * dt; e.vx = mvx;
        const g = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g);
        if (e.y >= g) { e.y = g; e.vy = 0; }
        if (!e.blind && e.hasArm && e.cd <= 0 && dP < 420 && dP > 60) { e.state = 'windup'; e.stT = 0; e.cd = 2.6; }
        if (e.state === 'windup' && e.stT > .5) {
          e.state = 'idle';
          spawnProj({ type: 'bind', x: e.x, y: e.y - e.h * .7, vx: toP * 540, vy: 0, dmg: 0, from: 'e', ttl: .85 });
        }
        break;
      }
      case 'armored': {
        e.vy += 2000 * dt;
        let mvx = 0;
        if (e.blind > 0) mvx = Math.sin(e.t * 1.6) * 30;
        else if (e.state === 'slam') {
          if (e.stT > .55) {
            e.state = 'idle'; e.cd = 2;
            addShake(5); Sfx.play('boom');
            burst(e.x, e.y, 14, { col: getStyle('oil').pal.accent, type: 'chip', s0: 3, s1: 8, sp1: 260, g: 700 });
            if (Math.abs(p.x - e.x) < 130 && p.onG) damagePlayer(16, e.x);
          }
        }
        else if (dP < 380) { mvx = toP * 55 * spd; if (dP < 120 && e.cd <= 0) { e.state = 'slam'; e.stT = 0; } }
        e.x += mvx * dt; e.vx = mvx;
        const g = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g);
        if (e.y >= g) { e.y = g; e.vy = 0; }
        break;
      }
      case 'cloner': {
        e.vy += 2000 * dt;
        let mvx = e.blind > 0 ? Math.sin(e.t * 2) * 40 : (dP < 300 ? toP * 46 * spd : Math.sin(e.t * .6) > 0 ? 34 : -34);
        e.x += mvx * dt; e.vx = mvx;
        const g = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g);
        if (e.y >= g) { e.y = g; e.vy = 0; }
        if (!e.blind && e.cd <= 0 && dP < 640) { e.cd = 4.5; spawnClone(e); }
        break;
      }
      case 'tele': {
        if (e.blind > 0) break;
        if (e.cd <= 0) {
          e.cd = 1.5; e.state = 'telegraph'; e.stT = 0; e.vulnT = .55;
        }
        if (e.state === 'telegraph' && e.stT > .35) {
          e.state = 'idle';
          const p2 = G.player;
          const dx = clamp(Math.round((p2.x - e.x) / 48), -2, 2), dy = clamp(Math.round((p2.y - 30 - e.y) / 48), -1, 1);
          e.x += dx * 48; e.y = clamp(e.y + dy * 48, 260, G.GB - 10);
          burst(e.x, e.y - 20, 6, { col: '#8ecbe8', type: 'rect', s0: 2, s1: 5, sp1: 140 });
          spawnProj({ type: 'pix', x: e.x, y: e.y - 24, vx: sgn(p2.x - e.x) * 560, vy: clamp((p2.y - 40 - e.y) * 1.1, -160, 160), dmg: 8, from: 'e', ttl: 1.4 });
          Sfx.play('shoot');
        }
        break;
      }
      case 'flyer': {
        const s2 = 170 * spd;
        if (e.blind > 0) { e.x += Math.sin(e.t * 2.4) * 80 * dt; e.y += Math.cos(e.t * 2) * 60 * dt; }
        else {
          if (e.cd <= 0 && Math.abs(p.y - 20 - e.y) < 70 && Math.abs(p.x - e.x) < 520) { e.state = 'dive'; e.stT = 0; e.cd = 3.2; e.dir = sgn(p.x - e.x); }
          if (e.state === 'dive') { e.x += e.dir * 540 * dt; if (e.stT > .5) e.state = 'fold'; }
          else {
            e.segT -= dt;
            if (e.axis === 'x') e.x += e.dir * s2 * dt; else e.y += e.dir * s2 * dt;
            if (e.segT <= 0) {
              e.segT = rnd(.7, 1.8);
              const dx = p.x - e.x, dy = (p.y - 30) - e.y;
              if (Math.abs(dx) > Math.abs(dy)) { e.axis = 'x'; e.dir = sgn(dx); } else { e.axis = 'y'; e.dir = sgn(dy); }
            }
          }
        }
        e.y = clamp(e.y, 240, G.GB - 30);
        break;
      }
      case 'walker': default: {
        e.vy += 2000 * dt;
        let mvx = 0;
        if (e.blind > 0) mvx = Math.sin(e.t * 1.8) * 46;
        else if (dP < 300) mvx = toP * 110 * spd;
        else mvx = Math.sin(e.t * .9) > 0 ? 50 : -50;
        e.x += mvx * dt; e.vx = mvx; e.face = sgn(mvx || e.face);
        const g = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g);
        if (e.y >= g) { e.y = g; e.vy = 0; }
        break;
      }
    }
    /* 接触伤害 */
    if (e.touchCd <= 0 && aabb(ebox(e), pbox(p))) {
      e.touchCd = .9;
      damagePlayer(e.touch, e.x);
      if (emStyle() === 'ink') { addStain(clamp(p.x - G.cam.x, 0, W), clamp(p.y - 40 - G.cam.y, 0, H), rnd(30, 55), .45); p.slowT = .6; }
      if (emStyle() === 'sketch' && e.type !== 'walker') p.bindT = Math.max(p.bindT, .8);
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}
function groundBelow(x, feetY) {
  let best = Infinity;
  for (const pl of G.platforms) {
    if (pl.hp !== undefined && pl.hp <= 0) continue;
    if (x > pl.x - 6 && x < pl.x + pl.w + 6 && pl.y >= feetY - 6) best = Math.min(best, pl.y);
  }
  return best === Infinity ? G.worldH + 400 : best;
}

/* ---------- 敌人绘制 ---------- */
function drawEnemy(ctx, e) {
  const st = getStyle(e.zs), pal = st.pal;
  const p = G.player;
  ctx.save();
  ctx.globalAlpha = e.alpha;
  const flash = e.flash > 0;
  const col = flash ? '#ffffff' : pal.ink;
  const breathe = e.type === 'cloner' && !e.cloneOf ? 1 + Math.sin(e.t * 2.2) * .06 : 1;
  ctx.translate(e.x, e.y);
  ctx.scale(breathe, breathe);
  ctx.translate(-e.x, -e.y);
  switch (e.type) {
    case 'floater': {
      const path = c => {
        c.beginPath();
        c.ellipse(e.x, e.y - e.h * .55, e.w * .48, e.h * .5, 0, 0, TAU);
        c.quadraticCurveTo(e.x - e.w * .6, e.y - e.h * .3, e.x - e.w * .2, e.y + Math.sin(e.t * 5) * 4);
        c.quadraticCurveTo(e.x + e.w * .1, e.y - e.h * .2, e.x + e.w * .5, e.y - e.h * .45);
      };
      Paint.fill(ctx, path, col, {});
      eyes(ctx, e, pal, 2);
      if (e.blind > 0) inkBlind(ctx, e);
      break;
    }
    case 'ambusher': {
      const a = e.hidden ? .16 : 1;
      ctx.globalAlpha = e.alpha * a;
      const path = c => { c.beginPath(); c.ellipse(e.x, e.y - e.h * .4, e.w * .55, e.h * .55, 0, 0, TAU); };
      Paint.fill(ctx, path, flash ? '#fff' : pal.mid, {});
      if (!e.hidden) eyes(ctx, e, pal, 2);
      else { /* 水渍涟漪：暴露位置的微光 */
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
        const r = (e.t * 30) % 40;
        ctx.beginPath(); ctx.ellipse(e.x, e.y - 4, e.w * .3 + r, 8 + r * .3, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = e.alpha;
      break;
    }
    case 'binder': {
      const hy = e.y - e.h + 10;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x, hy + 12); }, col, 4, {});
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x - 10, e.y); c.lineTo(e.x, e.y - 18); c.moveTo(e.x + 10, e.y); c.lineTo(e.x, e.y - 18); }, col, 3.5, {});
      Paint.stroke(ctx, c => { c.beginPath(); c.arc(e.x, hy, 9, 0, TAU); }, col, 3, {});
      if (e.hasArm) {
        const raise = e.state === 'windup' ? -18 : 0;
        Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x + 6, hy + 16); c.lineTo(e.x + 26, hy + 2 + raise); c.lineTo(e.x + 44, hy + 8 + raise); }, col, 3, {});
      } else {
        Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x + 6, hy + 16); c.lineTo(e.x + 16, hy + 24); }, col, 3, {});
      }
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x - 6, hy + 16); c.lineTo(e.x - 18, hy + 30); }, col, 3, {});
      if (e.blind > 0) inkBlind(ctx, e);
      break;
    }
    case 'armored': {
      const raise = e.state === 'slam' ? Math.max(0, .55 - e.stT) * -30 : 0;
      const path = c => { c.beginPath(); c.ellipse(e.x, e.y - e.h * .5 + raise * 0, e.w * .52, e.h * .52, 0, 0, TAU); };
      Paint.fill(ctx, path, flash ? '#fff' : '#a24a2c', {});
      /* 剩余色层 */
      const cols = ['#c86a34', '#d9a13b', '#e8b04a'];
      for (let i = 0; i < e.armor; i++) {
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 7; ctx.globalAlpha = e.alpha * .85;
        ctx.beginPath(); ctx.ellipse(e.x, e.y - e.h * .5 - 4 - i * 8, e.w * .52 - 2 + i * 3, e.h * .52 - 4, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
      ctx.globalAlpha = e.alpha;
      Paint.fill(ctx, c => { c.beginPath(); c.ellipse(e.x + e.face * 14, e.y - e.h * .62, 10, 8, 0, 0, TAU); }, flash ? '#fff' : '#3f2f22', {});
      eyes(ctx, e, pal, 1, e.x + e.face * 14, e.y - e.h * .62);
      if (e.blind > 0) inkBlind(ctx, e);
      break;
    }
    case 'cloner': {
      const s = e.cloneOf ? .92 : 1;
      const path = c => roughRectPath(c, e.x - e.w * .5 * s, e.y - e.h, e.w * s, e.h * s, 3, e.id * 7, 14);
      Paint.fill(ctx, path, flash ? '#fff' : '#17171c', { cut: c => {
        c.beginPath(); c.strokeRect(e.x - e.w * .3, e.y - e.h * .78, e.w * .6, e.h * .5);
      } });
      ctx.fillStyle = flash ? '#17171c' : '#f0e9d8';
      setFont(ctx, 20 * s, true); ctx.textAlign = 'center';
      ctx.fillText('印', e.x, e.y - e.h * .42);
      if (!e.cloneOf) eyes(ctx, e, pal, 2, e.x, e.y - e.h - 8, true);
      break;
    }
    case 'tele': {
      const cellX = Math.floor(e.x / 48) * 48, cellY = Math.floor(e.y / 48) * 48;
      ctx.strokeStyle = 'rgba(142,203,232,.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(cellX + 2, cellY + 2, 44, 44);
      const vul = e.vulnT > 0;
      const path = c => roughRectPath(c, e.x - e.w / 2, e.y - e.h, e.w, e.h, 2, e.id * 13, 12);
      if (vul) Paint.fill(ctx, path, '#ffffff', {});
      else Paint.fill(ctx, path, flash ? '#fff' : '#2a2a3a', {});
      ctx.fillStyle = vul ? '#2a2a3a' : '#8ecbe8';
      ctx.fillRect(e.x - 8, e.y - e.h * .7, 16, 8);
      ctx.fillRect(e.x - 3, e.y - e.h * .45, 6, 10);
      break;
    }
    case 'flyer': {
      const flap = Math.sin(e.t * 9) * .5;
      const bodyPath = c => { c.beginPath(); c.moveTo(e.x, e.y - e.h * .6); c.lineTo(e.x + e.face * 18, e.y - e.h * .35); c.lineTo(e.x - e.face * 6, e.y - e.h * .1); c.closePath(); };
      Paint.fill(ctx, bodyPath, flash ? '#fff' : '#fdf6e8', {});
      const wingL = c => { c.beginPath(); c.moveTo(e.x, e.y - e.h * .55); c.lineTo(e.x - e.face * 26, e.y - e.h * .55 - 20 - flap * 22); c.lineTo(e.x - e.face * 8, e.y - e.h * .35); c.closePath(); };
      Paint.fill(ctx, wingL, flash ? '#fff' : '#fdf6e8', {});
      ctx.strokeStyle = 'rgba(140,60,40,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x, e.y - e.h * .6); ctx.lineTo(e.x - e.face * 6, e.y - e.h * .1); ctx.stroke();
      break;
    }
    default: { /* walker 杂卒 */
      const path = c => roughRectPath(c, e.x - e.w * .5, e.y - e.h + 8, e.w, e.h - 8, 3, e.id * 3, 14);
      Paint.fill(ctx, path, flash ? '#fff' : col, { hR: 100, sp: 8 });
      const leg = Math.sin(e.t * 8) * 5;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x - 7, e.y - 8); c.lineTo(e.x - 7 + leg, e.y); c.moveTo(e.x + 7, e.y - 8); c.lineTo(e.x + 7 - leg, e.y); }, col, 3.5, {});
      eyes(ctx, e, pal, 2);
      if (e.blind > 0) inkBlind(ctx, e);
      break;
    }
  }
  /* 雕痕标记 */
  if (e.mark > 0) {
    ctx.strokeStyle = '#e05a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y - e.h - 16, 8, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.x - 4, e.y - e.h - 16); ctx.lineTo(e.x - 1, e.y - e.h - 13); ctx.lineTo(e.x + 4, e.y - e.h - 20); ctx.stroke();
  }
  /* 小血条 */
  if (e.showHpT > 0 && e.hp < e.hpMax && !e.cloneOf) {
    ctx.fillStyle = 'rgba(20,18,24,.6)';
    ctx.fillRect(e.x - 20, e.y - e.h - 10, 40, 4);
    ctx.fillStyle = '#e05a4a';
    ctx.fillRect(e.x - 20, e.y - e.h - 10, 40 * clamp(e.hp / e.hpMax, 0, 1), 4);
  }
  ctx.restore();
}
function eyes(ctx, e, pal, n, ex, ey, above) {
  const p = G.player;
  const dx = p ? clamp(sgn(p.x - e.x) * 1.6, -2, 2) : 0;
  const bx = ex != null ? ex : e.x, by = ey != null ? ey : e.y - e.h * .6;
  ctx.fillStyle = '#fdf6e8';
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.arc(bx + (i - (n - 1) / 2) * 11, by, 3.6, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#17171c';
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.arc(bx + (i - (n - 1) / 2) * 11 + dx, by, 1.8, 0, TAU); ctx.fill();
  }
}
function inkBlind(ctx, e) {
  ctx.fillStyle = 'rgba(30,28,34,.85)';
  ctx.beginPath(); ctx.ellipse(e.x, e.y - e.h * .62, 16, 10, 0, 0, TAU); ctx.fill();
}

/* ============================================================
   弹道
   ============================================================ */
function spawnProj(o) {
  G.projs.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, dmg: 8, ttl: 1.2, from: 'e', type: 'blot', t: 0 }, o));
}
function updateProjs(dt) {
  const p = G.player;
  for (const pr of G.projs) {
    pr.t += dt; pr.ttl -= dt;
    pr.vy += (pr.g || 0) * dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.ttl <= 0) { pr.dead = true; continue; }
    const box = { x: pr.x - 8, y: pr.y - 8, w: 16, h: 16 };
    /* 撞平台 */
    for (const pl of G.platforms) {
      if (pl.hp !== undefined && pl.hp <= 0) continue;
      if (aabb(box, pl)) {
        pr.dead = true;
        if (pr.type === 'drop') dropSplash(pr);
        else if (pr.type === 'blot' || pr.type === 'glit') {
          burst(pr.x, pr.y, 8, { col: '#26252b', s0: 2, s1: 6, sp1: 160, g: 400 });
          if (G.player && curStyle() === 'ink') addWash(pr.x, pr.y, 30, '#26252b');
        }
        break;
      }
    }
    if (pr.dead) continue;
    if (pr.from === 'e') {
      if (p && !p.dead && aabb(box, pbox(p))) {
        pr.dead = true;
        if (pr.type === 'bind') { p.bindT = Math.max(p.bindT, 1.4); addText(p.x, p.y - 70, '被线条捆住了! 连打方向挣脱', '#a8443c'); Sfx.play('fold'); }
        else if (pr.type === 'blot') { damagePlayer(12, pr.x); if (curStyle() === 'ink') addStain(clamp(pr.x - G.cam.x, 0, W), clamp(pr.y - G.cam.y, 0, H), rnd(24, 44), .4); }
        else damagePlayer(pr.dmg, pr.x);
      }
    } else {
      /* 玩家弹道 */
      if (pr.type === 'wave' && pr.hitSet) {
        for (const e of G.enemies) {
          if (e.dead || pr.hitSet[e.id]) continue;
          if (aabb(box, ebox(e))) { pr.hitSet[e.id] = 1; damageEnemy(e, pr.dmg, { style: 'ink', dir: sgn(pr.vx), knock: true }); }
        }
        if (G.bossOn && G.boss && !pr.hitSet.boss && aabb(box, { x: G.boss.x - 44, y: G.boss.y - 60, w: 88, h: 130 })) { pr.hitSet.boss = 1; hitBoss(pr.dmg, { style: 'ink' }); }
      } else if (pr.type !== 'wave') {
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (aabb(box, ebox(e))) { pr.dead = true; damageEnemy(e, pr.dmg, { style: curStyle(), dir: sgn(pr.vx), knock: true }); break; }
        }
        if (!pr.dead && G.bossOn && G.boss && aabb(box, { x: G.boss.x - 44, y: G.boss.y - 60, w: 88, h: 130 })) { pr.dead = true; hitBoss(pr.dmg, { style: curStyle() }); }
      }
      if (pr.type === 'drop' && pr.vy > 0) {
        const g = groundBelow(pr.x, pr.y + 8);
        if (pr.y >= g) { pr.dead = true; dropSplash(pr); }
      }
    }
  }
  G.projs = G.projs.filter(pr => !pr.dead);
}
function dropSplash(pr) {
  const pal = getStyle('water').pal;
  addWash(pr.x, pr.y, 90, pal.accent);
  burst(pr.x, pr.y, 16, { col: pal.accent, s0: 3, s1: 8, sp1: 260, vy: -120, g: 500 });
  Sfx.play('wave');
  const box = { x: pr.x - 90, y: pr.y - 90, w: 180, h: 120 };
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (aabb(box, ebox(e))) {
      if (e.hidden) { e.hidden = false; e.revealT = 3.5; }
      damageEnemy(e, pr.dmg, { style: 'water', dir: sgn(e.x - pr.x), knock: true });
    }
  }
  /* 照出水渍中的隐藏敌人（即使没打中） */
  for (const e of G.enemies) if (!e.dead && e.hidden && dist(e.x, e.y, pr.x, pr.y) < 200) { e.hidden = false; e.revealT = 3.5; }
}
function drawProjs(ctx) {
  const p = G.player;
  /* 激光笔重击光束 */
  if (p && p.beamT > 0) {
    const a = p.beamT / .2;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(p.beamDir > 0 ? p.x : p.x - 560, p.y - 52 - 9 * a, 560, 18 * a);
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.beamDir > 0 ? p.x : p.x - 560, p.y - 52 - 3 * a, 560, 6 * a);
    ctx.restore();
  }
  for (const pr of G.projs) {
    ctx.save();
    switch (pr.type) {
      case 'blot':
        ctx.fillStyle = '#26252b';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 11, 13, Math.atan2(pr.vy, pr.vx), 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(38,37,43,.3)';
        ctx.beginPath(); ctx.arc(pr.x - pr.vx * .03, pr.y - pr.vy * .03, 7, 0, TAU); ctx.fill();
        break;
      case 'bind':
        ctx.strokeStyle = '#3a3936'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y);
        const wob = Math.sin(pr.t * 20) * 5;
        ctx.lineTo(pr.x - pr.vx * .12, pr.y + wob); ctx.stroke();
        ctx.fillStyle = '#3a3936';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, TAU); ctx.fill();
        break;
      case 'pix':
        ctx.fillStyle = '#8ecbe8';
        ctx.fillRect(pr.x - 6, pr.y - 6, 12, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(pr.x - 2, pr.y - 2, 4, 4);
        break;
      case 'laser':
        ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - pr.vx * .022, pr.y); ctx.stroke();
        break;
      case 'wave': {
        const dir = sgn(pr.vx);
        ctx.strokeStyle = '#222126'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 26, dir > 0 ? -.9 : Math.PI - .9, dir > 0 ? .9 : Math.PI + .9, dir < 0);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(34,33,38,.4)'; ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(pr.x - dir * 14, pr.y, 30, dir > 0 ? -.8 : Math.PI - .8, dir > 0 ? .8 : Math.PI + .8, dir < 0);
        ctx.stroke();
        break;
      }
      case 'drop':
        ctx.fillStyle = '#e8836a';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(pr.x - 2.5, pr.y - 2.5, 3, 0, TAU); ctx.fill();
        break;
      case 'glit':
        ctx.fillStyle = '#8ecbe8'; ctx.fillRect(pr.x - 10, pr.y - 10, 20, 20);
        ctx.fillStyle = '#ff4a8c'; ctx.fillRect(pr.x - 4, pr.y - 12, 10, 8);
        break;
    }
    ctx.restore();
  }
}
