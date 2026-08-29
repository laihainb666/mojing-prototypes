'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》tools.js —— 万具匣：十种工具 + 绘画系统
   按住鼠标左键：用当前工具在世界上作画（墨迹会褪色 / 炭线易碎 / 荧光照明）
   ============================================================ */
const TOOLS = {
  brush:     { key: 'brush', name: '毛笔', tip: 'J 泼墨 · K 墨浪 · 按住左键画墨台（会褪色）', col: '#26252b',
    draw: { cost: .55, lw: 7, ttl: 6.5 },
    light: { cd: .34, type: 'arc', dmg: 15, range: 100, h: 76 },
    heavy: { type: 'wave', cd: .8, dmg: 24 } },
  pencil:    { key: 'pencil', name: '铅笔', tip: 'J 疾刺 · K 掷笔 · 按住左键画细线（永久）', col: '#4a4a4a',
    draw: { cost: .32, lw: 3.5, ttl: 0 },
    light: { cd: .2, type: 'arc', dmg: 10, range: 76, h: 60 },
    heavy: { type: 'throw', cd: .7, dmg: 14 } },
  charcoal:  { key: 'charcoal', name: '炭条', tip: 'J 粗抹 · K 烟雾致盲 · 按住左键画炭台（踩上即碎）', col: '#45403a',
    draw: { cost: .5, lw: 8, ttl: 0, brittle: true },
    light: { cd: .3, type: 'arc', dmg: 13, range: 90, h: 70 },
    heavy: { type: 'smoke', cd: 2.2 } },
  eraser:    { key: 'eraser', name: '橡皮擦', tip: 'J 擦击 · K 大擦除 · 按住左键擦掉笔迹与纸墙', col: '#e8e4da',
    erase: true,
    light: { cd: .26, type: 'arc', dmg: 8, range: 84, h: 66, vsSketch: 3 },
    heavy: { type: 'eraseBurst', cd: .9 } },
  knife:     { key: 'knife', name: '刮刀', tip: 'J 劈砍 · K 削层破甲 · 左键可刮开厚涂', col: '#c8ccd4',
    scrape: true,
    light: { cd: .4, type: 'arc', dmg: 16, range: 92, h: 78 },
    heavy: { type: 'scrape', cd: .9, dmg: 26, armorStrip: true } },
  sponge:    { key: 'sponge', name: '海绵', tip: 'K 吸收墨水/水渍 · 左键挤喷水炮（耗 1 蓄水）', col: '#f2c9a0',
    spray: true,
    light: { cd: .4, type: 'arc', dmg: 6, range: 70, h: 60 },
    heavy: { type: 'absorb', cd: .3 } },
  marker:    { key: 'marker', name: '马克笔', tip: 'J 标记弱点（受伤×2）· K 群体标记', col: '#e05a4a',
    light: { cd: .24, type: 'arc', dmg: 9, range: 80, h: 64, mark: true },
    heavy: { type: 'markAoe', cd: 1.4 } },
  scissors:  { key: 'scissors', name: '剪刀', tip: 'J 剪击（斩杀残血纸敌）· K 大剪（剪断封印）', col: '#b8bdc6',
    light: { cd: .22, type: 'arc', dmg: 12, range: 88, h: 68, execute: 24 },
    heavy: { type: 'cross', cd: .8, dmg: 22, cuts: true } },
  stamp:     { key: 'stamp', name: '图章', tip: 'J 敲击 · K 盖章召唤画灵（耗 25 墨量）', col: '#c2352a',
    light: { cd: .4, type: 'arc', dmg: 8, range: 74, h: 62 },
    heavy: { type: 'summon', cd: 1, cost: 25 } },
  highlight: { key: 'highlight', name: '荧光笔', tip: 'J 弹击 · K 荧光脉冲（照亮全图）· 左键画光线', col: '#ffe86a',
    draw: { cost: .25, lw: 6, ttl: 0, glow: true, noclip: true },
    light: { cd: .3, type: 'arc', dmg: 7, range: 76, h: 60 },
    heavy: { type: 'pulse', cd: 3 } },
};
const TOOL_ORDER = ['brush', 'pencil', 'charcoal', 'eraser', 'knife', 'sponge', 'marker', 'scissors', 'stamp', 'highlight'];

