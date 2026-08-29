'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》levels.js —— 手工示例关 + 专属机制 + 无尽回廊
   每关一个核心创意，机制在 updateMechanics 中驱动
   ============================================================ */
const GB = 620;

/* ---------- 构建辅助 ---------- */
function gr(x, w, o) { const p = Object.assign({ x, y: GB, w, h: 160, kind: 'ground' }, o || {}); G.platforms.push(p); return p; }
function pl(x, y, w, h, o) { const p = Object.assign({ x, y, w, h: h || 22, kind: 'plat' }, o || {}); G.platforms.push(p); return p; }
function wall(x, y, w, h, o) { const p = Object.assign({ x, y, w, h, kind: 'wall' }, o || {}); G.platforms.push(p); return p; }
function gwall(x, y, w, h, gs, hp, o) { G.platforms.push(Object.assign({ x, y, w, h, kind: 'gwall', gs, hp, hpMax: hp, seed: rnd(0, 999) }, o || {})); }
function en(type, x, y, o) { G.enemies.push(makeEnemy(Object.assign({ type, x, y, zs: G.level ? G.level.style : 'ink' }, o || {}))); }
function inter(o) { G.inter.push(o); }
function hint(x, y, str) { G.hints.push({ x, y, str }); }

/* ============================================================
   关卡定义
   ============================================================ */
