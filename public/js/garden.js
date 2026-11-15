/* garden.js — the Word Garden: every word she meets is a plant. Words grow when she remembers them
   (🌱 → 🌿 → ☘️ → 🌷 → 🌸 → 🌳) and get thirsty (🥀) when it is time to see them again, so no word is forgotten.
   Spaced repetition made for a slow, gentle pace: short gaps at first, longer ones as the word gets strong.
   Also: the Word Chest bonus lessons (8 new words per chapter) and a memory-match game. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h, VOC = window.VOCAB || {};
  if (!A || !A.RENDER || !A.VIEWS) return;
  const C = A.C, D = C.dict, DAY = 864e5;
  const STAGE = ['🌱', '🌿', '☘️', '🌷', '🌸', '🌳'];
  const STAGE_N = ['Seed', 'Sprout', 'Leafy', 'Bud', 'Bloom', 'Tree'];
  const STAGE_TH = ['เมล็ด', 'ต้นอ่อน', 'แตกใบ', 'ตูม', 'บาน', 'ต้นไม้ใหญ่'];
  // days until she sees the word again, by level (short at first: she forgets easily)
  const GAP = [0.02, 1, 2, 4, 7, 15, 30, 60];
  const KEEP = ['v', 'n', 'adj', 'adv', 'phr', 'n0', 'int'];

  // ------------------------------------------------------------- words
  const vocWord = {}; // 'v:word' -> entry
  Object.entries(VOC).forEach(([u, L]) => L.forEach((v) => { vocWord['v:' + v[0].toLowerCase()] = { u: +u, v }; }));
  const idOfVocab = (v) => (D[v[0].toLowerCase()] ? 'd:' + v[0].toLowerCase() : 'v:' + v[0].toLowerCase());
  function item(id) {
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
    return h('div', { class: 'stack', style: { gap: '14px' } }, head('🌱', 'New word', 'คำศัพท์ใหม่'),
      h('div', { class: 'g-card' },
        h('div', { class: 'g-emo' }, it.e),
        h('div', { class: 'row', style: { gap: '8px', justifyContent: 'center', alignItems: 'center' } }, h('h2', { class: 'g-w' }, it.w), say(it.w, true)),
        it.pr ? h('div', { class: 'g-pr th' }, '🗣️ ' + it.pr) : null,
        h('div', { class: 'g-th th' }, it.th),
        it.ex ? h('div', { class: 'g-ex' }, h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('span', { style: { flex: 1 } }, it.ex), say(it.ex)), h('div', { class: 'th small muted' }, it.exth)) : null,
        h('div', { class: 'small muted' }, '💡 Say it out loud 3 times. Picture ' + it.e + ' in your mind. · พูดออกเสียง 3 ครั้ง')),
      h('button', { class: 'btn primary block', onclick: () => ctl.next() }, 'I’ve got it 🌱'));
  };
  A.RENDER.gmean = (step, ctl) => {
    const it = item(step.gid);
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🤔', 'What does it mean?', 'แปลว่าอะไร'),
      h('div', { class: 'g-q' }, h('span', { class: 'g-qe' }, it.e), h('b', null, it.w), say(it.w)),
      optBox(step.opts, (o) => h('span', { class: 'th' }, o.th), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.th); }));
  };
  A.RENDER.gword = (step, ctl) => {
    const it = item(step.gid);
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('🔤', 'Which English word?', 'คำภาษาอังกฤษคือคำไหน'),
      h('div', { class: 'g-q' }, h('span', { class: 'g-qe' }, it.e), h('b', { class: 'th' }, it.th)),
      optBox(step.opts, (o) => h('span', null, o.w), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.w); A.speech.say(it.w); }));
  };
  A.RENDER.gear = (step, ctl) => {
    const it = item(step.gid);
    setTimeout(() => A.speech.say(it.w), 250);
    return h('div', { class: 'stack', style: { gap: '16px' } }, head('👂', 'Listen. Which word?', 'ฟังแล้วเลือกคำ'),
      h('div', { class: 'g-q' }, h('button', { class: 'btn ghost', onclick: () => A.speech.say(it.w) }, '🔊 Play again')),
      optBox(step.opts, (o) => h('span', null, o.e + ' ' + o.w), (o, b, box) => { const ok = o.id === it.id; mark(box, step.opts.findIndex((x) => x.id === it.id), b, ok); answer(step, ctl, ok, it, o.w); }));
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

  // ------------------------------------------------------------- memory match (a little game in the garden)
  function matchGame(st) {
    let pool = met(st).filter((id) => vg(st)[id]).sort((a, b) => lv(st, a) - lv(st, b));
    if (pool.length < 6) pool = pool.concat(met(st).filter((id) => !vg(st)[id]));
    const ids = A.shuffle(pool.slice(0, 14)).slice(0, 6);
    if (ids.length < 3) { A.toast('Learn a few more words first! · เรียนคำศัพท์เพิ่มอีกหน่อยนะ'); return; }
    const cards = A.shuffle(ids.flatMap((id) => { const it = item(id); return [{ id, f: 'en', t: it.w, e: it.e }, { id, f: 'th', t: it.th, e: it.e }]; }));
    let open = [], found = 0, tries = 0; const t0 = Date.now();
    const grid = h('div', { class: 'mm-grid' });
    const info = h('div', { class: 'small muted', style: { textAlign: 'center' } }, 'Find the pairs: English ↔ Thai · จับคู่คำ');
    cards.forEach((c) => {
      const el = h('button', { class: 'mm-card', 'aria-label': 'card' }, h('span', { class: 'mm-back' }, '🍃'), h('span', { class: 'mm-front' + (c.f === 'th' ? ' th' : '') }, c.f === 'en' ? h('i', null, c.e) : null, h('b', null, c.t)));
      el.onclick = () => {
        if (el.classList.contains('up') || open.length >= 2) return;
        el.classList.add('up'); if (c.f === 'en') A.speech.say(c.t); open.push([c, el]);
        if (open.length === 2) {
          tries++;
          const [[a, ea], [b, eb]] = open;
          if (a.id === b.id && a.f !== b.f) { setTimeout(() => { ea.classList.add('done'); eb.classList.add('done'); open = []; found++; A.sfx && A.sfx.play && A.sfx.play('good');
            if (found === ids.length) { const sec = Math.round((Date.now() - t0) / 1000); const p = A.voyage && A.voyage.addPearls ? A.voyage.addPearls(2, st) : 0; A.track('garden_match', { pairs: found, tries, sec }); A.saveSoon();
              info.replaceChildren('🎉 All pairs in ' + tries + ' tries · ' + sec + 's' + (p ? ' · +' + p + ' pearls' : '')); A.confetti && A.confetti(); } }, 350); }
          else setTimeout(() => { ea.classList.remove('up'); eb.classList.remove('up'); open = []; }, 900);
        }
      };
      grid.append(el);
    });
    A.sheet(h('div', { class: 'stack', style: { gap: '10px' } }, h('h2', null, '🃏 Memory match'), info, grid));
  }

  // ------------------------------------------------------------- the garden page (replaces the old word list)
  let gTab = 'thirsty', gQ = '';
  A.VIEWS.words = () => {
    const st = A.state, c = counts(st);
    const root = h('div', { class: 'screen garden' });
    const water = pickWater(st, 12);
    const hero = h('div', { class: 'g-hero' },
      h('div', { class: 'g-sky', 'aria-hidden': 'true' }, h('i', { class: 'sun' }), ...Array.from({ length: 6 }, (_, i) => h('i', { class: 'cl', style: { left: (i * 17 + 4) + '%', animationDelay: (i * 1.3) + 's' } }))),
      h('div', { class: 'g-title' }, h('h1', null, 'My Word Garden'), h('p', { class: 'th' }, 'สวนคำศัพท์ของฉัน · ' + c.all + ' words')),
      h('div', { class: 'g-bed' }, ...STAGE.map((e, i) => h('div', { class: 'g-plant' }, h('span', { class: 'g-pe', style: { fontSize: (1.2 + i * 0.18) + 'rem' } }, e), h('b', null, i === 0 ? c.st[0] + c.seeds : c.st[i]), h('small', null, STAGE_N[i])))),
      h('div', { class: 'g-cta' },
        h('button', { class: 'btn mango block', disabled: water.length ? null : true, onclick: () => A.play('garden') }, c.thirsty ? '💧 Water ' + Math.min(12, c.thirsty) + ' thirsty word' + (c.thirsty > 1 ? 's' : '') : water.length ? '🌱 Plant ' + water.length + ' new words' : '✨ All watered! Come back later'),
        h('button', { class: 'btn ghost block', onclick: () => matchGame(st) }, '🃏 Memory match')),
      c.thirsty ? h('div', { class: 'g-note th' }, '🥀 ' + c.thirsty + ' words miss you. Water them before they wilt! · มีคำศัพท์รอให้รดน้ำ') : h('div', { class: 'g-note th' }, '💚 Words grow when you remember them. Thirsty words come back at the right time. · คำจะกลับมาให้ทบทวนในเวลาที่เหมาะสม'));
    root.append(hero);
    const input = h('input', { class: 'input', placeholder: 'Search English or Thai · ค้นหา', value: gQ, oninput: (e) => { gQ = e.target.value; render(); } });
    root.append(h('div', { class: 'search' }, input));
    root.append(h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, [['thirsty', '🥀 Thirsty'], ['grow', '🌿 Growing'], ['tree', '🌳 Strong'], ['seed', '🌱 New'], ['all', '📖 All']].map(([k, t]) => h('button', { class: 'chip' + (gTab === k ? ' on' : ''), onclick: () => { gTab = k; render(); [...root.querySelectorAll('.chip')].forEach((x) => x.classList.toggle('on', x.textContent === t)); } }, t))));
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
      if (!ids.length) list.append(h('p', { class: 'th muted', style: { padding: '14px 4px' } }, gTab === 'thirsty' && !q ? '💚 No thirsty words right now. Well done! · ไม่มีคำที่ต้องรดน้ำตอนนี้' : 'Nothing here yet · ยังไม่มีคำ'));
      ids.slice(0, 400).forEach((id) => {
        const it = item(id), g = vg(st)[id], s = g ? stageOf(st, id) : 0, th = thirsty(st, id);
        list.append(h('button', { class: 'g-chip' + (th ? ' thirsty' : '') + (g ? '' : ' seed'), onclick: () => cardSheet(st, id) },
          h('span', { class: 'g-ce' }, it.e), h('span', { class: 'g-ct' }, h('b', null, it.w), h('small', { class: 'th' }, it.th)),
          h('span', { class: 'g-cs', title: STAGE_N[s] }, th ? '🥀' : g ? STAGE[s] : '🫘')));
      });
    }
    render();
    return root;
  };
  function cardSheet(st, id) {
    const it = item(id), g = vg(st)[id], s = g ? stageOf(st, id) : -1;
    A.speech.say(it.w);
    const sh = A.sheet(h('div', { class: 'stack', style: { gap: '10px', textAlign: 'center' } },
      h('div', { class: 'g-emo' }, it.e),
      h('div', { class: 'row', style: { gap: '8px', justifyContent: 'center', alignItems: 'center' } }, h('h2', { class: 'g-w', style: { color: 'inherit' } }, it.w), say(it.w)),
      it.pr ? h('div', { class: 'th muted' }, '🗣️ ' + it.pr) : null,
      h('div', { class: 'th', style: { fontSize: '1.15rem' } }, it.th),
      it.ex ? h('div', { class: 'g-ex', style: { textAlign: 'left' } }, h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('span', { style: { flex: 1 } }, it.ex), say(it.ex)), h('div', { class: 'th small muted' }, it.exth)) : null,
      h('div', { class: 'g-grow' }, ...STAGE.map((e, i) => h('span', { class: i <= s ? 'on' : '' }, e))),
      h('div', { class: 'small muted' }, g ? (STAGE_N[s] + ' · ' + STAGE_TH[s] + ' · ' + (thirsty(st, id) ? '🥀 thirsty now' : 'next water: ' + new Date(g.due).toLocaleDateString())) : '🫘 Not planted yet. Water your garden to plant it.'),
      it.dict ? h('button', { class: 'btn ghost block', onclick: () => { sh.close(); A.wordPopup(it.dict); } }, 'More: grammar and examples') : null));
  }

  // ------------------------------------------------------------- word of the day + thirsty reminder on the home page
  A.garden = {
    item, met, counts, grade, pickWater, vg, idOfVocab, matchGame, vocabFinish,
    homeCard(st) {
      const all = met(st); if (!all.length) return null;
      const c = counts(st);
      const pick = all[(parseInt(A.dkey().replace(/-/g, ''), 10) * 7919) % all.length], it = item(pick);
      return h('div', { class: 'card g-home' },
        h('div', { class: 'g-wod', onclick: () => cardSheet(st, pick) },
          h('span', { class: 'g-wode' }, it.e),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('small', { class: 'muted' }, '✨ Word of the day · คำศัพท์ประจำวัน'), h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('b', { class: 'g-wodw' }, it.w), say(it.w)), h('div', { class: 'th small' }, it.th))),
        h('button', { class: 'btn ' + (c.thirsty ? 'mango' : 'ghost') + ' block', onclick: () => (c.thirsty || pickWater(st, 12).length ? A.play('garden') : A.go('words')) }, c.thirsty ? '💧 ' + c.thirsty + ' thirsty word' + (c.thirsty > 1 ? 's' : '') + ' · water them' : '🌱 My Word Garden'));
    },
  };
})();
