'use strict';
/* ============================================================
   《墨境：千面残章》world.js —— 七境关卡构建 / 机关 / 残页与故事 / 过场
   ============================================================ */
const ZONE_DEFS = [
  { style: 'ink',    name: '第一章 · 墨渊', hint: 'J 轻击泼墨致盲墨灵 · K 重击放出墨浪' },
  { style: 'water',  name: '第二章 · 泪彩', hint: '湿润色块可以弹跳 · 重击凝出水珠，照出藏在水渍里的敌人' },
  { style: 'sketch', name: '第三章 · 线茧', hint: '炭笔轻击可擦掉线偶的手臂 · 橡皮重击能擦开纸墙' },
  { style: 'oil',    name: '第四章 · 厚壤', hint: '刮刀重击先削层再伤敌 · 厚涂的墙要用刮刀削开' },
  { style: 'print',  name: '第五章 · 印坊', hint: '印影会呼吸的才是原版 · E 转动刻板，改变地形' },
  { style: 'pixel',  name: '第六章 · 格庭', hint: '敌人闪白时吃像素暴击(×3) · 激光笔可按住 J 连点' },
  { style: 'paper',  name: '第七章 · 纸原', hint: 'E 折叠纸面改变路径 · 剪刀轻击可剪断低血量的纸鹤' },
];
const SHRINE_STORY = {
  ink:   ['水墨残页 · 守', '「最初的风格。学会画画的那一年，他家里的砚台比饭碗还沉。」', '「水墨记得一切，也从不催促。」'],
  water: ['水彩残页 · 愉', '「被夸奖的那个下午，颜色是甜的，边界是软的。」', '「他后来很少用这么亮的颜色了——亮颜色容易暴露高兴。」'],
  sketch:['素描残页 · 律', '「附中的四年。老师说：排线要匀，心要静。」', '「他用直线捆住了很多想逃走的东西。」'],
  oil:   ['油画残页 · 烈', '「落选的那个夜里，他把颜料堆得比伤口还厚。」', '「厚的颜色挡光，也挡人。」'],
  print: ['版画残页 · 刻', '「为了忘掉一句嘲笑，他把同一句话刻了一百遍。」', '「刻到一百遍，字不再是字，疼也不再是疼。」'],
  pixel: ['像素残页 · 遁', '「病床边的旧掌机，八枚像素就能拼出一位英雄。」', '「缩进格子的世界，永远不会让他失望。」'],
  paper: ['剪纸残页 · 念', '「奶奶的剪刀贴着窗花走，纸屑落了一地。」', '「他折叠过很多纸，也折叠过很多不想看见的日子。」'],
};

/* ---------- 构建辅助 ---------- */
function ground(x, w) { G.platforms.push({ x, y: G.GB, w, h: G.worldH - G.GB + 60, kind: 'ground' }); }
function plat(x, y, w, h) { G.platforms.push({ x, y, w, h: h || 24, kind: 'plat' }); }
function gwall(x, y, w, h, gs, hp) { G.platforms.push({ x, y, w, h, kind: 'gwall', gs, hp, hpMax: hp, seed: rnd(0, 999) }); }
function enemy(zone, type, x, y, o) { G.spawns.push(Object.assign({ zone, type, x, y, zs: ZONE_DEFS[zone].style }, o || {})); }
function hint(x, y, str) { G.hints.push({ x, y, str }); }
function shrine(style, x) { G.inter.push({ type: 'shrine', style, x, y: G.GB, taken: false }); }
function gate(x) { G.inter.push({ type: 'gate', x, y: G.GB }); }

