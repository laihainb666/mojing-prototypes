'use strict';
/* ============================================================
   《墨境：千面残章 · 万具回廊》main2.js —— 状态机 / 选关 / HUD / 结局
   ============================================================ */

/* ---------- 启动 ---------- */
function boot() {
  const cvs = document.getElementById('cv');
  G.cvs = cvs;
  G.ctx = cvs.getContext('2d');
  initSurfaces();
  Mouse.bind(cvs);
  loadProgress();
  startLevel(LEVELS[0]);
  G.state = 'title'; G.titleT = 0; G.titleIdx = -1;
  window.addEventListener('resize', fit);
  fit();
  requestAnimationFrame(loop);
}
function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  G.cvs.style.width = Math.floor(W * s) + 'px';
  G.cvs.style.height = Math.floor(H * s) + 'px';
}
let lastTs = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const now = ts / 1000;
  let dt = Math.min(now - (lastTs || now - .016), .033);
  lastTs = now;
  G.fps = lerp(G.fps || 60, 1 / Math.max(dt, .001), .06);
  if (G.dbg.slow && G.state === 'play') dt *= .35;
  G.dt = dt; G.t += dt; G.frame++;
  if (G.freeze > 0) { G.freeze -= dt; dt = 0; }
  update(dt);
  render();
  In.clear();
  Mouse.click = false;
}
function update(dt) {
  if (In.hit('debug')) { G.dbg.open = !G.dbg.open; Sfx.play('select'); }
  dbgPanelClicks();
  switch (G.state) {
    case 'title': {
      G.titleT += dt;
      if (G.titleT > 3.4) {
        G.titleT = 0;
        G.titleIdx = (G.titleIdx + 1) % ZONE_ORDER.length;
        G.level.style = ZONE_ORDER[G.titleIdx] === 'blank' ? 'ink' : ZONE_ORDER[G.titleIdx];
        G.zone = { style: G.level.style };
        Sfx.setMood(G.level.style);
      }
      if (G.player) G.player.anim += dt;
      G.cam.x = 60 + Math.sin(G.t * .1) * 60; G.cam.y = 40;
      if (In.hit('start')) { Sfx.ensure(); G.state = 'map'; Sfx.play('select'); }
      break;
    }
    case 'map': {
      const n = LEVELS.length + 1;
      if (In.hit('right')) { G.mapSel = (G.mapSel + 1) % n; Sfx.play('select'); }
      if (In.hit('left')) { G.mapSel = (G.mapSel + n - 1) % n; Sfx.play('select'); }
      if (In.hit('down')) { G.mapSel = (G.mapSel + 4) % n; Sfx.play('select'); }
      if (In.hit('up')) { G.mapSel = (G.mapSel + n - 4) % n; Sfx.play('select'); }
      if (In.hit('start')) {
        const clearedCount = Object.keys(G.progress).length;
        if (G.mapSel < LEVELS.length) {
          if (mapUnlocked(G.mapSel)) { startLevel(LEVELS[G.mapSel]); }
          else { Sfx.play('deny'); toast('先通过前面的关卡'); }
        } else {
          if (clearedCount >= 5 || G.progress['12-B']) { startLevel(makeEndless(Date.now() % 100000)); }
          else { Sfx.play('deny'); toast('通过任意 5 关后解锁无尽回廊'); }
        }
      }
      break;
    }
    case 'play': {
      /* 退出/静音在暂停与帮助时也生效（修复“回不去”） */
      if (In.hit('dbgzone')) { G.state = 'map'; G.paused = false; G.helpOpen = false; Sfx.play('select'); toast('已退出关卡'); break; }
      if (In.hit('mute')) toast(Sfx.toggleMute() ? '已静音' : '声音开启');
      if (In.hit('help')) G.helpOpen = !G.helpOpen;
      if (In.hit('pause')) G.paused = !G.paused;
      if (G.helpOpen || G.paused) break;
      if (G.wipe) { G.wipe.t += dt; if (G.wipe.t > G.wipe.dur) G.wipe = null; }
      G.stats.t += dt;
      /* 工具切换 */
      for (let i = 0; i < 4; i++) if (In.hit('page' + (i + 1))) {
        if (G.tools[i]) { if (G.toolIdx !== i) { G.toolIdx = i; Sfx.play('select'); } }
        else Sfx.play('deny');
      }
      if (In.hit('cancel')) { G.toolIdx = (G.toolIdx + 1) % G.tools.length; Sfx.play('select'); }
      updateMechanics(dt);
      if (G.state !== 'play') break;
      updateDrawing(dt);
      updateStrokes(dt);
      updatePlayer(dt);
      updateEnemies(dt);
      updateProjs(dt);
      if (G.level.boss && !G.bossOn && !G.bossDead && G.player.x > G.worldW - 1050) startBoss2();
      updateBoss2(dt);
      updateParts(dt);
      updateTexts(dt);
      updateFx(dt);
      updateCam(dt);
      G.hurtT -= dt; G.flashT -= dt; G.toastT -= dt;
      break;
    }
    case 'clear':
      G.clearT += dt;
      if (In.hit('start') || G.clearT > 4) { G.state = 'map'; Sfx.play('select'); }
      break;
    case 'win':
      G.winT += dt;
      updateParts(dt);
      if (In.hit('start') && G.winT > 5) { G.state = 'map'; }
      if (G.winT > 18) G.state = 'map';
      break;
    case 'exscore':
      if (In.hit('start') || In.hit('restart')) { G.state = 'map'; Sfx.play('select'); }
      break;
  }
}
function mapUnlocked(i) {
  if (i === 0) return true;
  return !!G.progress[LEVELS[i - 1].id];
}
/* ---------- 存档（localStorage） ---------- */
function saveProgress() {
  try { localStorage.setItem('mojing2_save', JSON.stringify({ progress: G.progress, best: G.bestScore || 0 })); } catch (e) {}
}
function loadProgress() {
  try {
    const s = JSON.parse(localStorage.getItem('mojing2_save') || 'null');
    if (s) { G.progress = s.progress || {}; G.bestScore = s.best || 0; }
  } catch (e) {}
}
function wipeSave() {
  try { localStorage.removeItem('mojing2_save'); } catch (e) {}
  G.progress = {}; G.bestScore = 0;
  toast('存档已清空');
}
/* ---------- 调试面板 ---------- */
function dbgRows() {
  const d = G.dbg;
  const tg = (label, key) => ({ label: label + '：' + (d[key] ? '开' : '关'), on: d[key], act: () => { d[key] = !d[key]; } });
  const rows = [
    tg('无敌', 'inv'), tg('一击必杀', 'ohk'), tg('无限墨量', 'ink'),
    tg('显示碰撞盒', 'boxes'), tg('慢动作', 'slow'),
  ];
  const lv = LEVELS.findIndex(l => l.id === (G.level && G.level.id));
  if (G.state === 'play' && G.level && !G.level.endless) {
    rows.push({ label: '◆ 直接过关', act: () => clearLevel() });
    if (lv > 0) rows.push({ label: '◆ 上一关', act: () => startLevel(LEVELS[lv - 1]) });
    if (lv < LEVELS.length - 1) rows.push({ label: '◆ 下一关', act: () => startLevel(LEVELS[lv + 1]) });
    if (G.boss && G.bossOn) rows.push({ label: '◆ Boss 秒杀', act: () => { G.boss.hp = 1; hitBoss(5, {}); } });
  } else if (G.state === 'map') {
    rows.push({ label: '◆ 解锁全部关卡', act: () => { LEVELS.forEach(l => G.progress[l.id] = true); saveProgress(); } });
  }
  rows.push({ label: '◆ 回选关地图', act: () => { G.state = 'map'; G.paused = false; G.helpOpen = false; } });
  rows.push({ label: '◆ 清空存档', act: () => wipeSave() });
  return rows;
}
function dbgPanelClicks() {
  if (!G.dbg.open || !Mouse.click) return;
  const rows = dbgRows();
  const x0 = W - 258, y0 = 96, rh = 30;
  for (let i = 0; i < rows.length; i++) {
    const ry = y0 + 46 + i * rh;
    if (Mouse.x >= x0 + 12 && Mouse.x <= x0 + 234 && Mouse.y >= ry && Mouse.y <= ry + rh - 6) {
      rows[i].act(); Sfx.play('select');
      return;
    }
  }
}
function drawDbgPanel(ctx) {
  if (!G.dbg.open) return;
  const rows = dbgRows();
  const x0 = W - 258, y0 = 96, w2 = 246, rh = 30;
  ctx.save();
  ctx.fillStyle = 'rgba(10,9,14,.88)';
  roundRect(ctx, x0, y0, w2, 52 + rows.length * rh + 14, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,.55)'; ctx.lineWidth = 1.5;
  roundRect(ctx, x0, y0, w2, 52 + rows.length * rh + 14, 10); ctx.stroke();
  setFont(ctx, 16, true);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('调试面板 · ' + Math.round(G.fps) + ' FPS', x0 + 14, y0 + 26);
  setFont(ctx, 11, false);
  ctx.fillStyle = 'rgba(245,241,230,.5)';
  ctx.fillText('` 收起 · G.level=' + (G.level ? G.level.id : '-'), x0 + 14, y0 + 44);
  for (let i = 0; i < rows.length; i++) {
    const ry = y0 + 46 + i * rh;
    const hov = Mouse.inside && Mouse.x >= x0 + 12 && Mouse.x <= x0 + 234 && Mouse.y >= ry && Mouse.y <= ry + rh - 6;
    ctx.fillStyle = rows[i].on ? 'rgba(159,216,168,.2)' : hov ? 'rgba(255,210,62,.12)' : 'rgba(245,241,230,.05)';
    roundRect(ctx, x0 + 12, ry, 222, rh - 6, 6); ctx.fill();
    setFont(ctx, 14, rows[i].on);
    ctx.fillStyle = rows[i].on ? '#9fd8a8' : hov ? '#ffd23e' : 'rgba(245,241,230,.8)';
    ctx.fillText(rows[i].label, x0 + 22, ry + 17);
  }
  ctx.restore();
}
function endEndless() {
  G.endScore = Math.floor(G.stats.t) + G.stats.kills * 10;
  if (G.endScore > (G.bestScore || 0)) { G.bestScore = G.endScore; saveProgress(); }
  G.state = 'exscore';
  Sfx.play('boom');
}

