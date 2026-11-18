/* storm-eye.js — the Storm Eye: the Storm Jar becomes a teacher.
   Every mistake is filed under the idea behind it (a grammar point such as "am / is / are", or one word).
   A storm only clears when she gets that idea right several times in a row in NEW sentences she has not
   missed before, so she really understands it rather than remembering one answer.
   - ⚡ Storm Training: short practice made only from her weak ideas, always with different sentences.
   - ⚡ Squalls: one or two of her weak ideas pop up in the middle of normal lessons.
   - 🌀 Storm Wall: before she sails into a new chapter, the strong storms from earlier chapters must be cleared.
   Nothing is reset: her old mistakes (word memory, skill history and storm clouds) are read to start it. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h;
  if (!A || !A.RENDER || !A.storm) return;
  const S = A.storm;
  const GRAM = ['be', 'bep', 's3', 'past', 'will', 'going', 'ing', 'do', 'have', 'can', 'if', 'question', 'order', 'prep', 'art'];
  const CLOUD = ['☁️', '☁️', '🌧️', '⛈️'];
  const reach = (st) => { try { return A.reachedUnit(st, A.user && A.user.cfg) || 1; } catch (e) { return 1; } };
  const unitOfSid = (sid) => (A.S(sid) && A.S(sid).u) || 1;
  const unitOfKey = (k) => (A.C.dict[k] && A.C.dict[k].u) || 1;

  function conceptOf(step) {
    if (step.stormcx) return step.stormcx;
    if (step.sk && GRAM.includes(step.sk)) return step.sk;
    if (step.sid) { const g = (A.sentSkills(step.sid) || []).find((x) => GRAM.includes(x)); return g || null; }
    if (step.key) return 'w:' + step.key;
    if (step.item && step.item.startsWith('w:')) return step.item;
    return null;
  }
  const nameOf = (c) => {
    if (c.startsWith('w:')) { const e = A.C.dict[c.slice(2)]; return e ? ['Word: ' + A.fill(e.w), 'คำศัพท์: ' + A.fill(e.w) + ' (' + A.thShort(e.th) + ')'] : [c.slice(2), c.slice(2)]; }
    return A.SKILLS[c] || [c, c];
  };
  const lvOf = (x) => (x.n >= 5 ? 3 : x.n >= 3 ? 2 : 1);

  // ---- her concept map (built once from everything she has done so far)
  function cxs(st) {
    const B = S.box(st);
    if (!B.cx) {
      B.cx = {};
      const u0 = reach(st);
      B.list.forEach((e) => {
        const c = e.sid ? conceptOf({ sid: e.sid }) : e.key ? 'w:' + e.key : null; if (!c) return;
        const x = B.cx[c] || (B.cx[c] = { n: 0, ok: 0, need: 2, u: 99, src: [], t: Date.now() });
        x.n += e.lv || 1; x.u = Math.min(x.u, e.sid ? unitOfSid(e.sid) : unitOfKey(e.key)); if (e.sid) x.src.push(e.sid); else if (e.key) x.src.push(e.key);
        e.cx = c;
      });
      A.weakSkills(st).filter((w) => GRAM.includes(w.id)).forEach((w) => {
        const r = st.sk[w.id], misses = (r.h || '').split('').filter((z) => z === '0').length;
        const x = B.cx[w.id] || (B.cx[w.id] = { n: 0, ok: 0, need: 2, u: u0, src: [], t: Date.now() });
        x.n = Math.max(x.n, misses); x.u = Math.min(x.u, u0);
      });
      Object.values(B.cx).forEach((x) => { x.need = Math.min(4, 2 + Math.floor(x.n / 4)); x.src = x.src.slice(-8); if (x.u === 99) x.u = u0; });
      A.saveSoon();
    }
    return B.cx;
  }
  const canTrain = (st, c) => c.startsWith('w:') || A.sentsUpTo(Math.max(reach(st), 1)).some((sid) => (A.sentSkills(sid) || []).includes(c));
  // storms she can work on now (ideas from later chapters wait until she meets them)
  const active = (st) => Object.entries(cxs(st)).filter(([c, x]) => !x.done && x.n > 0 && canTrain(st, c)).map(([c, x]) => ({ c, ...x }));

  // a wrong answer anywhere
  const baseAdd = S.add.bind(S);
  S.add = (st, step) => {
    baseAdd(st, step);
    const c = conceptOf(step); if (!c) return;
    const B = S.box(st), X = cxs(st), x = X[c] || (X[c] = { n: 0, ok: 0, need: 2, u: 99, src: [], t: Date.now() });
    if (x.done) { x.done = 0; x.n = 0; }
    x.n++; x.ok = 0; x.need = Math.min(4, 2 + Math.floor(x.n / 4)); x.t = Date.now();
    const u = step.sid ? unitOfSid(step.sid) : step.key ? unitOfKey(step.key) : reach(st); x.u = Math.min(x.u, u);
    const src = step.sid || step.key; if (src && !x.src.includes(src)) { x.src.push(src); x.src = x.src.slice(-8); }
    const e = B.list.find((y) => y.i === step.item); if (e) e.cx = c;
  };
  // every answer on a storm question moves the meter
  S.hit = (st, step, ok) => {
    const c = step.stormcx; if (!c) return null;
    const x = cxs(st)[c]; if (!x || x.done) return null;
    if (!ok) { x.ok = 0; return null; }
    const src = step.sid || step.key;
    if (src && x.src.includes(src) && !step.storm) return null; // it must be a new sentence to count
    x.ok++;
    if (x.ok >= x.need) return clear(st, c);
    A.saveSoon();
    return null;
  };
  function clear(st, c) {
    const B = S.box(st), x = cxs(st)[c];
    x.done = Date.now(); x.ok = x.need;
    const gone = B.list.filter((e) => (e.cx || (e.sid ? conceptOf({ sid: e.sid }) : e.key ? 'w:' + e.key : null)) === c);
    B.list = B.list.filter((e) => !gone.includes(e));
    const k = Math.max(1, Math.min(3, gone.length || 1));
    B.calm += k; B.log.unshift({ i: c, at: Date.now(), lv: lvOf(x) }); if (B.log.length > 40) B.log.length = 40;
    try { if (A.voyage && A.voyage.addPearls) A.voyage.addPearls(2 + k, st); } catch (e) { /* extras */ }
    A.track('storm_clear', { c, n: x.n });
    try { if (A.collect) A.collect.fragment(st, 'storm cleared'); } catch (e) { /* extras */ }
    A.toast('🌈 Storm cleared: ' + nameOf(c)[0] + '! · สยบพายุได้แล้ว', 2800);
    A.saveSoon();
    return c;
  }

  // ---- building questions on an idea, always with sentences she did not miss before
  function questionsFor(st, c, n, skip) {
    const out = [], x = cxs(st)[c] || { src: [] }, R = Math.max(reach(st), x.u || 1);
    if (c.startsWith('w:')) {
      const k = c.slice(2);
      ['wfit', 'pic', 'wfit'].slice(0, n).forEach((kind) => { const q = A.wordQuizFor(k, kind, R); if (q) out.push(q); });
      // the word inside a sentence she has not met with a mistake
      const sids = A.shuffle(A.sentsUpTo(R).filter((sid) => !skip.has(sid) && A.S(sid) && A.S(sid).t.some((t) => A.keyOf && A.keyOf(t) === k)));
      for (const sid of sids) { if (out.length >= n + 1) break; const q = A.sentQuiz(sid, A.sentsUpTo(R), ['gap', 'pick', 'build']); if (q) { out.push(q); skip.add(sid); } }
    } else {
      const pool = A.sentsUpTo(R);
      const cands = A.shuffle(pool.filter((sid) => !skip.has(sid) && !x.src.includes(sid) && (A.sentSkills(sid) || []).includes(c)));
      for (const sid of cands) {
        if (out.length >= n) break;
        const pref = out.length % 3 === 0 ? ['gap', 'pick', 'build'] : out.length % 3 === 1 ? ['pick', 'gap', 'build'] : ['build', 'gap', 'pick'];
        const q = A.sentQuiz(sid, pool, pref);
        if (!q) continue;
        if (q.type === 'gap' && A.gapSkill(q.gap) !== c && c !== 'question') continue;
        out.push(q); skip.add(sid);
      }
    }
    return out.slice(0, Math.max(n, 1)).map((q) => ({ ...q, stormcx: c }));
  }

  // ⚡ Storm Training
  S.trainSteps = (st) => {
    const list = active(st);
    const wallU = reach(st) + 1;
    list.sort((a, b) => ((b.u < wallU && b.n >= 2) - (a.u < wallU && a.n >= 2)) || b.n - a.n || a.u - b.u);
    const skip = new Set(), pick = [], groups = [];
    for (const x of list) { if (pick.length >= 3) break; const g = questionsFor(st, x.c, Math.min(5, x.need - x.ok + 1), skip); if (g.length) { pick.push(x); groups.push(g); } }
    if (!pick.length) return [];
    const steps = [{ type: 'stormeye', cx: pick.map((x) => x.c) }];
    // mix the ideas so each comes back a few times
    for (let i = 0; i < 6; i++) groups.forEach((g) => { if (g[i]) steps.push(g[i]); });
    return steps;
  };
  // ⚡ squalls inside a normal lesson
  S.squalls = (st, u, skip, n) => {
    const list = active(st).filter((x) => x.u <= u).sort((a, b) => b.n - a.n);
    const out = [];
    for (const x of list.slice(0, n)) { const q = questionsFor(st, x.c, 1, new Set(skip))[0]; if (q) out.push({ ...q, squall: 1 }); }
    return out;
  };
  // the test's Storm Round now uses new sentences too
  S.roundSteps = (st, u, used) => {
    const list = active(st).filter((x) => x.u <= u).sort((a, b) => b.n - a.n).slice(0, 3);
    const skip = new Set(used), out = [];
    list.forEach((x) => { const q = questionsFor(st, x.c, 1, skip)[0]; if (q) out.push({ ...q, storm: lvOf(x) }); });
    return out;
  };
  // 🌀 the Storm Wall before a new chapter
  S.wall = (st, u) => active(st).filter((x) => x.u < u && x.n >= 2 && !x.c.startsWith('w:'));

  // ---- settle: what happened to her storms in this session
  const baseSettle = S.settle.bind(S);
  S.settle = (st, ses) => {
    const hits = ses.steps.filter((x) => x.stormcx);
    if (!hits.length) return baseSettle(st, ses);
    const X = cxs(st), seen = A.uniq(hits.map((x) => x.stormcx));
    const calmed = [], stayed = [];
    seen.forEach((c) => { const x = X[c]; if (!x) return; const lab = nameOf(c)[0]; if (x.done && x.done >= ses.started) calmed.push({ label: lab, lv: lvOf(x) }); else stayed.push({ label: lab + ' · ' + (x.ok || 0) + '/' + x.need, lv: lvOf(x) }); });
    A.track('storm_round', { calmed: calmed.length, stayed: stayed.length, kind: ses.kind });
    return { calmed, stayed, total: S.box(st).calm };
  };

  // ---- the Storm Eye briefing (first screen of Storm Training)
  A.RENDER.stormeye = (step, ctl) => {
    const st = A.state, X = cxs(st);
    return h('div', { class: 'storm-gate eye' },
      h('div', { class: 'sg-sky', 'aria-hidden': 'true' }, h('i', { class: 'bolt b1' }), ...Array.from({ length: 10 }, (_, i) => h('i', { class: 'drop', style: { left: (i * 10 + 4) + '%', animationDelay: (i * 0.17) + 's' } }))),
      h('div', { class: 'sg-ic' }, '🌀'),
      h('h2', null, 'Storm Training'),
      h('p', { class: 'th' }, 'ฝึกเรื่องที่คุณยังพลาด ด้วยประโยคใหม่ทั้งหมด'),
      h('div', { class: 'eye-list' }, ...step.cx.map((c) => {
        const x = X[c] || { ok: 0, need: 2, n: 1 }, nm = nameOf(c);
        return h('div', { class: 'eye-row' }, h('span', { class: 'eye-ic' }, CLOUD[lvOf(x)]), h('div', { style: { flex: 1, textAlign: 'left' } }, h('b', null, nm[0]), h('small', { class: 'th' }, nm[1])),
          h('span', { class: 'eye-meter' }, ...Array.from({ length: x.need }, (_, i) => h('i', { class: i < x.ok ? 'on' : '' }))));
      })),
      h('div', { class: 'sg-prize' }, 'Get each one right ' + 'in new sentences to clear it 🌈'),
      h('button', { class: 'btn primary block', onclick: () => ctl.next() }, '⚡ Start'));
  };
  // a better label on storm questions
  const baseLabel = S.label.bind(S);
  S.label = (step) => {
    if (!step.stormcx) return baseLabel(step);
    const x = cxs(A.state)[step.stormcx] || { ok: 0, need: 2, n: 1 }, nm = nameOf(step.stormcx);
    return h('div', { class: 'storm-tag lv' + lvOf(x) }, h('span', { class: 'storm-ic' }, step.squall ? '⚡' : CLOUD[lvOf(x)]),
      h('div', { style: { flex: 1 } }, h('b', null, (step.squall ? 'Squall · ' : 'Storm · ') + nm[0]), h('small', { class: 'th' }, 'ประโยคใหม่ เรื่องที่คุณเคยพลาด')),
      h('span', { class: 'eye-meter sm' }, ...Array.from({ length: x.need }, (_, i) => h('i', { class: i < x.ok ? 'on' : '' }))));
  };

  // ---- the new Storm Jar card
  const baseJar = S.jar.bind(S);
  S.jar = (st) => {
    const card = baseJar(st);
    try {
      const list = active(st).sort((a, b) => b.n - a.n), wall = S.wall(st, reach(st) + 1);
      const body = h('div', { class: 'eye-panel' },
        list.length ? h('div', { class: 'eye-cells' }, ...list.slice(0, 8).map((x) => { const nm = nameOf(x.c); return h('div', { class: 'eye-cell lv' + lvOf(x) }, h('span', { class: 'eye-ic' }, CLOUD[lvOf(x)]), h('div', { style: { flex: 1, minWidth: 0 } }, h('b', null, nm[0]), h('small', { class: 'th' }, nm[1])), h('span', { class: 'eye-meter sm' }, ...Array.from({ length: x.need }, (_, i) => h('i', { class: i < x.ok ? 'on' : '' })))); }))
          : h('div', { class: 'small' }, '💙 No storms right now. Your sky is clear!'),
        wall.length ? h('div', { class: 'eye-wall' }, '🌀 Storm Wall: clear ' + wall.length + ' storm' + (wall.length > 1 ? 's' : '') + ' before the next chapter. · เคลียร์พายุก่อนไปบทถัดไป') : null,
        list.length ? h('button', { class: 'btn mango block', onclick: () => A.play('storm') }, '⚡ Storm Training · ' + Math.min(3, list.length) + ' storm' + (Math.min(3, list.length) > 1 ? 's' : '')) : null);
      card.append(body);
      card.classList.add('eye-jar');
    } catch (e) { /* keep the old card */ }
    return card;
  };
  S.active = active; S.cxs = cxs; S.nameOf = nameOf;
})();
