'use strict';
/* ============================================================
   《墨境：千面残章》main.js —— 状态机 / HUD / 标题 / 对话 / 抉择与结局
   ============================================================ */

/* ---------- 启动 ---------- */
function boot() {
  const cvs = document.getElementById('cv');
  G.cvs = cvs;
  G.ctx = cvs.getContext('2d');
  initSurfaces();
  buildWorld();
  G.player = makePlayer();
  window.addEventListener('resize', fit);
  fit();
  requestAnimationFrame(loop);
}
function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  G.cvs.style.width = Math.floor(W * s) + 'px';
  G.cvs.style.height = Math.floor(H * s) + 'px';
}

/* ---------- 主循环 ---------- */
let lastTs = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const now = ts / 1000;
  let dt = Math.min(now - (lastTs || now - .016), .033);
  lastTs = now;
  G.dt = dt; G.t += dt; G.frame++;
  if (G.freeze > 0) { G.freeze -= dt; dt = 0; }
  update(dt);
  render();
  In.clear();
}
function update(dt) {
  switch (G.state) {
    case 'title': {
      G.titleT += dt;
      if (G.titleT > 3.8) {
        G.titleT = 0;
        G.titleIdx = (G.titleIdx + 1) % ZONE_ORDER.length;
        G.overlay = ZONE_ORDER[G.titleIdx];
        Sfx.setMood(G.overlay);
      }
      if (G.player) G.player.anim += dt;
      G.cam.x = 240 + Math.sin(G.t * .07) * 180;
      G.cam.y = 180;
      if (In.hit('start')) {
        Sfx.ensure();
        G.overlay = null;
        G.state = 'intro'; G.introIdx = 0;
        Sfx.setMood('ink');
        Sfx.play('select');
      }
      break;
    }
    case 'intro':
      if (In.hit('start')) {
        G.introIdx++;
        Sfx.play('select');
        if (G.introIdx > 2) startGame();
      }
      break;
    case 'play': {
      if (In.hit('help')) G.helpOpen = !G.helpOpen;
      if (In.hit('pause')) G.paused = !G.paused;
      if (G.helpOpen || G.paused) break;
      if (G.wipe) { G.wipe.t += dt; if (G.wipe.t > G.wipe.dur) G.wipe = null; }
      updateWorld(dt);
      updatePlayer(dt);
      updateEnemies(dt);
      updateProjs(dt);
      updateBoss(dt);
      updateParts(dt);
      updateTexts(dt);
      updateFx(dt);
      updateCam(dt);
      if (G.bossDead) {
        G.choiceDelay -= dt;
        if (G.choiceDelay <= 0) { G.state = 'choice'; G.choiceSel = 0; }
      }
      break;
    }
    case 'dialog':
      if (In.hit('start')) {
        G.dialog.idx++;
        Sfx.play('select');
        if (G.dialog.idx >= G.dialog.lines.length) {
          const done = G.dialog.onDone;
          G.dialog = null;
          G.state = 'play';
          if (done) done();
        }
      }
      break;
    case 'choice':
      if (In.hit('left') || In.hit('right')) { G.choiceSel = 1 - G.choiceSel; Sfx.play('select'); }
      if (In.hit('start')) {
        G.endType = G.choiceSel === 0 ? 'fuse' : 'ink';
        G.state = 'ending'; G.endT = 0;
        Sfx.play('switch'); Sfx.setMood(G.endType === 'fuse' ? 'water' : 'ink');
      }
      break;
    case 'ending':
      G.endT += dt;
      updateParts(dt);
      if (In.hit('start') && G.endT > 4) G.state = 'endcard';
      if (G.endT > 13) G.state = 'endcard';
      break;
    case 'endcard':
      if (In.hit('start') || In.hit('restart')) resetToTitle();
      break;
  }
}
function startGame() {
  resetToTitle(true);
  G.state = 'play';
  G.stats = { t: 0, kills: 0, deaths: 0 };
  G.cam.x = 0; G.cam.y = 180;
  updateCam(0, true);
  toast('收集七境残页，抵达画师之心');
}
function resetToTitle(keepTitle) {
  G.platforms = []; G.inter = []; G.spawns = []; G.hints = [];
  G.pages = {}; G.soul = 40; G.overlay = null; G.overlayT = 0;
  G.boss = null; G.bossOn = false; G.bossDead = false; G.pixMix = 0;
  G.zone = null; G.gateTalked = false; G.dialog = null; G.wipe = null;
  G.hurtT = 0; G.flashT = 0; G.deadT = 0; G.paused = false; G.helpOpen = false;
  G.decos = { sky: [], far: [], mid: [] };
  buildWorld();
  G.player = makePlayer();
  G.checkpoint = { x: 120, y: G.GB - 60 };
  G.titleT = 0; G.titleIdx = -1;
  if (!keepTitle) { G.state = 'title'; Sfx.setMood('ink'); }
}