/* ---------- 渲染 ---------- */
function render() {
  const ctx = G.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  switch (G.state) {
    case 'title': renderTitle(ctx); break;
    case 'map': renderMap(ctx); break;
    case 'play':
      renderScene(ctx);
      drawHUD(ctx);
      drawWipeFx(ctx);
      break;
    case 'clear':
      renderScene(ctx);
      drawClear(ctx);
      break;
    case 'win': drawWin(ctx); break;
    case 'exscore': drawExScore(ctx); break;
  }
}

/* ---------- 标题 ---------- */
function renderTitle(ctx) {
  renderScene(ctx);
  ctx.fillStyle = 'rgba(12,10,16,.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  setFont(ctx, 78, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.strokeStyle = 'rgba(20,16,24,.9)'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
  ctx.strokeText('墨境 · 万具回廊', W / 2, H * .33);
  ctx.fillText('墨境 · 万具回廊', W / 2, H * .33);
  setFont(ctx, 34, true);
  ctx.strokeText('千 面 残 章', W / 2, H * .33 + 58);
  ctx.fillText('千 面 残 章', W / 2, H * .33 + 58);
  ctx.fillStyle = '#b23a2e';
  ctx.fillRect(W / 2 + 258, H * .33 - 52, 46, 46);
  ctx.fillStyle = '#f5f1e6'; setFont(ctx, 21, true);
  ctx.fillText('万具', W / 2 + 281, H * .33 - 22);
  setFont(ctx, 21, false);
  ctx.fillStyle = 'rgba(245,241,230,.85)';
  ctx.fillText('十种绘画工具 · 每关一个无法复制的创意 · 画风即规则', W / 2, H * .56);
  setFont(ctx, 26, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
  ctx.fillText('—— 按 Enter 推开回廊之门 ——', W / 2, H * .72);
  ctx.globalAlpha = 1;
  setFont(ctx, 15, false);
  ctx.fillStyle = 'rgba(245,241,230,.6)';
  ctx.fillText('A/D 移动 · 空格 跳跃 · Shift 冲刺 · J/K 工具技 · 左键 作画/擦除 · 1-4 换工具 · H 帮助', W / 2, H - 26);
  ctx.textAlign = 'left';
}

/* ---------- 选关地图 ---------- */
function renderMap(ctx) {
  ctx.fillStyle = '#17151b';
  ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = .06; tileTex(ctx, grainCv); ctx.restore();
  ctx.textAlign = 'center';
  setFont(ctx, 42, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('万 具 回 廊', W / 2, 86);
  setFont(ctx, 16, false);
  ctx.fillStyle = 'rgba(245,241,230,.55)';
  ctx.fillText('←→↑↓ 选择 · Enter 进入 · 已通关 ' + Object.keys(G.progress).length + ' / ' + LEVELS.length, W / 2, 120);
  const cols = 4, cw = 260, chh = 158, gx = W / 2 - (cols * cw + 3 * 18) / 2, gy = 158;
  for (let i = 0; i <= LEVELS.length; i++) {
    const isEndless = i === LEVELS.length;
    const col = i % cols, row = Math.floor(i / cols);
    const x = gx + col * (cw + 18), y = gy + row * (chh + 18);
    const sel = G.mapSel === i;
    const def = isEndless ? null : LEVELS[i];
    const cleared = !isEndless && G.progress[def.id];
    const unlocked = isEndless ? (Object.keys(G.progress).length >= 5 || G.progress['12-B']) : mapUnlocked(i);
    const st = getStyle(isEndless ? 'ink' : def.style);
    ctx.save();
    if (sel) { ctx.translate(x + cw / 2, y + chh / 2); ctx.scale(1.04, 1.04); ctx.translate(-x - cw / 2, -y - chh / 2); }
    ctx.fillStyle = sel ? 'rgba(38,34,44,.98)' : 'rgba(28,25,33,.95)';
    roundRect(ctx, x, y, cw, chh, 12); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd23e' : 'rgba(245,241,230,.18)';
    ctx.lineWidth = sel ? 3 : 1.4;
    roundRect(ctx, x, y, cw, chh, 12); ctx.stroke();
    /* 画风色块 */
    ctx.fillStyle = st.pal.accent;
    ctx.fillRect(x + 16, y + 16, 40, 40);
    ctx.fillStyle = st.pal.ground;
    ctx.fillRect(x + 16, y + 40, 40, 16);
    setFont(ctx, 15, true);
    ctx.textAlign = 'left';
    ctx.fillStyle = cleared ? '#9fd8a8' : unlocked ? '#f5f1e6' : 'rgba(245,241,230,.35)';
    ctx.fillText(isEndless ? '∞ 无尽回廊' : def.id + ' · ' + def.name, x + 68, y + 32);
    setFont(ctx, 12.5, false);
    ctx.fillStyle = 'rgba(245,241,230,.5)';
    ctx.fillText(isEndless ? '随机画风 · 冲击高分' : def.ch, x + 68, y + 52);
    /* 核心创意一行 */
    setFont(ctx, 13.5, false);
    ctx.fillStyle = unlocked ? 'rgba(255,210,62,.8)' : 'rgba(245,241,230,.28)';
    const tip = isEndless ? (G.bestScore ? '最高分 ' + G.bestScore + ' · 通关任意 5 关解锁' : '通关任意 5 关解锁') : def.tip;
    wrapText(ctx, tip, x + 18, y + 84, cw - 36, 18);
    if (cleared) { setFont(ctx, 13, true); ctx.fillStyle = '#9fd8a8'; ctx.fillText('✔ 已通关', x + 18, y + chh - 16); }
    else if (!unlocked) { setFont(ctx, 16, true); ctx.fillStyle = 'rgba(245,241,230,.35)'; ctx.fillText('🔒', x + 18, y + chh - 16); }
    if (sel) {
      setFont(ctx, 13, true);
      ctx.fillStyle = '#ffd23e';
      ctx.textAlign = 'center';
      ctx.fillText('Enter 开始', x + cw / 2, y + chh - 16);
    }
    ctx.restore();
  }
  ctx.textAlign = 'left';
}
function wrapText(ctx, str, x, y, maxW, lh) {
  let line = '', yy = y;
  for (const ch of str) {
    if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, yy); line = ch; yy += lh; }
    else line += ch;
  }
  if (line) ctx.fillText(line, x, yy);
}

