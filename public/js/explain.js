/* explain.js — why an answer is wrong: English + Thai + examples, for every kind of mistake */
(function () {
  'use strict';
  const A = window.AE, C = A.C, D = C.dict;
  const lo = (t) => String(t || '').toLowerCase();

  // ex: [English, Thai, 1 = correct / 0 = wrong]
  const EX = {
    'drop-be': {
      en: 'English needs am / is / are between the person and the describing word. Thai does not use a word here, so it is easy to forget.',
      th: 'ภาษาอังกฤษต้องมี am / is / are อยู่ระหว่าง "ใคร" กับ "เป็นอย่างไร / อยู่ที่ไหน" ภาษาไทยไม่มีคำนี้ เลยลืมได้ง่าย',
      ex: [['I am tired.', 'ฉันเหนื่อย', 1], ['I tired.', '', 0], ['She is at work.', 'เธออยู่ที่ทำงาน', 1], ['They are happy.', 'พวกเขามีความสุข', 1]],
    },
    'swap-be': {
      en: 'Choose by the person: I → am. He / she / it / one thing → is. You / we / they / many things → are.',
      th: 'เลือกตามคน: I ใช้ am · he / she / it หรือ 1 คน 1 สิ่ง ใช้ is · you / we / they หรือหลายคน หลายสิ่ง ใช้ are',
      ex: [['I am hungry.', 'ฉันหิว', 1], ['He is hungry.', 'เขาหิว', 1], ['You are hungry.', 'คุณหิว', 1], ['He are hungry.', '', 0]],
    },
    'add-be': {
      en: 'Do not put am / is / are in front of an action word (verb). Use am / is / are with an action word only when it ends in -ing.',
      th: 'ไม่ต้องใส่ am / is / are หน้าคำกริยา (คำที่บอกการกระทำ) ใช้ได้เฉพาะตอนที่กริยาเติม -ing เท่านั้น',
      ex: [['I like coffee.', 'ฉันชอบกาแฟ', 1], ['I am like coffee.', '', 0], ['I am drinking coffee.', 'ฉันกำลังดื่มกาแฟ', 1]],
    },
    'drop-s': {
      en: 'With he / she / it (one person or one thing), the action word gets -s.',
      th: 'ถ้าประธานเป็น he / she / it หรือ 1 คน 1 สิ่ง กริยาต้องเติม s',
      ex: [['She works at a hotel.', 'เธอทำงานที่โรงแรม', 1], ['She work at a hotel.', '', 0], ['My mother likes tea.', 'แม่ของฉันชอบชา', 1]],
    },
    'add-s': {
      en: 'With I / you / we / they, the action word has no -s.',
      th: 'ถ้าประธานเป็น I / you / we / they กริยาไม่ต้องเติม s',
      ex: [['I work every day.', 'ฉันทำงานทุกวัน', 1], ['I works every day.', '', 0], ['They live in Bangkok.', 'พวกเขาอาศัยอยู่ที่กรุงเทพฯ', 1]],
    },
    past: {
      en: 'For things that already happened (yesterday, last week…) use the past form. After did / didn\'t, use the normal form.',
      th: 'เรื่องที่เกิดขึ้นแล้ว (yesterday, last week…) ใช้กริยารูปอดีต แต่ถ้ามี did / didn\'t อยู่ข้างหน้า ให้ใช้กริยารูปธรรมดา',
      ex: [['I went to the market yesterday.', 'เมื่อวานฉันไปตลาด', 1], ['I go to the market yesterday.', '', 0], ['I didn\'t go to work.', 'ฉันไม่ได้ไปทำงาน', 1], ['I didn\'t went to work.', '', 0]],
    },
    will: {
      en: 'will + the normal action word: no -s, no -ing, no "to".',
      th: 'will + กริยารูปธรรมดา ไม่เติม s ไม่เติม ing และไม่ต้องมี to',
      ex: [['I will call you.', 'ฉันจะโทรหาคุณ', 1], ['I will calling you.', '', 0], ['She will come tomorrow.', 'เธอจะมาพรุ่งนี้', 1], ['She will comes tomorrow.', '', 0]],
    },
    ing: {
      en: 'am / is / are + action word with -ing = doing it now.',
      th: 'am / is / are + กริยาเติม ing = กำลังทำอยู่ตอนนี้',
      ex: [['I am cooking.', 'ฉันกำลังทำอาหาร', 1], ['I am cook.', '', 0], ['They are sleeping.', 'พวกเขากำลังนอนหลับ', 1]],
    },
    order: {
      en: 'In a question, am / is / are (or do / can / will) comes first, before the person.',
      th: 'ในประโยคคำถาม ให้ย้าย am / is / are (หรือ do / can / will) ไปไว้ข้างหน้า ก่อนคน',
      ex: [['Are you hungry?', 'คุณหิวไหม', 1], ['You are hungry?', '', 0], ['Do you like tea?', 'คุณชอบชาไหม', 1], ['Can you help me?', 'คุณช่วยฉันได้ไหม', 1]],
    },
    words: {
      en: 'English order: who → action (or am / is / are) → what → where → when.',
      th: 'ลำดับคำภาษาอังกฤษ: ใคร → ทำอะไร (หรือ am / is / are) → อะไร → ที่ไหน → เมื่อไหร่',
      ex: [['I eat rice at home every day.', 'ฉันกินข้าวที่บ้านทุกวัน', 1], ['She is very happy today.', 'วันนี้เธอมีความสุขมาก', 1], ['I very happy.', '', 0]],
    },
    'swap-do': {
      en: 'I / you / we / they → do / don\'t. He / she / it → does / doesn\'t. After does, the action word has no -s.',
      th: 'I / you / we / they ใช้ do / don\'t · he / she / it ใช้ does / doesn\'t และหลัง does กริยาไม่ต้องเติม s',
      ex: [['Do you like it?', 'คุณชอบไหม', 1], ['Does she like it?', 'เธอชอบไหม', 1], ['She doesn\'t like it.', 'เธอไม่ชอบ', 1], ['She don\'t like it.', '', 0]],
    },
    'swap-have': {
      en: 'I / you / we / they → have. He / she / it → has.',
      th: 'I / you / we / they ใช้ have · he / she / it ใช้ has',
      ex: [['I have a sister.', 'ฉันมีพี่สาวหรือน้องสาวหนึ่งคน', 1], ['She has a car.', 'เธอมีรถหนึ่งคัน', 1], ['She have a car.', '', 0]],
    },
    'swap-art': {
      en: 'a + a word that starts with a consonant sound. an + a word that starts with a vowel sound (a, e, i, o, u).',
      th: 'a ใช้กับคำที่ขึ้นต้นด้วยเสียงพยัญชนะ · an ใช้กับคำที่ขึ้นต้นด้วยเสียงสระ (a e i o u)',
      ex: [['a room', 'ห้องหนึ่งห้อง', 1], ['an apple', 'แอปเปิ้ลหนึ่งลูก', 1], ['an hour', 'หนึ่งชั่วโมง (h ไม่ออกเสียง)', 1], ['a apple', '', 0]],
    },
    bep: {
      en: 'Past of am / is / are: I / he / she / it → was. You / we / they → were.',
      th: 'อดีตของ am / is / are: I / he / she / it ใช้ was · you / we / they ใช้ were',
      ex: [['I was tired yesterday.', 'เมื่อวานฉันเหนื่อย', 1], ['They were at home.', 'พวกเขาอยู่ที่บ้าน', 1], ['I were tired.', '', 0]],
    },
    neg: {
      en: 'Not with an action word: I / you / we / they → don\'t. He / she / it → doesn\'t. Past → didn\'t.',
      th: 'ปฏิเสธกริยา: I / you / we / they ใช้ don\'t · he / she / it ใช้ doesn\'t · อดีตใช้ didn\'t',
      ex: [['I don\'t eat meat.', 'ฉันไม่กินเนื้อสัตว์', 1], ['He doesn\'t eat meat.', 'เขาไม่กินเนื้อสัตว์', 1], ['I am not eat meat.', '', 0]],
    },
    prep: {
      en: 'in = inside (a room, a city, the morning). on = on top / a day / a floor. at = a point (at home, at work, at 7 o\'clock).',
      th: 'in = ข้างใน (ห้อง เมือง ตอนเช้า) · on = บน / วัน / ชั้น · at = ที่จุดหนึ่ง (at home, at work, at 7 โมง)',
      ex: [['in the morning', 'ตอนเช้า', 1], ['on Monday', 'วันจันทร์', 1], ['at 7 o\'clock', 'ตอน 7 โมง', 1], ['on the second floor', 'ที่ชั้นสอง', 1]],
    },
    context: {
      en: 'This sentence is fine English, but it does not answer what the other person said. Read their words again.',
      th: 'ประโยคนี้ถูกไวยากรณ์ แต่ไม่ได้ตอบสิ่งที่อีกฝ่ายพูด ลองอ่านคำพูดของเขาอีกครั้งนะ',
      ex: [],
    },
    listen: {
      en: 'Listen again with the slow button 🐢. Small words like am, is, the, a are quick and quiet in English.',
      th: 'ลองฟังอีกครั้งด้วยปุ่มเสียงช้า 🐢 คำเล็ก ๆ อย่าง am, is, the, a จะพูดเร็วและเบา ต้องตั้งใจฟัง',
      ex: [],
    },
  };
  A.EXPLAIN = EX;

  // subject just before position i, for a personal rule line ("she → is")
  const SUBJ = { i: 'I', he: 'he', she: 'she', it: 'it', you: 'you', we: 'we', they: 'they' };
  function subjectBefore(toks, i) {
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) { const w = lo(toks[j]); if (SUBJ[w]) return SUBJ[w]; }
    return null;
  }
  const BE_FOR = { I: 'am', he: 'is', she: 'is', it: 'is', you: 'are', we: 'are', they: 'are' };

  // gap exercise: which explanation fits the chosen word
  A.explainGap = (g, chosen) => {
    const c = lo(chosen), ans = lo(g.answer);
    let key = { be: 'swap-be', bep: 'bep', do: 'swap-do', neg: 'neg', have: 'swap-have', will: 'will', prep: 'prep', art: 'swap-art' }[g.why] || 'words';
    if (g.why === 'neg' && /not$/.test(c)) key = 'neg';
    if (g.why === 'verb' || g.why === 'will') {
      const fa = A.formOf(g.answer), fc = A.formOf(chosen);
      if (fa === '3s') key = 'drop-s';
      else if (fa === 'past') key = 'past';
      else if (fa === 'ing') key = 'ing';
      else if (fc === '3s') key = 'add-s';
      else if (fc === 'ing') key = lo(g.toks[g.at - 1]) === 'will' ? 'will' : 'ing';
      else if (fc === 'past') key = 'past';
    }
    if (g.why === 'will') key = 'will';
    let rule = null;
    const subj = subjectBefore(g.toks, g.at);
    if (g.why === 'be' && subj) rule = { en: `The person is "${subj}" → ${BE_FOR[subj]}`, th: `ประธานคือ "${subj}" จึงใช้ ${BE_FOR[subj]}` };
    else if (key === 'drop-s' && subj) rule = { en: `"${subj}" is one person → ${g.answer}`, th: `"${subj}" คือ 1 คน กริยาจึงเติม s → ${g.answer}` };
    else if (key === 'add-s' && subj) rule = { en: `"${subj}" → no -s: ${g.answer}`, th: `"${subj}" ไม่ต้องเติม s → ${g.answer}` };
    else if (key === 'swap-art') rule = { en: `${g.answer} ${g.toks[g.at + 1] || ''}`, th: `ใช้ ${g.answer} หน้า "${g.toks[g.at + 1] || ''}"` };
    return { key, rule, you: chosen };
  };

  // build exercise: find what went wrong in her word order
  const BE = ['am', 'is', 'are', 'was', 'were'];
  A.explainBuild = (answerWords, given) => {
    const a = answerWords.map(lo), g = given.map(lo);
    const missing = a.filter((w) => !g.includes(w)), extra = g.filter((w) => !a.includes(w));
    if (missing.some((w) => BE.includes(w)) && !extra.some((w) => BE.includes(w))) return { key: 'drop-be' };
    if (extra.some((w) => BE.includes(w)) && !missing.some((w) => BE.includes(w))) return { key: 'add-be' };
    if (missing.some((w) => BE.includes(w)) && extra.some((w) => BE.includes(w))) return { key: missing.some((w) => w === 'was' || w === 'were') ? 'bep' : 'swap-be' };
    const fm = missing.map((w) => A.formOf(w)), fe = extra.map((w) => A.formOf(w));
    if (fm.includes('3s')) return { key: 'drop-s' };
    if (fe.includes('3s')) return { key: 'add-s' };
    if (fm.includes('past')) return { key: 'past' };
    if (fm.includes('ing')) return { key: 'ing' };
    if (!missing.length && !extra.length && /^(am|is|are|do|does|did|can|will|was|were)$/.test(a[0] || '')) return { key: 'order' };
    if (missing.length || extra.length) return { key: 'words', words: { missing, extra } };
    return { key: 'words' };
  };

  // word exercise: show what both words mean (Thai only as a helper here)
  A.explainWord = (key, chosenKey) => {
    const e = D[key], c = D[chosenKey];
    const ex = (e.ex && e.ex[0]) || (e.xs && e.xs[0] && A.S(e.xs[0]) && [A.S(e.xs[0]).en, A.S(e.xs[0]).th]) || null;
    return { key: 'vocab', word: e, chosen: c, example: ex };
  };

  // pick / reply / role-play: the tag of the wrong sentence she chose
  A.explainTag = (tag, text) => {
    if (tag === 'swap') { const s = A.tagSkill('swap', text); return { key: s === 'do' ? 'swap-do' : s === 'have' ? 'swap-have' : 'swap-art' }; }
    if ((tag === 'drop-be' || tag === 'swap-be') && /\b(was|were)\b/i.test(text || '')) return { key: 'bep' };
    return { key: EX[tag] ? tag : 'words' };
  };

  // skill a wrong answer belongs to (for her stats)
  const KEY_SKILL = { 'drop-be': 'be', 'swap-be': 'be', 'add-be': 'be', 'drop-s': 's3', 'add-s': 's3', past: 'past', will: 'will', ing: 'ing', order: 'question', words: 'order', 'swap-do': 'do', neg: 'do', 'swap-have': 'have', 'swap-art': 'art', bep: 'bep', prep: 'prep', context: 'talk', listen: 'listen', vocab: 'vocab' };
  A.keySkill = (key) => KEY_SKILL[key] || 'other';
})();
