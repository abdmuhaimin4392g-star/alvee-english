/* bonus.js — Idiom Cove: a bonus lesson in every chapter with four English idioms, their Thai meaning and how to use them.
   From chapter 5 on, the Idiom Cove must be finished before the chapter test opens. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h, I = window.IDIOMS || {};
  if (!A || !A.RENDER) return;
  const NEED_FROM = 5;
  const id = (u) => 'idioms:' + u;
  const has = (u) => !!(I[u] && I[u].length);
  const done = (st, u) => !!(st.bonus && st.bonus[id(u)]);
  const VOC = window.VOCAB || {};
  const vdone = (st, u) => !VOC[u] || !!(st.bonus && st.bonus['vocab:' + u]);
  const needed = (st, n) => n.kind === 'check' && n.u >= NEED_FROM && !st.done[n.id] && ((has(n.u) && !done(st, n.u)) || !vdone(st, n.u));

  // ------------------------------------------------------------- steps
  const blank = (idiom, key) => idiom.replace(new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '_____');
  A.bonusSteps = (arg) => {
    const u = +String(arg).split(':')[1], L = I[u];
    if (!L) return [];
    const others = Object.entries(I).filter(([k]) => +k !== u).flatMap(([, x]) => x);
    const steps = [];
    L.forEach((it, i) => {
      steps.push({ type: 'idcard', it, n: i + 1, of: L.length });
      const wrong = A.shuffle(others.filter((o) => o[1] !== it[1])).slice(0, 2);
      steps.push({ type: 'idmean', it, sk: 'vocab', opts: A.shuffle([it, ...wrong]) });
    });
    // second round: put the idioms to work
    A.shuffle(L.slice()).forEach((it) => {
      const keys = A.uniq([it[6], ...A.shuffle(L.filter((o) => o !== it).map((o) => o[6])), ...A.shuffle(others.map((o) => o[6]))]).filter((k) => k.toLowerCase() !== it[6].toLowerCase()).slice(0, 3);
      steps.push({ type: 'idfix', it, sk: 'vocab', opts: A.shuffle([it[6], ...keys]) });
    });
    A.shuffle(L.slice()).forEach((it) => {
      steps.push({ type: 'idfit', it, sk: 'vocab', opts: A.shuffle(L.slice()) });
    });
    return steps;
  };

  // ------------------------------------------------------------- the screens
  const say = (t) => h('button', { class: 'icon-btn id-say', 'aria-label': 'Listen', onclick: () => A.speech.say(t) }, '🔊');
  const optRow = (opts, label, onPick) => {
    const box = h('div', { class: 'opts id-opts' });
    opts.forEach((o) => box.append(h('button', { class: 'opt', onclick: (e) => { if (box.dataset.done) return; box.dataset.done = '1'; onPick(o, e.currentTarget, box); } }, label(o))));
    return box;
  };
  const mark = (box, right, b, ok) => { [...box.children].forEach((x, i) => { if (i === right) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); };
  const head = (ic, en, th) => h('div', { class: 'q-kind' }, ic + ' ' + en, h('span', { class: 'th muted small' }, '  · ' + th));

  A.RENDER.idcard = (step, ctl) => {
    const it = step.it;
    setTimeout(() => A.speech.say(it[0]), 250);
    return h('div', { class: 'stack', style: { gap: '14px' } },
      head('🏝️', 'Idiom Cove · ' + step.n + ' of ' + step.of, 'สำนวนภาษาอังกฤษ'),
      h('div', { class: 'id-card' },
        h('div', { class: 'id-glow', 'aria-hidden': 'true' }),
        h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', justifyContent: 'center' } }, h('h2', { class: 'id-title' }, '“' + it[0] + '”'), say(it[0])),
        h('div', { class: 'id-mean' }, h('b', null, 'Means: '), it[1]),
        h('div', { class: 'id-th th' }, '🇹🇭 ' + it[2]),
        h('div', { class: 'id-ex' }, h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('span', { class: 'en' }, it[3]), say(it[3])), h('div', { class: 'th muted small' }, it[4])),
        h('div', { class: 'id-tip' }, '💡 ' + it[5])),
      h('button', { class: 'btn primary block', onclick: () => ctl.next() }, 'Got it!'));
  };
  A.RENDER.idmean = (step, ctl) => {
    const it = step.it;
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🤔', 'What does it mean?', 'สำนวนนี้หมายถึงอะไร'),
      h('div', { class: 'id-q' }, h('span', null, '“' + it[0] + '”'), say(it[0])),
      optRow(step.opts, (o) => h('span', null, o[1]), (o, b, box) => {
        const ok = o === it; mark(box, step.opts.indexOf(it), b, ok);
        ctl.answer(step, ok, { q: it[0], a: o[1], c: it[1], show: it[0] + ' = ' + it[1], showTh: it[2], say: it[0], exp: null, note: it[5] });
      }));
  };
  A.RENDER.idfix = (step, ctl) => {
    const it = step.it;
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🧩', 'Complete the idiom', 'เติมคำให้สำนวนสมบูรณ์'),
      h('div', { class: 'id-q' }, h('span', null, '“' + blank(it[0], it[6]) + '”')),
      h('div', { class: 'small muted' }, it[1], h('div', { class: 'th' }, it[2])),
      optRow(step.opts, (o) => h('span', null, o), (o, b, box) => {
        const ok = o.toLowerCase() === it[6].toLowerCase(); mark(box, step.opts.findIndex((x) => x.toLowerCase() === it[6].toLowerCase()), b, ok);
        ctl.answer(step, ok, { q: blank(it[0], it[6]), a: o, c: it[6], show: it[0], showTh: it[2], say: it[0], exp: null, note: it[5] });
      }));
  };
  A.RENDER.idfit = (step, ctl) => {
    const it = step.it;
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🎯', 'Which idiom fits?', 'สำนวนไหนเหมาะกับสถานการณ์นี้'),
      h('div', { class: 'id-situ' }, h('div', { class: 'small muted' }, 'Situation · สถานการณ์'), h('b', null, it[1].charAt(0).toUpperCase() + it[1].slice(1)), h('div', { class: 'th small muted' }, it[4])),
      optRow(step.opts, (o) => h('span', null, '“' + o[0] + '”'), (o, b, box) => {
        const ok = o === it; mark(box, step.opts.indexOf(it), b, ok);
        ctl.answer(step, ok, { q: it[1], a: o[0], c: it[0], show: it[3], showTh: it[4], say: it[3], exp: null, note: it[5] });
      }));
  };

  // ------------------------------------------------------------- the row in a chapter, rewards and locks
  A.bonus = {
    NEED_FROM, id, has, done, needed,
    row(st, u, close) {
      if (!has(u)) return null;
      const d = st.bonus && st.bonus[id(u)], must = u >= NEED_FROM;
      return h('button', { class: 'les-row bonus' + (d ? ' done' : ''), onclick: () => { close && close(); A.play('bonus', id(u)); } },
        h('span', { class: 'lr-ic' }, d ? '✅' : '🏝️'),
        h('div', { class: 'lr-tx' }, h('b', null, 'Idiom Cove · ' + I[u].length + ' idioms'), h('span', { class: 'small muted' }, 'Bonus · สำนวนภาษาอังกฤษ' + (must && !d ? ' · needed for the test' : ''))),
        h('span', { class: 'lr-st' }, d ? '★'.repeat(d.s || 1) : '✨'));
    },
    rows(st, u, close) {
      const out = [];
      if (VOC[u]) {
        const d = st.bonus && st.bonus['vocab:' + u];
        out.push(h('button', { class: 'les-row bonus vocab' + (d ? ' done' : ''), onclick: () => { close && close(); A.play('vocab', 'vocab:' + u); } },
          h('span', { class: 'lr-ic' }, d ? '✅' : '💎'),
          h('div', { class: 'lr-tx' }, h('b', null, 'Word Chest · ' + VOC[u].length + ' new words'), h('span', { class: 'small muted' }, 'Bonus · คำศัพท์ใหม่' + (u >= NEED_FROM && !d ? ' · needed for the test' : ''))),
          h('span', { class: 'lr-st' }, d ? '★'.repeat(d.s || 1) : '✨')));
      }
      const r = this.row(st, u, close); if (r) out.push(r);
      return out;
    },
    finish(st, ses, acc) {
      if (ses.kind !== 'bonus' || acc < 70) return null;
      st.bonus = st.bonus || {};
      const prev = st.bonus[ses.arg], stars = acc >= 90 ? 3 : 2;
      st.bonus[ses.arg] = { s: Math.max(stars, (prev && prev.s) || 0), a: Math.max(acc, (prev && prev.a) || 0), t: Date.now(), n: ((prev && prev.n) || 0) + 1 };
      return !prev;
    },
  };
})();