const LEVELS = [
  {
    id: '1-1', name: '墨迹初醒', ch: '第一章 · 水墨', style: 'ink', w: 2500,
    loadout: ['brush', 'charcoal', 'eraser', 'marker'],
    tip: '核心创意：用毛笔画桥 —— 墨台会晕开褪色',
    build() {
      gr(0, 700); gr(1500, 1000, { edible: false });
      en('walker', 420, GB); en('floater', 1780, 400); en('walker', 2000, GB);
      inter({ type: 'exit', x: 2320, y: GB });
      inter({ type: 'checkpoint', x: 320, y: GB });
      hint(260, GB - 160, '按住 鼠标左键：用毛笔在深渊上画桥');
      hint(700, GB - 260, '墨台会晕开褪色 —— 画完就跑！');
      hint(1550, GB - 160, 'J/K 攻击 · 1-4 换工具 · Shift 冲刺');
    },
    mech: {},
  },
  {
    id: '1-7', name: '墨龙之脊', ch: '第一章 · 水墨', style: 'ink', w: 2900,
    loadout: ['brush', 'charcoal', 'marker', 'stamp'],
    tip: '核心创意：龙背狂奔 —— 中途天地翻转',
    build() {
      gr(0, 500, { edible: false });
      /* 龙脊：波动的脊背平台 */
      for (let i = 0; i < 8; i++) pl(560 + i * 180, 500, 130, 26, { spine: true, baseY: 500, ph: i * .9 });
      pl(2140, 500, 160, 26, { spine: true, baseY: 500, ph: 8 * .9 });
      /* 龙背鞍部：翻转前的休息点与存档 */
      pl(1540, 430, 150, 24);
      /* 翻转后的“天花板地面” */
      wall(1500, 60, 1400, 70);
      en('floater', 900, 380); en('floater', 1300, 350);
      inter({ type: 'exit', x: 2700, y: 130, label: '出口 · 天花板' });
      inter({ type: 'checkpoint', x: 260, y: GB });
      inter({ type: 'checkpoint', x: 1610, y: 430 });
      hint(700, 380, '龙脊在呼吸 —— 踩稳了');
      hint(1470, 360, '前方天地即将 倒 转');
    },
    mech: { spine: true, gravityAt: 1620, inkRegen: 3 },
  },
  {
    id: '2-13', name: '雨中倒影', ch: '第二章 · 水彩', style: 'water', w: 2700,
    loadout: ['sponge', 'brush', 'pencil', 'marker'],
    tip: '核心创意：雨水溶解现实，倒影才是真实的',
    build() {
      gr(0, 800, { edible: false });
      /* 会溶解的水彩台 */
      for (let i = 0; i < 3; i++) pl(860 + i * 130, 500 - i * 30, 110, 20, { sol: true });
      gr(1280, 240, { edible: false });
      inter({ type: 'pool', x: 1400, y: GB - 4, w: 200, h: 14 });
      /* 镜像世界的桥 */
      for (let i = 0; i < 4; i++) pl(1620 + i * 140, 470, 110, 18, { mirrorOnly: true });
      gr(2200, 500, { edible: false });
      en('floater', 700, 420, { zs: 'water' }); en('binder', 1050, 470, { zs: 'water' });
      inter({ type: 'exit', x: 2520, y: GB });
      inter({ type: 'checkpoint', x: 300, y: GB });
      hint(500, GB - 170, '雨会溶解水彩平台 —— 别停留');
      hint(1330, GB - 120, '倒影里的平台，只有潜入水中才踩得到');
    },
    mech: { rain: true, mirrorPool: true, freezeAt: 26, inkRegen: 3 },
  },
  {
    id: '3-22', name: '橡皮擦监狱', ch: '第三章 · 素描', style: 'sketch', w: 2600,
    loadout: ['eraser', 'pencil', 'knife', 'scissors'],
    tip: '核心创意：擦掉监狱，但巨橡皮也会擦掉你的路',
    build() {
      gr(0, 700, { edible: false }); gr(700, 700); gr(1400, 500, { edible: false }); gr(1900, 700);
      gwall(760, GB - 260, 40, 260, 'sketch', 5);
      gwall(1360, GB - 260, 40, 260, 'sketch', 5);
      gwall(1960, GB - 200, 40, 200, 'sketch', 4);
      pl(1060, 470, 120, 18); pl(1660, 450, 120, 18);
      en('binder', 1000, GB); en('binder', 1600, GB); en('walker', 2200, GB);
      inter({ type: 'exit', x: 2440, y: GB });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(680, GB - 320, '橡皮擦（选中后按住左键）可以擦开纸墙');
      hint(1240, GB - 320, '擦掉墙后，敌人也会改变路径……');
    },
    mech: { eraserAt: 16, inkRegen: 3 },
  },
  {
    id: '4-30', name: '厚涂崩塌', ch: '第四章 · 油画', style: 'oil', w: 2700,
    loadout: ['knife', 'eraser', 'marker', 'charcoal'],
    tip: '核心创意：承重厚涂会塌 —— 崩塌后只能游出去',
    build() {
      gr(0, 700, { edible: false });
      /* 承重厚涂塔 */
      for (let i = 0; i < 4; i++) pl(800 + i * 240, 500, 130, 40, { kind: 'sink', sink: 0, sinkMax: 52, baseY: 500 });
      gr(1900, 800, { edible: false });
      gwall(2280, GB - 220, 46, 220, 'oil', 3);
      en('armored', 1000, 500); en('armored', 1600, 470); en('walker', 600, GB);
      inter({ type: 'exit', x: 2520, y: 380, locked: true, lockHint: '随画框崩落后开启' });
      inter({ type: 'checkpoint', x: 300, y: GB });
      hint(760, 430, '厚涂塔承不住人 —— 用刮刀（左键）刮薄它们');
      hint(2150, GB - 300, '刮开厚涂墙');
    },
    mech: { collapseAt: 20, inkRegen: 3 },
  },
  {
    id: '5-35', name: '刻板翻转', ch: '第五章 · 版画', style: 'print', w: 2800,
    loadout: ['pencil', 'knife', 'eraser', 'brush'],
    tip: '核心创意：印版上刻线过渊 —— 拉杆翻面，滚筒压平你刻的一切',
    build() {
      gr(0, 620, { edible: false });
      gr(1350, 330, { edible: false });          /* 印版中台（拉杆） */
      gr(2350, 450, { edible: false });
      wall(620, 40, 1060, 90);                    /* 天花板印版（翻面后的地面） */
      wall(2350, 40, 270, 90);
      inter({ type: 'lever', x: 1420, y: GB, used: false });
      en('walker', 300, GB);
      inter({ type: 'exit', x: 2620, y: 130, label: '出口 · 印版背面' });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(240, GB - 190, '第一道渊：用铅笔画线刻过去（刻痕是永久的）');
      hint(1330, GB - 130, 'E — 拉动拉杆：翻面');
      hint(2200, 240, '滚筒会压平你刻下的一切 —— 看准再落笔');
    },
    mech: { roller: true, inkRegen: 3.5 },
  },
  {
    id: '6-41', name: '像素故障', ch: '第六章 · 像素', style: 'pixel', forcePixel: true, w: 2500,
    loadout: ['marker', 'pencil', 'scissors', 'highlight'],
    tip: '核心创意：标记缺失像素补路 —— 中途世界变回合制',
    build() {
      gr(0, 700, { edible: false });
      gr(800, 300); gr(1250, 350); gr(1750, 750, { edible: false });
      /* 缺失像素（用马克笔 J 标记修补） */
      inter({ type: 'node', x: 750, y: GB, missing: true, gapW: 100 });
      inter({ type: 'node', x: 1175, y: GB, missing: true, gapW: 140 });
      en('tele', 1000, 420); en('tele', 1500, 400); en('walker', 2000, GB);
      inter({ type: 'exit', x: 2340, y: GB });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(560, GB - 200, '深渊上的「缺失像素」—— 用马克笔 J 标记来补全');
      hint(1420, 320, '前方数据错乱……');
    },
    mech: { turnAt: 1720, inkRegen: 3 },
  },
  {
    id: '7-46', name: '折纸迷宫', ch: '第七章 · 剪纸', style: 'paper', w: 2700,
    loadout: ['scissors', 'stamp', 'sponge', 'brush'],
    tip: '核心创意：剪断封印、折叠墙壁 —— 迷宫还会自己折',
    build() {
      gr(0, 2700, { edible: false });
      /* 折叠墙（E 折叠 / 30s 自动折） */
      G.platforms.push({ kind: 'plat', morph: true, ax: 900, ay: GB - 240, aw: 22, ah: 240, bx: 922, by: GB - 130, bw: 150, bh: 20, t: 0, tx: 0, x: 900, y: GB - 240, w: 22, h: 240 });
      inter({ type: 'fold', x: 830, y: GB });
      G.platforms.push({ kind: 'plat', morph: true, ax: 1700, ay: GB - 240, aw: 22, ah: 240, bx: 1722, by: GB - 130, bw: 150, bh: 20, t: 0, tx: 0, x: 1700, y: GB - 240, w: 22, h: 240 });
      inter({ type: 'fold', x: 1630, y: GB });
      /* 剪刀封印：剪断后高墙下沉 */
      inter({ type: 'seal', x: 2260, y: GB, len: 120, link: [] });
      wall(2300, GB - 300, 40, 300, { sealWall: true });
      en('flyer', 1200, 380); en('flyer', 2000, 340); en('walker', 1450, GB);
      pl(1150, 450, 130, 20); pl(1950, 430, 130, 20);
      inter({ type: 'exit', x: 2520, y: GB });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(770, GB - 300, 'E 折叠纸墙 · 剪刀 K 可剪断红色封印');
    },
    mech: { foldAt: 30, inkRegen: 3 },
  },
  {
    id: '8-50', name: '雾雨双重', ch: '第八章 · 水墨×水彩', style: 'ink', w: 2900,
    loadout: ['brush', 'sponge', 'pencil', 'marker'],
    tip: '核心创意：左岸晕染缠足，右岸雨水溶解 —— 中央泥浆又滑又重',
    build() {
      gr(0, 2900, { edible: false });
      pl(1750, 470, 130, 20, { sol: true }); pl(1960, 430, 130, 20, { sol: true }); pl(2170, 470, 130, 20, { sol: true });
      en('floater', 600, 420, { zs: 'ink' }); en('floater', 850, 380, { zs: 'ink' });
      en('binder', 1900, 430, { zs: 'water' }); en('binder', 2250, 470, { zs: 'water' }); en('walker', 2500, GB, { zs: 'water' });
      inter({ type: 'exit', x: 2740, y: GB });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(320, GB - 200, '左岸 · 墨泽 —— 墨渍会缠住脚步（海绵 K 可吸干）');
      hint(1220, GB - 200, '中央 · 泥浆（又滑又重）');
      hint(1650, 360, '右岸 · 彩雨 —— 水彩台会被雨溶解');
    },
    mech: { dual: true, mud: { x0: 1150, x1: 1550 }, inkRegen: 3.5 },
  },
  {
    id: '9-57', name: '画室惊魂', ch: '第九章 · 素描×油画', style: 'oil', w: 2600,
    loadout: ['knife', 'eraser', 'pencil', 'marker'],
    tip: '核心创意：刮开厚涂覆盖层 —— 藏在下面的草图会活过来',
    build() {
      gr(0, 2600, { edible: false });
      pl(520, 470, 140, 20); pl(1080, 450, 140, 20); pl(1620, 470, 140, 20);
      gwall(760, GB - 240, 56, 240, 'oil', 3, { reveal: { type: 'binder', x: 830, zs: 'sketch' } });
      gwall(1320, GB - 240, 56, 240, 'oil', 3, { reveal: { type: 'walker', x: 1390, zs: 'sketch' } });
      gwall(1880, GB - 240, 56, 240, 'oil', 3, { reveal: { type: 'binder', x: 1950, zs: 'sketch' } });
      en('armored', 1050, GB, { zs: 'oil' });
      inter({ type: 'exit', x: 2440, y: GB });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(660, GB - 300, '用刮刀（按住左键抵住）刮开覆盖层');
      hint(1240, GB - 300, '覆盖层下面……有什么在动');
      hint(2160, GB - 300, '画架上的画开始颤动……');
    },
    mech: { surpriseAt: 26, inkRegen: 3 },
  },
  {
    id: '10-64', name: '电路刻印', ch: '第十章 · 版画×像素', style: 'print', forcePixel: true, w: 2700,
    loadout: ['pencil', 'highlight', 'eraser', 'knife'],
    tip: '核心创意：用铅笔画电路通电 —— 黑暗中靠荧光笔前行',
    build() {
      gr(0, 2700, { edible: false });
      pl(600, 460, 130, 20); pl(1250, 440, 130, 20); pl(1900, 460, 130, 20);
      inter({ type: 'node', x: 500, y: GB - 4, node: 'A' });
      inter({ type: 'node', x: 2100, y: GB - 4, node: 'B' });
      en('walker', 1000, GB); en('binder', 1500, GB); en('walker', 1800, GB);
      inter({ type: 'exit', x: 2450, y: GB, locked: true, lockHint: '需连通 A → B 电路' });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(420, GB - 170, '用 铅笔（按住左键）把电路 从 A 画到 B');
      hint(2050, GB - 170, 'B 节点');
    },
    mech: { circuit: true, blackoutAt: 15, inkRegen: 3.5 },
  },
  {
    id: '11-70', name: '万具回廊', ch: '第十一章 · 万象拼贴', style: 'paper', w: 3600,
    loadout: ['brush', 'scissors', 'eraser', 'highlight'],
    tip: '核心创意：每走一段，画风与工具随机重铸 —— 尾声万象拼贴',
    build() {
      gr(0, 700, { edible: false }); gr(820, 500); gr(1500, 400); gr(2050, 600); gr(2800, 800, { edible: false });
      pl(1000, 470, 140, 20); pl(1620, 440, 130, 20); pl(2250, 460, 140, 20); pl(2900, 430, 140, 20);
      en('flyer', 900, 380); en('walker', 1600, GB); en('armored', 2300, GB); en('flyer', 2600, 340); en('tele', 2450, GB - 140);
      inter({ type: 'exit', x: 3420, y: GB });
      inter({ type: 'checkpoint', x: 280, y: GB });
      hint(420, GB - 200, '每走一段 —— 画风与携带的工具都会随机重铸');
      hint(2760, 300, '回廊深处：万象拼贴');
    },
    mech: { styleWalk: 460, collageAt: 2600, inkRegen: 4 },
  },
  {
    id: '12-75', name: '空白之心', ch: '第十二章 · 纯白', style: 'blank', w: 2500,
    loadout: ['brush', 'highlight', 'stamp', 'sponge'],
    tip: '核心创意：世界一片空白 —— 一切都要自己画',
    build() {
      gr(0, 320, { edible: false });
      gr(2180, 320, { edible: false });
      /* 隐藏的旧足迹 */
      for (let i = 0; i < 5; i++) pl(500 + i * 260, 470 + (i % 2) * 60, 120, 18, { kind: 'hidden', revealT: 0 });
      inter({ type: 'spark', x: 900, y: 380 });
      inter({ type: 'spark', x: 1500, y: 320 });
      inter({ type: 'spark', x: 2000, y: 240 });
      en('shadow', 1200, 400); en('shadow', 1700, 300); en('shadow', 900, 480);
      inter({ type: 'exit', x: 2360, y: GB, locked: true, lockHint: '收集 3 枚回响之光' });
      inter({ type: 'checkpoint', x: 220, y: GB });
      hint(400, GB - 200, '按住左键画出台阶 · 荧光笔能照出隐藏的旧足迹');
      hint(1250, 200, '影子在白纸上爬行 —— 图章 K 召唤画灵对抗它们');
    },
    mech: { blank: true, wakeAt: 12, inkRegen: 5, dark: .45 },
  },
  {
    id: '12-B', name: '无面绘世者', ch: '终章 · 画师之心', style: 'blank', w: 1800,
    loadout: ['brush', 'eraser', 'scissors', 'highlight'],
    tip: '他把你画出的东西，变成攻击你的武器',
    boss: true,
    build() {
      gr(0, 560, { edible: false });
      gr(1240, 560, { edible: false });
      inter({ type: 'checkpoint', x: 200, y: GB });
      hint(500, GB - 200, '少画 —— 他会夺走你画下的每一笔');
    },
    mech: { inkRegen: 4.5 },
  },
];

