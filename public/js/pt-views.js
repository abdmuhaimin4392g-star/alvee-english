/* pt-views.js — reading about personality types: all 16 types with rarity, a full profile of each
   (English and Thai, famous people), and Alvee and Muhay (INFJ) side by side. */
(function () {
  'use strict';
  const A = window.AE, h = A.h, P = window.PTEST, PR = window.PTPROF, CM = window.PTCMP;
  if (!A || !P || !PR || !CM) return;
  const VIEWS = A.VIEWS;
  const MUHAY = CM.muhay.code;
  const GROUPS = [
    { k: 'NT', en: 'Thinkers', th: 'นักคิด', d: ['Logical, curious and full of ideas', 'มีเหตุผล ช่างสงสัย และเต็มไปด้วยไอเดีย'], codes: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
    { k: 'NF', en: 'Idealists', th: 'นักอุดมคติ', d: ['Caring, deep and guided by values', 'ใส่ใจ ลึกซึ้ง และยึดมั่นในคุณค่า'], codes: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
    { k: 'SJ', en: 'Guardians', th: 'ผู้พิทักษ์', d: ['Reliable, organized and loyal', 'ไว้ใจได้ มีระเบียบ และซื่อสัตย์'], codes: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
    { k: 'SP', en: 'Explorers', th: 'นักสำรวจ', d: ['Practical, free and full of action', 'ใช้ได้จริง รักอิสระ และชอบลงมือทำ'], codes: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
  ];
  const groupOf = (c) => GROUPS.find((g) => g.codes.includes(c));
  // rarity, like the treasure: the fewer people with a type, the rarer it is
  const RAR = [[2, 'l', 'Legendary', 'หายากที่สุด'], [3.5, 'e', 'Epic', 'หายากมาก'], [6, 'r', 'Rare', 'หายาก'], [10, 'u', 'Uncommon', 'ไม่ค่อยพบ'], [100, 'c', 'Common', 'พบบ่อย']];
  const rarity = (c) => { const pct = PR[c].pct, r = RAR.find((x) => pct < x[0]); const col = (A.treasure && A.treasure.RAR[r[1]] || {}).col || '#9fb8bd'; return { pct, k: r[1], en: r[2], th: r[3], col }; };
  const rchip = (c) => { const r = rarity(c); return h('span', { class: 'ty-rar', style: { '--rc': r.col } }, r.en); };
  const mine = () => { try { const p = A.ptest.st(); return p.done && p.res ? p.res : null; } catch (e) { return null; } };
  const bi = (en, th, cls) => h('div', { class: 'ty-bi ' + (cls || '') }, h('div', { class: 'en' }, en), h('div', { class: 'th' }, th));
  const back = (to, title, sub) => h('div', { class: 'row' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: () => A.go(to) }, '‹'), h('div', null, h('h1', null, title), sub ? h('p', { class: 'muted' }, sub) : null));
  const initials = (n) => n.replace(/[^A-Za-z .]/g, '').split(/[ .]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = (s) => { let x = 0; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) % 360; return x; };

  // ---------------------------------------------------------------- all 16 types
  VIEWS.types = () => {
    const root = h('div', { class: 'screen ty' }), me = mine();
    root.append(back('me', 'Personality types', 'All 16 types, how rare each one is, and what they are like'));
    if (me) root.append(h('button', { class: 'card ty-vs-card', onclick: () => A.go('typevs') },
      h('div', { class: 'ty-vs-two' }, h('span', { class: 'ty-av' }, P.types[me.code].ic), h('b', null, 'VS'), h('span', { class: 'ty-av' }, P.types[MUHAY].ic)),
      h('div', { style: { flex: 1 } }, h('b', null, 'You (' + me.full + ') and Muhay (' + MUHAY + ')'), bi('See how you two think, decide and plan, side by side.', 'ดูว่าคุณสองคนคิด ตัดสินใจ และวางแผนอย่างไร เทียบกันแบบเห็นชัด ๆ', 'small')),
      h('span', { class: 'muted' }, '›')));
    else root.append(h('button', { class: 'card ty-vs-card', onclick: () => A.ptest.open('types') }, h('span', { class: 'ty-av' }, '🧭'), h('div', { style: { flex: 1 } }, h('b', null, 'Find your own type first'), bi('Finish the test, then compare yourself with Muhay.', 'ทำแบบทดสอบให้เสร็จ แล้วเปรียบเทียบตัวเองกับมูไฮ', 'small')), h('span', { class: 'muted' }, '›')));
    root.append(h('div', { class: 'card ty-legend' }, h('b', null, '💎 How rare is each type?'),
      bi('The fewer people have a type, the rarer it is. The numbers come from large surveys and are only a rough guide.', 'ยิ่งมีคนเป็นแบบนั้นน้อย ก็ยิ่งหายาก ตัวเลขมาจากการสำรวจขนาดใหญ่ และเป็นเพียงการประมาณคร่าว ๆ', 'small'),
      h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '8px' } }, RAR.map((r) => h('span', { class: 'ty-rar', style: { '--rc': (A.treasure.RAR[r[1]] || {}).col } }, r[2] + (r[0] < 100 ? ' · under ' + r[0] + '%' : ' · 10% or more'))))));
    GROUPS.forEach((g) => {
      root.append(h('div', { class: 'ty-group' }, h('h2', null, g.en), bi(g.d[0], g.th + ' · ' + g.d[1], 'small muted')));
      const grid = h('div', { class: 'ty-grid' });
      g.codes.forEach((c) => {
        const T = P.types[c], r = rarity(c), you = me && me.code === c, mu = c === MUHAY;
        grid.append(h('button', { class: 'ty-cell' + (you ? ' you' : '') + (mu ? ' mu' : ''), style: { '--rc': r.col }, onclick: () => A.go('type', c) },
          h('div', { class: 'ty-ic' }, T.ic), h('b', { class: 'ty-code' }, c), h('div', { class: 'ty-name' }, T.n.replace(/^The /, '')),
          h('div', { class: 'ty-pct' }, r.pct + '%'), rchip(c),
          you ? h('span', { class: 'ty-tag' }, 'You') : mu ? h('span', { class: 'ty-tag mu' }, 'Muhay') : null));
      });
      root.append(grid);
    });
    root.append(bi('A type is a way of seeing yourself, not a box. Real people fit some lines and not others.', 'บุคลิกภาพเป็นเพียงวิธีหนึ่งในการมองตัวเอง ไม่ใช่กรอบที่ตายตัว คนจริง ๆ อาจตรงกับบางข้อและไม่ตรงกับบางข้อ', 'small muted ty-note'));
    return root;
  };

  // ---------------------------------------------------------------- one type in full
  const TABS = [['over', 'Overview'], ['str', 'Strengths'], ['rel', 'Relationships'], ['fam', 'Friends & family'], ['car', 'Career'], ['grow', 'Stress & growth']];
  let tab = 'over';
  const items = (L) => h('div', { class: 'ty-items' }, L.map(([ic, et, tt, en, th]) => h('div', { class: 'ty-item' }, h('span', { class: 'ty-iic' }, ic), h('div', null, h('b', null, et), h('span', { class: 'ty-tt th' }, ' · ' + tt), bi(en, th)))));
  VIEWS.type = (code) => {
    code = (code && PR[code]) ? code : (mine() || {}).code || MUHAY;
    const T = P.types[code], X = PR[code], r = rarity(code), me = mine(), you = me && me.code === code, mu = code === MUHAY, g = groupOf(code);
    const root = h('div', { class: 'screen ty' });
    root.append(back('types', code + ' · ' + T.n, g.en + ' · ' + r.en));
    root.append(h('div', { class: 'card ty-hero', style: { '--rc': r.col } },
      h('div', { class: 'ty-hero-ic' }, T.ic),
      h('div', { class: 'ty-hero-code' }, code, you ? h('small', null, '-' + me.id) : null),
      h('h2', null, T.n), h('div', { class: 'th ty-hero-th' }, T.th),
      h('div', { class: 'row wrap', style: { gap: '6px', justifyContent: 'center' } }, rchip(code), h('span', { class: 'pill sea' }, g.en + ' · ' + g.th), you ? h('span', { class: 'pill good' }, '⭐ Your type') : null, mu ? h('span', { class: 'pill ty-mu' }, '💙 Muhay’s type') : null),
      bi('About ' + r.pct + '% of people have this type.', 'ประมาณ ' + r.pct + '% ของผู้คนมีบุคลิกภาพแบบนี้', 'small')));
    const bar = h('div', { class: 'tabs scroll ty-tabs', role: 'tablist' });
    const body = h('div', { class: 'stack', style: { gap: '12px' } });
    const draw = () => {
      A.clear(bar).append(...TABS.map(([k, t]) => h('button', { class: tab === k ? 'on' : '', role: 'tab', onclick: () => { tab = k; draw(); } }, t)));
      A.clear(body);
      if (tab === 'over') {
        body.append(h('div', { class: 'card' }, bi(X.intro[0], X.intro[1])));
        const letters = code.split('').map((l, i) => { const d = P.dims[i], pole = P.poles[d.k][l]; return h('div', { class: 'ty-let' }, h('b', null, l), h('div', null, h('b', null, pole[0]), h('span', { class: 'th' }, ' · ' + pole[1]), bi(pole[2], pole[3], 'small'))); });
        body.append(h('div', { class: 'card stack', style: { gap: '8px' } }, h('b', null, '🔤 The four letters'), ...letters));
        body.append(h('div', { class: 'card stack', style: { gap: '6px' } }, h('b', null, '⭐ In three words'), h('div', { class: 'row wrap', style: { gap: '6px' } }, T.s.map(([en, th]) => h('span', { class: 'ty-chip' }, en, h('small', { class: 'th' }, th))))));
      }
      if (tab === 'str') body.append(h('h3', null, '💪 Strengths'), items(X.str), h('h3', null, '🌧️ Weak points'), items(X.weak));
      if (tab === 'rel') body.append(items(X.rel));
      if (tab === 'fam') body.append(items(X.fam));
      if (tab === 'car') body.append(h('div', { class: 'card' }, h('b', null, '💼 Good jobs for this type'), bi(X.jobs[0], X.jobs[1])), items(X.work));
      if (tab === 'grow') body.append(items(X.stress));
      if (tab === 'over') {
        const box = h('div', { class: 'stack', style: { gap: '10px' }, hidden: true });
        const btn = h('button', { class: 'ty-who', onclick: () => { box.hidden = !box.hidden; btn.classList.toggle('on', !box.hidden); } }, 'Who has this type in real life? ›');
        body.append(btn, box);
        box.append(bi('Famous people who are often said to be ' + code + '. These are popular guesses, not real test results.', 'คนดังที่มักถูกกล่าวว่าเป็น ' + code + ' นี่เป็นเพียงการคาดเดาที่นิยมกัน ไม่ใช่ผลการทดสอบจริง', 'small muted'));
        box.append(h('div', { class: 'ty-people' }, X.people.map(([n, en, th]) => h('div', { class: 'ty-person' }, h('span', { class: 'ty-ini', style: { '--h': hue(n) } }, initials(n)), h('div', null, h('b', null, n), bi(en, th, 'small'))))));
      }
    };
    draw();
    root.append(bar, body);
    const nav = h('div', { class: 'row wrap', style: { gap: '8px' } });
    if (me && !you) nav.append(h('button', { class: 'btn ghost', style: { flex: 1 }, onclick: () => { tab = 'over'; A.go('type', me.code); } }, '⭐ My type (' + me.code + ')'));
    if (!mu) nav.append(h('button', { class: 'btn ghost', style: { flex: 1 }, onclick: () => { tab = 'over'; A.go('type', MUHAY); } }, '💙 Muhay (' + MUHAY + ')'));
    if (me) nav.append(h('button', { class: 'btn', style: { flex: 1 }, onclick: () => A.go('typevs') }, '⚖️ Compare'));
    root.append(nav);
    return root;
  };

  // ---------------------------------------------------------------- Alvee and Muhay
  VIEWS.typevs = () => {
    const me = mine(), root = h('div', { class: 'screen ty tvs' });
    if (!me) { setTimeout(() => A.go('types'), 0); return root; }
    const A1 = P.types[me.code], B1 = P.types[MUHAY], name = (A.user && A.user.name) || 'You';
    const L = (c, i) => c[i];
    root.append(back('types', 'You and Muhay', me.full + ' and ' + MUHAY));
    root.append(h('div', { class: 'card ty-two' },
      h('button', { class: 'ty-side', onclick: () => A.go('type', me.code) }, h('div', { class: 'ty-hero-ic' }, A1.ic), h('b', null, name), h('div', { class: 'ty-hero-code sm' }, me.full), h('small', null, A1.n), rchip(me.code)),
      h('span', { class: 'ty-vs' }, 'VS'),
      h('button', { class: 'ty-side mu', onclick: () => A.go('type', MUHAY) }, h('div', { class: 'ty-hero-ic' }, B1.ic), h('b', null, 'Muhay'), h('div', { class: 'ty-hero-code sm' }, MUHAY), h('small', null, B1.n), rchip(MUHAY))));
    const same = [0, 1, 2, 3].filter((i) => L(me.code, i) === L(MUHAY, i)).length;
    const lets = h('div', { class: 'card stack', style: { gap: '8px' } }, h('b', null, '🔤 Letter by letter'), bi(same + ' of 4 letters are the same.', 'ตัวอักษรเหมือนกัน ' + same + ' จาก 4 ตัว', 'small muted'));
    P.dims.slice(0, 4).forEach((d, i) => {
      const a = L(me.code, i), b = L(MUHAY, i), eq = a === b, note = CM.letters[d.k][eq ? 'same' : 'diff'];
      lets.append(h('div', { class: 'ty-lrow' },
        h('div', { class: 'ty-lhead' }, h('span', null, name + ': ', h('b', null, a + ' ' + P.poles[d.k][a][0])), h('span', { class: 'ty-tagx ' + (eq ? 'same' : 'diff') }, eq ? 'Same' : 'Different'), h('span', null, 'Muhay: ', h('b', null, b + ' ' + P.poles[d.k][b][0]))),
        bi(note[0], note[1], 'small')));
    });
    root.append(lets);
    CM.groups.forEach((g) => {
      const box = h('div', { class: 'card stack ty-cg', style: { gap: '10px' } }, h('b', null, g.ic + ' ' + g.en, h('span', { class: 'th muted' }, ' · ' + g.th)));
      g.rows.forEach(([dim, en, th, men, mth, pol]) => {
        const i = P.dims.findIndex((d) => d.k === dim), a = L(me.code, i), eq = a === L(MUHAY, i), hers = pol[a];
        box.append(h('div', { class: 'ty-crow' },
          h('div', { class: 'ty-clab' }, h('b', null, en), h('span', { class: 'th muted' }, ' · ' + th), h('span', { class: 'ty-tagx ' + (eq ? 'same' : 'diff') }, eq ? 'Same' : 'Different')),
          h('div', { class: 'ty-cols' },
            h('div', { class: 'ty-col' }, h('em', null, name), bi(hers[0], hers[1], 'small')),
            h('div', { class: 'ty-col mu' }, h('em', null, 'Muhay'), bi(men, mth, 'small')))));
      });
      root.append(box);
    });
    root.append(bi('Types are a starting point for talking, not a rule. You two are always more than four letters.', 'บุคลิกภาพเป็นจุดเริ่มต้นของการพูดคุย ไม่ใช่กฎ คุณสองคนมีอะไรมากกว่าตัวอักษรสี่ตัวเสมอ', 'small muted ty-note'));
    return root;
  };
})();
