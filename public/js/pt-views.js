/* pt-views.js — reading about personality types: all 16 types, a full profile of each (English and Thai),
   and Alvee and Muhay (INFJ) side by side. Alvee's avatar is Tao the turtle; Muhay's is a panda. */
(function () {
  'use strict';
  const A = window.AE, h = A.h, P = window.PTEST, PR = window.PTPROF, CM = window.PTCMP;
  if (!A || !P || !PR || !CM) return;
  const VIEWS = A.VIEWS;
  const MUHAY = CM.muhay.code;
  const GROUPS = [
    { k: 'NT', en: 'Thinkers', th: 'นักคิด', col: '#7fb4ff', d: ['Logical, curious and full of ideas', 'มีเหตุผล ช่างสงสัย และเต็มไปด้วยไอเดีย'], codes: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
    { k: 'NF', en: 'Idealists', th: 'นักอุดมคติ', col: '#b69cff', d: ['Caring, deep and guided by values', 'ใส่ใจ ลึกซึ้ง และยึดมั่นในคุณค่า'], codes: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
    { k: 'SJ', en: 'Guardians', th: 'ผู้พิทักษ์', col: '#ffb35c', d: ['Reliable, organized and loyal', 'ไว้ใจได้ มีระเบียบ และซื่อสัตย์'], codes: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
    { k: 'SP', en: 'Explorers', th: 'นักสำรวจ', col: '#ff8a9d', d: ['Practical, free and full of action', 'ใช้ได้จริง รักอิสระ และชอบลงมือทำ'], codes: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
  ];
  const groupOf = (c) => GROUPS.find((g) => g.codes.includes(c));
  const RAR = [[2, 'l', 'Legendary'], [3.5, 'e', 'Epic'], [6, 'r', 'Rare'], [10, 'u', 'Uncommon'], [100, 'c', 'Common']];
  const rarity = (c) => { const pct = PR[c].pct, r = RAR.find((x) => pct < x[0]); return { pct, en: r[2], col: ((A.treasure && A.treasure.RAR[r[1]]) || {}).col || '#9fb8bd' }; };
  const mine = () => { try { const p = A.ptest.st(); return p.done && p.res ? p.res : null; } catch (e) { return null; } };
  const bi = (en, th, cls) => h('div', { class: 'tyd-bi ' + (cls || '') }, h('div', { class: 'en' }, en), h('div', { class: 'th' }, th));
  const initials = (n) => n.replace(/[^A-Za-z .]/g, '').split(/[ .]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = (s) => { let x = 0; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) % 360; return x; };
  const HER = '#ffbf47', HIM = '#b69cff';

  // ---------------------------------------------------------------- avatars
  const PANDA = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="#1f2430"/><circle cx="76" cy="24" r="14" fill="#1f2430"/><circle cx="24" cy="24" r="6" fill="#3a4152"/><circle cx="76" cy="24" r="6" fill="#3a4152"/><ellipse cx="50" cy="56" rx="38" ry="35" fill="#fbfbf7"/><ellipse cx="34" cy="51" rx="10" ry="13" transform="rotate(-25 34 51)" fill="#1f2430"/><ellipse cx="66" cy="51" rx="10" ry="13" transform="rotate(25 66 51)" fill="#1f2430"/><circle cx="35" cy="50" r="4.2" fill="#fff"/><circle cx="65" cy="50" r="4.2" fill="#fff"/><circle cx="36" cy="51" r="2.2" fill="#1f2430"/><circle cx="64" cy="51" r="2.2" fill="#1f2430"/><ellipse cx="50" cy="64" rx="6" ry="4.2" fill="#1f2430"/><path d="M44 71 q6 6 12 0" stroke="#1f2430" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="27" cy="66" r="5" fill="#ffb3c1" opacity=".55"/><circle cx="73" cy="66" r="5" fill="#ffb3c1" opacity=".55"/></svg>';
  const avatar = (who, code, size, col) => {
    const el = h('span', { class: 'tyd-pic' + (who ? ' ' + who : ''), style: { width: size + 'px', height: size + 'px', '--ac': col } });
    if (who === 'her') el.innerHTML = A.art.mascot('wave', Math.round(size * 0.9));
    else if (who === 'him') el.innerHTML = PANDA;
    else { el.textContent = P.types[code].ic; el.style.fontSize = Math.round(size * 0.48) + 'px'; }
    return el;
  };
  const whoOf = (code) => { const me = mine(); return me && me.code === code ? 'her' : code === MUHAY ? 'him' : null; };

  // these pages are dark, like a night sky
  const go0 = A.go;
  A.go = (view, arg) => { go0(view, arg); document.body.classList.toggle('tyd-on', ['types', 'type', 'typevs'].includes(view)); };
  const head = (to, kick, title) => h('div', { class: 'tyd-head' }, h('button', { class: 'tyd-back', 'aria-label': 'Back', onclick: () => A.back(to) }, '‹'), h('div', null, h('div', { class: 'tyd-kick' }, kick), h('h1', null, title)));

  // ---------------------------------------------------------------- all 16 types
  VIEWS.types = () => {
    const root = h('div', { class: 'screen tyd' }), me = mine();
    root.append(head('me', 'Personality', 'The 16 types'));
    if (me) {
      root.append(h('button', { class: 'tyd-vsban', onclick: () => A.go('typevs') },
        h('div', { class: 'tyd-vsban-two' }, avatar('her', me.code, 58, HER), h('b', null, 'VS'), avatar('him', MUHAY, 58, HIM)),
        h('div', { class: 'tyd-vsban-tx' }, h('b', null, me.code + ' and ' + MUHAY), bi('You and Muhay, side by side', 'คุณกับมูไฮ เทียบกันแบบเห็นชัด ๆ', 'small')),
        h('span', { class: 'tyd-arrow' }, '›')));
      root.append(h('div', { class: 'tyd-pair' },
        h('button', { class: 'tyd-mini', style: { '--ac': HER }, onclick: () => A.go('type', me.code) }, avatar('her', me.code, 44, HER), h('div', null, h('b', null, me.full), h('span', null, 'Your type'))),
        h('button', { class: 'tyd-mini', style: { '--ac': HIM }, onclick: () => A.go('type', MUHAY) }, avatar('him', MUHAY, 44, HIM), h('div', null, h('b', null, MUHAY), h('span', null, 'Muhay')))));
    } else root.append(h('button', { class: 'tyd-vsban', onclick: () => A.ptest.open('types') }, h('span', { class: 'tyd-pic', style: { width: '58px', height: '58px', fontSize: '28px' } }, '🧭'), h('div', { class: 'tyd-vsban-tx' }, h('b', null, 'Find your type first'), bi('Finish the test, then compare with Muhay.', 'ทำแบบทดสอบให้เสร็จ แล้วเปรียบเทียบกับมูไฮ', 'small')), h('span', { class: 'tyd-arrow' }, '›')));
    GROUPS.forEach((g) => {
      root.append(h('div', { class: 'tyd-sec', style: { '--ac': g.col } }, h('h2', null, g.en, h('span', { class: 'th' }, ' · ' + g.th)), bi(g.d[0], g.d[1], 'small')));
      root.append(h('div', { class: 'tyd-grid' }, g.codes.map((c) => {
        const T = P.types[c], r = rarity(c), who = whoOf(c);
        return h('button', { class: 'tyd-cell', style: { '--ac': g.col, '--rc': r.col }, onclick: () => A.go('type', c) },
          who ? avatar(who, c, 46, who === 'her' ? HER : HIM) : h('span', { class: 'tyd-ic' }, T.ic),
          h('b', { class: 'tyd-code' }, c), h('span', { class: 'tyd-name' }, T.n.replace(/^The /, '')),
          h('span', { class: 'tyd-rr' }, h('i'), r.en + ' · ' + r.pct + '%'),
          who ? h('span', { class: 'tyd-tag ' + who }, who === 'her' ? 'You' : 'Muhay') : null);
      })));
    });
    root.append(bi('A type is a way of seeing yourself, not a box. Real people fit some lines and not others.', 'บุคลิกภาพเป็นเพียงวิธีหนึ่งในการมองตัวเอง ไม่ใช่กรอบที่ตายตัว คนจริง ๆ อาจตรงกับบางข้อและไม่ตรงกับบางข้อ', 'small tyd-note'));
    return root;
  };

  // ---------------------------------------------------------------- one type in full
  const TABS = [['over', 'Overview'], ['str', 'Strengths'], ['rel', 'Relationships'], ['fam', 'Friends & family'], ['car', 'Career'], ['grow', 'Stress & growth']];
  let tab = 'over';
  const items = (L) => h('div', { class: 'tyd-cli' }, L.map(([ic, et, tt, en, th]) => h('div', { class: 'tyd-it' }, h('i', null, ic), h('div', null, h('b', null, et), h('span', { class: 'tt th' }, tt), bi(en, th, 'small')))));
  const sec = (title, ...kids) => h('div', { class: 'tyd-card' }, title ? h('h3', null, title) : null, ...kids);
  VIEWS.type = (code) => {
    code = (code && PR[code]) ? code : (mine() || {}).code || MUHAY;
    const T = P.types[code], X = PR[code], r = rarity(code), me = mine(), who = whoOf(code), g = groupOf(code);
    const ac = who === 'her' ? HER : who === 'him' ? HIM : g.col;
    const root = h('div', { class: 'screen tyd', style: { '--ac': ac } });
    root.append(head('types', 'Personality', code + ' · ' + T.n));
    root.append(h('div', { class: 'tyd-hero' },
      avatar(who, code, 96, ac),
      h('div', { class: 'tyd-hero-tx' },
        h('div', { class: 'tyd-kick' }, who === 'her' ? ((A.user && A.user.name) || 'Your') + '’s type' : who === 'him' ? 'Muhay’s type' : g.en),
        h('div', { class: 'tyd-hcode' }, code, who === 'her' ? h('small', null, '-' + me.id) : null),
        h('h2', null, T.n), h('div', { class: 'th tyd-hth' }, T.th),
        h('div', { class: 'tyd-hr', style: { '--rc': r.col } }, h('i'), r.en + ' · about ' + r.pct + '% of people'))));
    const facts = h('div', { class: 'tyd-facts' },
      h('div', { class: 'tyd-fact' }, h('span', null, 'Letters'), h('b', null, code.split('').join(' ')), h('small', null, code.split('').map((l, i) => P.poles[P.dims[i].k][l][0]).join(' · '))),
      h('div', { class: 'tyd-fact' }, h('span', null, 'Group'), h('b', null, g.en), h('small', { class: 'th' }, g.th)),
      h('div', { class: 'tyd-fact wide' }, h('span', null, 'In three words'), h('div', { class: 'tyd-chips' }, T.s.map(([en, th]) => h('span', { class: 'tyd-chip' }, en, h('small', { class: 'th' }, th))))));
    const bar = h('div', { class: 'tyd-tabs', role: 'tablist' });
    const body = h('div', { class: 'stack', style: { gap: '12px' } });
    const draw = () => {
      A.clear(bar).append(...TABS.map(([k, t]) => h('button', { class: tab === k ? 'on' : '', role: 'tab', onclick: () => { tab = k; draw(); } }, t)));
      A.clear(body);
      if (tab === 'over') {
        body.append(sec('🔖 In short', bi(X.intro[0], X.intro[1])));
        body.append(sec('🔤 The four letters', ...code.split('').map((l, i) => { const pole = P.poles[P.dims[i].k][l]; return h('div', { class: 'tyd-let' }, h('b', null, l), h('div', null, h('strong', null, pole[0]), h('span', { class: 'th' }, ' · ' + pole[1]), bi(pole[2], pole[3], 'small'))); })));
        const box = h('div', { class: 'tyd-card', hidden: true });
        const btn = h('button', { class: 'tyd-who', onclick: () => { box.hidden = !box.hidden; btn.classList.toggle('on', !box.hidden); } }, 'Who has this type in real life? ›');
        box.append(bi('Famous people who are often said to be ' + code + '. These are popular guesses, not real test results.', 'คนดังที่มักถูกกล่าวว่าเป็น ' + code + ' นี่เป็นเพียงการคาดเดาที่นิยมกัน ไม่ใช่ผลการทดสอบจริง', 'small'),
          h('div', { class: 'tyd-people' }, X.people.map(([n, en, th]) => h('div', { class: 'tyd-person' }, h('span', { class: 'tyd-ini', style: { '--h': hue(n) } }, initials(n)), h('div', null, h('b', null, n), bi(en, th, 'small'))))));
        body.append(btn, box);
      }
      if (tab === 'str') body.append(sec('💪 Strengths', items(X.str)), sec('🌧️ Weak points', items(X.weak)));
      if (tab === 'rel') body.append(sec('💞 Relationships', items(X.rel)));
      if (tab === 'fam') body.append(sec('🫂 Friends & family', items(X.fam)));
      if (tab === 'car') body.append(sec('💼 Good careers', bi(X.jobs[0], X.jobs[1])), sec('🧭 At work', items(X.work)));
      if (tab === 'grow') body.append(sec('🌩️ Stress & growth', items(X.stress)));
    };
    draw();
    root.append(facts, bar, body);
    const nav = h('div', { class: 'tyd-next' });
    if (me && who !== 'her') nav.append(h('button', { style: { '--ac': HER }, onclick: () => { tab = 'over'; A.go('type', me.code); } }, avatar('her', me.code, 26, HER), 'My type'));
    if (who !== 'him') nav.append(h('button', { style: { '--ac': HIM }, onclick: () => { tab = 'over'; A.go('type', MUHAY); } }, avatar('him', MUHAY, 26, HIM), 'Muhay'));
    if (me) nav.append(h('button', { class: 'go', onclick: () => A.go('typevs') }, '⚖️ Compare'));
    root.append(nav);
    return root;
  };

  // ---------------------------------------------------------------- Alvee and Muhay
  VIEWS.typevs = () => {
    const me = mine(), root = h('div', { class: 'screen tyd' });
    if (!me) { setTimeout(() => A.go('types'), 0); return root; }
    const A1 = P.types[me.code], B1 = P.types[MUHAY], name = (A.user && A.user.name) || 'You';
    root.append(head('types', 'Personality', me.code + ' and ' + MUHAY));
    root.append(h('div', { class: 'tyd-two' },
      h('button', { class: 'tyd-side', style: { '--ac': HER }, onclick: () => A.go('type', me.code) }, avatar('her', me.code, 66, HER), h('b', { class: 'cd' }, me.code), h('span', null, name), h('small', null, A1.n)),
      h('span', { class: 'tyd-vs' }, 'VS'),
      h('button', { class: 'tyd-side', style: { '--ac': HIM }, onclick: () => A.go('type', MUHAY) }, avatar('him', MUHAY, 66, HIM), h('b', { class: 'cd' }, MUHAY), h('span', null, 'Muhay'), h('small', null, B1.n))));
    const same = [0, 1, 2, 3].filter((i) => me.code[i] === MUHAY[i]).length;
    root.append(h('div', { class: 'tyd-card' }, h('h3', null, '🔤 Letter by letter'), bi(same + ' of 4 letters are the same.', 'ตัวอักษรเหมือนกัน ' + same + ' จาก 4 ตัว', 'small'),
      h('div', { class: 'tyd-lets' }, P.dims.slice(0, 4).map((d, i) => {
        const a = me.code[i], b = MUHAY[i], eq = a === b, note = CM.letters[d.k][eq ? 'same' : 'diff'];
        return h('div', { class: 'tyd-l' },
          h('div', { class: 'tyd-l-top' }, h('span', { class: 'k' }, d.k), h('span', { class: 'tyd-tag2 ' + (eq ? 'same' : 'diff') }, eq ? 'Same' : 'Different')),
          h('div', { class: 'tyd-l-ab' }, h('span', { class: 'a' }, a + ' ' + P.poles[d.k][a][0]), h('span', { class: 'b' }, b + ' ' + P.poles[d.k][b][0])),
          bi(note[0], note[1], 'small'));
      }))));
    const all = CM.groups.reduce((n, g) => n + g.rows.length, 0);
    root.append(bi(all + ' things compared in ' + CM.groups.length + ' groups. Tap a group to open it.', 'เปรียบเทียบ ' + all + ' เรื่อง ใน ' + CM.groups.length + ' หมวด แตะที่หมวดเพื่อเปิดดู', 'small tyd-note'));
    const grp = h('div', { class: 'tyd-grp' });
    CM.groups.forEach((g, gi) => {
      let s = 0, d = 0;
      const rows = g.rows.map(([dim, en, th, men, mth, pol]) => {
        const i = P.dims.findIndex((x) => x.k === dim), a = me.code[i], eq = a === MUHAY[i], hers = pol[a];
        if (eq) s++; else d++;
        return h('div', { class: 'tyd-r' },
          h('div', { class: 'l' }, h('b', null, en, h('span', { class: 'th' }, ' · ' + th)), h('span', { class: 'tyd-tag2 ' + (eq ? 'same' : 'diff') }, eq ? 'Same' : 'Different')),
          h('div', { class: 's a' }, avatar('her', me.code, 24, HER), bi(hers[0], hers[1], 'small')),
          h('div', { class: 's b' }, avatar('him', MUHAY, 24, HIM), bi(men, mth, 'small')));
      });
      grp.append(h('details', gi === 0 ? { open: true } : null,
        h('summary', null, h('span', { class: 'ic' }, g.ic), h('b', null, g.en, h('span', { class: 'th' }, ' · ' + g.th)), h('span', { class: 'tl' }, h('i', { class: 'm' }, s + ' same'), h('i', { class: 'f' }, d + ' diff'))),
        h('div', { class: 'rows' }, rows)));
    });
    root.append(grp);
    root.append(bi('Types are a starting point for talking, not a rule. Two real people are always more than four letters.', 'บุคลิกภาพเป็นจุดเริ่มต้นของการพูดคุย ไม่ใช่กฎ คนจริงสองคนมีอะไรมากกว่าตัวอักษรสี่ตัวเสมอ', 'small tyd-note'));
    return root;
  };
})();