/* ---------- HUD ---------- */
function drawHUD(ctx) {
  const p = G.player;
  if (!p) return;
  const pal = getStyle(curStyle()).pal;
  /* 血量 + 墨量 */
  ctx.save();
  ctx.translate(26, 26);
  ctx.fillStyle = 'rgba(15,13,18,.55)';
  roundRect(ctx, -10, -8, 226, 64, 10); ctx.fill();
  setFont(ctx, 13, false);
  ctx.fillStyle = 'rgba(245,241,230,.9)';
  ctx.fillText('HP', 0, 6);
  ctx.fillStyle = 'rgba(245,241,230,.25)';
  roundRect(ctx, 28, -4, 160, 11, 5); ctx.fill();
  ctx.fillStyle = p.hp > 35 ? '#9fd8a8' : '#e05a4a';
  roundRect(ctx, 28, -4, 160 * clamp(p.hp / G.hpMax, 0, 1), 11, 5); ctx.fill();
  ctx.fillStyle = 'rgba(245,241,230,.9)';
  ctx.fillText('墨量', 0, 26);
  ctx.fillStyle = 'rgba(245,241,230,.25)';
  roundRect(ctx, 28, 16, 160, 11, 5); ctx.fill();
  ctx.fillStyle = '#7fb0c8';
  roundRect(ctx, 28, 16, 160 * clamp(G.ink / G.inkMax, 0, 1), 11, 5); ctx.fill();
  ctx.fillStyle = 'rgba(245,241,230,.55)'; setFont(ctx, 11, false);
  ctx.fillText(G.level ? G.level.ch : '', 0, 48);
  ctx.restore();
  /* 工具栏 */
  ctx.save();
  ctx.translate(W / 2 - 4 * 74, H - 74);
  ctx.fillStyle = 'rgba(15,13,18,.6)';
  roundRect(ctx, -10, -10, 4 * 74 + 20, 66, 10); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const key = G.tools[i];
    const tl = TOOLS[key];
    const x = i * 74 + 6;
    const active = G.toolIdx === i;
    ctx.fillStyle = active ? 'rgba(255,210,62,.16)' : 'rgba(245,241,230,.05)';
    roundRect(ctx, x, 0, 64, 46, 8); ctx.fill();
    if (active) { ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2; roundRect(ctx, x, 0, 64, 46, 8); ctx.stroke(); }
    ctx.fillStyle = tl.col;
    roundRect(ctx, x + 8, 8, 22, 22, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5;
    roundRect(ctx, x + 8, 8, 22, 22, 5); ctx.stroke();
    setFont(ctx, 14, true);
    ctx.fillStyle = active ? '#f5f1e6' : 'rgba(245,241,230,.6)';
    ctx.fillText(tl.name, x + 36, 18);
    setFont(ctx, 11, false);
    ctx.fillStyle = 'rgba(245,241,230,.45)';
    ctx.fillText('' + (i + 1), x + 6, 42);
  }
  ctx.restore();
  /* 当前工具提示 */
  setFont(ctx, 13.5, false);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245,241,230,.75)';
  ctx.fillText(tool().tip, W / 2, H - 86);
  ctx.textAlign = 'left';
  /* 关卡名 */
  setFont(ctx, 15, true);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(245,241,230,.7)';
  ctx.fillText((G.level.endless ? '得分 ' + (Math.floor(G.stats.t) + G.stats.kills * 10) : G.level.ch + ' · ' + G.level.name), W - 28, 36);
  if (G.mirror) { ctx.fillStyle = '#7fb0c8'; ctx.fillText('倒影世界', W - 28, 60); }
  ctx.textAlign = 'left';
  /* Boss 血条 */
  if (G.bossOn && G.boss && G.boss.state !== 'intro') {
    const d = G.boss;
    ctx.fillStyle = 'rgba(15,13,18,.6)';
    roundRect(ctx, W / 2 - 270, 24, 540, 24, 8); ctx.fill();
    ctx.fillStyle = '#26252b';
    roundRect(ctx, W / 2 - 262, 28, 524 * clamp(d.hp / d.hpMax, 0, 1), 16, 6); ctx.fill();
    setFont(ctx, 15, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(d.name + ' · ' + getStyle(d.style).zh, W / 2, 66);
    ctx.textAlign = 'left';
  }
  /* 回合制遮罩提示 */
  if (G.turn) {
    const t = G.turn;
    /* 网格与陷坑标记 */
    ctx.save();
    ctx.strokeStyle = 'rgba(142,203,232,.28)'; ctx.lineWidth = 1;
    for (let wx = t.x0; wx < G.worldW; wx += t.cell) {
      ctx.beginPath(); ctx.moveTo(wx, GB - 3 * t.cell); ctx.lineTo(wx, GB); ctx.stroke();
    }
    for (const [a, b] of t.pits) {
      ctx.fillStyle = 'rgba(255,74,140,.18)';
      ctx.fillRect(a, GB - 14, b - a, 18);
      ctx.strokeStyle = 'rgba(255,74,140,.7)';
      ctx.strokeRect(a, GB - 14, b - a, 18);
    }
    /* 敌我格子标记 */
    for (const e of G.enemies) if (!e.dead && e.type === 'tele') {
      ctx.strokeStyle = 'rgba(255,74,140,.8)'; ctx.lineWidth = 2;
      ctx.strokeRect(e.x - 26, e.y - 74, 52, 78);
    }
    ctx.strokeStyle = 'rgba(142,203,232,.9)';
    ctx.strokeRect(G.player.x - 24, G.player.y - 76, 48, 80);
    ctx.restore();
    ctx.textAlign = 'center';
    setFont(ctx, 20, true);
    ctx.fillStyle = 'rgba(255,210,62,.9)';
    ctx.fillText('回合制模式 —— 步数 ' + t.steps + ' · A/D 移动 · 空格 跃进(跨1格) · J 攻击 · E 蓄势', W / 2, 96);
    ctx.textAlign = 'left';
  }
  if (G.promptStr) {
    ctx.textAlign = 'center';
    setFont(ctx, 17, true);
    ctx.fillStyle = 'rgba(15,13,18,.6)';
    const tw = ctx.measureText(G.promptStr).width + 50;
    roundRect(ctx, W / 2 - tw / 2, H - 132, tw, 32, 8); ctx.fill();
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(G.promptStr, W / 2, H - 110);
    ctx.textAlign = 'left';
  }
  if (G.toastT > 0) {
    const a = clamp(G.toastT, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    setFont(ctx, 18, true);
    ctx.fillStyle = 'rgba(15,13,18,.55)';
    const tw2 = ctx.measureText(G.toastStr).width + 44;
    roundRect(ctx, W / 2 - tw2 / 2, 108, tw2, 32, 8); ctx.fill();
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(G.toastStr, W / 2, 130);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  if (G.hurtT > 0) { ctx.fillStyle = 'rgba(178,58,46,' + (G.hurtT * .8) + ')'; ctx.fillRect(0, 0, W, H); }
  if (G.flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(G.flashT * 2.4, 0, .8) + ')'; ctx.fillRect(0, 0, W, H); }
  /* 倒影蓝调 */
  if (G.mirror) { ctx.fillStyle = 'rgba(70,120,160,.13)'; ctx.fillRect(0, 0, W, H); }
  if (p.dead) {
    ctx.fillStyle = 'rgba(12,10,16,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    setFont(ctx, 38, true);
    ctx.fillStyle = '#f5f1e6';
    ctx.fillText(G.level.endless ? '回廊合上了……' : '墨迹未干……', W / 2, H / 2 - 10);
    ctx.textAlign = 'left';
  }
  if (G.paused) drawMsg(ctx, '暂 停', 'P 继续 · M 离开关卡 · H 帮助 · ` 调试');
  if (G.helpOpen) drawHelp2(ctx);
  drawDbgPanel(ctx);
}
function drawMsg(ctx, big, small) {
  ctx.fillStyle = 'rgba(12,10,16,.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  setFont(ctx, 42, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText(big, W / 2, H / 2 - 10);
  setFont(ctx, 17, false);
  ctx.fillStyle = 'rgba(245,241,230,.75)';
  ctx.fillText(small, W / 2, H / 2 + 32);
  ctx.textAlign = 'left';
}
function drawHelp2(ctx) {
  ctx.fillStyle = 'rgba(12,10,16,.85)';
  ctx.fillRect(70, 54, W - 140, H - 108);
  ctx.textAlign = 'left';
  const L = [
    ['操 作', ''],
    ['A / D', '移动 · 空格 跳跃（二段） · Shift 冲刺'],
    ['鼠标左键', '按当前工具作画 / 擦除 / 刮削 / 挤喷'],
    ['J / K', '工具轻技 / 重技（每种工具不同）'],
    ['1 ~ 4', '切换携带的工具 · Q 顺时针轮换'],
    ['E', '交互（折叠墙 / 潜入倒影）'],
    ['万具匣', ''],
    ['毛笔', '画墨台（5秒褪色）· 墨浪'],
    ['铅笔', '画永久细线 · 掷笔 · 可连成电路'],
    ['炭条', '画脆台（踩上即碎）· 烟雾致盲'],
    ['橡皮擦', '擦笔迹/纸墙/敌弹 · 对素描敌×3'],
    ['刮刀', '削层破甲 · 左键刮开厚涂'],
    ['海绵', 'K 吸收液体蓄水 · 左键挤喷水炮'],
    ['马克笔', '标记弱点（受伤×2）· 群体标记'],
    ['剪刀', '斩杀残血纸敌 · 剪断封印'],
    ['图章', 'K 盖章召唤画灵（25 墨量）'],
    ['荧光笔', '画光线照明 · K 脉冲照亮全图'],
    ['其他', ''],
    ['` / F2', '调试面板（无敌 · 秒杀 · 无限墨 · 碰撞盒 · 慢动作 · 跳关）'],
    ['H 关闭 · P 暂停 · M 离开关卡 · 0 静音', ''],
  ];
  let y = 92;
  for (const [a, b] of L) {
    if (!b) { setFont(ctx, 20, true); ctx.fillStyle = '#ffd23e'; ctx.fillText(a, 104, y); y += 8; }
    else {
      setFont(ctx, 16, false);
      ctx.fillStyle = '#f5f1e6'; ctx.fillText(a, 104, y);
      ctx.fillStyle = 'rgba(245,241,230,.7)'; ctx.fillText(b, 260, y);
    }
    y += 26;
  }
}

/* ---------- 过关 / 结局 ---------- */
function drawClear(ctx) {
  const a = clamp(G.clearT / .5, 0, 1);
  ctx.fillStyle = 'rgba(12,10,16,' + a * .55 + ')';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.globalAlpha = a;
  setFont(ctx, 52, true);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('通 过', W / 2, H / 2 - 40);
  setFont(ctx, 24, false);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText(G.level.ch + ' · ' + G.level.name, W / 2, H / 2 + 8);
  setFont(ctx, 17, false);
  ctx.fillStyle = 'rgba(245,241,230,.7)';
  ctx.fillText('用时 ' + Math.floor(G.stats.t) + ' 秒 · 击破 ' + G.stats.kills, W / 2, H / 2 + 46);
  ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
  setFont(ctx, 16, true);
  ctx.fillText('Enter 返回回廊', W / 2, H / 2 + 96);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
function drawExScore(ctx) {
  ctx.fillStyle = 'rgba(12,10,16,.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  setFont(ctx, 46, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('无尽回廊 · 合上了', W / 2, H * .34);
  setFont(ctx, 60, true);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('' + G.endScore, W / 2, H * .5);
  setFont(ctx, 18, false);
  ctx.fillStyle = 'rgba(245,241,230,.7)';
  ctx.fillText('存活 ' + Math.floor(G.stats.t) + ' 秒 · 击破 ' + G.stats.kills + '（每击 10 分）', W / 2, H * .58);
  ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
  setFont(ctx, 17, true);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText('Enter 再入回廊', W / 2, H * .72);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
/* 终局：重新画出一个宇宙 */
function drawWin(ctx) {
  const t = G.winT;
  /* 纯白画布 */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  /* 七色笔触逐层画出宇宙 */
  const st = getStyle('ink').pal;
  const cols = ['#b23a2e', '#e8836a', '#4a4a4a', '#d9a13b', '#c2352a', '#8ecbe8', '#e8b04a'];
  for (let i = 0; i < 7; i++) {
    const at = .8 + i * 1.1;
    const pr = clamp((t - at) / 1.2, 0, 1);
    if (pr <= 0) continue;
    ctx.save();
    ctx.globalAlpha = .85;
    ctx.strokeStyle = cols[i];
    ctx.lineWidth = 14 - i;
    ctx.lineCap = 'round';
    const cx = W / 2 + Math.cos(i * 2.1) * 160, cy = H * .42 + Math.sin(i * 1.7) * 90;
    ctx.beginPath();
    ctx.arc(cx, cy, 40 + i * 16, -Math.PI / 2, -Math.PI / 2 + pr * TAU * (.6 + (i % 3) * .12));
    ctx.stroke();
    ctx.restore();
  }
  /* 山与日 */
  const at2 = 8.6, pr2 = clamp((t - at2) / 1.6, 0, 1);
  if (pr2 > 0) {
    ctx.globalAlpha = pr2;
    ctx.fillStyle = '#26252b';
    ctx.beginPath();
    ctx.moveTo(W * .12, H * .8);
    ctx.quadraticCurveTo(W * .42, H * (.8 - .34 * pr2), W * .78, H * .8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b23a2e';
    ctx.beginPath(); ctx.arc(W * .8, H * .3, 34 * pr2, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  /* 文本 */
  ctx.textAlign = 'center';
  const lines = [
    ['空白不再可怕 —— 你握住了全部二十四具。', 10.4],
    ['水墨做骨，水彩做血，素描做光，油画做山。', 11.8],
    ['每一个被安放好的自己，都在画里呼吸。', 13.2],
  ];
  for (const [str, at] of lines) {
    const a = clamp((t - at) / .9, 0, 1);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    setFont(ctx, 24, false);
    ctx.fillStyle = '#2c2a2f';
    ctx.fillText(str, W / 2, H * .66 + (at - 10.4) * 34);
  }
  ctx.globalAlpha = 1;
  const ta = clamp((t - 14.6) / 1, 0, 1);
  if (ta > 0) {
    ctx.globalAlpha = ta;
    setFont(ctx, 40, true);
    ctx.fillStyle = '#b23a2e';
    ctx.fillText('《墨境 · 万象重开》', W / 2, H * .86);
    ctx.globalAlpha = 1;
  }
  if (t > 5) {
    ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 3);
    setFont(ctx, 15, false);
    ctx.fillStyle = 'rgba(44,42,47,.6)';
    ctx.fillText('Enter 返回回廊', W / 2, H - 30);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

/* ---------- 过场毛刷 ---------- */
function drawWipeFx(ctx) {
  const w = G.wipe;
  if (!w) return;
  const t = w.t, d = w.dur, pal = w.pal;
  for (let i = 0; i < 11; i++) {
    const yy = H * i / 11, hh = H / 11 + 2, del = i * .045;
    const c1 = easeT(clamp((t - del) / (d * .4), 0, 1));
    const r1 = easeT(clamp((t - del - d * .6) / (d * .35), 0, 1));
    const x0 = W * r1, wdt = W * c1 - W * r1;
    if (wdt <= 0) continue;
    ctx.fillStyle = i % 2 ? shade(pal.paper, -16) : pal.paper;
    ctx.globalAlpha = .97;
    ctx.fillRect(x0, yy, wdt, hh);
  }
  ctx.globalAlpha = 1;
  if (t > d * .42 && t < d * .88) {
    const a = Math.min(1, (t - d * .42) / .18) * Math.min(1, (d * .88 - t) / .18);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    setFont(ctx, 44, true);
    ctx.fillStyle = '#221f26';
    ctx.fillText(w.label, W / 2, H / 2 - 6);
    setFont(ctx, 17, false);
    ctx.fillStyle = 'rgba(60,54,46,.85)';
    ctx.fillText(w.en, W / 2, H / 2 + 32);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

/* ---------- GO ---------- */
boot();