/* ============================================================
   无尽回廊：随机生成
   ============================================================ */
function makeEndless(seed) {
  const rr = mulberry32(seed);
  const styles = ['ink', 'water', 'sketch', 'oil', 'print', 'paper'];
  const def = {
    id: 'EX', name: '无尽回廊', ch: '回廊 · 第 ' + (1 + Math.floor(seed % 7)) + ' 层', style: styles[Math.floor(rr() * styles.length)],
    w: 4600, endless: true,
    loadout: [],
    tip: '画风每 25 秒突变 —— 活得越久，得分越高',
    build() {
      let x = 0;
      while (x < def.w - 300) {
        const w = 320 + Math.floor(rr() * 420);
        gr(x, w);
        if (rr() < .6) { const py = 380 + rr() * 160; pl(x + 60 + rr() * (w - 180), py, 90 + rr() * 90, 20); }
        const et = ['walker', 'floater', 'binder', 'armored', 'flyer'][Math.floor(rr() * 5)];
        if (rr() < .8) en(et, x + w * .5, et === 'floater' || et === 'flyer' ? 380 : GB, { zs: def.style });
        x += w + 150 + rr() * 130;
      }
      inter({ type: 'checkpoint', x: 240, y: GB });
      hint(600, 300, '无尽回廊：击杀与存活 = 得分 · 画风会不断突变');
    },
    mech: { styleShift: 25, inkRegen: 4 },
  };
  const pool = TOOL_ORDER.slice();
  for (let i = 0; i < 4; i++) def.loadout.push(pool.splice(Math.floor(rr() * pool.length), 1)[0]);
  return def;
}

