'use strict';
/* ============================================================
   《墨境：千面残章》audio.js —— 极简 WebAudio 合成音效 + 氛围底噪
   ============================================================ */
const Sfx = (() => {
  let ac = null, master = null, drone = null, muted = false;

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return; }
    master = ac.createGain();
    master.gain.value = muted ? 0 : .22;
    master.connect(ac.destination);
    startDrone();
  }
  function startDrone() {
    if (!ac) return;
    const g = ac.createGain(); g.gain.value = .03; g.connect(master);
    const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 165.2;
    const lfo = ac.createOscillator(); lfo.frequency.value = .07;
    const lg = ac.createGain(); lg.gain.value = 5;
    lfo.connect(lg); lg.connect(o1.frequency);
    o1.connect(g); o2.connect(g);
    o1.start(); o2.start(); lfo.start();
    drone = { o1, o2 };
  }
  function setMood(st) {
    if (!drone || !ac) return;
    const f = { ink: [110, 165], water: [98, 147], sketch: [123, 185], oil: [87, 131],
      print: [110, 220], pixel: [131, 196], paper: [104, 156] }[st] || [110, 165];
    drone.o1.frequency.setTargetAtTime(f[0], ac.currentTime, .8);
    drone.o2.frequency.setTargetAtTime(f[1], ac.currentTime, .8);
  }
  function beep(f, d, type, v, slide) {
    if (!ac || muted) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
    g.gain.setValueAtTime(v || .2, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + .02);
  }
  function noise(d, v, fq) {
    if (!ac || muted) return;
    const t = ac.currentTime;
    const n = Math.floor(ac.sampleRate * d);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fq || 900;
    const g = ac.createGain(); g.gain.value = v || .3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  function play(name) {
    if (!ac || muted) return;
    switch (name) {
      case 'jump': beep(300, .12, 'square', .11, 520); break;
      case 'djump': beep(420, .12, 'square', .11, 680); break;
      case 'dash': noise(.14, .15, 1600); break;
      case 'swing': noise(.06, .08, 2400); break;
      case 'hit': noise(.08, .24, 700); beep(180, .07, 'triangle', .14, 90); break;
      case 'crit': beep(880, .1, 'square', .16, 1320); noise(.1, .18, 2400); break;
      case 'hurt': beep(160, .25, 'sawtooth', .18, 70); noise(.2, .18, 500); break;
      case 'kill': noise(.25, .28, 900); beep(240, .2, 'triangle', .14, 60); break;
      case 'shoot': beep(700, .06, 'square', .08, 980); break;
      case 'wave': noise(.2, .18, 400); beep(140, .2, 'sine', .14, 80); break;
      case 'erase': noise(.18, .2, 3200); break;
      case 'scrape': noise(.2, .22, 1400); beep(90, .15, 'sawtooth', .1, 60); break;
      case 'switch': beep(520, .16, 'sine', .16, 1040); beep(780, .22, 'sine', .11, 1560); break;
      case 'deny': beep(140, .12, 'square', .11, 100); break;
      case 'shrine': beep(523, .3, 'sine', .15, 1046); beep(659, .45, 'sine', .11, 1318); break;
      case 'select': beep(660, .08, 'square', .13, 880); break;
      case 'roar': noise(.7, .35, 300); beep(70, .7, 'sawtooth', .22, 40); break;
      case 'boom': noise(.4, .35, 500); break;
      case 'fold': noise(.15, .18, 2000); beep(440, .1, 'triangle', .09, 660); break;
      case 'bounce': beep(260, .16, 'sine', .14, 620); break;
    }
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : .22;
    return muted;
  }
  return { ensure, play, setMood, toggleMute };
})();
