'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》entities.js —— 玩家 / 敌人 / 弹道 / 战斗判定
   ============================================================ */

/* ============================================================
   玩家（末位清醒人格）
   ============================================================ */
function makePlayer() {
  return {
    x: 120, y: 520, w: 30, h: 52, vx: 0, vy: 0, face: 1,
    onG: false, jumps: 0, coyote: 0, jbuf: 0, anim: 0, squash: 0,
    atkCd: 0, atkT: 0, swing: 0,
    dashT: 0, dashCd: 0, dashDir: 1, dashTrail: [],
    iframe: 0, hp: G.hpMax, bindT: 0, dead: false,
    beamT: 0, runT: 0, sprayCd: 0, sponge: 0, touchCd2: 0, inLiquid: false,
  };
}
function pbox(p) { return { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }; }

function updatePlayer(dt) {
  const p = G.player;
  if (!p || p.dead) return;
  /* 回合制模式：移动交由关卡逻辑 */
  if (G.turn) { p.atkCd -= dt; p.iframe -= dt; return; }
  p.coyote -= dt; p.jbuf -= dt; p.atkCd -= dt; p.dashCd -= dt;
  p.iframe -= dt; p.bindT -= dt; p.beamT -= dt; p.sprayCd -= dt; p.touchCd2 -= dt;
  p.anim += dt; p.squash = lerp(p.squash, 0, Math.min(1, 12 * dt));
  G.ink = clamp(G.ink + dt * 2.2, 0, G.inkMax); /* 墨量缓回 */

  const g = G.grav;
  p.inLiquid = !!(G.liquid && p.x > G.liquid.x && p.x < G.liquid.x + G.liquid.w
    && p.y > G.liquid.y - 40 && p.y - p.h < G.liquid.y + G.liquid.h + 190);
  /* 颜料浮力底：沉不到底 */
  if (G.liquid && p.x > G.liquid.x && p.x < G.liquid.x + G.liquid.w && p.y > G.liquid.y + G.liquid.h + 150) {
    p.y = G.liquid.y + G.liquid.h + 150; p.vy = Math.min(p.vy, 0);
  }

  /* 移动 */
  let mx = 0;
  if (In.down('left')) mx -= 1;
  if (In.down('right')) mx += 1;
  p.slowT = (p.slowT || 0) - dt;
  const mud = !!(G.mud && p.x > G.mud.x0 && p.x < G.mud.x1);
  let spd = 330 * (p.bindT > 0 ? .45 : 1) * (p.slowT > 0 ? .6 : 1) * (mud ? .52 : 1);
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashDir * 640; p.vy = 0;
    p.dashTrail.push({ x: p.x, y: p.y });
    if (p.dashTrail.length > 6) p.dashTrail.shift();
  } else {
    p.dashTrail.length = 0;
    if (mx) p.face = mx;
    if (p.inLiquid) {
      p.vx = lerp(p.vx, mx * 210, 1 - Math.pow(.01, dt));
    } else {
    p.vx = lerp(p.vx, mx * spd, 1 - Math.pow(mud ? .08 : .0001, dt));
    if (!mx && p.onG) p.vx = lerp(p.vx, 0, 1 - Math.pow(mud ? .3 : .001, dt));
    if (mud && chance(.06)) spawnPart({ x: p.x - p.face * 8, y: p.y - 2, vx: rnd(-30, 30), vy: rnd(-50, -10), life: .5, size: rnd(2, 5), col: 'rgba(96,70,44,.7)' });
    }
    p.runT = Math.abs(p.vx) > 30 && p.onG ? p.runT + dt : 0;
    if (p.runT > .17) { p.runT = 0; spawnPart({ x: p.x - p.face * 10, y: p.y - 2, vx: -p.face * 40, vy: -30, life: .4, size: rnd(3, 6), col: 'rgba(120,115,100,.5)' }); }
  }
  /* 冲刺 */
  if (In.hit('dash') && p.dashCd <= 0 && p.bindT <= 0 && !p.inLiquid) {
    if (G.ink >= 6) {
      G.ink -= 6; p.dashT = .16; p.dashCd = .5; p.dashDir = mx || p.face;
      p.iframe = Math.max(p.iframe, .22);
      Sfx.play('dash');
    } else { Sfx.play('deny'); toast('墨量不足'); }
  }
  /* 跳跃 / 游泳上浮 */
  if (In.hit('jump')) p.jbuf = .12;
  if (p.inLiquid) {
    if (In.down('jump')) p.vy = lerp(p.vy, -230, 4 * dt);
    if (In.down('down')) p.vy = lerp(p.vy, 230, 4 * dt);
  } else if (p.jbuf > 0) {
    const jMul = mud ? .8 : 1;
    if (p.onG || p.coyote > 0) {
      p.vy = -700 * g * jMul; p.onG = false; p.jumps = 1; p.jbuf = 0; p.coyote = 0;
      Sfx.play('jump');
    } else if (p.jumps < 2) {
      p.vy = -640 * g * jMul; p.jumps = 2; p.jbuf = 0;
      Sfx.play('djump');
      burst(p.x, p.y - 10, 8, { col: 'rgba(255,255,255,.55)', s0: 2, s1: 5, sp1: 150 });
    }
  }
  if (!p.inLiquid && !In.down('jump') && p.vy * g < -260 && p.vy * g < 0) p.vy = -260 * g;

  /* 重力 */
  if (p.inLiquid) { p.vy += 260 * dt; p.vy = clamp(p.vy, -240, 240); }
  else { p.vy += 2200 * g * dt; p.vy = g > 0 ? Math.min(p.vy, 1300) : Math.max(p.vy, -1300); }
  moveAndCollide(p, dt);

  /* 攻击 */
  if (In.hit('light') && p.atkCd <= 0) doToolLight(p);
  if (In.hit('heavy') && p.atkCd <= 0) doToolHeavy(p);

  /* 挣脱捆缚 */
  if (p.bindT > 0 && (In.hit('left') || In.hit('right') || In.hit('jump'))) p.bindT -= .2;

  /* 深渊 */
  if (!p.dead && (p.y > G.worldH + 160 || p.y < -360)) {
    damagePlayer(12, p.x, { silent: true });
    if (!p.dead) { p.x = G.checkpoint.x; p.y = G.checkpoint.y - 4; p.vx = 0; p.vy = 0; updateCam(0, true); toast('万具匣把你捞了回来'); }
  }
}
function moveAndCollide(p, dt) {
  const g = G.grav;
  const prevFeet = p.y, prevHead = p.y - p.h;
  /* X 轴 */
  p.x += p.vx * dt;
  let box = pbox(p);
  for (const pl of solidList()) {
    if (!aabb(box, pl)) continue;
    const feetGap = g > 0 ? p.y - pl.y : pl.y + pl.h - (p.y - p.h);
    const stepAllow = pl.kind === 'dbx' ? 56 : 20; /* 画出的笔迹可以攀上去 */
    if (feetGap > 0 && feetGap <= stepAllow && p.vy * g >= 0) { if (g > 0) p.y = pl.y; else p.y = pl.y + pl.h + p.h; box = pbox(p); continue; }
    if (p.vx > 0) p.x = pl.x - p.w / 2; else if (p.vx < 0) p.x = pl.x + pl.w + p.w / 2;
    p.vx = 0; box = pbox(p);
  }
  /* Y 轴 */
  p.y += p.vy * dt;
  box = pbox(p);
  const wasG = p.onG;
  p.onG = false;
  for (const pl of solidList()) {
    if (!aabb(box, pl)) continue;
    if (g > 0) {
      const dbxMagnet = pl.kind === 'dbx' && p.vy >= 0 && p.y - pl.y > -4 && p.y - pl.y <= 42;
      if (p.vy >= 0 && (prevFeet <= pl.y + Math.max(12, p.vy * dt + 12) || dbxMagnet)) {
        p.y = pl.y;
        if (pl.kind === 'bounce') { p.vy = -980; Sfx.play('bounce'); p.squash = .35; }
        else {
          if (!wasG && p.vy > 500) { p.squash = .3; burst(p.x, p.y, 6, { col: 'rgba(120,115,100,.5)', s0: 2, s1: 5, sp1: 100 }); }
          p.vy = 0;
        }
        p.onG = true; p.jumps = 0;
        box = pbox(p);
      } else if (p.vy < 0) { p.y = pl.y + pl.h + p.h; p.vy = 0; box = pbox(p); }
    } else {
      if (p.vy <= 0 && prevHead >= pl.y + pl.h - Math.max(12, -p.vy * dt + 12)) {
        p.y = pl.y + pl.h + p.h;
        p.vy = 0; p.onG = true; p.jumps = 0;
        box = pbox(p);
      } else if (p.vy > 0) { p.y = pl.y - p.h; p.vy = 0; box = pbox(p); }
    }
  }
  if (p.onG) p.coyote = .1;
}
function solidList() {
  const out = [];
  for (const pl of G.platforms) {
    if (pl.dead) continue;
    if (pl.kind === 'hidden' && pl.revealT <= 0 && G.revealAll <= 0) continue; /* 隐藏平台未显形 */
    if (pl.kind === 'mirrorOnly' && !G.mirror) continue; /* 倒影平台仅镜像态实体 */
    if (pl.kind === 'liquid') continue;
    out.push(pl);
  }
  return out;
}