/* ============================================================
   进入关卡 / 通用更新
   ============================================================ */
function startLevel(def) {
  G.platforms = []; G.inter = []; G.hints = [];
  G.enemies = []; G.projs = []; G.parts = []; G.texts = [];
  G.washes = []; G.stains = []; G.strokes = [];
  G.decos = { sky: [], far: [], mid: [] };
  G.level = def; G.zone = { style: def.style };
  G.worldW = def.w; G.worldH = 760;
  G.tools = def.loadout.slice(); G.toolIdx = 0;
  G.ink = 100; G.hpMax = 100;
  G.grav = 1; G.mirror = false; G.dark = def.mech.dark || 0; G.turn = null; G.liquid = null;
  G.mud = def.mech.mud || null;
  G.roller = null; G.collage = false; G.pixMix = 0;
  G.walkDist = 0; G.lastWalkX = null;
  G.forcePixel = !!def.forcePixel;
  G.mechT = 0; G.mechFired = {}; G.clearT = 0;
  G.pixMix = 0;
  G.boss = null; G.bossOn = false; G.bossDead = false; G.choiceDelay = 0;
  G.stats = { t: 0, kills: 0, deaths: G.stats.deaths || 0 };
  G.player = makePlayer();
  G.player.x = 140; G.player.y = GB - 4;
  G.checkpoint = { x: 140, y: GB - 4 };
  def.build();
  updateCam(0, true);
  G.state = 'play'; G.paused = false;
  G.wipe = { t: 0, dur: 1.1, label: def.ch + ' · ' + def.name, en: def.tip || '', zh: getStyle(def.style).zh, pal: getStyle(def.style).pal };
  Sfx.setMood(def.style);
}
function restartLevel() {
  const d = G.level;
  G.stats.deaths++;
  startLevel(d);
  G.stats.deaths = (G.stats.deaths || 0) + 1;
}
function clearLevel() {
  if (G.state !== 'play') return;
  G.state = 'clear'; G.clearT = 0;
  G.progress[G.level.id] = true;
  saveProgress();
  Sfx.play('shrine');
  burst(G.player.x, G.player.y - 40, 24, { col: getStyle(G.level.style).pal.accent, s0: 3, s1: 9, sp1: 320, g: 200, drag: 2 });
}

