/* music.js — the voyage theme. An original tune played live by the phone (no music files): a marimba melody over
   soft pads, a plucked bass and a shaker, with the sea washing underneath and a gull now and then.
   It starts when the voyage map opens and fades out when she leaves it. The 🎵 button on the map turns it off and on. */
(function () {
  'use strict';
  const A = window.AE;
  const M = (A.music = { playing: false });
  let ac = null, out = null, timer = null, nextT = 0, step = 0, loop = 0, sea = null, gullT = null;
  const BPM = 92, E8 = 60 / BPM / 2; // one eighth note
  const f = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // [midi, eighths]; null = rest. Two eight-bar phrases in D major.
  const MEL = [
    [69, 2], [66, 1], [69, 1], [74, 4], [73, 2], [71, 2], [69, 2], [66, 2], [67, 2], [69, 2], [71, 2], [74, 2], [73, 4], [69, 4],
    [69, 2], [66, 1], [69, 1], [74, 2], [76, 2], [78, 2], [76, 2], [74, 2], [71, 2], [71, 2], [74, 2], [76, 3], [73, 1], [74, 8],
    [71, 1], [71, 1], [74, 2], [71, 2], [67, 2], [69, 2], [73, 2], [76, 2], [73, 2], [78, 3], [76, 1], [73, 2], [69, 2], [71, 6], [74, 2],
    [74, 2], [71, 2], [67, 2], [71, 2], [73, 2], [76, 2], [81, 3], [79, 1], [78, 2], [76, 2], [74, 2], [69, 2], [74, 6], [null, 2],
  ];
  // chord per bar (root and triad, midi)
  const CH = { D: [50, 62, 66, 69], Bm: [47, 59, 62, 66], G: [43, 55, 59, 62], A: [45, 57, 61, 64], Fsm: [42, 54, 57, 61] };
  const BARS = ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'G', 'A', 'Fsm', 'Bm', 'G', 'A', 'D', 'D'];
  const TOTAL = BARS.length * 8;
  // melody laid out on the eighth-note grid
  const GRID = []; { let p = 0; MEL.forEach(([m, d]) => { GRID[p] = m == null ? null : [m, d]; p += d; }); }

  function ctx() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    out = ac.createGain(); out.gain.value = 0;
    out.connect(comp); comp.connect(ac.destination);
    return ac;
  }
  const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  function marimba(m, t, vol, bright) {
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
    o1.type = 'sine'; o1.frequency.value = f(m); o2.type = 'sine'; o2.frequency.value = f(m) * (bright ? 4.0 : 3.99);
    env(g, t, 0.006, vol, 0.9); env(g2, t, 0.003, vol * 0.35, 0.14);
    o1.connect(g); o2.connect(g2); g.connect(out); g2.connect(out);
    o1.start(t); o2.start(t); o1.stop(t + 1.1); o2.stop(t + 0.3);
  }
  function pluck(m, t, vol) {
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f(m); lp.type = 'lowpass'; lp.frequency.value = 700;
    env(g, t, 0.01, vol, 0.5); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.6);
  }
  function pad(notes, t, dur) {
    const lp = ac.createBiquadFilter(), g = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.6); g.gain.setValueAtTime(0.045, t + dur - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    lp.connect(g); g.connect(out);
    notes.forEach((m) => [-6, 6].forEach((det) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f(m); o.detune.value = det; const og = ac.createGain(); og.gain.value = 0.18; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.3); }));
  }
  let noiseBuf = null;
  const noise = () => { if (noiseBuf) return noiseBuf; const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return (noiseBuf = b); };
  function shaker(t, vol) { const s = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise(); hp.type = 'highpass'; hp.frequency.value = 6000; env(g, t, 0.004, vol, 0.06); s.connect(hp); hp.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + 0.1); }
  function startSea() {
    const s = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    s.buffer = noise(); s.loop = true; lp.type = 'lowpass'; lp.frequency.value = 520;
    g.gain.value = 0.05; lfo.frequency.value = 0.11; lg.gain.value = 0.04; lfo.connect(lg); lg.connect(g.gain);
    s.connect(lp); lp.connect(g); g.connect(out); s.start(); lfo.start();
    sea = [s, lfo];
  }
  function gull() {
    if (!M.playing || !ac) return;
    const t = ac.currentTime + 0.05;
    [0, 0.22].forEach((d) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1500, t + d); o.frequency.exponentialRampToValueAtTime(900, t + d + 0.18); env(g, t + d, 0.02, 0.018, 0.16); o.connect(g); g.connect(out); o.start(t + d); o.stop(t + d + 0.25); });
    gullT = setTimeout(gull, 18000 + Math.random() * 25000);
  }
  function schedule() {
    while (nextT < ac.currentTime + 0.25) {
      const i = step % TOTAL, bar = Math.floor(i / 8), beat = i % 8, ch = CH[BARS[bar]], swing = beat % 2 ? E8 * 0.12 : 0, t = nextT + swing;
      if (beat === 0) { pad(ch.slice(1), t, E8 * 8); pluck(ch[0], t, 0.16); }
      if (beat === 4) pluck(ch[0] + (bar % 2 ? 7 : 12), t, 0.11);
      if (beat % 2) shaker(t, 0.018); else if (beat === 2 || beat === 6) shaker(t, 0.01);
      if (beat % 2 === 1) marimba(ch[1 + ((beat >> 1) % 3)] + 12, t, 0.025, false);
      const n = GRID[i];
      if (n) marimba(loop % 2 ? n[0] + 12 : n[0], t, loop % 2 ? 0.07 : 0.11, loop % 2);
      nextT += E8; step++;
      if (step % TOTAL === 0) loop++;
    }
  }
  M.allowed = () => { const s = A.state && A.state.set; return !(s && s.music === false); };
  M.start = () => {
    if (M.playing || !M.allowed()) return;
    if (!ctx()) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    M.playing = true; step = 0; loop = 0; nextT = ac.currentTime + 0.15;
    out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0.5, ac.currentTime + 2.5);
    startSea(); schedule(); timer = setInterval(schedule, 60);
    gullT = setTimeout(gull, 6000);
  };
  M.stop = () => {
    if (!M.playing) return;
    M.playing = false; clearInterval(timer); clearTimeout(gullT);
    const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 1.2);
    const s = sea; sea = null; setTimeout(() => { try { s && s.forEach((x) => x.stop()); } catch (e) { /* done */ } }, 1400);
  };
  M.toggle = () => {
    const set = A.state.set || (A.state.set = {});
    set.music = !M.allowed() ? true : false; A.saveSoon();
    if (set.music) M.start(); else M.stop();
    return set.music;
  };
  // the page is hidden (phone locked, app switched): be quiet
  document.addEventListener('visibilitychange', () => { if (document.hidden) M.stop(); else if (A.view === 'journey') M.start(); });
  // some phones only allow sound after a tap: try again on the next tap while the map is open
  document.addEventListener('pointerdown', () => { if (A.view === 'journey' && !M.playing && M.allowed()) M.start(); else if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }, true);
})();