/* ============================================================
   战斗判定
   ============================================================ */
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
  if (G.bossOn && G.boss && G.boss.state !== 'dying') {
    const d = G.boss;
    if (aabb(box, { x: d.x - 46, y: d.y - 64, w: 92, h: 130 })) { hitBoss(dmg, o); hitAny = true; }
  }
  /* 可破坏墙 */
  for (let i = G.platforms.length - 1; i >= 0; i--) {
    const pl = G.platforms[i];
    if (pl.dead || pl.kind !== 'gwall' || !aabb(box, pl)) continue;
    let hitWall = false;
    if (pl.gs === 'sketch' && (o.tool === 'eraser' || o.erase)) {
      pl.hp -= o.erase ? 1.2 : .6; hitWall = true; Sfx.play('erase');
      burst(pl.x + pl.w / 2, box.y + box.h / 2, 6, { col: '#f6f4ef', type: 'rect', s0: 3, s1: 7, sp1: 180, g: 400 });
    } else if (pl.gs === 'oil' && o.armorStrip) {
      pl.hp -= 1; hitWall = true; Sfx.play('scrape');
      burst(pl.x + pl.w / 2, box.y + box.h / 2, 8, { col: '#c86a34', type: 'chip', s0: 3, s1: 7, sp1: 200, g: 500 });
    }
    if (hitWall) {
      hitAny = true;
      if (pl.hp <= 0) {
        pl.dead = true;
        G.platforms.splice(i, 1);
        burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 20, { col: pl.gs === 'sketch' ? '#e8e4da' : '#a24a2c', type: pl.gs === 'sketch' ? 'rect' : 'chip', s0: 4, s1: 10, sp1: 320, g: 600 });
        toast('墙被打开了'); Sfx.play('boom'); addShake(5);
        if (pl.reveal) spawnReveal(pl);
      }
    }
  }
  /* 擦除敌方弹幕 */
  if (o.erase) for (const pr of G.projs) if (pr.from === 'e' && aabb(box, { x: pr.x - 10, y: pr.y - 10, w: 20, h: 20 })) pr.ttl = 0;
  /* 剪断封印 */
  if (o.cuts) for (const it of G.inter) {
    if (it.type === 'seal' && !it.cut) {
      if (aabb(box, { x: it.x - 14, y: it.y - it.len - 10, w: 28, h: it.len + 20 })) {
        it.cut = true; Sfx.play('fold');
        addText(it.x, it.y - it.len - 20, '剪断!', '#c2352a');
        onSealCut(it);
      }
    }
  }
  if (hitAny) { G.freeze = Math.max(G.freeze, .05); addShake(3); }
}
function damageEnemy(e, dmg, o) {
  if (e.dead || e.type === 'ally') return;
  if (e.hidden) { e.hidden = false; e.revealT = 3; }
  let d = dmg;
  if (e.markT > 0) d *= 2;
  if (o.vsSketch && e.zs === 'sketch') d *= o.vsSketch;
  let knock = o.knock !== false && !e.cloneOf;
  if (e.armor > 0 && !o.armorStrip) { d *= .3; knock = false; }
  else if (e.armor > 0 && o.armorStrip) {
    e.armor--; d *= .6; knock = true;
    if (e.armor === 0) addText(e.x, e.y - 64, '破甲!', '#d9a13b');
  }
  e.hp -= d; e.flash = .12; e.showHpT = 2;
  if (o.mark) e.markT = o.mark;
  if (knock) { e.vx = (o.dir || 1) * 260; e.vy = -160; }
  if (o.blind) e.blind = Math.max(e.blind || 0, o.blind);
  addText(e.x + rnd(-8, 8), e.y - e.h - 6, Math.round(d) + (e.markT > 0 ? '✗' : ''), e.markT > 0 ? '#e05a4a' : '#fff');
  burst(e.x, e.y - e.h * .5, 7, { col: getStyle(emStyle()).pal.ink, s0: 2, s1: 6, sp1: 220, g: 400 });
  Sfx.play('hit');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  G.stats.kills++;
  G.ink = clamp(G.ink + 10, 0, G.inkMax);
  addText(e.x, e.y - e.h - 18, '+墨量', '#7fb0c8');
  burst(e.x, e.y - e.h / 2, 14, { col: getStyle(e.zs).pal.ink, s0: 3, s1: 8, sp1: 280, g: 300, drag: 2 });
  Sfx.play('kill');
  if (e.type === 'eraserGiant') { toast('巨橡皮碎裂了！它擦掉的地板回来了'); restoreEatenFloor(); }
}
function damagePlayer(d, sx, opts = {}) {
  const p = G.player;
  if (!p || p.dead || p.iframe > 0 || p.dashT > 0 || G.state !== 'play') return;
  p.hp -= d; p.iframe = 1.1; G.hurtT = .3;
  p.vx = (p.x < sx ? -1 : 1) * 300; p.vy = -280 * G.grav; p.onG = false;
  addShake(7); Sfx.play('hurt');
  burst(p.x, p.y - 30, 10, { col: getStyle(curStyle()).pal.accent, s0: 2, s1: 6, sp1: 240, g: 500 });
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true; G.deadT = 1.5; G.stats.deaths++;
    burst(p.x, p.y - 30, 24, { col: '#26252b', s0: 3, s1: 10, sp1: 340, g: 400, drag: 2 });
    Sfx.play('boom');
  }
}