let STROKE_ID = 1, drawState = null;
function strokeBoxesLeft() {
  let n = 0;
  for (const s of G.strokes) n += s.boxes.length;
  return n;
}
/* 把线段光栅化成小碰撞盒 */
function addStrokeBoxes(s) {
  const step = s.tool === 'pencil' ? 9 : 11;
  for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1], b = s.pts[i];
    const d = dist(a.x, a.y, b.x, b.y), n = Math.max(1, Math.ceil(d / step));
    for (let k = 0; k < n; k++) {
      const t = (k + .5) / n;
      const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
      if (!s.noclip) {
        const h = s.tool === 'pencil' ? 8 : 16;
        s.boxes.push({ kind: 'dbx', sid: s.id, x: x - step / 2, y: y - h / 2, w: step + 1, h });
        G.platforms.push(s.boxes[s.boxes.length - 1]);
      }
    }
  }
}
function removeStroke(s) {
  s.dead = true;
  G.platforms = G.platforms.filter(pl => pl.sid !== s.id);
  burst(s.cx, s.cy, 8, { col: s.col, s0: 2, s1: 5, sp1: 140, g: 300 });
}
function commitStroke(s) {
  s.id = STROKE_ID++;
  s.boxes = [];
  s.t = 0;
  s.hostile = false;
  let cx = 0, cy = 0;
  for (const p of s.pts) { cx += p.x; cy += p.y; }
  s.cx = cx / s.pts.length; s.cy = cy / s.pts.length;
  addStrokeBoxes(s);
  /* 电路关卡：检查是否连通节点 */
  checkCircuit(s);
  if (G.strokes.length > 26) { const old = G.strokes.find(x => !x.dead && !x.pinned); if (old) removeStroke(old); }
  G.strokes = G.strokes.filter(x => !x.dead);
  G.strokes.push(s);
}
function eraseAt(wx, wy, r) {
  let erased = false;
  for (const s of G.strokes) {
    if (s.dead || s.pinned) continue;
    for (const p of s.pts) {
      if (dist(p.x, p.y, wx, wy) < r) { removeStroke(s); erased = true; break; }
    }
  }
  G.strokes = G.strokes.filter(x => !x.dead);
  /* 素描纸墙也能被擦 */
  for (const pl of G.platforms) {
    if (pl.kind === 'gwall' && pl.gs === 'sketch' && !pl.dead) {
      const cx = clamp(wx, pl.x, pl.x + pl.w), cy = clamp(wy, pl.y, pl.y + pl.h);
      if (dist(cx, cy, wx, wy) < r + 10) {
        pl.hp -= .06; erased = true;
        if (chance(.3)) spawnPart({ x: cx, y: cy, vx: rnd(-40, 40), vy: rnd(-60, 0), life: .5, size: rnd(2, 5), col: '#e8e4da', type: 'rect' });
        if (pl.hp <= 0) {
          pl.dead = true;
          G.platforms = G.platforms.filter(p2 => p2 !== pl);
          burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 18, { col: '#e8e4da', type: 'rect', s0: 3, s1: 8, sp1: 280, g: 500 });
          Sfx.play('erase'); toast('纸墙被擦开了');
        }
      }
    }
  }
  return erased;
}
function updateDrawing(dt) {
  Mouse.wx = Mouse.x + G.cam.x; Mouse.wy = Mouse.y + G.cam.y;
  if (G.state !== 'play' || G.paused || G.helpOpen || G.dialog || !G.level || G.turn) { drawState = null; return; }
  const t = tool();
  if (Mouse.down && t.draw && (G.dbg.ink || G.ink >= 1)) {
    if (!drawState) {
      drawState = { pts: [{ x: Mouse.wx, y: Mouse.wy }], tool: t.key, col: t.col, lw: t.draw.lw, glow: !!t.draw.glow, noclip: !!t.draw.noclip, ttl: t.draw.ttl, brittle: !!t.draw.brittle, len: 0, lastX: Mouse.wx, lastY: Mouse.wy };
      Sfx.play('swing');
    } else {
      const d = dist(Mouse.wx, Mouse.wy, drawState.lastX, drawState.lastY);
      if (d > 8) {
        const cost = t.draw.cost * d / 10;
        if (G.dbg.ink || G.ink >= cost) {
          drawState.pts.push({ x: Mouse.wx, y: Mouse.wy });
          drawState.len += d;
          drawState.lastX = Mouse.wx; drawState.lastY = Mouse.wy;
          if (!G.dbg.ink) G.ink -= cost;
        }
      }
    }
  } else if (drawState) {
    if (drawState.pts.length > 1) commitStroke(drawState);
    drawState = null;
  }
  /* 橡皮擦：按住左键持续擦 */
  if (Mouse.down && t.erase) {
    if (eraseAt(Mouse.wx, Mouse.wy, 46)) Sfx.play('erase');
  }
  /* 刮刀：按住左键刮厚涂 */
  if (Mouse.down && t.scrape) {
    for (const pl of G.platforms) {
      if (pl.dead) continue;
      const cx = clamp(Mouse.wx, pl.x, pl.x + pl.w), cy = clamp(Mouse.wy, pl.y, pl.y + pl.h);
      if (dist(cx, cy, Mouse.wx, Mouse.wy) < 50) {
        if (pl.kind === 'gwall' && pl.gs === 'oil') {
          pl.hp -= dt * 1.6;
          if (chance(.2)) spawnPart({ x: cx, y: cy, vx: rnd(-50, 50), vy: rnd(-70, 0), life: .5, size: rnd(3, 6), col: '#c86a34', type: 'chip' });
          if (pl.hp <= 0) {
            pl.dead = true;
            G.platforms = G.platforms.filter(p2 => p2 !== pl);
            burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 18, { col: '#a24a2c', type: 'chip', s0: 4, s1: 9, sp1: 300, g: 600 });
            Sfx.play('scrape'); toast('覆盖层被刮穿了');
            if (pl.reveal) spawnReveal(pl);
          }
        } else if (pl.kind === 'sink' && pl.h > 22) {
          pl.y += dt * 30; pl.h -= dt * 26;
        }
      }
    }
  }
  /* 海绵：左键挤喷 */
  if (Mouse.down && t.spray && G.player && !G.player.sprayCd) {
    const p = G.player;
    if (p.sponge > 0) {
      p.sponge--; p.sprayCd = .45;
      const a = Math.atan2(Mouse.wy - (p.y - 30), Mouse.wx - p.x);
      spawnProj({ type: 'spray', x: p.x + Math.cos(a) * 24, y: p.y - 30 + Math.sin(a) * 24, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: 16, from: 'p', ttl: .8, splash: true });
      Sfx.play('wave');
    } else { Sfx.play('deny'); toast('海绵是干的 —— 按 K 吸收水渍/墨渍'); }
  }
}
function updateStrokes(dt) {
  for (const s of G.strokes) {
    if (s.dead) continue;
    s.t = (s.t || 0) + dt;
    if (s.ttl > 0) {
      s.ttl -= dt;
      if (s.ttl <= 0) removeStroke(s);
    }
    if (s.brittle && s.crumbT > 0) {
      s.crumbT -= dt;
      if (s.crumbT <= 0) { removeStroke(s); addText(s.cx, s.cy - 10, '碎了', '#8a7f70'); }
    }
    if (s.hostileT > 0) {
      s.hostileT -= dt;
      if (s.hostileT <= 0) s.hostile = false;
    }
  }
  G.strokes = G.strokes.filter(s => !s.dead);
  /* 笔迹碰到的脆弱/敌对判定 */
  const p = G.player;
  if (p) {
    const pb = pbox(p);
    for (const s of G.strokes) {
      if (s.dead) continue;
      if (s.brittle && !s.crumbT) {
        for (const b of s.boxes) if (aabb(pb, { x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 6 })) { s.crumbT = .8; break; }
      }
      if (s.hostile) {
        for (const b of s.boxes) {
          if (aabb(pb, b) && p.touchCd2 <= 0) {
            p.touchCd2 = .8; damagePlayer(10, p.x + rnd(-30, 30));
            addText(p.x, p.y - 70, '被自己的画击中!', '#ff4a8c');
          }
        }
      }
    }
  }
}

