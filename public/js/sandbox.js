/* sandbox.js — "Play her app" for the dashboard: a private copy of Alvee's account to play with.
   It opens her side of the app with a copy of her progress. Nothing goes to the server: no saves, no steps
   in her feed, no online status, no live screen. The copy is kept on this phone only (play on another day,
   or take a fresh copy from her account), and her real account is never touched. */
(function () {
  'use strict';
  const A = window.AE, h = A.h;
  const SB = (A.sandbox = { on: false });
  const key = (uid) => 'ae.sbx.' + uid;
  let real = null;

  // an api that keeps everything on this phone; anything else it is asked for does nothing
  function sandboxApi(uid, ctl, coach) {
    const base = {
      mode: 'sandbox',
      async init() {},
      async me() { return A.user; },
      async loadState() { return A.store.get(key(uid), null); },
      async saveState(st) { A.store.set(key(uid), st); },
      async log() { return { ok: 1 }; },
      async beat() { return {}; },
      async ctl() { return ctl; },
      async livePush() { return { w: 0 }; },
      async inbox() { return []; },
      async coachName() { return coach; },
      async logout() { setTimeout(() => SB.exit(), 0); },
    };
    return new Proxy(base, { get: (t, k) => (k in t ? t[k] : async () => ({})) });
  }

  // fresh = take a new copy of her account now (otherwise go on with the copy from last time)
  SB.start = async (uid, herUser, herState, fresh) => {
    if (SB.on || !herUser) return;
    let ctl = {};
    try { ctl = await A.api.adminCtl(uid); } catch (e) { /* offline: no gifts */ }
    real = { api: A.api, user: A.user, state: A.state, ctl: A.ctl, queue: A.queue, view: A.view, ctlCache: A.store.get('ae.ctl', null) };
    if (fresh || !A.store.get(key(uid), null)) {
      const copy = JSON.parse(JSON.stringify(herState || {}));
      copy.rev = 0; delete copy.resetAt;
      A.store.set(key(uid), copy);
    }
    clearInterval(A.admin && A.admin.timer);
    SB.on = true;
    A.queue = [];
    A.api = sandboxApi(uid, ctl, real.user.name);
    document.documentElement.classList.add('sbx');
    banner();
    await A.enter({ ...herUser, id: 'sbx_' + uid, role: 'learner' });
  };

  SB.exit = () => {
    if (!SB.on) return;
    SB.on = false;
    try { A.music.stop(); } catch (e) { /* no music */ }
    document.querySelectorAll('.pt-ov,.sheet,.veil,#trv,.pop-note,.toast,.fb,.sbx-bar,canvas.confetti').forEach((x) => x.remove());
    document.documentElement.classList.remove('sbx');
    A.queue = [];
    A.api = real.api; A.user = real.user; A.state = real.state; A.ctl = real.ctl || {};
    if (real.ctlCache) A.store.set('ae.ctl', real.ctlCache); else A.store.del('ae.ctl');
    real = null;
    if (/[?&]sbx=/.test(location.search)) { if (SB.frame) location.reload(); else location.href = location.pathname; return; }
    A.admin.start();
  };

  // the demo page (/?sbx=<id>): start straight away, and say what went wrong instead of doing nothing
  SB.auto = async (uid) => {
    const inFrame = window.self !== window.top;
    const fresh = /[?&]new=/.test(location.search);
    const app = document.getElementById('app') || document.body;
    const say = (t, err) => { app.innerHTML = ''; app.append(h('div', { class: 'screen full', style: { display: 'grid', placeItems: 'center', minHeight: '80vh', textAlign: 'center' } }, h('div', { class: 'stack', style: { gap: '10px', maxWidth: '320px' } }, h('div', { style: { fontSize: '3rem' } }, err ? '⚠️' : '🐢'), h('b', null, t), err ? h('button', { class: 'btn block', onclick: () => location.reload() }, 'Try again') : null))); };
    say('Opening her app…');
    try {
      const list = await A.api.learners();
      const her = list.find((x) => x.id === uid) || list[0];
      if (!her) throw new Error('No learner account found.');
      const d = await A.api.learner(her.id);
      SB.frame = inFrame;
      await SB.start(her.id, her, d && d.state, fresh || !A.store.get(key(her.id), null));
      if (fresh) history.replaceState(null, '', location.pathname + '?sbx=' + encodeURIComponent(her.id));
    } catch (e) { say('The demo could not open: ' + ((e && e.message) || e), true); }
  };

  function banner() {
    const bar = h('div', { class: 'sbx-bar', role: 'status' },
      h('span', null, '🎮 Demo copy · not saved to her account'),
      h('button', { onclick: () => SB.exit() }, SB.frame ? '↻ Restart' : 'Exit'));
    document.body.append(bar);
  }
})();