/* 电路连通检查：笔迹两端靠近 A/B 节点 */
function checkCircuit(s) {
  if (!G.level || !G.level.mech.circuit || s.tool !== 'pencil') return;
  const nodes = G.inter.filter(i => i.type === 'node' && i.node);
  if (nodes.length < 2) return;
  const a = nodes.find(n => n.node === 'A'), b = nodes.find(n => n.node === 'B');
  const p0 = s.pts[0], p1 = s.pts[s.pts.length - 1];
  const near = (p, n) => dist(p.x, p.y, n.x, n.y - 26) < 100;
  if ((near(p0, a) && near(p1, b)) || (near(p0, b) && near(p1, a))) {
    if (!G.mechFired.powered) {
      G.mechFired.powered = true;
      a.powered = b.powered = true;
      const ex = G.inter.find(i => i.type === 'exit');
      if (ex) ex.locked = false;
      toast('电路接通了！');
      Sfx.play('shrine');
      for (const n of nodes) burst(n.x, n.y - 26, 16, { col: '#ffd23e', s0: 2, s1: 6, sp1: 220 });
    }
  }
}
/* 5-35：拉杆 → 印版翻面 + 滚筒启动 */
function onLeverPulled(it) {
  if (G.grav === 1) {
    G.grav = -1;
    G.player.vy = -200;
    G.player.iframe = 1;
    G.flashT = .35; addShake(10); Sfx.play('roar');
    toast('印版翻面！滚筒启动 —— 到背面重新刻线！');
  }
  G.roller = { x: G.worldW - 120, dir: -1, w: 190, h: 120, y: 130, stopX: 640, done: false };
  burst(G.player.x, G.player.y - 30, 16, { col: '#17171c', type: 'chip', s0: 3, s1: 8, sp1: 280, g: 300 });
}
/* 9-57：厚涂覆盖层被刮开后，露出草图敌人 */
function spawnReveal(pl) {
  if (!pl.reveal) return;
  const e = makeEnemy({ type: pl.reveal.type, zone: -1, x: pl.reveal.x, y: pl.reveal.y || GB - 4, zs: pl.reveal.zs || 'sketch' });
  G.enemies.push(e);
  addText(e.x, e.y - 70, '草图活了!', '#e8e4da');
  burst(e.x, e.y - 30, 14, { col: '#e8e4da', type: 'rect', s0: 3, s1: 8, sp1: 260, g: 300 });
  Sfx.play('roar');
}
function onSealCut(it) {  for (const pl of G.platforms) {
    if (pl.sealWall) {
      pl.dead = true;
      burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 18, { col: '#fdf6e8', type: 'petal', s0: 4, s1: 9, sp1: 260, g: 350, drag: 2 });
    }
  }
  G.platforms = G.platforms.filter(p => !p.dead);
  toast('封印断了 —— 高墙倒下');
  addShake(6);
}
function restoreEatenFloor() {
  /* 巨橡皮死后恢复被擦掉的地面（简化：在缺口处补桥） */
  const gaps = [];
  let prev = null;
  const grounds = G.platforms.filter(p => p.kind === 'ground').sort((a, b) => a.x - b.x);
  for (const g of grounds) {
    if (prev && g.x - (prev.x + prev.w) > 80) gaps.push([prev.x + prev.w, g.x]);
    prev = g;
  }
  for (const [x0, x1] of gaps) pl(x0, GB, x1 - x0, 20);
}

/* ============================================================
   关卡机制驱动
   ============================================================ */