/* ============================================================
   敌人
   ============================================================ */
let ENEMY_ID = 1;
const ETYPE = {
  floater:     { hp: 34, w: 46, h: 52, touch: 12, zh: '墨灵' },
  walker:      { hp: 40, w: 38, h: 52, touch: 10, zh: '杂卒' },
  binder:      { hp: 46, w: 34, h: 58, touch: 10, zh: '线偶' },
  armored:     { hp: 70, w: 70, h: 62, touch: 16, zh: '厚涂傀' },
  tele:        { hp: 36, w: 44, h: 44, touch: 10, zh: '网格哨兵' },
  flyer:       { hp: 38, w: 54, h: 36, touch: 12, zh: '纸鹤兵' },
  eraserGiant: { hp: 90, w: 74, h: 84, touch: 14, zh: '巨橡皮' },
  shadow:      { hp: 30, w: 40, h: 50, touch: 10, zh: '影子' },
  ally:        { hp: 1, w: 30, h: 40, touch: 0, zh: '画灵' },
};
function makeEnemy(s) {
  const base = ETYPE[s.type];
  return {
    id: ENEMY_ID++, type: s.type, zone: s.zone != null ? s.zone : -1, zs: s.zs || 'ink',
    x: s.x, y: s.y, w: base.w, h: base.h,
    vx: 0, vy: 0, hp: base.hp, hpMax: base.hp, touch: base.touch,
    face: -1, t: rnd(0, 9), state: 'idle', stT: 0, cd: rnd(1, 2.5),
    dead: false, flash: 0, showHpT: 0, blind: 0, markT: 0, revealT: 0,
    hidden: !!s.hidden, hasArm: true, armor: s.type === 'armored' ? 3 : 0,
    touchCd: 0, vulnT: 0, cloneOf: 0, alpha: 1, tpCd: 1, lastSwing: -1,
    life: s.type === 'ally' ? 14 : 0, shootCd: 1,
  };
}
function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (Math.abs(e.x - (p ? p.x : 0)) > 1500) continue;
    e.t += dt; e.stT += dt; e.flash -= dt; e.showHpT -= dt;
    e.touchCd -= dt; e.vulnT -= dt; e.cd -= dt; e.markT -= dt; e.blind -= dt; e.revealT -= dt;
    if (e.life > 0) { e.life -= dt; if (e.life <= 0) { e.dead = true; burst(e.x, e.y - 20, 10, { col: '#c2352a', s0: 3, s1: 6, sp1: 180, g: 200 }); continue; } }
    const dP = p ? dist(e.x, e.y, p.x, p.y) : 9999;
    const toP = p ? sgn(p.x - e.x) : 1;
    switch (e.type) {
      case 'ally': {
        /* 画灵：跟随玩家并射击最近敌人 */
        if (p) {
          const tx = p.x + p.face * -40, ty = p.y - 90 + Math.sin(e.t * 2) * 10;
          e.x = lerp(e.x, tx, 2.4 * dt); e.y = lerp(e.y, ty, 2.4 * dt);
          e.shootCd -= dt;
          if (e.shootCd <= 0) {
            let best = null, bd = 560;
            for (const o of G.enemies) if (!o.dead && o.type !== 'ally') { const d2 = dist(o.x, o.y, e.x, e.y); if (d2 < bd) { bd = d2; best = o; } }
            if (G.bossOn && G.boss) { const d2 = dist(G.boss.x, G.boss.y, e.x, e.y); if (d2 < bd) best = G.boss; }
            if (best) {
              e.shootCd = 1.1;
              const a = Math.atan2((best.y - 24) - e.y, best.x - e.x);
              spawnProj({ type: 'pix', x: e.x, y: e.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: 8, from: 'p', ttl: 1.2 });
              Sfx.play('shoot');
            }
          }
        }
        break;
      }
      case 'shadow': {
        if (p) {
          const s2 = G.dark > .4 ? 150 : 96;
          e.vx = lerp(e.vx, toP * s2, 2 * dt);
          e.vy = lerp(e.vy, clamp((p.y - 30 - e.y) * 1.4, -110, 110), 2 * dt);
          e.x += e.vx * dt; e.y += e.vy * dt;
          e.y = clamp(e.y, 160, G.worldH - 10);
        }
        break;
      }
      case 'eraserGiant': {
        e.face = toP;
        e.x += toP * 46 * dt;
        const gnd = groundBelow(e.x, e.y);
        if (gnd !== Infinity) {
          e.vy += 2000 * dt;
          e.y = Math.min(e.y + e.vy * dt, gnd);
          if (e.y >= gnd) { e.y = gnd; e.vy = 0; }
          e.lastGnd = gnd;
        } else {
          /* 脚下地板被自己擦掉了：像幽灵一样悬浮在原高度继续擦 */
          e.y = e.lastGnd || e.y;
          e.vy = 0;
        }
        /* 擦地板！ */
        e.eatCd = (e.eatCd || 0) - dt;
        if (e.eatCd <= 0) {
          e.eatCd = .06;
          const box = { x: e.x - e.w / 2 - 6, y: e.y - e.h, w: e.w + 12, h: e.h + 4 };
          for (const pl of G.platforms) {
            if (pl.dead || pl.edible === false || pl.sid) continue;
            if (pl.kind !== 'ground' && pl.kind !== 'plat') continue;
            if (!aabb(box, pl)) continue;
            pl.w -= 26; pl.x += 13;
            if (chance(.5)) spawnPart({ x: e.x + e.face * 30, y: e.y - 20, vx: rnd(-60, 60), vy: rnd(-120, -30), life: .6, size: rnd(3, 7), col: '#e8e4da', type: 'rect' });
            if (pl.w <= 10) { pl.dead = true; }
          }
          G.platforms = G.platforms.filter(pl => !pl.dead);
          if (chance(.12)) Sfx.play('erase');
        }
        break;
      }
      case 'floater': {
        if (e.blind > 0) { e.vx = Math.sin(e.t * 2.2) * 60; e.vy = Math.cos(e.t * 1.7) * 40; }
        else {
          if (dP < 480) { e.vx = lerp(e.vx, toP * 130, 2 * dt); e.vy = lerp(e.vy, clamp((p.y - 40 - e.y) * 1.2, -90, 90), 2 * dt); }
          else { e.vx = Math.sin(e.t) * 40; e.vy = Math.sin(e.t * .7) * 30; }
          if (e.cd <= 0 && dP < 320) { e.state = 'lunge'; e.stT = 0; e.cd = 2.2; e.lungeDir = toP; }
          if (e.state === 'lunge') { e.vx = e.lungeDir * 430; if (e.stT > .35) e.state = 'idle'; }
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.y = clamp(e.y, 140, G.worldH - 10);
        break;
      }
      case 'binder': {
        e.vy += 2000 * dt;
        let mvx = 0;
        if (e.blind > 0) mvx = Math.sin(e.t * 2) * 50;
        else if (dP < 320) mvx = toP * 62;
        else mvx = Math.sin(e.t * .8) > 0 ? 40 : -40;
        e.x += mvx * dt; e.vx = mvx;
        const g2 = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g2);
        if (e.y >= g2) { e.y = g2; e.vy = 0; }
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
            burst(e.x, e.y, 14, { col: '#c86a34', type: 'chip', s0: 3, s1: 8, sp1: 260, g: 700 });
            if (p && Math.abs(p.x - e.x) < 130) damagePlayer(16, e.x);
          }
        }
        else if (dP < 380) { mvx = toP * 55; if (dP < 120 && e.cd <= 0) { e.state = 'slam'; e.stT = 0; } }
        e.x += mvx * dt; e.vx = mvx;
        const g3 = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g3);
        if (e.y >= g3) { e.y = g3; e.vy = 0; }
        break;
      }
      case 'tele': {
        if (e.blind > 0) break;
        if (G.turn) break; /* 回合制下由关卡驱动 */
        if (e.cd <= 0) { e.cd = 1.5; e.state = 'telegraph'; e.stT = 0; e.vulnT = .55; }
        if (e.state === 'telegraph' && e.stT > .35) {
          e.state = 'idle';
          if (p) {
            e.x += clamp(Math.round((p.x - e.x) / 48), -2, 2) * 48;
            e.y = clamp(e.y + clamp(Math.round((p.y - 30 - e.y) / 48), -1, 1) * 48, 140, G.worldH - 10);
            spawnProj({ type: 'pix', x: e.x, y: e.y - 24, vx: sgn(p.x - e.x) * 560, vy: clamp((p.y - 40 - e.y) * 1.1, -160, 160), dmg: 8, from: 'e', ttl: 1.4 });
            Sfx.play('shoot');
          }
        }
        break;
      }
      case 'flyer': {
        const s2 = 170;
        if (e.blind > 0) { e.x += Math.sin(e.t * 2.4) * 80 * dt; e.y += Math.cos(e.t * 2) * 60 * dt; }
        else if (p) {
          if (e.cd <= 0 && Math.abs(p.y - 20 - e.y) < 70 && Math.abs(p.x - e.x) < 520) { e.state = 'dive'; e.stT = 0; e.cd = 3.2; e.dir = sgn(p.x - e.x); }
          if (e.state === 'dive') { e.x += e.dir * 540 * dt; if (e.stT > .5) e.state = 'fold'; }
          else {
            e.segT = (e.segT || 0) - dt;
            if (e.axis === 'y') e.y += e.dir * s2 * dt; else e.x += e.dir * s2 * dt;
            if (e.segT <= 0) {
              e.segT = rnd(.7, 1.8);
              const dx = p.x - e.x, dy = (p.y - 30) - e.y;
              if (Math.abs(dx) > Math.abs(dy)) { e.axis = 'x'; e.dir = sgn(dx); } else { e.axis = 'y'; e.dir = sgn(dy); }
            }
          }
        }
        e.y = clamp(e.y, 120, G.worldH - 30);
        break;
      }
      case 'walker': default: {
        e.vy += 2000 * dt;
        let mvx = 0;
        if (e.blind > 0) mvx = Math.sin(e.t * 1.8) * 46;
        else if (dP < 300) mvx = toP * 110;
        else mvx = Math.sin(e.t * .9) > 0 ? 50 : -50;
        e.x += mvx * dt; e.vx = mvx; e.face = sgn(mvx || e.face);
        const g4 = groundBelow(e.x, e.y);
        e.y = Math.min(e.y + e.vy * dt, g4);
        if (e.y >= g4) { e.y = g4; e.vy = 0; }
        break;
      }
    }
    /* 接触伤害 */
    if (e.touch > 0 && e.touchCd <= 0 && p && !p.dead && aabb(ebox(e), pbox(p))) {
      e.touchCd = .9;
      damagePlayer(e.touch, e.x);
      if (e.type === 'floater') addStain(clamp(p.x - G.cam.x, 0, W), clamp(p.y - 40 - G.cam.y, 0, H), rnd(30, 55), .45);
      if (e.type === 'binder') p.bindT = Math.max(p.bindT, .8);
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}
function groundBelow(x, feetY) {
  let best = Infinity;
  for (const pl of solidList()) {
    if (x > pl.x - 6 && x < pl.x + pl.w + 6 && pl.y >= feetY - 6) best = Math.min(best, pl.y);
  }
  return best;
}