function buildWorld() {
  G.platforms = []; G.inter = []; G.spawns = []; G.hints = [];
  G.enemies = []; G.projs = []; G.parts = []; G.texts = [];
  G.washes = []; G.stains = [];
  G.decos = { sky: [], far: [], mid: [] };
  G.zones = ZONE_DEFS.map((d, i) => ({ i, x0: i * G.ZLEN, x1: (i + 1) * G.ZLEN, style: d.style, name: d.name, hint: d.hint }));
  G.zones[6].x1 = G.worldW;

  const ZLEN = G.ZLEN, GB = G.GB;
  /* ---- 第一章 水墨 ---- */
  ground(0, 1150); ground(1420, 480);
  plat(700, GB - 140, 120); plat(950, GB - 240, 110); plat(1250, GB - 70, 100);
  enemy(0, 'walker', 600, GB); enemy(0, 'floater', 980, 470);
  enemy(0, 'floater', 1520, 450); enemy(0, 'walker', 1700, GB);
  shrine('ink', 1760);
  /* ---- 第二章 水彩 ---- */
  ground(1900, 850); ground(3050, 750);
  plat(2660, GB - 8, 120, 8); G.platforms[G.platforms.length - 1].kind = 'bounce';
  plat(2950, GB - 150, 110);
  plat(2200, GB - 120, 110);
  enemy(1, 'ambusher', 2450, GB, { hidden: true });
  enemy(1, 'walker', 3120, GB); enemy(1, 'ambusher', 3350, GB, { hidden: true });
  enemy(1, 'walker', 3600, GB);
  shrine('water', 3660);
  /* ---- 第三章 素描 ---- */
  ground(3800, 1100); ground(5150, 550);
  plat(4990, GB - 80, 90); plat(4200, GB - 130, 110);
  gwall(5400, GB - 240, 46, 240, 'sketch', 4);
  enemy(2, 'binder', 4300, GB); enemy(2, 'walker', 4650, GB);
  enemy(2, 'walker', 5250, GB); enemy(2, 'binder', 5560, GB);
  shrine('sketch', 5600);
  /* ---- 第四章 油画 ---- */
  ground(5700, 600); ground(6560, 1040);
  plat(6390, GB - 80, 100); plat(5950, GB - 140, 110);
  gwall(7100, GB - 230, 50, 230, 'oil', 3);
  enemy(3, 'armored', 6100, GB); enemy(3, 'walker', 6750, GB); enemy(3, 'armored', 6950, GB);
  shrine('oil', 7500);
  /* ---- 第五章 版画 ---- */
  ground(7600, 700); ground(8880, 620);
  /* 刻板桥：拉杆切换 石柱 ↔ 长桥 */
  G.platforms.push({ kind: 'plat', morph: true, ax: 8540, ay: GB - 240, aw: 26, ah: 240, bx: 8300, by: GB, bw: 580, bh: 20, t: 0, tx: 0, x: 8540, y: GB - 240, w: 26, h: 240 });
  G.inter.push({ type: 'lever', x: 8180, y: GB, on: false });
  plat(7900, GB - 130, 110);
  enemy(4, 'walker', 8950, GB); enemy(4, 'cloner', 9080, GB); enemy(4, 'cloner', 9300, GB);
  shrine('print', 9400);
  /* ---- 第六章 像素 ---- */
  ground(9500, 1900);
  plat(10300, GB - 78, 260, 30);            /* 低顶隧道 */
  gwall(10880, GB - 280, 36, 220, 'pixel', 9999); /* 像素缝隙墙（不可破坏，下方留缝） */
  G.platforms[G.platforms.length - 1].kind = 'wall';
  plat(10250, GB - 200, 90); plat(11000, GB - 180, 110);
  enemy(5, 'tele', 10150, GB - 140); enemy(5, 'tele', 10750, GB - 160); enemy(5, 'walker', 11100, GB);
  shrine('pixel', 11300);
  /* ---- 第七章 剪纸 ---- */
  ground(11400, 500); ground(12160, 1140);
  plat(11990, GB - 90, 90);
  /* 折叠墙 ↔ 踏板 */
  G.platforms.push({ kind: 'plat', morph: true, ax: 12520, ay: GB - 240, aw: 22, ah: 240, bx: 12542, by: GB - 130, bw: 150, bh: 20, t: 0, tx: 0, x: 12520, y: GB - 240, w: 22, h: 240 });
  G.inter.push({ type: 'fold', x: 12440, y: GB });
  plat(12600, GB - 240, 280, 22);
  G.inter.push({ type: 'orb', x: 12720, y: GB - 280, taken: false });
  enemy(6, 'flyer', 12050, GB - 160); enemy(6, 'walker', 12250, GB); enemy(6, 'flyer', 12750, GB - 300);
  shrine('paper', 13200);
  /* ---- 终章 · 画师之心 ---- */
  ground(13300, 1800);
  gate(13380);

  /* 机关提示 */
  hint(5360, GB - 300, '炭笔可以擦开这面纸墙');
  hint(7050, GB - 290, '刮刀重击可削开厚涂');
  hint(8180, GB - 80, 'E — 转动刻板');
  hint(10850, GB - 120, '像素缝隙');
  hint(12420, GB - 80, 'E — 折叠纸面');
  hint(2680, GB - 60, '湿润色块 — 弹跳');
  hint(13560, GB - 300, '前方 · 画师之心');

  /* 装饰物生成 */
  for (let i = 0; i < 7; i++) {
    const z = G.zones[i], st = getStyle(z.style);
    const rr = mulberry32(1000 + i * 77);
    for (let x = z.x0 + 100; x < z.x1 - 100; x += 300 + rr() * 260) {
      G.decos.far.push({ x: x + rr() * 200, y: GB - 40, w: 360 + rr() * 360, h: 130 + rr() * 150, seed: rr() * 999 | 0, col: shade(st.pal.far, (rr() * 30 - 15) | 0) });
    }
    for (let x = z.x0 + 160; x < z.x1 - 160; x += 380 + rr() * 300) {
      if (Math.abs((x % ZLEN) - 860) < 200) continue; /* 避开 shrine 一带 */
      G.decos.mid.push({ x, y: GB + 6, s: .7 + rr() * .6, seed: rr() * 999 | 0 });
    }
  }
  for (let x = 0; x < G.worldW; x += 420)
    G.decos.sky.push({ x: x + rnd(0, 200), y: 140 + rnd(-50, 80), s: rnd(.7, 1.4) });

  spawnZoneEnemies(0, true);
}
function spawnZoneEnemies(i, clear) {
  if (clear) G.enemies = G.enemies.filter(e => e.zone !== i);
  for (const s of G.spawns) if (s.zone === i) G.enemies.push(makeEnemy(s));
}