function updateMechanics(dt) {
  if (!G.level) return;
  const m = G.level.mech, p = G.player;
  G.mechT += dt;
  if (m.inkRegen) G.ink = clamp(G.ink + m.inkRegen * dt * .35, 0, G.inkMax);

  /* 龙脊呼吸 */
  if (m.spine) for (const pl of G.platforms) if (pl.spine) pl.y = pl.baseY + Math.sin(G.mechT * 1.3 + pl.ph) * 26;

  /* 印刷滚筒：压平笔迹 */
  if (G.roller && !G.roller.done) {
    const R = G.roller;
    R.x += R.dir * 250 * dt;
    for (const s of G.strokes) {
      if (!s.dead && s.cx > R.x - 30 && s.cx < R.x + R.w + 30 && s.cy > R.y - 50 && s.cy < R.y + R.h + 50) {
        removeStroke(s);
        addText(s.cx, s.cy - 14, '被压平', '#f0e9d8');
      }
    }
    G.strokes = G.strokes.filter(s => !s.dead);
    if (p && !p.dead && aabb({ x: R.x, y: R.y, w: R.w, h: R.h }, pbox(p))) damagePlayer(14, R.x);
    if (chance(.3)) spawnPart({ x: R.x + rnd(0, R.w), y: R.y + R.h, vx: rnd(-30, 30), vy: rnd(20, 60), life: .6, size: rnd(2, 5), col: 'rgba(240,233,216,.7)' });
    addShake(.5);
    if (R.dir < 0 && R.x <= R.stopX) { R.done = true; toast('滚筒停在了印版尽头'); Sfx.play('boom'); }
  }

  /* 雾雨双重：左岸墨泽 / 右岸彩雨 */
  if (m.dual) {
    if (chance(.05)) addWash(rnd(160, 1000), GB - rnd(4, 10), rnd(30, 55), '#26252b');
    if (p.x > 950 && chance(.55)) spawnPart({ x: rnd(Math.max(p.x - 640, 1250), p.x + 640), y: G.cam.y - 10, vx: rnd(-20, -6), vy: rnd(330, 430), life: 2, size: rnd(1, 2.4), col: 'rgba(110,150,170,.55)', type: 'line' });
    for (const pl of G.platforms) {
      if (pl.sol && !pl.dead) {
        pl.x += 2.4 * dt; pl.w -= 4.8 * dt;
        if (pl.w <= 14) { pl.dead = true; burst(pl.x, pl.y, 10, { col: '#9fc3b8', s0: 3, s1: 7, sp1: 160, g: 300 }); }
      }
    }
    G.platforms = G.platforms.filter(pl => !pl.dead);
    for (const w of G.washes) {
      if (w.col === '#26252b' && Math.abs(p.x - w.x) < w.r + 14 && Math.abs(p.y - w.y) < 34) p.slowT = Math.max(p.slowT || 0, .15);
    }
  }

  /* 11-70：行走重铸（画风 + 工具） */
  if (m.styleWalk) {
    if (G.lastWalkX == null) G.lastWalkX = p.x;
    G.walkDist += Math.abs(p.x - G.lastWalkX);
    G.lastWalkX = p.x;
    if (G.walkDist >= m.styleWalk) {
      G.walkDist = 0;
      const styles = ['ink', 'water', 'sketch', 'oil', 'print', 'pixel', 'paper'];
      const ns = styles.filter(s => s !== G.level.style)[rndi(0, 5)];
      G.level.style = ns; G.zone = { style: ns };
      G.forcePixel = ns === 'pixel';
      const pool = TOOL_ORDER.slice();
      G.tools = [];
      for (let i = 0; i < 4; i++) G.tools.push(pool.splice(rndi(0, pool.length - 1), 1)[0]);
      G.toolIdx = 0;
      Sfx.setMood(ns); Sfx.play('switch');
      for (const d of G.decos.far) d.col = shade(getStyle(ns).pal.far, rndi(-14, 14));
      toast('回廊重铸 · ' + getStyle(ns).zh + '之境（工具已更换）');
      en(['walker', 'floater', 'flyer'][rndi(0, 2)], clamp(p.x + rnd(-480, 480), 400, G.worldW - 320), GB - 4, { zs: ns });
    }
  }
  if (G.collage) G.pixMix = .35 + .25 * Math.sin(G.t * 1.6);

  /* 9-57：画室惊魂 */
  if (m.surpriseAt && !G.mechFired.surprise && G.mechT > m.surpriseAt) {
    G.mechFired.surprise = true;
    let n = 0;
    for (const pl of G.platforms) {
      if (pl.kind === 'gwall' && pl.reveal && !pl.dead) {
        pl.dead = true;
        burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 16, { col: '#a24a2c', type: 'chip', s0: 4, s1: 9, sp1: 300, g: 500 });
        spawnReveal(pl);
        n++;
      }
    }
    G.platforms = G.platforms.filter(pl => !pl.dead);
    if (n) { en('walker', 1200, GB, { zs: 'sketch' }); en('walker', 2100, GB, { zs: 'sketch' }); }
    toast('画室里的画全部活了！');
    Sfx.play('roar'); addShake(10); G.flashT = .4;
  }

  /* 承重厚涂：站上去会下陷崩塌，4 秒后重构 */
  if (!G.sinkRespawn) G.sinkRespawn = [];
  for (const pl of G.platforms) {
    if (pl.kind === 'sink' && !pl.dead) {
      const on = p.onG && Math.abs(p.y - pl.y) < 8 && p.x > pl.x - 8 && p.x < pl.x + pl.w + 8;
      if (on) {
        pl.sink += dt * 30;
        pl.y = pl.baseY + Math.min(pl.sink, pl.sinkMax);
        if (pl.sink >= pl.sinkMax && !pl.gone) {
          pl.gone = true;
          burst(pl.x + pl.w / 2, pl.y, 18, { col: '#a24a2c', type: 'chip', s0: 4, s1: 9, sp1: 280, g: 600 });
          Sfx.play('boom'); addShake(6);
          addText(pl.x + pl.w / 2, pl.y - 20, '崩塌!', '#d9a13b');
          G.sinkRespawn.push({ pl, t: 4 });
        }
      } else if (pl.sink > 0) {
        pl.sink = Math.max(0, pl.sink - dt * 12);
        pl.y = pl.baseY + pl.sink;
      }
    }
  }
  for (let i = G.sinkRespawn.length - 1; i >= 0; i--) {
    const r = G.sinkRespawn[i];
    r.t -= dt;
    if (r.t <= 0) {
      r.pl.gone = false; r.pl.sink = 0; r.pl.y = r.pl.baseY;
      burst(r.pl.x + r.pl.w / 2, r.pl.y, 10, { col: '#d9a13b', type: 'chip', s0: 3, s1: 7, sp1: 200 });
      G.sinkRespawn.splice(i, 1);
    }
  }
  G.platforms = G.platforms.filter(pl => !(pl.kind === 'sink' && pl.gone));

  /* 缺失像素：马克笔 J 标记补全 */
  for (const it of G.inter) {
    if (it.type === 'node' && it.missing && !it.filled) {
      if (tool().key === 'marker' && p.atkT > 0 && dist(p.x, p.y - 30, it.x, it.y - 20) < 120) {
        it.filled = true;
        G.platforms.push({ x: it.x - it.gapW / 2, y: GB - 14, w: it.gapW, h: 16, kind: 'plat' });
        addText(it.x, it.y - 46, '像素补全!', '#ffd23e');
        Sfx.play('crit');
        burst(it.x, it.y - 12, 14, { col: '#ffd23e', type: 'rect', s0: 3, s1: 7, sp1: 220 });
      }
    }
  }

  /* 雨：溶解水彩平台 */
  if (m.rain) {
    if (chance(.5)) spawnPart({ x: G.cam.x + rnd(0, W), y: G.cam.y - 10, vx: rnd(-20, -6), vy: rnd(330, 430), life: 2, size: rnd(1, 2.4), col: 'rgba(110,150,170,.55)', type: 'line' });
    for (const pl of G.platforms) {
      if (pl.sol && !pl.dead) {
        pl.x += 2.6 * dt; pl.w -= 5.2 * dt;
        if (pl.w <= 14) { pl.dead = true; burst(pl.x, pl.y, 10, { col: '#9fc3b8', s0: 3, s1: 7, sp1: 160, g: 300 }); }
      }
    }
    G.platforms = G.platforms.filter(pl => !pl.dead);
  }

  /* 重力翻转 */
  if (m.gravityAt && !G.mechFired.flip && p.x > m.gravityAt) {
    G.mechFired.flip = true;
    G.grav = -1;
    p.vy = -200; p.iframe = 1.2;
    G.flashT = .3; addShake(10); Sfx.play('roar');
    toast('天地倒转！');
    burst(p.x, p.y - 30, 20, { col: '#26252b', s0: 3, s1: 8, sp1: 300 });
  }

  /* 倒影世界 */
  if (m.mirrorPool) {
    for (const it of G.inter) {
      if (it.type === 'pool') {
        const near = Math.abs(p.x - it.x) < it.w / 2 + 20 && Math.abs(p.y - it.y) < 60;
        it.near = near;
        if (near && (In.hit('interact') || In.hit('down'))) {
          G.mirror = !G.mirror;
          Sfx.play('fold');
          toast(G.mirror ? '潜入倒影 —— 上即是下' : '浮出水面');
          G.flashT = .2;
          if (G.mirror && !G.mechFired.refl) {
            G.mechFired.refl = true;
            en('floater', 1900, 380, { zs: 'water' }); en('floater', 2100, 420, { zs: 'water' });
            toast('倒影里的它们……也是真实的');
          }
        }
      }
    }
    G.mirrorTint = G.mirror ? .16 : 0;
  }

  /* 冰封时刻 */
  if (m.freezeAt && !G.mechFired.freeze && G.mechT > m.freezeAt) {
    G.mechFired.freeze = true;
    m.rain = false;
    G.platforms.push({ x: 1450, y: GB - 10, w: 700, h: 16, kind: 'ice' });
    toast('雨突然停了 —— 水面结冰，倒影与现实重叠！');
    Sfx.play('crit'); G.flashT = .35; addShake(8);
    en('floater', 1700, 400, { zs: 'water' }); en('floater', 1950, 380, { zs: 'water' });
  }

  /* 巨橡皮 */
  if (m.eraserAt && !G.mechFired.giant && G.mechT > m.eraserAt) {
    G.mechFired.giant = true;
    en('eraserGiant', G.worldW - 160, GB - 4, { zs: 'sketch' });
    toast('一只巨大的橡皮擦醒了 —— 它会擦掉你脚下的路！');
    Sfx.play('roar'); addShake(6);
  }

  /* 画框崩塌 → 液态颜料 */
  if (m.collapseAt && !G.mechFired.collapse && (G.mechT > m.collapseAt || p.x > 1900)) {
    G.mechFired.collapse = true;
    G.liquid = { x: 1900, y: GB - 20, w: 800, h: 130 };
    G.platforms.push({ x: 1900, y: GB - 20, w: 800, h: 130, kind: 'liquid', col: '#b3542e' });
    const ex = G.inter.find(i => i.type === 'exit');
    if (ex) { ex.locked = false; ex.y = 566; } /* 沉到液面处，游泳可及 */
    /* 崩塌后右侧地面消失 */
    for (const pl of G.platforms) if (pl.kind === 'ground' && pl.x >= 1900) pl.dead = true;
    G.platforms = G.platforms.filter(pl => !pl.dead);
    toast('整幅画从画框上脱落了 —— 在颜料里游泳（W 上浮）！');
    Sfx.play('boom'); addShake(14); G.flashT = .4;
  }

  /* 回合制 */
  if (m.turnAt && !G.mechFired.turn && p.x > m.turnAt) {
    G.mechFired.turn = true;
    startTurnMode();
  }
  if (G.turn) updateTurnMode(dt);

  /* 电路黑暗 */
  if (m.blackoutAt && !G.mechFired.blackout && G.mechT > m.blackoutAt) {
    G.mechFired.blackout = true;
    G.dark = 1;
    toast('短路！世界陷入黑暗 —— 用荧光笔画出光路');
    Sfx.play('boom'); G.flashT = .3;
  }
  if (G.dark > 0 && G.dark < 1 && !G.mechFired.blackout) G.dark = Math.min(1, G.dark + dt * .2);

  /* 迷宫自动折叠 */
  if (m.foldAt && !G.mechFired.fold && G.mechT > m.foldAt) {
    G.mechFired.fold = true;
    for (const pl of G.platforms) if (pl.morph) pl.tx = pl.tx === 1 ? 0 : 1;
    toast('迷宫开始自己折叠！');
    Sfx.play('fold'); addShake(8);
    en('flyer', 1400, 340);
  }

  /* 空白之心：笔画觉醒 */
  if (m.blank && G.mechT > (m.wakeAt || 10)) {
    if (!G.wakeCd) G.wakeCd = 8;
    G.wakeCd -= dt;
    if (G.wakeCd <= 0) {
      G.wakeCd = rnd(8, 12);
      const cands = G.strokes.filter(s => !s.dead && !s.hostile && !s.pinned);
      if (cands.length) {
        const s = cands[rndi(0, cands.length - 1)];
        s.hostile = true; s.hostileT = 4;
        addText(s.cx, s.cy - 20, '你的画醒了！', '#ff4a8c');
        Sfx.play('roar');
      }
    }
  }
  G.revealAll = Math.max(0, (G.revealAll || 0) - dt);

  /* 无尽：画风突变 */
  if (m.styleShift) {
    if (!G.shiftCd) G.shiftCd = m.styleShift;
    G.shiftCd -= dt;
    if (G.shiftCd <= 0) {
      G.shiftCd = m.styleShift;
      const styles = ['ink', 'water', 'sketch', 'oil', 'print', 'paper'];
      const ns = styles.filter(s => s !== G.level.style)[rndi(0, 4)];
      G.level.style = ns; G.zone = { style: ns };
      G.forcePixel = false;
      G.wipe = { t: 0, dur: 1.1, label: '画风突变 · ' + getStyle(ns).zh, en: '', zh: getStyle(ns).zh, pal: getStyle(ns).pal };
      Sfx.setMood(ns); Sfx.play('switch');
      for (const e of G.enemies) if (!e.dead) e.zs = ns;
      for (const d of G.decos.far) d.col = shade(getStyle(ns).pal.far, rndi(-14, 14));
    }
  }

  /* 出口判定 */
  for (const it of G.inter) {
    if (it.type === 'exit' && !it.locked) {
      if (dist(p.x, p.y - 40, it.x, it.y - 52) < 76) { clearLevel(); return; }
    }
    if (it.type === 'spark' && !it.taken) {
      if (dist(p.x, p.y - 30, it.x, it.y) < 46) {
        it.taken = true;
        Sfx.play('shrine');
        burst(it.x, it.y, 16, { col: '#ffe86a', s0: 3, s1: 8, sp1: 260, g: 100 });
        const sparks = G.inter.filter(i => i.type === 'spark');
        if (sparks.every(s => s.taken)) {
          const ex = G.inter.find(i => i.type === 'exit');
          if (ex) { ex.locked = false; toast('回响之光集齐了 —— 出口显形！'); }
        } else toast('回响之光 ' + sparks.filter(s => s.taken).length + ' / ' + sparks.length);
      }
    }
    if (it.type === 'checkpoint' && !it.on) {
      if (Math.abs(p.x - it.x) < 60 && Math.abs(p.y - it.y) < 90) {
        it.on = true;
        G.checkpoint = { x: it.x, y: it.y - 4 };
        G.player.hp = G.hpMax;
        G.ink = G.inkMax;
        toast('存档点 —— 状态已恢复');
        Sfx.play('fold');
      }
    }
    if (it.type === 'fold' && In.hit('interact') && Math.abs(p.x - it.x) < 70 && Math.abs(p.y - it.y) < 100) {
      for (const pl of G.platforms) if (pl.morph && Math.abs(pl.ax - (it.x + 70)) < 90) pl.tx = pl.tx === 1 ? 0 : 1;
      Sfx.play('fold');
    }
    if (it.type === 'lever' && !it.used && In.hit('interact') && Math.abs(p.x - it.x) < 120 && Math.abs(p.y - it.y) < 140) {
      it.used = true;
      onLeverPulled(it);
    }
  }
  /* 11-70：万象拼贴 */
  if (m.collageAt && !G.mechFired.collage && p.x > m.collageAt) {
    G.mechFired.collage = true;
    G.collage = true;
    toast('万象拼贴 —— 所有画风同时显现！');
    Sfx.play('roar'); addShake(10); G.flashT = .4;
    en('binder', 2950, GB, { zs: 'sketch' }); en('floater', 3150, 380, { zs: 'ink' });
    en('flyer', 3050, 320, { zs: 'paper' }); en('armored', 2680, GB, { zs: 'oil' });
  }
  if (p.dead) {
    G.deadT -= dt;
    if (G.deadT <= 0) {
      if (G.level.endless) { endEndless(); }
      else {
        p.dead = false; p.hp = G.hpMax;
        p.x = G.checkpoint.x; p.y = G.checkpoint.y - 4;
        p.vx = 0; p.vy = 0; p.iframe = 2;
        G.ink = Math.max(G.ink, 60);
        updateCam(0, true);
        /* 重置该关敌人（简化：清除后重建本关） */
        const d = G.level;
        G.enemies = []; G.projs = [];
        d.build();
        G.strokes = [];
        G.platforms = G.platforms.filter(pl => pl.kind !== 'dbx');
        toast('万具匣重构了回廊……再试一次');
      }
    }
  }
}