/* ============================================================
   敌人绘制
   ============================================================ */
function drawEnemy(ctx, e) {
  const st = getStyle(e.zs === 'blank' ? 'blank' : e.zs), pal = st.pal;
  const p = G.player;
  ctx.save();
  let a = e.alpha;
  if (e.type === 'shadow') a = G.revealAll > 0 ? .95 : .22 + (G.dark > .4 ? .08 : 0);
  ctx.globalAlpha = a;
  const flash = e.flash > 0;
  const col = flash ? '#ffffff' : pal.ink;
  switch (e.type) {
    case 'ally': {
      const bob = Math.sin(e.t * 3) * 5;
      Paint.fill(ctx, c => roughRectPath(ctx, e.x - 12, e.y - 34 + bob, 24, 34, 3, e.id * 7, 12), '#c2352a', {});
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(e.x - 6, e.y - 26 + bob, 4, 4); ctx.fillRect(e.x + 2, e.y - 26 + bob, 4, 4);
      ctx.globalAlpha = a * .5;
      ctx.strokeStyle = '#c2352a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y - 18 + bob, 26, 0, TAU); ctx.stroke();
      break;
    }
    case 'shadow': {
      const path = c => { c.beginPath(); c.ellipse(e.x, e.y - e.h * .5, e.w * .5, e.h * .55, 0, 0, TAU); c.ellipse(e.x - 8, e.y - e.h * .8, 9, 11, 0, 0, TAU); };
      Paint.fill(ctx, path, flash ? '#fff' : '#17171c', {});
      if (G.revealAll > 0) { ctx.fillStyle = '#ffe86a'; ctx.beginPath(); ctx.arc(e.x - 5, e.y - e.h * .78, 2.4, 0, TAU); ctx.arc(e.x + 5, e.y - e.h * .78, 2.4, 0, TAU); ctx.fill(); }
      break;
    }
    case 'eraserGiant': {
      const path = c => roughRectPath(ctx, e.x - e.w / 2, e.y - e.h, e.w, e.h, 5, e.id * 11, 16);
      Paint.fill(ctx, path, flash ? '#fff' : '#f2eee4', {});
      Paint.fill(ctx, c => roughRectPath(ctx, e.x - e.w / 2, e.y - e.h * .38, e.w, e.h * .38, 4, e.id * 5 + 3, 14), '#b23a2e', {});
      /* 眼睛 */
      ctx.fillStyle = '#26252b';
      ctx.beginPath(); ctx.arc(e.x + e.face * 14 - 8, e.y - e.h * .7, 4, 0, TAU); ctx.arc(e.x + e.face * 14 + 8, e.y - e.h * .7, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x + e.face * 14 - 8 + e.face * 1.5, e.y - e.h * .7, 1.6, 0, TAU); ctx.arc(e.x + e.face * 14 + 8 + e.face * 1.5, e.y - e.h * .7, 1.6, 0, TAU); ctx.fill();
      /* 尘埃 */
      if (chance(.3)) spawnPart({ x: e.x - e.face * 30, y: e.y - 8, vx: -e.face * 60, vy: rnd(-40, -10), life: .5, size: rnd(2, 5), col: 'rgba(200,195,185,.7)' });
      break;
    }
    case 'floater': {
      const path = c => {
        c.beginPath();
        c.ellipse(e.x, e.y - e.h * .55, e.w * .48, e.h * .5, 0, 0, TAU);
        c.quadraticCurveTo(e.x - e.w * .6, e.y - e.h * .3, e.x - e.w * .2, e.y + Math.sin(e.t * 5) * 4);
        c.quadraticCurveTo(e.x + e.w * .1, e.y - e.h * .2, e.x + e.w * .5, e.y - e.h * .45);
      };
      Paint.fill(ctx, path, col, {});
      eyes(ctx, e, 2);
      if (e.blind > 0) inkBlind(ctx, e);
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
      }
      if (e.blind > 0) inkBlind(ctx, e);
      break;
    }
    case 'armored': {
      const path = c => { c.beginPath(); c.ellipse(e.x, e.y - e.h * .5, e.w * .52, e.h * .52, 0, 0, TAU); };
      Paint.fill(ctx, path, flash ? '#fff' : '#a24a2c', {});
      const cols = ['#c86a34', '#d9a13b', '#e8b04a'];
      for (let i = 0; i < e.armor; i++) {
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 7; ctx.globalAlpha = a * .85;
        ctx.beginPath(); ctx.ellipse(e.x, e.y - e.h * .5 - 4 - i * 8, e.w * .52 - 2 + i * 3, e.h * .52 - 4, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
      ctx.globalAlpha = a;
      eyes(ctx, e, 2);
      break;
    }
    case 'tele': {
      const vul = e.vulnT > 0;
      const path = c => roughRectPath(ctx, e.x - e.w / 2, e.y - e.h, e.w, e.h, 2, e.id * 13, 12);
      if (vul) Paint.fill(ctx, path, '#ffffff', {});
      else Paint.fill(ctx, path, flash ? '#fff' : '#2a2a3a', {});
      ctx.fillStyle = vul ? '#2a2a3a' : '#8ecbe8';
      ctx.fillRect(e.x - 8, e.y - e.h * .7, 16, 8);
      ctx.fillRect(e.x - 3, e.y - e.h * .45, 6, 10);
      break;
    }
    case 'flyer': {
      const flap = Math.sin(e.t * 9) * .5;
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(e.x, e.y - e.h * .6); c.lineTo(e.x + e.face * 18, e.y - e.h * .35); c.lineTo(e.x - e.face * 6, e.y - e.h * .1); c.closePath(); }, flash ? '#fff' : '#fdf6e8', {});
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(e.x, e.y - e.h * .55); c.lineTo(e.x - e.face * 26, e.y - e.h * .55 - 20 - flap * 22); c.lineTo(e.x - e.face * 8, e.y - e.h * .35); c.closePath(); }, flash ? '#fff' : '#fdf6e8', {});
      break;
    }
    default: {
      const path = c => roughRectPath(ctx, e.x - e.w * .5, e.y - e.h + 8, e.w, e.h - 8, 3, e.id * 3, 14);
      Paint.fill(ctx, path, flash ? '#fff' : col, { hR: 100, sp: 8 });
      const leg = Math.sin(e.t * 8) * 5;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(e.x - 7, e.y - 8); c.lineTo(e.x - 7 + leg, e.y); c.moveTo(e.x + 7, e.y - 8); c.lineTo(e.x + 7 - leg, e.y); }, col, 3.5, {});
      eyes(ctx, e, 2);
      if (e.blind > 0) inkBlind(ctx, e);
      break;
    }
  }
  if (e.markT > 0) {
    ctx.strokeStyle = '#e05a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y - e.h - 16, 8, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.x - 4, e.y - e.h - 16); ctx.lineTo(e.x + 4, e.y - e.h - 16); ctx.stroke();
  }
  if (e.showHpT > 0 && e.hp < e.hpMax && e.type !== 'ally') {
    ctx.fillStyle = 'rgba(20,18,24,.6)';
    ctx.fillRect(e.x - 20, e.y - e.h - 10, 40, 4);
    ctx.fillStyle = '#e05a4a';
    ctx.fillRect(e.x - 20, e.y - e.h - 10, 40 * clamp(e.hp / e.hpMax, 0, 1), 4);
  }
  ctx.restore();
}
function eyes(ctx, e, n) {
  const p = G.player;
  const dx = p ? clamp(sgn(p.x - e.x) * 1.6, -2, 2) : 0;
  const by = e.y - e.h * .6;
  ctx.fillStyle = '#fdf6e8';
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(e.x + (i - (n - 1) / 2) * 11, by, 3.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#17171c';
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(e.x + (i - (n - 1) / 2) * 11 + dx, by, 1.8, 0, TAU); ctx.fill(); }
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
    for (const pl of solidList()) {
      if (pl.kind === 'dbx' && !pl.sid) continue;
      if (aabb(box, pl)) {
        pr.dead = true;
        burst(pr.x, pr.y, 5, { col: '#26252b', s0: 2, s1: 5, sp1: 140, g: 300 });
        if (pr.type === 'blot') addWash(pr.x, pr.y, 34, '#26252b');
        break;
      }
    }
    /* 橡皮之潮：行进途中擦掉一切笔迹 */
    if (pr.type === 'eraserWave') {
      eraseAt(pr.x, pr.y - 20, 58);
      if (chance(.4)) spawnPart({ x: pr.x + rnd(-24, 24), y: pr.y - rnd(0, 70), vx: rnd(-40, 40), vy: rnd(-90, -20), life: .5, size: rnd(2, 6), col: '#e8e4da', type: 'rect' });
    }
    if (pr.dead) continue;
    if (pr.from === 'e') {
      const hb = pr.type === 'eraserWave' ? { x: pr.x - 30, y: pr.y - 88, w: 60, h: 108 } : box;
      if (p && !p.dead && aabb(hb, pbox(p))) {
        pr.dead = true;
        if (pr.type === 'bind') { p.bindT = Math.max(p.bindT, 1.4); addText(p.x, p.y - 70, '被捆住了! 挣脱!', '#a8443c'); Sfx.play('fold'); }
        else damagePlayer(pr.dmg, pr.x);
      }
    } else {
      for (const e of G.enemies) {
        if (e.dead || e.type === 'ally') continue;
        if (aabb(box, ebox(e))) {
          if (!pr.pierce) pr.dead = true;
          if (!pr.hitSet) pr.hitSet = {};
          if (pr.hitSet[e.id]) continue;
          pr.hitSet[e.id] = 1;
          damageEnemy(e, pr.dmg, { style: curStyle(), dir: sgn(pr.vx), knock: true });
          if (pr.type === 'spray') { e.vx += sgn(pr.vx) * 200; addText(e.x, e.y - 60, '冲!', '#7fb0c8'); }
          if (!pr.pierce) break;
        }
      }
      if (!pr.dead && G.bossOn && G.boss && !(pr.hitSet && pr.hitSet.boss)) {
        const d = G.boss;
        if (aabb(box, { x: d.x - 46, y: d.y - 64, w: 92, h: 130 })) {
          if (!pr.hitSet) pr.hitSet = {};
          pr.hitSet.boss = 1;
          hitBoss(pr.dmg, { style: curStyle() });
          if (!pr.pierce) pr.dead = true;
        }
      }
    }
  }
  G.projs = G.projs.filter(pr => !pr.dead);
}
function drawProjs(ctx) {
  for (const pr of G.projs) {
    ctx.save();
    switch (pr.type) {
      case 'blot':
        ctx.fillStyle = '#26252b';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 11, 13, Math.atan2(pr.vy, pr.vx), 0, TAU); ctx.fill();
        break;
      case 'bind': {
        ctx.strokeStyle = '#3a3936'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y);
        ctx.lineTo(pr.x - pr.vx * .12, pr.y + Math.sin(pr.t * 20) * 5); ctx.stroke();
        break;
      }
      case 'pix':
        ctx.fillStyle = '#8ecbe8';
        ctx.fillRect(pr.x - 6, pr.y - 6, 12, 12);
        break;
      case 'wave': {
        const dir = sgn(pr.vx);
        ctx.strokeStyle = '#222126'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 26, dir > 0 ? -.9 : Math.PI - .9, dir > 0 ? .9 : Math.PI + .9, dir < 0);
        ctx.stroke();
        break;
      }
      case 'pencil':
        ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pr.x - pr.vx * .02, pr.y - pr.vy * .02); ctx.lineTo(pr.x, pr.y); ctx.stroke();
        break;
      case 'spray':
        ctx.fillStyle = 'rgba(127,176,200,.85)';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.arc(pr.x - 3, pr.y - 3, 3.5, 0, TAU); ctx.fill();
        break;
      case 'eraserWave':
        ctx.fillStyle = 'rgba(242,238,228,.92)';
        ctx.fillRect(pr.x - 26, pr.y - 40, 52, 80);
        ctx.fillStyle = '#b23a2e';
        ctx.fillRect(pr.x - 26, pr.y + 14, 52, 26);
        break;
    }
    ctx.restore();
  }
}