/* ---------- 区域切换 / 过场 ---------- */
function startWipe(z) {
  const st = getStyle(z.style);
  G.wipe = { t: 0, dur: 1.7, label: z.name, en: st.en, zh: st.zh, pal: st.pal };
  G.flashT = .18;
  G.checkpoint = { x: z.x0 + 120, y: G.GB - 60 };
}

/* ---------- 世界逻辑 ---------- */
function updateWorld(dt) {
  const p = G.player;
  if (!p) return;
  G.stats.t += dt;

  /* 区域切换 */
  const z = zoneAt(p.x);
  if (G.zone !== z) {
    G.zone = z;
    startWipe(z);
    spawnZoneEnemies(z.i, true);
    Sfx.setMood(G.overlay || z.style);
  }

  /* 残页切换 1-7 */
  for (let i = 1; i <= 7; i++) {
    if (!In.hit('page' + i)) continue;
    const k = ZONE_ORDER[i - 1];
    if (!G.pages[k] || k === curStyle()) { Sfx.play('deny'); continue; }
    if (G.soul < 25) { Sfx.play('deny'); toast('墨魂不足（残页需 25）'); continue; }
    G.soul -= 25;
    G.overlay = k; G.overlayT = 8;
    Sfx.play('switch'); Sfx.setMood(k); G.flashT = .15;
    toast('残页展开 · ' + getStyle(k).zh + '之境（敌人也染上该画风之力）');
    if (k === 'oil') for (const e of G.enemies) if (!e.dead && !e.oilBuffed) { e.oilBuffed = true; e.armor += 2; }
  }
  if (In.hit('cancel') && G.overlay) { G.overlay = null; Sfx.setMood(G.zone.style); toast('残页已收回'); }
  if (G.overlay) {
    G.overlayT -= dt;
    if (G.overlayT <= 0) { G.overlay = null; Sfx.setMood(G.zone.style); toast('残页已收回'); }
  }
  G.soul = clamp(G.soul + dt * 1.4, 0, G.soulMax);

  /* 交互 */
  updateInter(dt);

  /* 机关平台动画 */
  for (const pl of G.platforms) {
    if (pl.morph && pl.t !== pl.tx) {
      pl.t = clamp(pl.t + sgn(pl.tx - pl.t) * dt * 1.4, 0, 1);
      pl.x = lerp(pl.ax, pl.bx, easeT(pl.t));
      pl.y = lerp(pl.ay, pl.by, easeT(pl.t));
      pl.w = lerp(pl.aw, pl.bw, easeT(pl.t));
      pl.h = lerp(pl.ah, pl.bh, easeT(pl.t));
    }
  }

  /* 坠落 */
  if (!p.dead && p.y > G.worldH + 140) {
    damagePlayer(15, p.x, { silent: true });
    if (!p.dead) {
      p.x = G.checkpoint.x; p.y = G.checkpoint.y - 4;
      p.vx = 0; p.vy = 0;
      updateCam(0, true);
      toast('墨魂把你从留白里捞了回来');
    }
  }
  /* 死亡重生 */
  if (p.dead) {
    G.deadT -= dt;
    if (G.deadT <= 0) respawn();
  }

  /* Boss 触发 */
  if (!G.bossOn && !G.bossDead && p.x > 13520 && !G.dialog) {
    if (!G.gateTalked) {
      G.gateTalked = true;
      G.dialog = {
        title: '画师之心',
        lines: [
          '七片残页在你面前拼成了一张脸——所有画风，来自同一双手。',
          '所谓画灾，不是侵蚀，是逃避：他想用别的风格，盖住那幅没画完的肖像。',
          '墨龙「未尽」，就是那幅肖像的残影。',
        ],
        idx: 0, onDone: startBoss,
      };
      G.state = 'dialog';
    }
  }

  ambience(dt);
  G.toastT -= dt; G.hurtT -= dt; G.flashT -= dt;

  /* 调试 */
  if (In.hit('dbgzone')) {
    const ni = Math.min((G.zone ? G.zone.i : 0) + 1, 6);
    p.x = G.zones[ni].x0 + 140; p.y = G.GB - 80; p.vx = 0; p.vy = 0;
    G.zone = null;
  }
  if (In.hit('dbgboss')) { p.x = 13600; p.y = G.GB - 80; p.vx = 0; p.vy = 0; }
  if (In.hit('dbgsoul')) { G.soul = G.soulMax; toast('墨魂已满'); }
  if (In.hit('mute')) toast(Sfx.toggleMute() ? '已静音' : '声音开启');
}
function updateInter(dt) {
  const p = G.player;
  G.promptStr = '';
  let near = null, nd = 90;
  for (const it of G.inter) {
    const iy = it.type === 'orb' ? it.y : it.y - 60;
    const d = dist(p.x, p.y - 30, it.x, iy);
    if (d < nd && !(it.taken)) { nd = d; near = it; }
    if (it.type === 'lever' || it.type === 'fold') {
      const d2 = dist(p.x, p.y - 30, it.x, it.y - 40);
      if (d2 < nd) { nd = d2; near = it; }
    }
  }
  if (!near) return;
  if (near.type === 'shrine') G.promptStr = 'E — 拾取' + getStyle(near.style).zh + '残页（恢复并记录此处）';
  else if (near.type === 'lever') G.promptStr = 'E — 转动刻板';
  else if (near.type === 'fold') G.promptStr = 'E — 折叠纸面';
  else if (near.type === 'orb') G.promptStr = 'E — 收取墨魂结晶';
  if (In.hit('interact')) {
    if (near.type === 'shrine') {
      near.taken = true;
      G.pages[near.style] = true;
      G.soul = clamp(G.soul + 30, 0, G.soulMax);
      G.player.hp = G.hpMax;
      G.checkpoint = { x: near.x + 40, y: G.GB - 60 };
      Sfx.play('shrine');
      const story = SHRINE_STORY[near.style];
      G.dialog = { title: story[0], lines: story.slice(1), idx: 0, onDone: null };
      G.state = 'dialog';
      burst(near.x, near.y - 140, 20, { col: getStyle(near.style).pal.accent, s0: 3, s1: 8, sp1: 240, g: 200, drag: 2 });
    } else if (near.type === 'lever') {
      near.on = !near.on;
      for (const pl of G.platforms) if (pl.morph) pl.tx = near.on ? 1 : 0;
      Sfx.play('fold');
      toast(near.on ? '刻板转动 —— 长桥铺开' : '刻板复位');
    } else if (near.type === 'fold') {
      for (const pl of G.platforms) {
        if (pl.morph && pl.ax === 12520) pl.tx = pl.tx === 1 ? 0 : 1;
      }
      Sfx.play('fold');
      toast('纸面折叠 —— 折出踏板');
      burst(near.x, near.y - 120, 14, { col: '#fdf6e8', type: 'petal', s0: 4, s1: 8, sp1: 220, g: 300, drag: 2 });
    } else if (near.type === 'orb') {
      near.taken = true;
      G.soul = clamp(G.soul + 40, 0, G.soulMax);
      Sfx.play('shrine');
      addText(near.x, near.y - 30, '+40 墨魂', '#7fb0c8');
    }
  }
}
function respawn() {
  const p = G.player;
  p.dead = false; p.hp = G.hpMax;
  p.x = G.checkpoint.x; p.y = G.checkpoint.y - 4;
  p.vx = 0; p.vy = 0; p.iframe = 2;
  G.overlay = null;
  if (G.zone) spawnZoneEnemies(G.zone.i, true);
  updateCam(0, true);
  burst(p.x, p.y - 30, 16, { col: '#26252b', s0: 3, s1: 8, sp1: 200, g: 200, drag: 2 });
}