/* ============================================================
   回合制模式（像素故障）
   ============================================================ */
function startTurnMode() {
  const p = G.player;
  const cell = 48;
  const x0 = Math.floor((p.x + 60) / cell) * cell;
  G.turn = {
    cell, x0, gy: GB - 4,
    pits: [[1855, 1900], [2145, 2190]],
    exitCell: Math.floor((2340 - x0) / cell),
    cd: 0, steps: 0,
  };
  p.x = x0; p.vx = 0; p.vy = 0;
  for (const e of G.enemies) if (e.type === 'tele') { e.x = Math.round(e.x / cell) * cell; e.y = G.turn.gy; e.vulnT = 0; }
  toast('世界变成了回合制 —— 每走一步，敌人也走一步');
  Sfx.play('crit'); G.flashT = .35;
}
function turnBlocked(gx) {
  const t = G.turn;
  const wx = t.x0 + gx * t.cell + t.cell / 2;
  for (const [a, b] of t.pits) if (wx > a - 10 && wx < b + 10) return true;
  return false;
}
function updateTurnMode(dt) {
  const t = G.turn, p = G.player;
  t.cd -= dt;
  if (t.cd > 0) return;
  let acted = null;
  if (In.hit('left')) acted = -1;
  else if (In.hit('right')) acted = 1;
  else if (In.hit('jump')) acted = 'jump';
  else if (In.hit('light')) acted = 'attack';
  else if (In.hit('interact') || In.hit('heavy')) acted = 'wait';
  if (acted === null) return;
  t.cd = .16;
  const curCell = Math.round((p.x - t.x0) / t.cell);
  if (acted === -1 || acted === 1) {
    const nx = curCell + acted;
    if (!turnBlocked(nx)) { p.x = t.x0 + nx * t.cell; Sfx.play('select'); }
    else { Sfx.play('deny'); return; }
  } else if (acted === 'jump') {
    const nx = curCell + p.face * 2;
    if (!turnBlocked(nx)) { p.x = t.x0 + nx * t.cell; Sfx.play('jump'); }
    else if (!turnBlocked(curCell + p.face)) { p.x = t.x0 + (curCell + p.face) * t.cell; Sfx.play('jump'); }
  } else if (acted === 'attack') {
    Sfx.play('swing');
    applyMelee({ x: p.x + p.face * 20, y: p.y - 70, w: 84, h: 90 }, 12, { style: curStyle(), dir: p.face, knock: false });
    burst(p.x + p.face * 40, p.y - 30, 6, { col: '#8ecbe8', type: 'rect', s0: 2, s1: 5, sp1: 160 });
  } else if (acted === 'wait') {
    Sfx.play('select');
  }
  t.steps++;
  /* 敌人行动 */
  for (const e of G.enemies) {
    if (e.dead || e.type !== 'tele') continue;
    const dxCells = Math.round((p.x - e.x) / t.cell);
    if (Math.abs(dxCells) <= 5) {
      /* 同走廊：开火 */
      spawnProj({ type: 'pix', x: e.x, y: e.y - 30, vx: sgn(dxCells) * 620, vy: 0, dmg: 6, from: 'e', ttl: 1 });
      Sfx.play('shoot');
      addText(e.x, e.y - 60, '开火!', '#8ecbe8');
    } else {
      const step = sgn(dxCells) * t.cell;
      const nx = e.x + step;
      if (!turnBlocked(Math.round((nx - t.x0) / t.cell))) e.x = nx;
    }
  }
  /* 到达出口 */
  if (curCell >= t.exitCell) {
    G.turn = null;
    clearLevel();
  }
}
