/* garden.js — the Word Reef: every word she meets is a coral. Corals grow into new kinds when she remembers them
   (polyp → sea fan → brain coral → staghorn → tube coral → rainbow reef) and fade white (bleach) when it is time
   to see them again, so no word is forgotten.
   Spaced repetition made for a slow, gentle pace: short gaps at first, longer ones as the word gets strong.
   Also: the Word Chest bonus lessons (8 new words per chapter) and a memory-match game. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h, VOC = window.VOCAB || {};
  if (!A || !A.RENDER || !A.VIEWS) return;
  const C = A.C, D = C.dict, DAY = 864e5, DEFS = window.DEFS || {}, WOTD = window.WOTD || [];
  const STAGE_N = ['Polyp', 'Sea fan', 'Brain coral', 'Staghorn', 'Tube coral', 'Rainbow reef'];
  const STAGE_TH = ['ตัวอ่อนปะการัง', 'กัลปังหา', 'ปะการังสมอง', 'ปะการังเขากวาง', 'ปะการังท่อ', 'แนวปะการังสีรุ้ง'];
  // a small hand-drawn coral for each stage (SVG). Faded words show the same coral bleached white.
  function coral(stage, size, faded) {
    const k = Math.max(0, Math.min(5, stage | 0)), z = size || 34;
    return '<img class="coral' + (faded ? ' faded' : '') + '" src="img/coral/c' + k + '.webp" width="' + z + '" height="' + z + '" alt="" draggable="false" decoding="async">';
  }
  const coralEl = (stage, size, faded) => h('span', { class: 'coral-w', html: coral(stage, size, faded) });
  // days until she sees the word again, by level (short at first: she forgets easily)
  const GAP = [0.02, 1, 2, 4, 7, 15, 30, 60];
  const KEEP = ['v', 'n', 'adj', 'adv', 'phr', 'n0', 'int'];

  // ------------------------------------------------------------- words
  const vocWord = {}; // 'v:word' -> entry
  Object.entries(VOC).forEach(([u, L]) => L.forEach((v) => { vocWord['v:' + v[0].toLowerCase()] = { u: +u, v }; }));
  const idOfVocab = (v) => (D[v[0].toLowerCase()] ? 'd:' + v[0].toLowerCase() : 'v:' + v[0].toLowerCase());
  const wotdBy = {}; WOTD.forEach((x) => { wotdBy['o:' + x[0]] = x; });
  const defOf = (w) => DEFS[w] || DEFS[w.toLowerCase()] || (WOTD.find((x) => x[0] === w.toLowerCase()) || [])[4] || '';
  function item(id) {
    if (id.startsWith('o:')) { const x = wotdBy[id]; return x ? { id, w: x[0], th: x[1], pr: x[2], e: x[3], def: x[4], ex: x[5], exth: x[6], adv: 1 } : null; }
    const it = item0(id); if (it) it.def = defOf(it.w); return it;
  }
  function item0(id) {
    if (id.startsWith('d:')) {
      const e = D[id.slice(2)]; if (!e) return null;
      const ex = (e.ex && e.ex[0]) || null;
      const vv = vocWord['v:' + id.slice(2)];
      return { id, w: A.fill(e.w), th: A.thShort(e.th), pr: e.pr || (vv && vv.v[2]) || '', e: e.e || (vv && vv.v[3]) || '•', ex: ex ? ex[0] : vv ? vv.v[4] : '', exth: ex ? ex[1] : vv ? vv.v[5] : '', dict: id.slice(2) };
    }
    const x = vocWord[id]; if (!x) return null;
    const v = x.v; return { id, w: v[0], th: v[1], pr: v[2], e: v[3], ex: v[4], exth: v[5] };
  }
  const vg = (st) => st.vg || (st.vg = {});
  // every word she has met: in lessons (seen or taught) and in Word Chests
  function met(st) {
    const out = new Set();
    const add = (k) => { const e = D[k]; if (!e) return; const b = e.base && D[e.base] ? e.base : k; const be = D[b]; if (be && KEEP.includes(be.p) && be.w.length > 2) out.add('d:' + b); };
    Object.keys(st.wseen || {}).forEach(add);
    Object.keys(st.srs || {}).forEach((k) => { if (k.startsWith('w:')) add(k.slice(2)); });
    Object.keys(vg(st)).forEach((id) => out.add(id));
    return [...out].filter((id) => item(id));
  }
  const lv = (st, id) => (vg(st)[id] ? vg(st)[id].lv : -1);
  const thirsty = (st, id) => { const g = vg(st)[id]; return !!g && g.due <= Date.now(); };
  const stageOf = (st, id) => Math.max(0, Math.min(5, lv(st, id)));
  function grade(st, id, ok) {
    const G = vg(st), g = G[id] || (G[id] = { lv: 0, due: 0, ok: 0, no: 0, t: Date.now() });
    if (ok) { g.lv = Math.min(GAP.length - 1, g.lv + 1); g.ok++; } else { g.lv = Math.max(0, g.lv - 2); g.no++; }
    g.due = Date.now() + (ok ? GAP[g.lv] : GAP[0]) * DAY; g.last = Date.now();
    A.saveSoon();
  }
  function counts(st) {
    const all = met(st), c = { all: all.length, thirsty: 0, seeds: 0, st: [0, 0, 0, 0, 0, 0] };
    all.forEach((id) => { if (!vg(st)[id]) c.seeds++; else { c.st[stageOf(st, id)]++; if (thirsty(st, id)) c.thirsty++; } });
    return c;
  }
  // what to water now: thirsty words first (the weakest first), then a few new seeds
  function pickWater(st, max) {
    const all = met(st), now = Date.now(), G = vg(st);
    const due = all.filter((id) => G[id] && G[id].due <= now).sort((a, b) => G[a].lv - G[b].lv || G[a].due - G[b].due);
    const weak = (id) => { const s = id.startsWith('d:') && st.srs['w:' + id.slice(2)]; return s ? s.w - s.c : 0; };
    const seeds = all.filter((id) => !G[id]).sort((a, b) => weak(b) - weak(a) || (((D[a.slice(2)] || {}).u || 0) - ((D[b.slice(2)] || {}).u || 0)));
    return due.slice(0, max).concat(seeds.slice(0, Math.max(0, Math.min(4, max - due.length))));
  }

  // ------------------------------------------------------------- the questions
  const others = (st, id, n) => A.shuffle(met(st).filter((x) => x !== id).map(item).filter(Boolean)).concat(A.shuffle(Object.keys(vocWord).map(item))).filter((x, i, a) => x.id !== id && a.findIndex((y) => y.w.toLowerCase() === x.w.toLowerCase() || y.th === x.th) === i).slice(0, n);
  function quiz(st, id, type) {
    const it = item(id); if (!it) return null;
    const wrong = others(st, id, 3).filter((x) => x.th !== it.th && x.w.toLowerCase() !== it.w.toLowerCase()).slice(0, 3);
    return { type, gid: id, sk: 'vocab', opts: A.shuffle([it, ...wrong]) };
  }
  A.gardenSteps = (st, ids, opts) => {
    const steps = [];
    ids.forEach((id) => { if (!vg(st)[id] || (opts && opts.cards)) steps.push({ type: 'gcard', gid: id }); });
    ids.forEach((id, i) => { const q = quiz(st, id, ['gmean', 'gword', 'gear'][i % 3]); if (q) steps.push(q); });
    if (opts && opts.fill) A.shuffle(ids.slice()).forEach((id) => { const q = quiz(st, id, 'gfill'); if (q && item(id).ex && new RegExp('\\b' + esc(item(id).w) + '\\b', 'i').test(item(id).ex)) steps.push(q); });
    if (opts && opts.twice) A.shuffle(ids.slice()).forEach((id, i) => { const q = quiz(st, id, ['gword', 'gmean'][i % 2]); if (q) steps.push(q); });
    return steps;
  };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const say = (t, big) => h('button', { class: 'icon-btn' + (big ? ' g-say' : ''), 'aria-label': 'Listen', onclick: (e) => { e.stopPropagation(); A.speech.say(t); } }, '🔊');
  const optBox = (opts, label, onPick) => {
    const box = h('div', { class: 'opts g-opts' });
    opts.forEach((o) => box.append(h('button', { class: 'opt', onclick: (e) => { if (box.dataset.done) return; box.dataset.done = '1'; onPick(o, e.currentTarget, box); } }, label(o))));
    return box;
  };
  const mark = (box, right, b, ok) => [...box.children].forEach((x, i) => { if (i === right) x.classList.add('right'); else if (x === b && !ok) x.classList.add('wrong'); else x.classList.add('dim'); });
  const head = (ic, en, th) => h('div', { class: 'q-kind' }, ic + ' ' + en, h('span', { class: 'th muted small' }, '  · ' + th));
  function answer(step, ctl, ok, it, a) {
    if (A.session && A.session.kind === 'garden') grade(A.state, step.gid, ok);
    ctl.answer(step, ok, { q: it.w, a, c: it.w + ' = ' + it.th, show: it.w + ' = ' + it.th, showTh: it.ex ? it.ex + ' · ' + it.exth : '', say: it.w, exp: null, note: it.pr ? 'Say it: ' + it.pr : '' });
  }
  A.RENDER.gcard = (step, ctl) => {
    const it = item(step.gid);
    setTimeout(() => A.speech.say(it.w), 250);
    return h('div', { class: 'stack', style: { gap: '14px' } }, head('🪸', 'New word', 'คำศัพท์ใหม่'),
      h('div', { class: 'g-card' },
        h('div', { class: 'g-emo' }, A.emoEl(it.e)),
        h('div', { class: 'row', style: { gap: '8px', justifyContent: 'center', alignItems: 'center' } }, h('h2', { class: 'g-w' }, it.w), say(it.w, true)),
        it.pr ? h('div', { class: 'g-pr th' }, '🗣️ ' + it.pr) : null,
        h('div', { class: 'g-th th' }, it.th),
        it.def ? h('div', { class: 'g-def' }, '📘 ' + it.def) : null,
        it.ex ? h('div', { class: 'g-ex' }, h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('span', { style: { flex: 1 } }, it.ex), say(it.ex)), h('div', { class: 'th small muted' }, it.exth)) : null,
        h('div', { class: 'small muted' }, '💡 Say it out loud 3 times. Picture ' + it.e + ' in your mind. · พูดออกเสียง 3 ครั้ง')),
      h('button', { class: 'btn primary block', onclick: () => ctl.next() }, 'I’ve got it 🪸'));
  };
  A.RENDER.gmean = (step, ctl) => {
    const it = item(step.gid);
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🤔', 'What does it mean?', 'แปลว่าอะไร'),
      h('div', { class: 'g-q' }, h('span', { class: 'g-qe' }, A.emoEl(it.e)), h('b', null, it.w), say(it.w)),
      optBox(step.opts, (o) => h('span', { class: 'th' }, o.th), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.th); }));
  };
  A.RENDER.gword = (step, ctl) => {
    const it = item(step.gid);
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🔤', 'Which English word?', 'คำภาษาอังกฤษคือคำไหน'),
      h('div', { class: 'g-q' }, h('span', { class: 'g-qe' }, A.emoEl(it.e)), h('b', { class: 'th' }, it.th)),
      optBox(step.opts, (o) => h('span', null, o.w), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.w); A.speech.say(it.w); }));
  };
  A.RENDER.gear = (step, ctl) => {
    const it = item(step.gid);
    setTimeout(() => A.speech.say(it.w), 250);
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('👂', 'Listen. Which word?', 'ฟังแล้วเลือกคำ'),
      h('div', { class: 'g-q' }, h('button', { class: 'btn ghost', onclick: () => A.speech.say(it.w) }, '🔊 Play again')),
      optBox(step.opts, (o) => h('span', null, A.emoEl(o.e), ' ' + o.w), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.w); }));
  };
  A.RENDER.gfill = (step, ctl) => {
    const it = item(step.gid), gap = it.ex.replace(new RegExp('\\b' + esc(it.w) + '\\b', 'i'), '_____');
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('✏️', 'Fill the gap', 'เติมคำในช่องว่าง'),
      h('div', { class: 'g-q g-fill' }, h('b', null, gap), h('div', { class: 'th small muted' }, it.exth)),
      optBox(step.opts, (o) => h('span', null, o.w), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.w); A.speech.say(it.ex); }));
  };

  // ------------------------------------------------------------- Word Chest: the bonus lesson with 8 new words a chapter
  A.vocabSteps = (arg, st) => {
    const u = +String(arg).split(':')[1], L = VOC[u]; if (!L) return [];
    const ids = L.map(idOfVocab);
    return A.gardenSteps(st, ids, { cards: true, fill: true, twice: true });
  };
  const vocabFinish = (st, ses, acc) => {
    if (ses.kind !== 'vocab' || acc < 70) return null;
    const u = +String(ses.arg).split(':')[1];
    (VOC[u] || []).forEach((v) => { const id = idOfVocab(v), G = vg(st); if (!G[id] || G[id].lv < 1) G[id] = { lv: 1, due: Date.now() + DAY, ok: 1, no: 0, t: Date.now() }; });
    st.bonus = st.bonus || {};
    const prev = st.bonus[ses.arg], stars = acc >= 90 ? 3 : 2;
    st.bonus[ses.arg] = { s: Math.max(stars, (prev && prev.s) || 0), a: Math.max(acc, (prev && prev.a) || 0), t: Date.now(), n: ((prev && prev.n) || 0) + 1 };
    return !prev;
  };

  // ------------------------------------------------------------- Shell Match: find the word that goes with each English meaning
  // Clams open to show a word or its meaning (an easy English explanation). Two clams that belong together become a pearl.
  function matchGame(st) {
    const withDef = (id) => { const it = item(id); return it && it.def && it.def.length < 64; };
    const reach = A.reachedUnit(st, A.user && A.user.cfg);
    let pool = met(st).filter((id) => vg(st)[id] && withDef(id)).sort((a, b) => lv(st, a) - lv(st, b)).slice(0, 12);
    if (pool.length < 5) pool = pool.concat(A.shuffle(Object.entries(VOC).filter(([u]) => +u <= Math.max(reach, 1) + 1).flatMap(([, L]) => L.map(idOfVocab)).filter((id) => withDef(id) && !pool.includes(id))));
    const ids = A.uniq(A.shuffle(pool.slice(0, 12))).slice(0, 5);
    if (ids.length < 3) { A.toast('Learn a few more words first! · เรียนคำศัพท์เพิ่มอีกหน่อยนะ'); return; }
    const cards = A.shuffle(ids.flatMap((id) => { const it = item(id); return [{ id, f: 'w', it }, { id, f: 'd', it }]; }));
    let open = [], found = 0, tries = 0; const t0 = Date.now();
    const pearls = h('div', { class: 'sm-pearls' }, ...ids.map(() => h('i')));
    const info = h('div', { class: 'small muted', style: { textAlign: 'center' } }, 'Open two clams: a word and its meaning. · เปิดหอยสองตัว: คำศัพท์และความหมายของมัน');
    const grid = h('div', { class: 'sm-grid' });
    cards.forEach((c) => {
      const face = c.f === 'w' ? h('span', { class: 'sm-face w' }, h('i', null, A.emoEl(c.it.e)), h('b', null, c.it.w)) : h('span', { class: 'sm-face d' }, h('span', null, c.it.def));
      const el = h('button', { class: 'sm-card', 'aria-label': 'clam' }, h('span', { class: 'sm-shell', html: '<svg viewBox="0 0 60 40" aria-hidden="true"><defs><linearGradient id="smg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9e2"/><stop offset="1" stop-color="#f49ab3"/></linearGradient></defs><path d="M30 4C14 4 4 16 4 30h52C56 16 46 4 30 4z" fill="url(#smg)" stroke="#e07a98" stroke-width="1.5"/>' + [12, 20, 30, 40, 48].map((x) => '<path d="M30 30L' + x + ' 8" stroke="#e07a98" stroke-width="1" opacity=".6"/>').join('') + '<rect x="4" y="30" width="52" height="6" rx="3" fill="#e9a3b8"/></svg>' }), face);
      el.onclick = () => {
        if (el.classList.contains('up') || open.length >= 2) return;
        el.classList.add('up'); if (c.f === 'w') A.speech.say(c.it.w); open.push([c, el]);
        if (open.length === 2) {
          tries++;
          const [[a, ea], [b, eb]] = open;
          if (a.id === b.id && a.f !== b.f) {
            setTimeout(() => {
              ea.classList.add('done'); eb.classList.add('done'); open = []; pearls.children[found].classList.add('on'); found++;
              A.sfx && A.sfx.play && A.sfx.play('good');
              if (found === ids.length) {
                const sec = Math.round((Date.now() - t0) / 1000);
                const p = A.voyage && A.voyage.addPearls ? A.voyage.addPearls(2, st) : 0;
                A.track('reef_match', { pairs: found, tries, sec }); A.saveSoon();
                info.replaceChildren('🎉 All ' + found + ' pairs in ' + tries + ' tries · ' + sec + 's' + (p ? ' · +' + p + ' pearls' : ''));
                A.confetti && A.confetti();
              }
            }, 450);
          } else setTimeout(() => { ea.classList.remove('up'); eb.classList.remove('up'); open = []; }, 1400);
        }
      };
      grid.append(el);
    });
    A.sheet(h('div', { class: 'stack sm-wrap', style: { gap: '10px' } }, h('h2', null, '🐚 Shell match'), info, pearls, grid));
  }

  // ------------------------------------------------------------- the garden page (replaces the old word list)
  let gTab = 'thirsty', gQ = '';
  A.VIEWS.words = () => {
    const st = A.state, c = counts(st);
    const root = h('div', { class: 'screen garden' });
    const water = pickWater(st, 12);
    const hero = h('div', { class: 'g-hero' },
      h('div', { class: 'g-sky', 'aria-hidden': 'true' }, h('i', { class: 'ray' }), ...Array.from({ length: 10 }, (_, i) => h('i', { class: 'bub', style: { left: (i * 10 + 3) + '%', animationDelay: (i * 0.9) + 's', width: (4 + (i % 3) * 3) + 'px', height: (4 + (i % 3) * 3) + 'px' } })), h('i', { class: 'fish f1' }, '🐠'), h('i', { class: 'fish f2' }, '🐟')),
      h('div', { class: 'g-title' }, h('h1', null, 'My Word Reef'), h('p', { class: 'th' }, 'แนวปะการังคำศัพท์ของฉัน · ' + c.all + ' words')),
      h('div', { class: 'g-bed' }, ...STAGE_N.map((n, i) => h('div', { class: 'g-plant' }, h('span', { class: 'g-pe' }, coralEl(i, 40 + i * 4)), h('b', null, i === 0 ? c.st[0] + c.seeds : c.st[i]), h('small', null, n)))),
      h('div', { class: 'g-cta' },
        h('button', { class: 'btn mango block', disabled: water.length ? null : true, onclick: () => A.play('garden') }, c.thirsty ? '✨ Bring back ' + Math.min(12, c.thirsty) + ' fading coral' + (c.thirsty > 1 ? 's' : '') : water.length ? '🪸 Grow ' + water.length + ' new corals' : '💙 Your reef is healthy! Come back later'),
        h('button', { class: 'btn ghost block', onclick: () => matchGame(st) }, '🐚 Shell match')),
      c.thirsty ? h('div', { class: 'g-note th' }, '🤍 ' + c.thirsty + ' words are fading white. Review them to bring their colour back! · มีคำศัพท์ที่กำลังซีดจาง ทบทวนเพื่อให้กลับมามีสีสัน') : h('div', { class: 'g-note th' }, '💙 Each word you remember grows into a new coral. Fading words come back at the right time. · คำที่จำได้จะเติบโตเป็นปะการังชนิดใหม่'));
    root.append(hero);
    const input = h('input', { class: 'input', placeholder: 'Search English or Thai · ค้นหา', value: gQ, oninput: (e) => { gQ = e.target.value; render(); } });
    root.append(h('div', { class: 'search' }, input));
    root.append(h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, [['thirsty', '🤍 Fading'], ['grow', '🪸 Growing'], ['tree', '🌈 Strong'], ['seed', '🥚 New'], ['all', '📖 All']].map(([k, t]) => h('button', { class: 'chip' + (gTab === k ? ' on' : ''), onclick: () => { gTab = k; render(); [...root.querySelectorAll('.chip')].forEach((x) => x.classList.toggle('on', x.textContent === t)); } }, t))));
    const list = h('div', { class: 'g-list' });
    root.append(list);
    function render() {
      A.clear(list);
      const q = gQ.trim().toLowerCase();
      let ids = met(st);
      if (q) {
        const dictHits = Object.keys(D).filter((k) => !D[k].base && (k.toLowerCase().includes(q) || (D[k].th || '').includes(q))).map((k) => 'd:' + k);
        const vocHits = Object.keys(vocWord).filter((id) => { const it = item(id); return it.w.toLowerCase().includes(q) || it.th.includes(q); });
        ids = A.uniq([...ids.filter((id) => { const it = item(id); return it.w.toLowerCase().includes(q) || it.th.includes(q); }), ...dictHits, ...vocHits]).filter((id) => item(id)).slice(0, 120);
      } else if (gTab === 'thirsty') ids = ids.filter((id) => thirsty(st, id));
      else if (gTab === 'grow') ids = ids.filter((id) => vg(st)[id] && stageOf(st, id) < 5);
      else if (gTab === 'tree') ids = ids.filter((id) => vg(st)[id] && stageOf(st, id) >= 4);
      else if (gTab === 'seed') ids = ids.filter((id) => !vg(st)[id]);
      ids.sort((a, b) => (lv(st, a) - lv(st, b)) || item(a).w.localeCompare(item(b).w));
      if (!ids.length) list.append(h('p', { class: 'th muted', style: { padding: '14px 4px' } }, gTab === 'thirsty' && !q ? '💙 No fading corals right now. Well done! · ตอนนี้ไม่มีคำที่ซีดจาง' : 'Nothing here yet · ยังไม่มีคำ'));
      ids.slice(0, 400).forEach((id) => {
        const it = item(id), g = vg(st)[id], s = g ? stageOf(st, id) : 0, th = thirsty(st, id);
        list.append(h('button', { class: 'g-chip' + (th ? ' thirsty' : '') + (g ? '' : ' seed'), onclick: () => cardSheet(st, id) },
          h('span', { class: 'g-ce' }, A.emoEl(it.e)), h('span', { class: 'g-ct' }, h('b', null, it.w), h('small', { class: 'th' }, it.th)),
          h('span', { class: 'g-cs', title: g ? STAGE_N[s] : 'not grown yet' }, g ? coralEl(s, 30, th) : h('span', { class: 'g-egg' }, '🥚'))));
      });
    }
    render();
    return root;
  };
  function cardSheet(st, id) {
    const it = item(id), g = vg(st)[id], s = g ? stageOf(st, id) : -1;
    A.speech.say(it.w);
    const sh = A.sheet(h('div', { class: 'stack', style: { gap: '10px', textAlign: 'center' } },
      h('div', { class: 'g-emo' }, A.emoEl(it.e)),
      h('div', { class: 'row', style: { gap: '8px', justifyContent: 'center', alignItems: 'center' } }, h('h2', { class: 'g-w', style: { color: 'inherit' } }, it.w), say(it.w)),
      it.pr ? h('div', { class: 'th muted' }, '🗣️ ' + it.pr) : null,
      h('div', { class: 'th', style: { fontSize: '1.15rem' } }, it.th),
      it.ex ? h('div', { class: 'g-ex', style: { textAlign: 'left' } }, h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('span', { style: { flex: 1 } }, it.ex), say(it.ex)), h('div', { class: 'th small muted' }, it.exth)) : null,
      it.def ? h('div', { class: 'g-def' }, '📘 ' + it.def) : null,
      h('div', { class: 'g-grow' }, ...STAGE_N.map((n, i) => h('span', { class: i <= s ? 'on' : '', title: n }, coralEl(i, 30, false)))),
      h('div', { class: 'small muted' }, g ? (STAGE_N[s] + ' · ' + STAGE_TH[s] + ' · ' + (thirsty(st, id) ? '🤍 fading, review it now' : 'next review: ' + new Date(g.due).toLocaleDateString())) : '🥚 Not grown yet. Tap "Grow new corals" to start it.'),
      it.dict ? h('button', { class: 'btn ghost block', onclick: () => { sh.close(); A.wordPopup(it.dict); } }, 'More: grammar and examples') : null));
  }

  // ------------------------------------------------------------- word of the day + thirsty reminder on the home page
  A.garden = {
    item, met, counts, grade, pickWater, vg, idOfVocab, matchGame, vocabFinish,
    homeCard(st) {
      const c = counts(st);
      // an advanced word every day: Word of the day words first, then the harder Word Chest words; strong ones are skipped
      const n = Math.floor(Date.now() / DAY);
      const strong = (id) => vg(st)[id] && vg(st)[id].lv >= 4;
      const pool = WOTD.map((x) => 'o:' + x[0]).concat(Object.entries(VOC).filter(([u]) => +u >= 13).flatMap(([, L]) => L.map(idOfVocab))).filter((id) => item(id) && !strong(id));
      const pick = pool.length ? pool[(n * 7) % pool.length] : null;
      if (!pick) return null;
      const it = item(pick), have = !!vg(st)[pick];
      return h('div', { class: 'card g-home' },
        h('div', { class: 'g-wod', onclick: () => cardSheet(st, pick) },
          h('span', { class: 'g-wode' }, A.emoEl(it.e)),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('small', { class: 'muted' }, '✨ Word of the day · คำศัพท์ประจำวัน'),
            h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('b', { class: 'g-wodw' }, it.w), say(it.w)),
            it.def ? h('div', { class: 'small' }, it.def) : null,
            h('div', { class: 'th small muted' }, it.th + (it.pr ? ' · ' + it.pr : '')))),
        h('div', { class: 'row', style: { gap: '8px' } },
          have ? null : h('button', { class: 'btn ghost', style: { flex: 1 }, onclick: (e) => { const G = vg(st); G[pick] = { lv: 0, due: Date.now() + GAP[0] * DAY, ok: 0, no: 0, t: Date.now() }; A.saveSoon(); A.track('wotd_add', { w: it.w }); e.currentTarget.replaceWith(h('span', { class: 'small', style: { flex: 1, alignSelf: 'center' } }, '🪸 Added to your reef')); } }, '🪸 Add to my reef'),
          h('button', { class: 'btn ' + (c.thirsty ? 'mango' : 'ghost'), style: { flex: 1 }, onclick: () => (c.thirsty || pickWater(st, 12).length ? A.play('garden') : A.go('words')) }, c.thirsty ? '✨ ' + c.thirsty + ' fading' : '🪸 My Word Reef')));
    },
  };
})();
