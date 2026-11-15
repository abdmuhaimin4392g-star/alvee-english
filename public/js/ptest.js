/* ptest.js — the 16 personalities test (questions in ptest-data.js).
   It opens every time she opens the voyage map, until all 60 questions are answered.
   Every answer is saved the moment she taps it (on the phone and on the server), so after closing the app
   she goes on from the first question she has not answered. The order never changes. */
(function () {
  'use strict';
  const A = window.AE, h = A.h, P = window.PTEST;
  if (!A || !P) return;
  const PT = (A.ptest = {});
  const N = P.qs.length, UI = P.ui;
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  const bk = () => 'ae.pt.' + ((A.user && A.user.id) || 'x');

  // ---------------------------------------------------------------- saved answers
  // st.ptest = { gen, a: { questionId: [answer -3..3, time] }, x: { questionId: times "explain" was opened },
  //              start, done, res: { code, id, full, pct: { mind: % towards the first letter, … } }, prize }
  PT.st = (st) => {
    st = st || A.state;
    if (!st) return null;
    let p = st.ptest;
    if (!p || typeof p !== 'object') p = st.ptest = { gen: 1, a: {}, x: {} };
    if (!p.gen) p.gen = 1;
    p.a = p.a || {}; p.x = p.x || {};
    // a second copy lives on this phone: an older copy from the server can never take answers away
    if (st === A.state) {
      try {
        const b = A.store.get(bk(), null);
        if (b && b.gen === p.gen && b.a) {
          for (const [k, v] of Object.entries(b.a)) if (Array.isArray(v) && (!p.a[k] || (v[1] || 0) > (p.a[k][1] || 0))) p.a[k] = v;
          for (const [k, n] of Object.entries(b.x || {})) p.x[k] = Math.max(p.x[k] || 0, +n || 0);
          if (!p.start && b.start) p.start = b.start;
          if (!p.done && b.done && b.res && PT.count(p) >= N) { p.done = b.done; p.res = b.res; }
          if (!p.prize && b.prize) p.prize = b.prize;
        }
      } catch (e) { /* no copy */ }
    }
    return p;
  };
  PT.count = (p) => P.qs.reduce((n, q) => n + (p.a[q.id] ? 1 : 0), 0);
  PT.firstOpen = (p) => { const i = P.qs.findIndex((q) => !p.a[q.id]); return i < 0 ? N : i; };
  PT.need = () => !!(A.user && A.user.role === 'learner' && A.state && !(A.ctl && A.ctl.ptestOff) && !PT.st().done);
  function save() {
    const st = A.state, p = st.ptest;
    try { A.store.set(bk(), { gen: p.gen, a: p.a, x: p.x, start: p.start, done: p.done, res: p.res, prize: p.prize }); } catch (e) { /* full */ }
    // keep the newest copy on the phone straight away, so closing the app at once loses nothing
    st.rev = (st.rev || 0) + 1;
    try { if (A.api && A.api.mode === 'server' && A.user) A.store.set('ae.st.' + A.user.id, st); } catch (e) { /* full */ }
    A.saveSoon();
  }

  // ---------------------------------------------------------------- scores
  // each answer counts -3..+3 towards the letter its question points to; the result is the side with more points
  PT.score = (p) => {
    const dims = {};
    P.dims.forEach((d) => {
      let sum = 0, n = 0, sa = 0, sb = 0;
      P.qs.forEach((q) => {
        if (q.dim !== d.k || !p.a[q.id]) return;
        const v = (q.pole === d.a ? 1 : -1) * p.a[q.id][0];
        sum += v; n++; if (v >= 2) sa++; if (v <= -2) sb++;
      });
      const pct = n ? Math.round(50 + (50 * sum) / (3 * n)) : 50;
      dims[d.k] = { pct, n, letter: sum > 0 ? d.a : sum < 0 ? d.b : sa >= sb ? d.a : d.b };
    });
    const code = dims.mind.letter + dims.energy.letter + dims.nature.letter + dims.tactics.letter;
    const pct = {}; Object.keys(dims).forEach((k) => { pct[k] = dims[k].pct; });
    return { code, id: dims.identity.letter, full: code + '-' + dims.identity.letter, pct, dims };
  };
  PT.label = (v) => { const s = P.scale.find((x) => x[0] === v); return s ? [s[1], s[2]] : ['', '']; };

  // ---------------------------------------------------------------- the screen
  let ov = null, cur = 0, busy = false, shownAt = 0;
  const bi = (pair, cls) => h('div', { class: 'pt-bi ' + (cls || '') }, h('div', { class: 'en' }, pair[0]), h('div', { class: 'th' }, pair[1]));
  const btnBi = (pair, cls, fn) => h('button', { class: 'pt-btn ' + (cls || ''), onclick: fn }, h('span', { class: 'en' }, pair[0]), h('span', { class: 'th' }, pair[1]));
  function frame(...kids) {
    if (!ov) return;
    const inner = h('div', { class: 'pt-in' }, ...kids);
    A.clear(ov).append(h('div', { class: 'pt-sea', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), inner);
    ov.scrollTop = 0;
  }
  const presence = (step) => { try { A.setPresence(step ? { screen: 'personality test', title: 'Personality test', step, total: N } : { screen: A.view }); } catch (e) { /* offline */ } };

  PT.open = (from) => {
    if (!A.state || !A.user || A.user.role !== 'learner') return;
    if (document.querySelector('.pt-ov')) return;
    document.querySelectorAll('.sheet,.veil').forEach((x) => x.remove());
    const p = PT.st();
    ov = h('div', { class: 'pt-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Personality test' });
    document.body.append(ov);
    A.track('ptest_open', { from: from || '', n: PT.count(p) });
    if (p.done && p.res) return result(false);
    const n = PT.count(p);
    if (n >= N) return finish();
    if (!n) intro(); else welcome(n);
  };
  PT.close = () => { if (ov) ov.remove(); ov = null; busy = false; presence(0); };

  function intro() {
    presence(1);
    frame(h('div', { class: 'pt-hero' },
      h('div', { class: 'pt-compass', 'aria-hidden': 'true' }, h('span', null, '🧭')),
      h('h2', { class: 'pt-title' }, UI.title[0]), h('div', { class: 'pt-title-th th' }, UI.title[1]),
      h('div', { class: 'pt-sub' }, UI.sub[0] + ' · ', h('span', { class: 'th' }, UI.sub[1]))),
    h('div', { class: 'pt-card pt-intro' }, bi(UI.intro),
      h('ul', { class: 'pt-tips' },
        h('li', null, h('b', null, '💡'), bi(UI.tipExplain)),
        h('li', null, h('b', null, '⏸️'), bi(UI.tipPause)),
        h('li', null, h('b', null, '🎁'), bi(UI.tipPrize)))),
    h('div', { class: 'pt-row' }, btnBi(UI.later, 'ghost', () => pause(true)), btnBi(UI.start, 'go', () => question(0))));
  }
  function welcome(n) {
    const p = PT.st(), q = PT.firstOpen(p);
    presence(q + 1);
    frame(h('div', { class: 'pt-hero' },
      h('div', { class: 'pt-compass', 'aria-hidden': 'true' }, h('span', null, '⛵')),
      h('h2', { class: 'pt-title' }, UI.welcome[0]), h('div', { class: 'pt-title-th th' }, UI.welcome[1])),
    h('div', { class: 'pt-card pt-intro' },
      h('div', { class: 'pt-big-n' }, h('b', null, n), ' / ' + N),
      h('div', { class: 'pt-rope wide' }, h('i', { style: { width: (n / N) * 100 + '%' } })),
      bi([fmt(UI.resume[0], { n, q: q + 1 }), fmt(UI.resume[1], { n, q: q + 1 })])),
    h('div', { class: 'pt-row' }, btnBi(UI.later, 'ghost', () => pause(true)), btnBi(UI.cont, 'go', () => question(q))));
  }

  function question(i) {
    if (!ov) return;
    busy = false; shownAt = Date.now();
    cur = Math.max(0, Math.min(N - 1, i));
    const p = PT.st(), q = P.qs[cur], r = p.a[q.id], done = PT.count(p);
    presence(cur + 1);
    const box = h('div', { class: 'pt-ex', hidden: true });
    const exBtn = h('button', { class: 'pt-exbtn', 'aria-expanded': 'false', onclick: () => {
      const open = box.hidden;
      box.hidden = !open; exBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); exBtn.classList.toggle('on', open);
      if (open) {
        if (!box.firstChild) box.append(explain(q));
        p.x[q.id] = (p.x[q.id] || 0) + 1; save();
        A.track('ptest_explain', { q: q.id, n: cur + 1 });
        setTimeout(() => { try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* old phone */ } }, 60);
      }
    } }, '💡 ', h('span', { class: 'en' }, UI.explain[0]), ' · ', h('span', { class: 'th' }, UI.explain[1]));
    const say = A.speech && A.speech.ok ? h('button', { class: 'pt-say', 'aria-label': 'Listen', onclick: () => A.speech.say(q.en) }, '🔊') : null;
    const dots = P.scale.map(([v, en, th]) => h('button', {
      class: 'pt-dot ' + (v > 0 ? 'ag' : v < 0 ? 'dg' : 'mid') + ' s' + Math.abs(v) + (r && r[0] === v ? ' on' : ''),
      role: 'radio', 'aria-checked': r && r[0] === v ? 'true' : 'false', 'aria-label': en + ' · ' + th, 'data-v': v,
      onclick: (e) => answer(q, v, e.currentTarget),
    }));
    const chosen = r ? PT.label(r[0]) : null;
    const next = cur + 1 < N && r ? h('button', { class: 'pt-link', onclick: () => question(cur + 1) }, 'Next ›') : done >= N && cur === N - 1 ? h('button', { class: 'pt-link', onclick: () => finish() }, 'See my result ›') : h('span');
    frame(
      h('div', { class: 'pt-top' },
        h('button', { class: 'pt-x', 'aria-label': 'Continue later', onclick: () => pause(false) }, '✕'),
        h('div', { class: 'pt-prog' },
          h('div', { class: 'pt-rope' }, h('i', { style: { width: (done / N) * 100 + '%' } }), h('span', { class: 'pt-boat', style: { left: (done / N) * 100 + '%' } }, '⛵')),
          h('div', { class: 'pt-qn' }, fmt(UI.qof[0], { i: cur + 1 }), ' · ', h('span', { class: 'th' }, fmt(UI.qof[1], { i: cur + 1 }))))),
      h('div', { class: 'pt-card pt-qcard' },
        h('div', { class: 'pt-port', 'aria-hidden': 'true' }, q.ic),
        h('div', { class: 'pt-q' }, q.en, say),
        h('div', { class: 'pt-qt th' }, q.th),
        exBtn, box),
      h('div', { class: 'pt-scale', role: 'radiogroup', 'aria-label': 'Your answer' }, dots),
      h('div', { class: 'pt-ends' }, h('span', { class: 'ag' }, UI.agree[0], h('small', { class: 'th' }, UI.agree[1])), h('span', { class: 'dg' }, UI.disagree[0], h('small', { class: 'th' }, UI.disagree[1]))),
      h('div', { class: 'pt-chosen' + (chosen ? '' : ' empty') }, chosen ? chosen[0] + ' · ' : '', chosen ? h('span', { class: 'th' }, chosen[1]) : ''),
      h('div', { class: 'pt-nav' },
        cur > 0 ? h('button', { class: 'pt-link', onclick: () => question(cur - 1) }, '‹ ' + UI.back[0]) : h('span'),
        next));
  }

  function explain(q) {
    return h('div', null,
      h('div', { class: 'pt-exh' }, '🤔 ' + UI.asks[0] + ' · ', h('span', { class: 'th' }, UI.asks[1])),
      h('p', { class: 'en' }, q.why[0]), h('p', { class: 'th' }, q.why[1]),
      h('div', { class: 'pt-exh' }, '🌊 ' + UI.examples[0] + ' · ', h('span', { class: 'th' }, UI.examples[1])),
      h('ol', { class: 'pt-egs' }, q.ex.map(([en, th]) => h('li', null, h('div', { class: 'en' }, en), h('div', { class: 'th' }, th)))),
      h('div', { class: 'pt-how' }, h('div', { class: 'en' }, UI.howto[0]), h('div', { class: 'th' }, UI.howto[1])));
  }

  function answer(q, v, el) {
    // a second quick tap (a double tap) must not answer the next question by mistake
    if (busy || !ov || Date.now() - shownAt < 300) return;
    busy = true;
    const p = PT.st();
    if (!p.start) p.start = Date.now();
    const before = p.a[q.id];
    p.a[q.id] = [v, Date.now()];
    save();
    A.track('ptest_answer', { q: q.id, v, n: PT.count(p), change: before ? 1 : undefined });
    try { A.sfx.play('tap'); } catch (e) { /* quiet */ }
    ov.querySelectorAll('.pt-dot').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-checked', b === el ? 'true' : 'false'); });
    const L = PT.label(v), c = ov.querySelector('.pt-chosen');
    if (c) { c.classList.remove('empty'); A.clear(c).append(L[0] + ' · ', h('span', { class: 'th' }, L[1])); }
    const card = ov.querySelector('.pt-qcard');
    setTimeout(() => { if (card) card.classList.add('leave'); }, 160);
    setTimeout(() => {
      if (!ov) return;
      if (PT.count(p) >= N && !p.done) finish();
      else if (cur + 1 < N) question(cur + 1);
      else finish();
    }, 380);
  }

  function pause(fromIntro) {
    const p = PT.st();
    A.track('ptest_pause', { n: PT.count(p), at: cur + 1 });
    PT.close();
    A.toast(fromIntro ? '🧭 The test will be here when you open the map again.' : '💾 Saved! You will continue from question ' + (PT.firstOpen(p) + 1) + '.', 3200);
  }

  // ---------------------------------------------------------------- the end: result and prize
  function finish() {
    const p = PT.st();
    if (PT.count(p) < N) return question(PT.firstOpen(p));
    if (!p.done || !p.res) {
      const sc = PT.score(p);
      p.res = { code: sc.code, id: sc.id, full: sc.full, pct: sc.pct, at: Date.now() };
      p.done = Date.now();
      if (!p.prize) {
        try {
          const V = A.voyage, s = V.st();
          V.addGold(150); s.keys += 1;
          const roll = V.rollTreasure(true);
          p.prize = { at: Date.now(), item: roll.item[0], isNew: roll.isNew ? 1 : 0, opened: 0 };
        } catch (e) { p.prize = { at: Date.now(), opened: 1 }; }
      }
      save();
      A.track('ptest_done', { code: sc.full, mins: Math.max(1, Math.round((p.done - (p.start || p.done)) / 60000)), explained: Object.keys(p.x).length });
      try { A.notify({ quiet: 1, ic: P.types[sc.code].ic, t: 'You are ' + P.types[sc.code].n + ' (' + sc.full + ')', s: 'Tap to see your result again.', go: ['ptest'] }); } catch (e) { /* no inbox */ }
      return result(true);
    }
    return result(false);
  }

  function result(fresh) {
    const p = PT.st(), res = p.res, T = P.types[res.code];
    const desc = (window.PTPROF && window.PTPROF[res.code] && window.PTPROF[res.code].intro) || [T.en, T.thd];
    presence(0);
    try { A.setPresence({ screen: 'personality result', title: res.full }); } catch (e) { /* offline */ }
    const scales = P.dims.map((d) => {
      const pa = res.pct[d.k], letter = d.k === 'identity' ? res.id : res.code['mind energy nature tactics'.split(' ').indexOf(d.k)];
      const lead = letter === d.a ? pa : 100 - pa, pole = P.poles[d.k][letter];
      return h('div', { class: 'pt-scl' },
        h('div', { class: 'pt-scl-ends' }, h('span', { class: letter === d.a ? 'on' : '' }, P.poles[d.k][d.a][0] + ' (' + d.a + ')'), h('span', { class: letter === d.b ? 'on' : '' }, P.poles[d.k][d.b][0] + ' (' + d.b + ')')),
        h('div', { class: 'pt-bar ' + d.k + (letter === d.b ? ' r' : '') }, h('i', { style: { width: lead + '%' } })),
        h('div', { class: 'pt-scl-tx' }, h('b', null, lead + '% ' + pole[0]), ' · ', h('span', { class: 'th' }, pole[1])),
        h('div', { class: 'pt-scl-mean' }, pole[2], h('span', { class: 'th' }, pole[3])));
    });
    const prize = p.prize && p.prize.item && !p.prize.opened ? h('div', { class: 'pt-card pt-prize' },
      h('div', { class: 'pt-exh' }, '🎁 ' + UI.prize[0] + ' · ', h('span', { class: 'th' }, UI.prize[1])),
      h('div', { class: 'pt-prize-row' }, h('span', null, '🪙 150 gold'), h('span', null, '🔑 1 key'), h('span', null, '🧰 a golden chest')),
      btnBi(UI.openChest, 'go', () => {
        const T2 = A.treasure, it = T2 && T2.byId[p.prize.item];
        p.prize.opened = 1; save();
        PT.close();
        A.go('journey');
        if (it) setTimeout(() => { try { A.voyage.treasureReveal({ item: it, isNew: !!p.prize.isNew }, true); } catch (e) { /* no chest screen */ } }, 450);
      })) : null;
    frame(
      h('div', { class: 'pt-top' }, h('button', { class: 'pt-x', 'aria-label': 'Close', onclick: () => PT.close() }, '✕'), h('div', { class: 'pt-qn' }, UI.sub[0])),
      h('div', { class: 'pt-hero pt-res' },
        h('div', { class: 'small pt-kick' }, UI.yourType[0], ' ', h('span', { class: 'th' }, UI.yourType[1])),
        h('div', { class: 'pt-port big', 'aria-hidden': 'true' }, T.ic),
        h('div', { class: 'pt-code' }, res.code, h('small', null, '-' + res.id)),
        h('h2', { class: 'pt-title' }, T.n), h('div', { class: 'pt-title-th th' }, T.th)),
      h('div', { class: 'pt-card' }, h('p', { class: 'en pt-desc' }, desc[0]), h('p', { class: 'th pt-desc' }, desc[1]),
        h('div', { class: 'pt-exh' }, '⭐ ' + UI.strengths[0] + ' · ', h('span', { class: 'th' }, UI.strengths[1])),
        h('div', { class: 'pt-chips' }, T.s.map(([en, th]) => h('span', { class: 'pt-chip' }, en, h('small', { class: 'th' }, th)))),
        h('div', { class: 'pt-ident' }, h('div', { class: 'en' }, P.ident[res.id][0]), h('div', { class: 'th' }, P.ident[res.id][1]))),
      prize,
      h('div', { class: 'pt-card' }, h('div', { class: 'pt-exh' }, '📊 ' + UI.scales[0] + ' · ', h('span', { class: 'th' }, UI.scales[1])), ...scales),
      h('div', { class: 'pt-card pt-note' }, bi(UI.noBest), bi(UI.grow)),
      h('div', { class: 'pt-card pt-more' },
        btnBi(['Compare with Muhay (INFJ)', 'เปรียบเทียบกับมูไฮ (INFJ)'], 'ghost wide', () => { PT.close(); A.go('typevs'); }),
        btnBi(['Read about all 16 types', 'อ่านเกี่ยวกับบุคลิกภาพทั้ง 16 แบบ'], 'ghost wide', () => { PT.close(); A.go('types'); })),
      h('div', { class: 'pt-row' }, btnBi(UI.sail, 'go', () => { PT.close(); A.go('journey'); })));
    if (fresh) {
      try { A.sfx.play('done'); } catch (e) { /* quiet */ }
      setTimeout(() => { try { A.confetti(); const cv = document.querySelectorAll('canvas.confetti'); if (cv.length) cv[cv.length - 1].style.zIndex = 400; } catch (e) { /* no confetti */ } }, 250);
    }
  }

  PT.fixNote = () => {
    try {
      const st = A.state, p = st && st.ptest, L = st && st.inbox;
      if (!p || !p.res || !Array.isArray(L)) return;
      const T = P.types[p.res.code], t = 'You are ' + T.n + ' (' + p.res.full + ')';
      L.forEach((x) => { if (x && x.go && x.go[0] === 'ptest' && x.t !== t) { x.t = t; x.s = 'Tap to see your result again.'; } });
    } catch (e) { /* inbox stays */ }
  };

  // ---------------------------------------------------------------- where she meets it
  // 1. the voyage map: asks every time she opens it, until the test is finished
  const go0 = A.go;
  A.go = (view, arg) => {
    if (view === 'ptest') { PT.open('note'); return; }
    if (view === 'home') PT.fixNote();
    go0(view, arg);
    if (view === 'journey' && PT.need()) {
      clearTimeout(PT.timer);
      let tries = 0;
      const ask = () => {
        if (A.view !== 'journey' || A.session || !PT.need() || document.querySelector('.pt-ov')) return;
        const kraken = A.kraken && A.kraken.state && A.kraken.state.on;
        if ((kraken || document.querySelector('#trv')) && tries++ < 40) { PT.timer = setTimeout(ask, 1500); return; }
        PT.open('map');
      };
      PT.timer = setTimeout(ask, 900);
    }
  };
  // 2. a card on the Me page (to continue, or to see the result again)
  const me0 = A.VIEWS.me;
  if (me0) A.VIEWS.me = (arg) => {
    const root = me0(arg);
    try {
      const p = PT.st(), n = PT.count(p), T = p.done && p.res && P.types[p.res.code];
      const card = T
        ? h('button', { class: 'card talk-item pt-me', onclick: () => A.go('types') }, h('div', { class: 'av' }, T.ic), h('div', { style: { flex: 1 } }, h('b', null, 'My personality: ' + p.res.full), h('div', { class: 'small muted' }, T.n + ' · all 16 types · you and Muhay')), h('span', { class: 'muted' }, '›'))
        : h('button', { class: 'card talk-item pt-me', onclick: () => PT.open('me') }, h('div', { class: 'av' }, '🧭'), h('div', { style: { flex: 1 } }, h('b', null, 'What is your personality type?'), h('div', { class: 'small muted' }, n ? n + ' of ' + N + ' answered · tap to go on' : N + ' questions · win a golden chest')), h('span', { class: 'muted' }, '›'));
      const shelf = root.querySelector('.medal-shelf');
      if (shelf) shelf.after(card); else root.append(card);
    } catch (e) { /* the page still works */ }
    return root;
  };
})();
