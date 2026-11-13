/* engine.js — builds lessons, reviews and tests; makes realistic wrong answers */
(function () {
  'use strict';
  const A = window.AE, C = A.C;
  const D = C.dict;
  const lo = (t) => String(t).toLowerCase();

  const BE = ['am', 'is', 'are'];
  const BEP = ['was', 'were'];
  const BE_CONTR = { "i'm": ['I', 'am'], "you're": ['you', 'are'], "he's": ['he', 'is'], "she's": ['she', 'is'], "it's": ['it', 'is'], "we're": ['we', 'are'], "they're": ['they', 'are'], "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'], "what's": ['what', 'is'], "where's": ['where', 'is'], "that's": ['that', 'is'], "there's": ['there', 'is'] };
  const SUBJ_BE = { i: 'am', he: 'is', she: 'is', it: 'is', you: 'are', we: 'are', they: 'are' };
  const ADV = ['always', 'usually', 'sometimes', 'never', 'really', 'also', 'often', 'just', 'still'];
  const keepCase = (orig, w) => (/^[A-Z]/.test(orig) && orig !== 'I' ? A.capFirst(w) : (w === 'i' ? 'I' : w));
  const isVerbBase = (t) => { const e = D[A.keyOf(t)]; return !!(e && (e.p === 'v' || e.v) && !e.base && e.forms); };
  const formOf = (t) => { const e = D[A.keyOf(t)]; return e && e.base ? e.f : null; };
  const baseOf = (t) => { const k = A.keyOf(t); return k && D[k] && D[k].base ? D[k].base : k; };
  const formsOf = (t) => { const b = baseOf(t); return b && D[b] && D[b].forms ? { base: D[b].w, s: D[b].forms[0], past: D[b].forms[1], ing: D[b].forms[2] } : null; };
  const sentText = (toks) => {
    let s = A.join(toks).replace(/\bi\b/g, 'I');
    return A.capFirst(s);
  };

  // expand be-contractions so a gap can sit on am / is / are
  function expandBe(toks) {
    const out = [];
    toks.forEach((t, i) => {
      const e = BE_CONTR[lo(t)];
      if (e) {
        out.push(i === 0 ? A.capFirst(e[0]) : e[0], e[1]);
      } else out.push(t);
    });
    return out;
  }

  // ------------------------------------------------------------------ wrong versions of a sentence
  function corruptions(toks) {
    const out = []; const L = toks.map(lo);
    const put = (arr, tag) => { const s = sentText(arr); out.push({ s, tag }); };
    L.forEach((t, i) => {
      // 1. forgetting am / is / are (her #1 mistake)
      if (BE.includes(t) || BEP.includes(t)) put(toks.filter((_, j) => j !== i), 'drop-be');
      if (BE_CONTR[t] && !t.includes("n't")) put([...toks.slice(0, i), keepCase(toks[i], BE_CONTR[t][0]), ...toks.slice(i + 1)], 'drop-be');
      if (t === "isn't" || t === "aren't") put([...toks.slice(0, i), 'not', ...toks.slice(i + 1)], 'drop-be');
      // 2. wrong am / is / are
      if (BE.includes(t)) BE.filter((b) => b !== t).forEach((b) => put([...toks.slice(0, i), keepCase(toks[i], b), ...toks.slice(i + 1)], 'swap-be'));
      if (BEP.includes(t)) put([...toks.slice(0, i), keepCase(toks[i], t === 'was' ? 'were' : 'was'), ...toks.slice(i + 1)], 'swap-be');
      if (BE_CONTR[t] && !t.includes("n't") && BE.includes(BE_CONTR[t][1])) {
        BE.filter((b) => b !== BE_CONTR[t][1]).forEach((b) => put([...toks.slice(0, i), keepCase(toks[i], BE_CONTR[t][0]), b, ...toks.slice(i + 1)], 'swap-be'));
      }
      if (t === "isn't") put([...toks.slice(0, i), "aren't", ...toks.slice(i + 1)], 'swap-be');
      if (t === "aren't") put([...toks.slice(0, i), "isn't", ...toks.slice(i + 1)], 'swap-be');
      // 3. adding am before a verb (I am like…), also with always / usually … in between
      const j = ADV.includes(L[i + 1]) ? i + 2 : i + 1;
      if (SUBJ_BE[t] && toks[j] && isVerbBase(toks[j]) && !BE.includes(L[i + 1])) put([...toks.slice(0, i + 1), SUBJ_BE[t], ...toks.slice(i + 1)], 'add-be');
      if ((t === 'he' || t === 'she' || t === 'it') && toks[j] && formOf(toks[j]) === '3s') put([...toks.slice(0, i + 1), 'is', ...toks.slice(i + 1)], 'add-be');
      // don't / doesn't: "I am not like", "She doesn't likes"
      if (["don't", "doesn't", "didn't"].includes(t) && toks[i + 1] && isVerbBase(toks[i + 1])) {
        const f = formsOf(toks[i + 1]);
        if (f) put([...toks.slice(0, i + 1), f.s, ...toks.slice(i + 2)], 'add-s');
        const be = SUBJ_BE[L[i - 1]] || (t === "doesn't" ? 'is' : 'are');
        if (t !== "didn't") put([...toks.slice(0, i), be, 'not', ...toks.slice(i + 1)], 'add-be');
      }
      // 4. he / she + s
      if (formOf(toks[i]) === '3s') { const f = formsOf(toks[i]); if (f) put([...toks.slice(0, i), f.base, ...toks.slice(i + 1)], 'drop-s'); }
      if (['i', 'you', 'we', 'they'].includes(t) && toks[j] && isVerbBase(toks[j])) { const f = formsOf(toks[j]); if (f) put([...toks.slice(0, j), f.s, ...toks.slice(j + 1)], 'add-s'); }
      // 5. past tense
      if (formOf(toks[i]) === 'past' && !BE.includes(L[i - 1])) {
        const f = formsOf(toks[i]);
        const marked = L.some((x) => ['yesterday', 'ago', 'last'].includes(x));
        if (f) put([...toks.slice(0, i), marked ? f.base : f.ing, ...toks.slice(i + 1)], 'past');
      }
      if ((t === 'did' || t === "didn't") && toks[i + 1] && isVerbBase(toks[i + 1])) { const f = formsOf(toks[i + 1]); if (f) put([...toks.slice(0, i + 1), f.past, ...toks.slice(i + 2)], 'past'); }
      // 6. will + verb
      if ((t === 'will' || t === "won't" || t === "i'll") && toks[i + 1] && isVerbBase(toks[i + 1])) {
        const f = formsOf(toks[i + 1]);
        if (f) { put([...toks.slice(0, i + 1), f.ing, ...toks.slice(i + 2)], 'will'); put([...toks.slice(0, i + 1), f.s, ...toks.slice(i + 2)], 'will'); }
      }
      // 7. -ing after am / is / are
      if (formOf(toks[i]) === 'ing' && BE.includes(L[i - 1])) { const f = formsOf(toks[i]); if (f) put([...toks.slice(0, i), f.base, ...toks.slice(i + 1)], 'ing'); }
      // 8. do / does, have / has, a / an
      const sw = { do: 'does', does: 'do', "don't": "doesn't", "doesn't": "don't", have: 'has', has: 'have', a: 'an', an: 'a' }[t];
      if (sw) put([...toks.slice(0, i), keepCase(toks[i], sw), ...toks.slice(i + 1)], 'swap');
    });
    // 9. question order: "Are you okay?" -> "You are okay?"
    if ((BE.includes(L[0]) || ['do', 'does', 'can', 'did', 'will'].includes(L[0])) && SUBJ_BE[L[1]] !== undefined) {
      put([A.capFirst(L[1] === 'i' ? 'I' : L[1]), lo(toks[0]), ...toks.slice(2)], 'order');
    }
    const orig = sentText(toks);
    const seen = new Set([orig.toLowerCase()]);
    return out.filter((o) => { const k = o.s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  A.corruptions = corruptions;

  function swapAdjacent(toks) {
    const idx = toks.map((t, i) => i).filter((i) => !A.isPunct(toks[i]) && i < toks.length - 1 && !A.isPunct(toks[i + 1]));
    if (!idx.length) return null;
    const i = A.pick(idx); const t = toks.slice(); [t[i], t[i + 1]] = [t[i + 1], t[i]];
    return sentText(t);
  }

  // two wrong versions, preferring her typical mistakes
  const PRIORITY = ['drop-be', 'add-be', 'swap-be', 'drop-s', 'add-s', 'past', 'will', 'ing', 'order', 'swap'];
  function wrongVersions(toks, n) {
    const all = corruptions(toks);
    const byTag = (tag) => A.shuffle(all.filter((c) => c.tag === tag));
    const out = [];
    for (const tag of PRIORITY) { for (const c of byTag(tag)) { if (out.length >= n) break; if (!out.some((o) => o.tag === c.tag) || out.length >= PRIORITY.length) out.push(c); } }
    for (const c of A.shuffle(all)) { if (out.length >= n) break; if (!out.includes(c)) out.push(c); }
    while (out.length < n) { const s = swapAdjacent(toks); if (!s || out.some((o) => o.s === s) || s === sentText(toks)) break; out.push({ s, tag: 'order' }); }
    return out.slice(0, n);
  }

  // ------------------------------------------------------------------ gap (fill the blank)
  const WHY = {
    be: 'I → am · He / She / It / 1 คน หรือ 1 สิ่ง → is · You / We / They / หลายคน → are',
    bep: 'I / He / She / It → was · You / We / They → were (อดีต)',
    do: 'I / You / We / They → do · He / She / It → does · อดีตใช้ did',
    neg: "I / You / We / They → don't · He / She / It → doesn't · อดีต → didn't",
    have: 'I / You / We / They → have · He / She / It → has',
    verb: 'He / She / It + กริยาเติม s · am / is / are + -ing = กำลังทำ · เรื่องที่เกิดแล้วใช้รูปอดีต',
    will: 'will + กริยาธรรมดา (ไม่เติม s ไม่เติม ing)',
    prep: 'in = ใน · on = บน / ชั้น · at = ที่ (สถานที่ / เวลา)',
    art: 'a = หนึ่ง (เสียงพยัญชนะ) · an = หนึ่ง (เสียงสระ a e i o u) · the = อันนั้น (รู้กันว่าอันไหน)',
  };
  A.WHY = WHY;
  function gapFor(sid) {
    const s = A.S(sid);
    const toks = expandBe(s.t);
    const L = toks.map(lo);
    // subject before position i (skipping always / usually …): 'i' | '3' (he/she/it/one thing) | 'pl'
    const subj = (i) => {
      let j = i - 1; while (j >= 0 && ADV.includes(L[j])) j--;
      const w = L[j];
      if (w === 'i') return 'i';
      if (['he', 'she', 'it', 'this', 'that'].includes(w)) return '3';
      if (['you', 'we', 'they'].includes(w)) return 'pl';
      const e = w && D[A.keyOf(toks[j])];
      if (e && e.f === 'pl') return 'pl';
      if (e && (e.p === 'n' || e.p === 'name')) return '3';
      return 'pl';
    };
    const PAST_MARK = L.some((t) => ['yesterday', 'ago', 'last', 'did', "didn't"].includes(t));
    const tests = [
      (t) => BE.includes(t) && { set: ['am', 'is', 'are'], why: 'be' },
      (t, i) => BEP.includes(t) && { set: [t, t === 'was' ? 'were' : 'was', subj(i) === 'i' ? 'are' : 'am'], why: 'bep' },
      (t, i) => ['do', 'does', 'did'].includes(t) && { set: t === 'did' ? ['did', subj(i + 2) === '3' || ['he', 'she', 'it'].includes(L[i + 1]) ? 'do' : 'does', BE[A.rnd(3)]] : [t, t === 'do' ? 'does' : 'do', ['he', 'she', 'it'].includes(L[i + 1]) ? 'are' : 'is'], why: 'do' },
      (t, i) => ["don't", "doesn't", "didn't"].includes(t) && { set: t === "didn't" ? ["didn't", subj(i) === '3' ? "don't" : "doesn't", subj(i) === 'pl' ? "weren't" : "wasn't"] : [t, t === "don't" ? "doesn't" : "don't", subj(i) === 'i' ? 'am not' : subj(i) === '3' ? 'is not' : 'are not'], why: 'neg' },
      (t, i) => ['have', 'has', 'had'].includes(t) && L[i + 1] !== 'to' && { set: t === 'had' ? ['had', subj(i) === '3' ? 'have' : 'has', 'having'] : [t, t === 'have' ? 'has' : 'have', 'having'], why: 'have' },
      (t, i) => {
        const e = D[A.keyOf(toks[i])]; const f = formsOf(toks[i]);
        if (!f || !e) return false;
        const isVerb = e.base ? (D[e.base].p === 'v' || D[e.base].v) : (e.p === 'v' && isVerbBase(toks[i]));
        if (!isVerb) return false;
        const form = e.base ? e.f : 'base';
        let set;
        if (form === '3s') set = [t, f.base, f.ing];
        else if (form === 'ing') set = [t, f.base, f.s];
        else if (form === 'past') set = [t, PAST_MARK ? f.base : (subj(i) === '3' ? f.base : f.s), f.ing];
        else set = [t, f.s, f.ing];
        set = A.uniq(set.map(lo));
        return set.length >= 3 && set[0] !== set[1] && { set, why: 'verb' };
      },
      (t) => t === 'will' && { set: ['will', 'is', 'am'], why: 'will' },
      (t, i) => {
        if (!['in', 'on', 'at'].includes(t)) return false;
        const n1 = L[i + 1], n2 = L[i + 2], n3 = L[i + 3];
        const fixed = (t === 'at' && (['work', 'home', 'night'].includes(n1) || /^\d/.test(n1 || '')))
          || (t === 'in' && n1 === 'the' && ['morning', 'afternoon', 'evening'].includes(n2))
          || (t === 'on' && (['sunday', 'monday', 'friday'].includes(n1) || (n1 === 'the' && ['first', 'second', 'third', 'fifth', 'sixth'].includes(n2) && n3 === 'floor')));
        return fixed && { set: ['in', 'on', 'at'], why: 'prep' };
      },
      (t) => ['a', 'an'].includes(t) && { set: ['a', 'an'], why: 'art' },
    ];
    for (const test of tests) {
      for (let i = 0; i < L.length; i++) {
        const r = test(L[i], i);
        if (r) {
          const answer = toks[i];
          const opts = A.shuffle(A.uniq(r.set.map((o) => (i === 0 ? A.capFirst(o) : o))));
          if (!opts.some((o) => lo(o) === lo(answer))) continue;
          return { toks, at: i, answer, opts, why: r.why };
        }
      }
    }
    return null;
  }
  A.gapFor = gapFor;

  // ------------------------------------------------------------------ pools
  const unitOf = (k) => (D[k] && D[k].u) || 99;
  A.lessonWordsUpTo = (u) => A.uniq(Object.values(C.lessons).filter((l) => l.u <= u).flatMap((l) => l.words)).filter((k) => D[k]);
  const LESSON_ORDER = A.nodes.filter((n) => n.kind === 'lesson').map((n) => n.id);
  A.wordsThrough = (lessonId) => {
    const i = LESSON_ORDER.indexOf(lessonId);
    return A.uniq(LESSON_ORDER.slice(0, i + 1).flatMap((id) => C.lessons[id].words)).filter((k) => D[k]);
  };
  const ALL_LESSON_WORDS = A.uniq(LESSON_ORDER.flatMap((id) => C.lessons[id].words)).filter((k) => D[k]);
  A.sentsUpTo = (u) => Object.values(C.lessons).filter((l) => l.u <= u).flatMap((l) => l.sents);

  function wordOptions(key, pool, n) {
    const e = D[key];
    const ok = (k) => k !== key && D[k] && D[k].th !== e.th && lo(D[k].w) !== lo(e.w) && !D[k].base;
    const cand = A.shuffle(A.uniq(pool).filter(ok));
    const same = cand.filter((k) => D[k].p === e.p);
    const rest = cand.filter((k) => D[k].p !== e.p);
    const out = [key];
    for (const k of [...same, ...rest]) { if (out.length >= n) break; if (!out.some((o) => D[o].th === D[k].th)) out.push(k); }
    if (out.length < n) for (const k of [...A.shuffle(A.lessonWordsUpTo(unitOf(key))), ...A.shuffle(ALL_LESSON_WORDS)].filter(ok)) { if (out.length >= n) break; if (!out.some((o) => D[o].th === D[k].th)) out.push(k); }
    return A.shuffle(out);
  }
  const thShort = (th) => th.split(' / ')[0].split(' · ')[0].trim();
  A.thShort = thShort;

  // ------------------------------------------------------------------ exercises
  function wordQuiz(key, pool, kind) {
    const e = D[key];
    if (!e) return null;
    const types = ['w2th', 'th2w'];
    if (e.e && !/^\d/.test(e.e)) types.push('pic');
    if (A.speech.ok) types.push('listenw');
    const type = kind && types.includes(kind) ? kind : A.pick(types);
    return { type, key, item: 'w:' + key, opts: wordOptions(key, pool, type === 'w2th' ? 4 : 3) };
  }

  function otherSentences(sid, pool, n) {
    const s = A.S(sid);
    const len = A.words(s.t).length;
    const cand = A.shuffle(A.uniq(pool).filter((x) => x !== sid && A.S(x) && A.S(x).th !== s.th && A.S(x).en.toLowerCase() !== s.en.toLowerCase()));
    cand.sort((a, b) => Math.abs(A.words(A.S(a).t).length - len) - Math.abs(A.words(A.S(b).t).length - len));
    return cand.slice(0, n);
  }

  function sentQuiz(sid, pool, prefer) {
    const s = A.S(sid);
    if (!s) return null;
    const n = A.words(s.t).length;
    const avail = [];
    const gap = gapFor(sid);
    if (gap) avail.push('gap');
    if (n >= 2 && n <= 10) avail.push('build');
    const wrong = wrongVersions(s.t, 2);
    if (wrong.length >= 2) avail.push('pick');
    if (otherSentences(sid, pool, 2).length >= 2) avail.push('meaning');
    if (A.speech.ok && otherSentences(sid, pool, 2).length >= 2) avail.push('listen');
    if (s.ctx) avail.push('reply');
    let type = (prefer || []).find((t) => avail.includes(t)) || A.pick(avail.length ? avail : ['meaning']);
    if (!avail.length) return null;
    const base = { type, sid, item: 's:' + sid };
    if (type === 'gap') return { ...base, gap };
    if (type === 'build') return { ...base, tiles: buildTiles(s.t) };
    if (type === 'pick') return { ...base, opts: A.shuffle([{ s: s.en, ok: 1 }, ...wrong]) };
    if (type === 'meaning') return { ...base, opts: A.shuffle([sid, ...otherSentences(sid, pool, 2)]) };
    if (type === 'listen') return { ...base, opts: A.shuffle([sid, ...otherSentences(sid, pool, 2)]) };
    if (type === 'reply') return { ...base, opts: A.shuffle([{ s: s.en, ok: 1 }, ...wrong.slice(0, 1), ...otherSentences(sid, pool, 1).map((x) => ({ s: A.S(x).en, tag: 'context' }))]) };
    return null;
  }
  A.sentQuiz = sentQuiz;

  function buildTiles(toks) {
    const words = A.words(toks);
    const L = words.map(lo);
    const extra = [];
    const beAt = L.findIndex((t) => BE.includes(t));
    if (beAt >= 0) extra.push(BE.filter((b) => b !== L[beAt])[A.rnd(2)]);
    else if (L.some((t, i) => formOf(words[i]) === '3s')) { const i = L.findIndex((t, j) => formOf(words[j]) === '3s'); extra.push(formsOf(words[i]).base); }
    else if (L.some((t, i) => formOf(words[i]) === 'past')) { const i = L.findIndex((t, j) => formOf(words[j]) === 'past'); extra.push(formsOf(words[i]).base); }
    else if (L.includes('i') && !L.includes('am')) extra.push('am');
    else extra.push(A.pick(['is', 'are', 'the', 'to']));
    let tiles = A.shuffle([...words.map((w, i) => ({ w: i === 0 && w !== 'I' && !D[w] ? w : w, id: i })), ...extra.map((w, i) => ({ w, id: 100 + i }))]);
    if (tiles.filter((t) => t.id < 100).map((t) => t.id).join() === words.map((_, i) => i).join()) tiles = A.shuffle(tiles);
    return { answer: words, tiles };
  }

  // ------------------------------------------------------------------ session builders
  function reviewPicks(st, n, excludeIds, maxUnit) {
    const today = A.todayNum();
    const ids = Object.keys(st.srs).filter((id) => !excludeIds.has(id) && okItem(id, maxUnit));
    const due = ids.filter((id) => st.srs[id].d <= today).sort((a, b) => st.srs[a].d - st.srs[b].d || st.srs[b].w - st.srs[a].w);
    const weak = ids.filter((id) => st.srs[id].d > today).sort((a, b) => st.srs[a].b - st.srs[b].b || st.srs[b].w - st.srs[a].w);
    return [...due, ...weak].slice(0, n);
  }
  function okItem(id, maxUnit) {
    if (id.startsWith('w:')) return !!D[id.slice(2)] && (maxUnit == null || unitOf(id.slice(2)) <= maxUnit);
    if (id.startsWith('s:')) return !!A.S(id.slice(2));
    return false;
  }
  function quizForItem(id, st, pool, spool) {
    const box = (st.srs[id] && st.srs[id].b) || 0;
    if (id.startsWith('w:')) return wordQuiz(id.slice(2), pool, box <= 1 ? 'w2th' : A.pick(['th2w', 'listenw', 'pic', 'w2th']));
    const prefer = box <= 1 ? ['pick', 'meaning', 'gap'] : box <= 3 ? A.shuffle(['gap', 'build', 'listen', 'reply']) : A.shuffle(['build', 'listen', 'reply', 'gap']);
    return sentQuiz(id.slice(2), spool, prefer);
  }

  function noRepeatTypes(steps) {
    // avoid the same quiz type twice in a row where we can
    for (let i = 1; i < steps.length - 1; i++) {
      if (steps[i].type === steps[i - 1].type && !/intro|tip|talk/.test(steps[i].type)) {
        const j = steps.findIndex((s, k) => k > i + 1 && s.type !== steps[i].type && !/intro|tip|talk/.test(s.type));
        if (j > 0) [steps[i], steps[j]] = [steps[j], steps[i]];
      }
    }
    return steps;
  }

  function lessonSteps(node, st) {
    const L = C.lessons[node.id];
    const steps = [];
    if (L.tip) steps.push({ type: 'tip', tip: L.tip });
    const words = L.words.filter((k) => D[k]);
    const pool = A.wordsThrough(L.id);
    const spool = A.uniq([...L.sents, ...A.sentsUpTo(L.u)]);
    for (let i = 0; i < words.length; i += 2) {
      const chunk = words.slice(i, i + 2);
      chunk.forEach((k) => steps.push({ type: 'wintro', key: k, item: 'w:' + k }));
      chunk.forEach((k, j) => { const q = wordQuiz(k, pool, (i + j) % 2 ? 'th2w' : 'w2th'); if (q) steps.push(q); });
    }
    const mw = words.filter((k, i, a) => a.findIndex((x) => D[x].th === D[k].th) === i);
    if (mw.length >= 3) steps.push({ type: 'match', keys: A.shuffle(mw).slice(0, 5) });
    const review = reviewPicks(st, 2, new Set([...words.map((k) => 'w:' + k), ...L.sents.map((s) => 's:' + s)]), L.u);
    const sentSteps = [];
    const practise = L.sents.length > 6 ? [...L.sents.slice(0, 2), ...A.shuffle(L.sents.slice(2)).slice(0, 4)] : L.sents;
    practise.forEach((sid, i) => {
      if (i < 2) sentSteps.push({ type: 'sintro', sid, item: 's:' + sid });
      const q = sentQuiz(sid, spool, i < 2 ? ['build', 'gap', 'pick'] : A.shuffle(['gap', 'build', 'pick', 'meaning', 'listen']));
      if (q) sentSteps.push(q);
      if (i % 3 === 2 && review.length) { const r = quizForItem(review.shift(), st, pool, spool); if (r) sentSteps.push({ ...r, review: 1 }); }
    });
    steps.push(...sentSteps);
    review.forEach((id) => { const r = quizForItem(id, st, pool, spool); if (r) steps.push({ ...r, review: 1 }); });
    // finish with a second look at two new sentences and two new words
    A.shuffle(L.sents.slice(0, 4)).slice(0, 1).forEach((sid) => { const q = sentQuiz(sid, spool, A.shuffle(['listen', 'meaning', 'gap', 'pick'])); if (q) steps.push(q); });
    A.shuffle(words).slice(0, 1).forEach((k) => { const q = wordQuiz(k, pool, A.pick(['listenw', 'pic', 'th2w'])); if (q) steps.push(q); });
    return noRepeatTypes(steps);
  }

  function talkSteps(talkId) {
    const t = C.talks[talkId];
    const steps = [{ type: 'talkread', talk: talkId }, { type: 'talkplay', talk: talkId }];
    const spool = A.uniq([...t.lines.map((l) => l.id), ...A.sentsUpTo(t.u || 1)]);
    A.shuffle(t.lines.filter((l) => l.s === 'B')).slice(0, 2).forEach((l) => {
      const q = sentQuiz(l.id, spool, ['build', 'gap']);
      if (q) steps.push(q);
    });
    return steps;
  }

  function checkSteps(node, st) {
    const monthTest = node.u % 4 === 0;
    const units = monthTest ? C.units.filter((u) => u.m === A.unit(node.u).m && u.lessons.length) : [A.unit(node.u)];
    const lessons = units.flatMap((u) => u.lessons.map((id) => C.lessons[id]));
    const sents = A.shuffle(lessons.flatMap((l) => l.sents));
    const words = A.shuffle(lessons.flatMap((l) => l.words).filter((k) => D[k]));
    const talkLines = A.shuffle(units.flatMap((u) => u.talks.slice(0, 1)).flatMap((id) => C.talks[id].lines.filter((l) => l.s === 'B' && A.S(l.id).ctx).map((l) => l.id)));
    const pool = A.lessonWordsUpTo(node.u);
    const spool = A.uniq([...sents, ...A.sentsUpTo(node.u)]);
    const nS = monthTest ? 11 : 8, nW = monthTest ? 4 : 4, nT = monthTest ? 3 : 2;
    const steps = [];
    const types = A.shuffle(['gap', 'pick', 'build', 'gap', 'meaning', 'listen', 'pick', 'build', 'gap', 'pick', 'build']);
    sents.slice(0, nS).forEach((sid, i) => { const q = sentQuiz(sid, spool, [types[i % types.length], 'gap', 'pick']); if (q) steps.push(q); });
    words.slice(0, nW).forEach((k) => { const q = wordQuiz(k, pool, A.pick(['w2th', 'th2w', 'listenw'])); if (q) steps.push(q); });
    talkLines.slice(0, nT).forEach((sid) => { const q = sentQuiz(sid, spool, ['reply']); if (q) steps.push(q); });
    return noRepeatTypes(A.shuffle(steps));
  }

  function reviewSteps(st, mistakesOnly) {
    const maxUnit = A.reachedUnit(st);
    const pool = A.lessonWordsUpTo(maxUnit);
    const spool = A.sentsUpTo(maxUnit);
    let ids;
    if (mistakesOnly) ids = Object.keys(st.srs).filter((id) => okItem(id) && st.srs[id].w > 0).sort((a, b) => st.srs[b].w - st.srs[a].w || st.srs[a].b - st.srs[b].b).slice(0, 12);
    else ids = reviewPicks(st, 12, new Set(), null);
    return noRepeatTypes(A.shuffle(ids).map((id) => quizForItem(id, st, pool, spool)).filter(Boolean));
  }

  // one more try for an item answered wrong (different exercise if possible)
  A.retryFor = (step, st) => {
    if (!step.item) return null;
    const maxUnit = A.reachedUnit(st);
    const pool = A.lessonWordsUpTo(maxUnit);
    const spool = A.uniq([step.sid, ...A.sentsUpTo(maxUnit)].filter(Boolean));
    if (step.item.startsWith('w:')) return wordQuiz(step.key, pool, step.type === 'w2th' ? 'th2w' : 'w2th');
    const order = ['pick', 'gap', 'meaning', 'build'].filter((t) => t !== step.type);
    return sentQuiz(step.sid, spool, order);
  };

  A.buildSession = (kind, arg, st) => {
    let steps = [], node = null;
    if (kind === 'node') {
      node = A.nodeById(arg);
      if (node.kind === 'lesson') steps = lessonSteps(node, st);
      else if (node.kind === 'talk') steps = talkSteps(node.talk, st);
      else steps = checkSteps(node, st);
    } else if (kind === 'review') steps = reviewSteps(st, false);
    else if (kind === 'mistakes') steps = reviewSteps(st, true);
    else if (kind === 'talk') steps = talkSteps(arg, st);
    steps = steps.filter(Boolean);
    return {
      kind, arg, node, steps, i: 0, started: Date.now(), items: {}, graded: 0, firstOk: 0, retries: {},
      test: !!(node && node.kind === 'check'), lookups: 0,
    };
  };
})();