/* ============================================================
   工具招式
   ============================================================ */
function doToolLight(p) {
  const t = tool(), L = t.light;
  p.atkCd = L.cd; p.atkT = .18; p.swing++;
  const box = meleeBox(p, L.range, L.h);
  const opts = { style: curStyle(), dir: p.face, knock: true, tool: t.key };
  if (L.mark) opts.mark = 6;
  if (L.execute) opts.execute = L.execute;
  if (L.vsSketch) opts.vsSketch = L.vsSketch;
  Sfx.play('swing');
  applyMelee(box, L.dmg, opts);
  burst(p.x + p.face * (L.range * .5), p.y - 30, 5, { col: t.col, s0: 2, s1: 5, sp1: 180, drag: 3 });
}
function doToolHeavy(p) {
  const t = tool(), Hv = t.heavy;
  if (!G.dbg.ink && G.ink < (Hv.cost || 0)) { Sfx.play('deny'); toast('墨量不足'); return; }
  if (!G.dbg.ink) G.ink -= (Hv.cost || 0);
  p.atkCd = Hv.cd; p.atkT = .26; p.swing++;
  const pal = getStyle(curStyle()).pal;
  switch (Hv.type) {
    case 'wave':
      spawnProj({ type: 'wave', x: p.x + p.face * 26, y: p.y - 34, vx: p.face * 520, vy: 0, dmg: Hv.dmg, from: 'p', ttl: 1.2, pierce: true, hitSet: {} });
      Sfx.play('wave'); addShake(2);
      break;
    case 'throw':
      spawnProj({ type: 'pencil', x: p.x + p.face * 20, y: p.y - 34, vx: p.face * 700, vy: -60, g: 500, dmg: Hv.dmg, from: 'p', ttl: 1.1, pierce: true, hitSet: {} });
      Sfx.play('shoot');
      break;
    case 'smoke': {
      const cx = p.x + p.face * 150, cy = p.y - 40;
      for (let i = 0; i < 16; i++)
        spawnPart({ x: cx + rnd(-40, 40), y: cy + rnd(-30, 30), vx: rnd(-16, 16), vy: rnd(-26, -6), life: rnd(1.6, 2.6), size: rnd(16, 30), col: 'rgba(70,66,60,.5)', alpha: .6 });
      for (const e of G.enemies) if (!e.dead && dist(e.x, e.y, cx, cy) < 190) e.blind = Math.max(e.blind || 0, 3);
      Sfx.play('erase'); addText(cx, cy - 40, '烟雾!', '#6a655c');
      break;
    }
    case 'eraseBurst': {
      Sfx.play('erase'); addShake(3);
      const b = { x: p.x - 100, y: p.y - 90, w: 200, h: 110 };
      applyMelee(b, 14, { style: curStyle(), dir: p.face, erase: true, vsSketch: 3, knock: true });
      eraseAt(p.x + p.face * 40, p.y - 40, 80);
      burst(p.x + p.face * 30, p.y - 40, 14, { col: '#e8e4da', type: 'rect', s0: 3, s1: 8, sp1: 260, drag: 3 });
      break;
    }
    case 'scrape': {
      Sfx.play('scrape'); addShake(3);
      applyMelee(meleeBox(p, 106, 90), Hv.dmg, { style: curStyle(), dir: p.face, armorStrip: true, knock: true });
      burst(p.x + p.face * 50, p.y - 34, 12, { col: '#c86a34', type: 'chip', s0: 3, s1: 8, sp1: 260, g: 700 });
      break;
    }
    case 'absorb': {
      let got = false;
      for (let i = G.washes.length - 1; i >= 0; i--) {
        const w = G.washes[i];
        if (dist(w.x, w.y, p.x, p.y - 30) < 170) {
          G.washes.splice(i, 1);
          p.sponge = Math.min(3, p.sponge + 1);
          got = true;
        }
      }
      /* 也能吸敌人口水/墨弹 */
      for (const pr of G.projs) {
        if (pr.from === 'e' && dist(pr.x, pr.y, p.x, p.y - 30) < 170 && (pr.type === 'blot' || pr.type === 'drop')) { pr.ttl = 0; p.sponge = Math.min(3, p.sponge + 1); got = true; }
      }
      if (got) { Sfx.play('fold'); addText(p.x, p.y - 70, '吸水 ' + p.sponge + '/3', '#7fb0c8'); }
      else { Sfx.play('deny'); addText(p.x, p.y - 70, '附近没有液体', '#9a938a'); }
      break;
    }
    case 'markAoe': {
      Sfx.play('crit');
      let n = 0;
      for (const e of G.enemies) {
        if (!e.dead && Math.abs(e.x - p.x) < 240 && Math.abs(e.y - p.y) < 140) { e.mark = 6; n++; addText(e.x, e.y - e.h - 10, '标记!', '#e05a4a'); }
      }
      if (G.bossOn && G.boss && Math.abs(G.boss.x - p.x) < 280) { G.boss.mark = 6; n++; }
      if (!n) addText(p.x, p.y - 70, '没有可标记的目标', '#9a938a');
      break;
    }
    case 'cross':
      Sfx.play('swing'); addShake(2);
      applyMelee(meleeBox(p, 116, 100), Hv.dmg, { style: curStyle(), dir: p.face, execute: 30, knock: true, cuts: true });
      burst(p.x + p.face * 50, p.y - 34, 10, { col: '#fdf6e8', type: 'petal', s0: 4, s1: 9, sp1: 260, g: 300, drag: 2 });
      break;
    case 'summon': {
      if (G.enemies.filter(e => e.type === 'ally' && !e.dead).length >= 2) { Sfx.play('deny'); addText(p.x, p.y - 70, '画灵已达上限', '#9a938a'); G.ink += Hv.cost; return; }
      const a = makeEnemy({ type: 'ally', zone: -1, x: p.x + p.face * 40, y: p.y - 10, zs: curStyle() });
      G.enemies.push(a);
      Sfx.play('shrine');
      addText(p.x, p.y - 80, '画灵现身!', '#c2352a');
      burst(p.x + p.face * 40, p.y - 30, 12, { col: '#c2352a', s0: 3, s1: 7, sp1: 200, g: 200, drag: 2 });
      break;
    }
    case 'pulse': {
      Sfx.play('crit');
      G.revealAll = 4;
      G.dark = Math.max(0, G.dark - .75);
      for (const pl of G.platforms) if (pl.kind === 'hidden') pl.revealT = 4;
      addText(p.x, p.y - 80, '荧光脉冲!', '#ffe86a');
      for (let i = 0; i < 20; i++) spawnPart({ x: p.x + rnd(-80, 80), y: p.y - 30 + rnd(-60, 20), vx: rnd(-40, 40), vy: rnd(-60, -10), life: rnd(.5, 1), size: rnd(2, 5), col: '#ffe86a' });
      break;
    }
  }
}
/* 工具的普攻也走 melee（arc 类） */
function meleeBox(p, range, h) {
  const cx = p.x + p.face * (range / 2 + 12), cy = p.y - p.h * .55;
  return { x: cx - range / 2, y: cy - h / 2, w: range, h };
}