/* ============================================================
   玩家绘制（万具匣形态）
   ============================================================ */
function drawPlayer(ctx) {
  const p = G.player;
  if (!p || p.dead) return;
  const pal = getStyle(curStyle()).pal;
  const col = pal.player;
  if (p.dashTrail.length) {
    for (const d of p.dashTrail) {
      ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(d.x, d.y - 26, 12, 24, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  ctx.save();
  if (p.iframe > 0 && (G.frame & 2)) ctx.globalAlpha = .45;
  if (p.inLiquid) ctx.globalAlpha *= .9;
  ctx.translate(p.x, p.y);
  if (G.grav < 0) ctx.scale(1, -1);
  ctx.scale(p.face * (1 + p.squash * .6), 1 - p.squash * .5);
  const run = Math.abs(p.vx) > 30 && p.onG;
  const t = p.anim;
  const legA = run ? Math.sin(t * 14) : 0;
  const bob = run ? Math.abs(Math.sin(t * 14)) * 3 : Math.sin(t * 2.2) * 1.5;
  const air = !p.onG && !p.inLiquid;
  Paint.stroke(ctx, c => {
    c.beginPath();
    c.moveTo(0, -19 - bob * .3);
    c.lineTo(legA * 9 + (air ? -5 : 0), air ? -13 : -2);
    c.moveTo(0, -19 - bob * .3);
    c.lineTo(-legA * 9 + (air ? 6 : 0), air ? -9 : -2);
  }, col, 4.5, {});
  const body = c => {
    c.beginPath();
    c.moveTo(-6.5, -18 - bob * .3);
    c.quadraticCurveTo(-8, -34 - bob, -5.5, -42 - bob);
    c.lineTo(5.5, -42 - bob);
    c.quadraticCurveTo(8, -34 - bob, 6.5, -18 - bob * .3);
    c.closePath();
  };
  Paint.fill(ctx, body, col, { hR: 80, sp: 6 });
  Paint.stroke(ctx, c => {
    c.beginPath();
    c.moveTo(-3, -40 - bob);
    c.quadraticCurveTo(-14 - run * 3, -37 - bob + Math.sin(t * 6) * 3, -24 - Math.abs(p.vx) * .03, -33 + Math.sin(t * 5) * 5);
  }, pal.accent, 4, {});
  const head = c => { c.beginPath(); c.arc(1, -49 - bob, 8.5, 0, TAU); };
  Paint.fill(ctx, head, col, {});
  const hat = c => { c.beginPath(); c.moveTo(-13, -53 - bob); c.quadraticCurveTo(1, -66 - bob, 15, -53 - bob); c.closePath(); };
  Paint.fill(ctx, hat, shade(col, 30), {});
  ctx.fillStyle = '#fdf6e8';
  ctx.beginPath(); ctx.arc(5.5, -50 - bob, 1.8, 0, TAU); ctx.fill();
  /* 手臂 + 当前工具 */
  const prog = p.atkT > 0 ? 1 - p.atkT / .2 : -1;
  const armAng = prog >= 0 ? lerp(-1.5, 1.05, prog) : .45 + (run ? Math.sin(t * 14 + Math.PI) * .35 : Math.sin(t * 2) * .06);
  ctx.save();
  ctx.translate(4, -38 - bob);
  ctx.rotate(armAng);
  Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(0, 0); c.lineTo(13, 3); }, col, 4, {});
  ctx.translate(13, 3);
  drawToolInHand(ctx, tool().key);
  ctx.restore();
  ctx.restore();
  /* 海绵蓄水珠 */
  if (p.sponge > 0) {
    for (let i = 0; i < p.sponge; i++) {
      ctx.fillStyle = 'rgba(127,176,200,.85)';
      ctx.beginPath(); ctx.arc(p.x - 18 + i * 9, p.y - 64, 3.5, 0, TAU); ctx.fill();
    }
  }
  /* 绘画光标 */
  if (G.state === 'play' && !G.paused && !G.turn && Mouse.inside) {
    const tl = tool();
    ctx.strokeStyle = tl.draw ? tl.col : (tl.erase ? '#e8e4da' : 'rgba(150,150,150,.8)');
    ctx.lineWidth = 1.6;
    const cx = Mouse.x, cy = Mouse.y;
    ctx.beginPath(); ctx.arc(cx, cy, tl.draw || tl.erase ? 11 : 6, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 5, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy - 5); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 15);
    ctx.stroke();
    if (tl.erase) { ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx, cy, 46, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }
}
function drawToolInHand(ctx, key) {
  const dark = '#26252b';
  switch (key) {
    case 'brush':
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-6, -2); c.lineTo(16, 2); }, '#5a4632', 5, {});
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(15, -1); c.quadraticCurveTo(34, 2, 40, 6); c.quadraticCurveTo(30, 10, 15, 6); c.closePath(); }, dark, {});
      break;
    case 'pencil':
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(-4, -2.5); c.lineTo(26, -1); c.lineTo(26, 2.5); c.lineTo(-4, 3); c.closePath(); }, '#4a4a4a', {});
      ctx.fillStyle = '#26252b'; ctx.beginPath(); ctx.moveTo(26, -1); ctx.lineTo(31, .8); ctx.lineTo(26, 2.5); ctx.closePath(); ctx.fill();
      break;
    case 'charcoal':
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-4, -3.5, 28, 7); }, '#45403a', {});
      break;
    case 'eraser':
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-2, -5, 24, 12); }, '#f2eee4', {});
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-2, 2, 24, 5); }, '#b23a2e', {});
      break;
    case 'knife':
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-6, 0); c.lineTo(12, 2); }, '#6b5138', 5, {});
      Paint.fill(ctx, c => { c.beginPath(); c.moveTo(12, -5); c.lineTo(30, -9); c.lineTo(34, 8); c.lineTo(12, 6); c.closePath(); }, '#c8ccd4', {});
      break;
    case 'sponge':
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-2, -6, 22, 13); }, '#f2c9a0', {});
      ctx.fillStyle = 'rgba(127,176,200,.7)';
      ctx.fillRect(-2, -6, 22, 4);
      break;
    case 'marker':
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-4, -3.5, 26, 7); }, '#e05a4a', {});
      ctx.fillStyle = '#26252b'; ctx.fillRect(22, -2, 6, 4);
      break;
    case 'scissors': {
      const open = prog >= 0 ? .5 : .22 + Math.sin(G.t * 3) * .06;
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-4, 3); c.lineTo(22, -2 - open * 22); }, '#b8bdc6', 3.5, {});
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-4, 3); c.lineTo(22, 6 + open * 22); }, '#b8bdc6', 3.5, {});
      ctx.fillStyle = '#b23a2e';
      ctx.beginPath(); ctx.arc(-7, 0, 4.5, 0, TAU); ctx.fill();
      break;
    }
    case 'stamp':
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-5, -6, 18, 12); }, '#c2352a', {});
      Paint.stroke(ctx, c => { c.beginPath(); c.moveTo(-1, -6); c.lineTo(-1, -14); }, '#6b5138', 4, {});
      break;
    case 'highlight':
      Paint.fill(ctx, c => { c.beginPath(); c.rect(-4, -3, 26, 6); }, '#ffe86a', {});
      ctx.fillStyle = '#fff'; ctx.fillRect(20, -2, 6, 4);
      break;
  }
}