/* ---------- 环境粒子 ---------- */
let ambT = 0;
function ambience(dt) {
  ambT -= dt;
  if (ambT > 0) return;
  ambT = .22;
  const st = curStyle(), vx = G.cam.x, vy = G.cam.y;
  const px = vx + rnd(0, W), py = vy + rnd(0, H);
  if (st === 'ink') spawnPart({ x: px, y: py, vx: rnd(-14, -4), vy: rnd(-6, 6), life: rnd(2, 4), size: rnd(14, 34), col: 'rgba(140,134,114,.05)', alpha: .5 });
  else if (st === 'water') spawnPart({ x: px, y: py, vx: rnd(-8, 8), vy: rnd(-14, -4), life: rnd(2, 4), size: rnd(2, 4), col: 'rgba(255,255,255,.5)' });
  else if (st === 'sketch') spawnPart({ x: px, y: py, vx: rnd(-6, 6), vy: rnd(4, 14), life: rnd(1.5, 3), size: rnd(1, 2.5), col: 'rgba(90,87,80,.4)' });
  else if (st === 'oil') spawnPart({ x: px, y: py, vx: rnd(-10, 10), vy: rnd(-8, 8), life: rnd(1, 2.5), size: rnd(2, 4), col: 'rgba(217,161,59,.25)' });
  else if (st === 'print') spawnPart({ x: px, y: py, vx: rnd(-6, 6), vy: rnd(6, 16), life: rnd(1.5, 3), size: rnd(1, 2), col: 'rgba(240,233,216,.25)' });
  else if (st === 'pixel') { if (chance(.25)) spawnPart({ x: px, y: py, vx: 0, vy: 0, life: rnd(.2, .5), size: rnd(4, 10), col: chance(.5) ? '#8ecbe8' : '#ff4a8c', type: 'rect' }); }
  else if (st === 'paper') spawnPart({ x: vx + W + 20, y: py, vx: rnd(-60, -30), vy: rnd(10, 30), life: rnd(3, 6), size: rnd(4, 8), col: chance(.5) ? '#e8836a' : '#fdf6e8', type: 'petal' });
}