/* ---------- 渲染 ---------- */
function render() {
  const ctx = G.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  switch (G.state) {
    case 'title': renderTitle(ctx); break;
    case 'intro': renderIntro(ctx); break;
    case 'play':
      renderScene(ctx);
      drawHUD(ctx);
      drawWipeFx(ctx);
      break;
    case 'dialog':
      renderScene(ctx);
      drawHUD(ctx);
      drawDialog(ctx);
      break;
    case 'choice':
      renderScene(ctx);
      drawChoice(ctx);
      break;
    case 'ending':
      if (G.endType === 'fuse') drawEndingFuse(ctx); else drawEndingInk(ctx);
      break;
    case 'endcard': drawEndcard(ctx); break;
  }
}

/* ---------- 标题 ---------- */
function renderTitle(ctx) {
  renderScene(ctx);
  ctx.fillStyle = 'rgba(12,10,16,.42)';
  ctx.fillRect(0, 0, W, H);
  const st = getStyle(curStyle());
  ctx.textAlign = 'center';
  /* 大标题 */
  setFont(ctx, 96, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.strokeStyle = 'rgba(20,16,24,.9)'; ctx.lineWidth = 10; ctx.lineJoin = 'round';
  ctx.strokeText('墨境', W / 2, H * .34);
  ctx.fillText('墨境', W / 2, H * .34);
  setFont(ctx, 40, true);
  ctx.strokeText('千 面 残 章', W / 2, H * .34 + 64);
  ctx.fillText('千 面 残 章', W / 2, H * .34 + 64);
  /* 印章 */
  ctx.fillStyle = '#b23a2e';
  ctx.fillRect(W / 2 + 218, H * .34 - 66, 44, 44);
  ctx.fillStyle = '#f5f1e6'; setFont(ctx, 22, true);
  ctx.fillText('画灾', W / 2 + 240, H * .34 - 36);
  /* 卖点 */
  setFont(ctx, 21, false);
  ctx.fillStyle = 'rgba(245,241,230,.85)';
  ctx.fillText('每一次转身，世界都换了一副面孔 ——', W / 2, H * .58);
  ctx.fillText('在七种画风交织的战场上，用一支笔打出属于自己的风格。', W / 2, H * .58 + 34);
  /* 当前演示画风 */
  setFont(ctx, 30, true);
  ctx.fillStyle = st.pal.accent;
  ctx.fillText('【 ' + st.zh + '之境 】', W / 2, H * .68);
  setFont(ctx, 16, false);
  ctx.fillStyle = 'rgba(245,241,230,.55)';
  ctx.fillText('ENEMY · ' + st.en, W / 2, H * .68 + 26);
  /* 开始提示 */
  ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
  setFont(ctx, 26, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('—— 按 Enter 落笔 ——', W / 2, H * .82);
  ctx.globalAlpha = 1;
  setFont(ctx, 15, false);
  ctx.fillStyle = 'rgba(245,241,230,.6)';
  ctx.fillText('A/D 移动 · 空格 跳跃(二段) · Shift 冲刺 · J 轻击 · K 重击 · E 交互 · 1-7 切换残页 · H 帮助', W / 2, H - 26);
  ctx.textAlign = 'left';
}

/* ---------- 序章 ---------- */
const INTRO_SLIDES = [
  ['一夜之间，画师的心境碎成了七片。', '墨色退去，万物换上了陌生的笔触。'],
  ['你是最末一位「绘世者」。', '手中的万化笔，听得懂每一种画风的规则。'],
  ['收集散落的残页，穿过七境，抵达画师之心。', '—— 在那里，做出你的选择。'],
];
function renderIntro(ctx) {
  const st = getStyle('ink'), pal = st.pal;
  ctx.fillStyle = pal.paper; ctx.fillRect(0, 0, W, H);
  /* 远山 */
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ['rgba(160,154,132,.25)', 'rgba(120,114,96,.3)', 'rgba(70,66,58,.45)'][i];
    ctx.beginPath();
    ctx.moveTo(-50, H - 60 - i * 30);
    ctx.quadraticCurveTo(W * (.25 + i * .2), H * .42 - i * 60, W * (.6 + i * .15), H - 60 - i * 30);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.textAlign = 'center';
  const lines = INTRO_SLIDES[G.introIdx];
  setFont(ctx, 34, true);
  ctx.fillStyle = '#2c2a2f';
  ctx.fillText(lines[0], W / 2, H * .42);
  setFont(ctx, 24, false);
  ctx.fillStyle = '#57534a';
  ctx.fillText(lines[1], W / 2, H * .42 + 56);
  setFont(ctx, 14, false);
  ctx.fillStyle = 'rgba(87,83,74,.6)';
  ctx.fillText((G.introIdx + 1) + ' / 3 · Enter', W / 2, H - 40);
  ctx.textAlign = 'left';
}

/* ---------- HUD ---------- */
function drawHUD(ctx) {
  const p = G.player;
  if (!p) return;
  const st = getStyle(curStyle()), pal = st.pal;
  /* 血量（墨瓶） */
  ctx.save();
  ctx.translate(30, 30);
  ctx.fillStyle = 'rgba(15,13,18,.55)';
  roundRect(ctx, -10, -8, 200, 66, 10); ctx.fill();
  ctx.fillStyle = '#f5f1e6';
  roundRect(ctx, 0, 0, 24, 34, 5); ctx.fill();
  ctx.fillStyle = getStyle('ink').pal.accent;
  const hpF = clamp(p.hp / G.hpMax, 0, 1);
  ctx.fillRect(3, 3 + 28 * (1 - hpF), 18, 28 * hpF);
  ctx.fillStyle = '#f5f1e6'; setFont(ctx, 15, true);
  ctx.fillText(Math.ceil(p.hp) + '', 4, 52);
  ctx.fillStyle = 'rgba(245,241,230,.9)'; setFont(ctx, 13, false);
  ctx.fillText('HP', 36, 16);
  ctx.fillStyle = 'rgba(245,241,230,.25)';
  roundRect(ctx, 36, 22, 140, 10, 5); ctx.fill();
  ctx.fillStyle = hpF > .35 ? '#9fd8a8' : '#e05a4a';
  roundRect(ctx, 36, 22, 140 * hpF, 10, 5); ctx.fill();
  /* 墨魂 */
  ctx.fillStyle = 'rgba(245,241,230,.9)';
  ctx.fillText('墨魂', 36, 48);
  ctx.fillStyle = 'rgba(245,241,230,.25)';
  roundRect(ctx, 70, 40, 106, 9, 4); ctx.fill();
  ctx.fillStyle = '#7fb0c8';
  roundRect(ctx, 70, 40, 106 * clamp(G.soul / G.soulMax, 0, 1), 9, 4); ctx.fill();
  ctx.restore();
  /* 武器名 */
  setFont(ctx, 17, true);
  ctx.fillStyle = 'rgba(245,241,230,.92)';
  ctx.fillText('『 ' + WEAPONS[curStyle()].name + ' 』', 30, 122);
  /* 残页栏 */
  ctx.save();
  ctx.translate(W - 320, 26);
  ctx.fillStyle = 'rgba(15,13,18,.55)';
  roundRect(ctx, -14, -10, 320, 58, 10); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const k = ZONE_ORDER[i];
    const x = 8 + i * 44;
    pageIcon(ctx, k, x + 8, 16, 20, !!G.pages[k]);
    ctx.fillStyle = G.pages[k] ? 'rgba(245,241,230,.8)' : 'rgba(245,241,230,.3)';
    setFont(ctx, 11, false); ctx.textAlign = 'center';
    ctx.fillText('' + (i + 1), x + 8, 40);
    if (G.overlay === k) {
      ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
      ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 6);
      ctx.beginPath(); ctx.arc(x + 8, 14, 17, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'left';
  ctx.restore();
  /* 残页余量 */
  if (G.overlay) {
    ctx.fillStyle = 'rgba(15,13,18,.55)';
    roundRect(ctx, W - 334, 76, 220, 10, 5); ctx.fill();
    ctx.fillStyle = getStyle(G.overlay).pal.accent;
    roundRect(ctx, W - 334, 76, 220 * clamp(G.overlayT / 8, 0, 1), 10, 5); ctx.fill();
    setFont(ctx, 13, false);
    ctx.fillStyle = 'rgba(245,241,230,.85)';
    ctx.fillText(getStyle(G.overlay).zh + '之境 · ' + G.overlayT.toFixed(1) + 's', W - 330, 104);
  }
  /* 区域名 */
  if (G.zone) {
    setFont(ctx, 15, false);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(245,241,230,.55)';
    ctx.fillText(G.zone.name, W - 30, G.overlay ? 130 : 90);
    ctx.textAlign = 'left';
  }
  /* Boss 血条 */
  if (G.bossOn && G.boss && G.boss.state !== 'intro') {
    const d = G.boss;
    ctx.fillStyle = 'rgba(15,13,18,.6)';
    roundRect(ctx, W / 2 - 280, 24, 560, 26, 8); ctx.fill();
    ctx.fillStyle = '#26252b';
    roundRect(ctx, W / 2 - 272, 28, 544 * clamp(d.hp / d.hpMax, 0, 1), 18, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,74,140,.8)';
    ctx.fillRect(W / 2, 24, 2, 26); /* 二阶段线 */
    setFont(ctx, 15, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(d.name + (d.phase === 2 ? '  【水墨 × 像素】' : ''), W / 2, 68);
    ctx.textAlign = 'left';
  }
  /* 交互提示 */
  if (G.promptStr) {
    ctx.textAlign = 'center';
    setFont(ctx, 18, true);
    ctx.fillStyle = 'rgba(15,13,18,.6)';
    const tw = ctx.measureText(G.promptStr).width + 60;
    roundRect(ctx, W / 2 - tw / 2, H - 96, tw, 34, 8); ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.fillText('[E] ', W / 2 - tw / 2 + 26, H - 73);
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(G.promptStr, W / 2 + 10, H - 73);
    ctx.textAlign = 'left';
  }
  /* Toast */
  if (G.toastT > 0) {
    const a = clamp(G.toastT, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    setFont(ctx, 19, true);
    ctx.fillStyle = 'rgba(15,13,18,.55)';
    const tw2 = ctx.measureText(G.toastStr).width + 44;
    roundRect(ctx, W / 2 - tw2 / 2, 110, tw2, 32, 8); ctx.fill();
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(G.toastStr, W / 2, 132);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  /* 受伤红闪 & 白闪 */
  if (G.hurtT > 0) {
    ctx.fillStyle = 'rgba(178,58,46,' + (G.hurtT * .8) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (G.flashT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + clamp(G.flashT * 2.4, 0, .8) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  /* 死亡提示 */
  if (p.dead) {
    ctx.fillStyle = 'rgba(12,10,16,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    setFont(ctx, 40, true);
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText('墨魂未散……', W / 2, H / 2 - 10);
    setFont(ctx, 18, false);
    ctx.fillStyle = 'rgba(245,241,230,.7)';
    ctx.fillText('残页与记忆不会消失。', W / 2, H / 2 + 30);
    ctx.textAlign = 'left';
  }
  if (G.paused) drawPanelMessage(ctx, '暂 停', 'P / Esc 继续 · H 操作说明');
  if (G.helpOpen) drawHelp(ctx);
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawPanelMessage(ctx, big, small) {
  ctx.fillStyle = 'rgba(12,10,16,.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  setFont(ctx, 44, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText(big, W / 2, H / 2 - 10);
  setFont(ctx, 18, false);
  ctx.fillStyle = 'rgba(245,241,230,.75)';
  ctx.fillText(small, W / 2, H / 2 + 34);
  ctx.textAlign = 'left';
}
function drawHelp(ctx) {
  ctx.fillStyle = 'rgba(12,10,16,.82)';
  ctx.fillRect(60, 60, W - 120, H - 120);
  ctx.textAlign = 'left';
  const L = [
    ['操 作', ''],
    ['A / D 或 ←→', '移动'],
    ['空格 / W', '跳跃（可二段跳）'],
    ['Shift', '冲刺（无敌帧，耗 8 墨魂）'],
    ['J', '轻击 —— 随画风变化'],
    ['K', '重击 —— 随画风变化'],
    ['E', '交互（残页 / 刻板 / 折叠）'],
    ['1 ~ 7', '展开对应画风残页（耗 25 墨魂，持续 8s，敌人也获得该画风之力）'],
    ['Q', '收回残页'],
    ['P / Esc · H', '暂停 · 本说明'],
    ['机 制', ''],
    ['水墨', '泼墨致盲；墨灵的攻击会晕染画面，沾墨会减速'],
    ['水彩', '敌人藏在水渍里（看涟漪）；湿色可弹跳；凝珠可照亮'],
    ['素描', '轻击擦掉线偶的手臂；被线条捆住时连打方向挣脱'],
    ['油画', '厚涂傀有色层，先削层再伤敌；刮刀可削墙'],
    ['版画', '会呼吸的是原版；分身一打就碎；刻痕使后续伤害翻倍'],
    ['像素', '哨兵闪白时受像素暴击(×3)；地形网格化'],
    ['剪纸', '纸鹤沿折线飞；剪刀可斩杀残血；E 折叠场景'],
    ['调试', 'M 下一境 · B 直达心相 · L 补墨魂 · 0 静音'],
  ];
  let y = 104;
  for (const [a, b] of L) {
    if (!b) { setFont(ctx, 22, true); ctx.fillStyle = '#ffd23e'; ctx.fillText(a, 100, y); y += 14; }
    else {
      setFont(ctx, 17, false);
      ctx.fillStyle = '#f5f1e6'; ctx.fillText(a, 100, y);
      ctx.fillStyle = 'rgba(245,241,230,.72)'; ctx.fillText(b, 300, y);
    }
    y += 27;
  }
  ctx.textAlign = 'center';
  setFont(ctx, 14, false);
  ctx.fillStyle = 'rgba(245,241,230,.5)';
  ctx.fillText('H 关闭', W / 2, H - 78);
  ctx.textAlign = 'left';
}

/* ---------- 对话 ---------- */
function drawDialog(ctx) {
  const d = G.dialog;
  if (!d) return;
  const bx = W / 2 - 470, by = H - 208, bw = 940, bh = 160;
  ctx.fillStyle = 'rgba(18,15,20,.88)';
  roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(245,241,230,.35)'; ctx.lineWidth = 2;
  roundRect(ctx, bx + 6, by + 6, bw - 12, bh - 12, 8); ctx.stroke();
  setFont(ctx, 22, true);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText(d.title, bx + 34, by + 40);
  setFont(ctx, 20, false);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText(d.lines[d.idx], bx + 34, by + 84);
  setFont(ctx, 14, false);
  ctx.fillStyle = 'rgba(245,241,230,.5)';
  ctx.fillText((d.idx + 1) + ' / ' + d.lines.length + ' · Enter ▸', bx + bw - 130, by + bh - 18);
}

/* ---------- 过场毛刷 ---------- */
function drawWipeFx(ctx) {
  const w = G.wipe;
  if (!w) return;
  const t = w.t, d = w.dur, pal = w.pal;
  for (let i = 0; i < 11; i++) {
    const yy = H * i / 11, hh = H / 11 + 2, del = i * .05;
    const c1 = easeT(clamp((t - del) / (d * .4), 0, 1));
    const r1 = easeT(clamp((t - del - d * .6) / (d * .35), 0, 1));
    const x0 = W * r1, wdt = W * c1 - W * r1;
    if (wdt <= 0) continue;
    ctx.fillStyle = i % 2 ? shade(pal.paper, -16) : pal.paper;
    ctx.globalAlpha = .97;
    ctx.fillRect(x0, yy, wdt, hh);
    ctx.fillStyle = shade(pal.paper, -46);
    ctx.fillRect(x0, yy + hh - 3, wdt, 3);
  }
  ctx.globalAlpha = 1;
  if (t > d * .42 && t < d * .88) {
    const a = Math.min(1, (t - d * .42) / .18) * Math.min(1, (d * .88 - t) / .18);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    setFont(ctx, 52, true);
    ctx.fillStyle = '#221f26';
    ctx.fillText(w.label, W / 2, H / 2 - 6);
    setFont(ctx, 19, false);
    ctx.fillStyle = 'rgba(60,54,46,.85)';
    ctx.fillText(w.zh + ' · ' + w.en, W / 2, H / 2 + 34);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

/* ---------- 抉择 ---------- */
function drawChoice(ctx) {
  ctx.fillStyle = 'rgba(12,10,16,.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  setFont(ctx, 40, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('墨龙散作七色流萤 —— 现在，轮到你落笔。', W / 2, 96);
  const cards = [
    { x: W / 2 - 310, title: '融合万象', sub: '七境归一，万象同纸', desc: '保留所有画风，让世界成为\n一幅永远在自我重绘的画卷。' },
    { x: W / 2 + 310, title: '归于一墨', sub: '万色收笔，一念归白', desc: '抹平所有风格，让世界回到\n最初的水墨与留白。' },
  ];
  for (let i = 0; i < 2; i++) {
    const c = cards[i], sel = G.choiceSel === i;
    const cx = c.x, cy = H / 2 + 40;
    ctx.save();
    if (sel) { ctx.translate(cx, cy); ctx.scale(1.04, 1.04); ctx.translate(-cx, -cy); }
    ctx.fillStyle = 'rgba(20,17,24,.92)';
    roundRect(ctx, cx - 220, cy - 170, 440, 340, 14); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd23e' : 'rgba(245,241,230,.3)';
    ctx.lineWidth = sel ? 3.5 : 1.5;
    roundRect(ctx, cx - 220, cy - 170, 440, 340, 14); ctx.stroke();
    if (i === 0) { /* 七色小条 */
      for (let j = 0; j < 7; j++) {
        ctx.fillStyle = getStyle(ZONE_ORDER[j]).pal.accent;
        ctx.globalAlpha = .85;
        ctx.fillRect(cx - 190 + j * 55, cy - 130, 44, 54);
      }
      ctx.globalAlpha = 1;
    } else { /* 圆相 */
      ctx.strokeStyle = '#f5f1e6'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy - 103, 40, -Math.PI * .5, Math.PI * 1.28); ctx.stroke();
    }
    setFont(ctx, 34, true);
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(c.title, cx, cy + 6);
    setFont(ctx, 17, false);
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(c.sub, cx, cy + 40);
    setFont(ctx, 16, false);
    ctx.fillStyle = 'rgba(245,241,230,.75)';
    const ds = c.desc.split('\n');
    ctx.fillText(ds[0], cx, cy + 82);
    ctx.fillText(ds[1], cx, cy + 110);
    if (sel) {
      setFont(ctx, 15, true);
      ctx.fillStyle = '#ffd23e';
      ctx.fillText('▲ Enter 确认 ▲', cx, cy + 150);
    }
    ctx.restore();
  }
  setFont(ctx, 16, false);
  ctx.fillStyle = 'rgba(245,241,230,.6)';
  ctx.fillText('← → 选择 · Enter 确认', W / 2, H - 36);
  ctx.textAlign = 'left';
}

/* ---------- 结局 ---------- */
const END_FUSE = [
  '你把七种笔触叠进同一幅画。',
  '晕染与排线、厚涂与折痕，在同一片天空下呼吸。',
  '画师在画里认出了每一个自己 ——',
  '包括那个不敢落笔的自己。',
  '新的一笔，落下了。',
];
const END_INK = [
  '你收回所有残页，世界安静成最初的留白。',
  '没有七种声音，也没有那段回忆。',
  '只是偶尔，雪白的纸面上会洇开一点说不清的颜色 ——',
  '像谁没忍住，哭了一下。',
];
function endingText(ctx, lines, title) {
  ctx.textAlign = 'center';
  for (let i = 0; i < lines.length; i++) {
    const at = 1.2 + i * 1.6;
    const a = clamp((G.endT - at) / .8, 0, 1);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    setFont(ctx, 26, false);
    ctx.fillStyle = '#2c2a2f';
    ctx.fillText(lines[i], W / 2, H * .3 + i * 52);
  }
  ctx.globalAlpha = 1;
  const ta = clamp((G.endT - 1.2 + lines.length * 1.6 + .6) / 1, 0, 1);
  if (ta > 0) {
    ctx.globalAlpha = ta;
    setFont(ctx, 42, true);
    ctx.fillStyle = '#b23a2e';
    ctx.fillText(title, W / 2, H * .3 + lines.length * 52 + 44);
    ctx.globalAlpha = 1;
  }
  if (G.endT > 4) {
    ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
    setFont(ctx, 16, false);
    ctx.fillStyle = 'rgba(44,42,47,.7)';
    ctx.fillText('Enter 继续', W / 2, H - 40);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}
function drawEndingFuse(ctx) {
  /* 七彩长卷 */
  for (let j = 0; j < 7; j++) {
    const st = getStyle(ZONE_ORDER[j]), pal = st.pal;
    const bx = W * j / 7 + Math.sin(G.t * .7 + j) * 12;
    ctx.fillStyle = pal.sky;
    ctx.fillRect(bx - 4, 0, W / 7 + 8, H);
    ctx.fillStyle = pal.far;
    ctx.globalAlpha = .8;
    ctx.beginPath();
    ctx.moveTo(bx - 4, H);
    ctx.quadraticCurveTo(bx + W / 14, H * .45 + Math.sin(G.t + j) * 30, bx + W / 7 + 4, H);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(bx + W / 14, 110 + Math.sin(G.t * 1.2 + j * 2) * 14, 26, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(0, 0, W, H);
  endingText(ctx, END_FUSE, '《墨境 · 千面合一》');
}
function drawEndingInk(ctx) {
  const pal = getStyle('ink').pal;
  ctx.fillStyle = pal.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(160,154,132,.3)';
  ctx.beginPath();
  ctx.moveTo(-50, H - 80);
  ctx.quadraticCurveTo(W * .4, H * .5, W * .8, H - 80);
  ctx.closePath(); ctx.fill();
  /* 圆相 */
  const pr = clamp((G.endT - .4) / 2.6, 0, 1);
  ctx.strokeStyle = '#222126'; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.lineWidth = 14 - k * 4;
    ctx.globalAlpha = .5 - k * .12;
    ctx.beginPath();
    ctx.arc(W / 2, H * .24, 110 + k * 3, -Math.PI * .42, -Math.PI * .42 + pr * Math.PI * 1.92);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  endingText(ctx, END_INK, '《墨境 · 归一》');
}
function drawEndcard(ctx) {
  const pal = getStyle('ink').pal;
  ctx.fillStyle = '#1a181f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.paper;
  ctx.globalAlpha = .06;
  tileTex(ctx, grainCv);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  setFont(ctx, 60, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('千面残章 · 完', W / 2, H * .3);
  for (let j = 0; j < 7; j++) {
    ctx.fillStyle = getStyle(ZONE_ORDER[j]).pal.accent;
    ctx.fillRect(W / 2 - 154 + j * 46, H * .3 + 26, 36, 10);
  }
  const mm = Math.floor(G.stats.t / 60), ss = Math.floor(G.stats.t % 60);
  setFont(ctx, 22, false);
  ctx.fillStyle = 'rgba(245,241,230,.85)';
  ctx.fillText('旅程用时  ' + mm + ' 分 ' + (ss < 10 ? '0' : '') + ss + ' 秒', W / 2, H * .48);
  ctx.fillText('击破  ' + G.stats.kills + ' · 陨落  ' + G.stats.deaths + ' · 残页  ' + Object.keys(G.pages).length + ' / 7', W / 2, H * .48 + 44);
  setFont(ctx, 19, false);
  ctx.fillStyle = 'rgba(245,241,230,.6)';
  ctx.fillText('每一次转身，世界都换了一副面孔。', W / 2, H * .66);
  ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
  setFont(ctx, 20, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('Enter — 返回标题', W / 2, H * .78);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ---------- GO ---------- */
boot();
