/* calendar.js — a Thai calendar for Alvee: Thai and Maldives special days, both birthdays with countdowns,
   and the days she learned. Holidays: fixed dates, Buddhist days from the moon, Islamic days from the Hijri calendar. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h;
  if (!A || !A.VIEWS) return;
  const VIEWS = A.VIEWS;
  const MUHAY_BDAY = '1989-10-09';

  // ------------------------------------------------------------- day numbers (days since 1970, local dates)
  const D = (y, m, d) => Math.floor(Date.UTC(y, m, d) / 864e5);
  const Y = (n) => { const t = new Date(n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), w: t.getUTCDay() }; };
  const today = () => A.dnum(A.dkey());
  const keyOf = (n) => { const t = Y(n); return t.y + '-' + String(t.m + 1).padStart(2, '0') + '-' + String(t.d).padStart(2, '0'); };
  const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const nth = (y, m, wd, k) => { const f = Y(D(y, m, 1)).w; return D(y, m, 1 + ((wd - f + 7) % 7) + (k - 1) * 7); };

  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MN_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WD_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const WD_TH_LONG = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const longDate = (n) => { const t = Y(n); return WD[t.w] + ', ' + t.d + ' ' + MN[t.m] + ' ' + t.y; };
  const longTh = (n) => { const t = Y(n); return WD_TH_LONG[t.w] + 'ที่ ' + t.d + ' ' + MN_TH[t.m] + ' ' + (t.y + 543); };
  const shortDate = (n) => { const t = Y(n); return t.d + ' ' + MN[t.m].slice(0, 3); };

  // ------------------------------------------------------------- Hijri (Umm al-Qura through Intl, tabular fallback)
  let hf = null; const hc = {};
  function hijriCalc(d) {
    const jd = Math.floor(d + 2440587.5 + 0.5) + 0.5, i2j = (y, m, dd) => dd + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439.5 - 1;
    const y = Math.floor((30 * (jd - 1948439.5) + 10646) / 10631), m = Math.min(12, Math.ceil((jd - (29 + i2j(y, 1, 1))) / 29.5) + 1);
    return { y, m, d: jd - i2j(y, m, 1) + 1 };
  }
  function hijri(d) {
    if (hc[d]) return hc[d];
    let r = null;
    try {
      if (!hf) hf = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
      const ps = hf.formatToParts(new Date(d * 864e5 + 432e5)), g = (t) => parseInt((ps.find((p) => p.type === t) || {}).value, 10);
      const y = g('year'), m = g('month'), dd = g('day');
      if (y > 1000 && y < 2000 && m >= 1 && m <= 12 && dd >= 1 && dd <= 30) r = { y, m, d: dd };
    } catch (e) { /* fallback below */ }
    return (hc[d] = r || hijriCalc(d));
  }

  // ------------------------------------------------------------- full moons (Meeus, main terms), as Thai local dates
  function fullMoonJD(k) {
    const kk = k + 0.5, T = kk / 1236.85, r = Math.PI / 180, s = Math.sin, E = 1 - 0.002516 * T;
    const J = 2451550.09766 + 29.530588861 * kk + 0.00015437 * T * T;
    const M = r * (2.5534 + 29.1053567 * kk), P = r * (201.5643 + 385.81693528 * kk + 0.0107582 * T * T), F = r * (160.7108 + 390.67050284 * kk);
    return J - 0.40614 * s(P) + 0.17302 * E * s(M) + 0.01614 * s(2 * P) + 0.01043 * s(2 * F) + 0.00734 * E * s(P - M) - 0.00515 * E * s(P + M) + 0.00209 * E * E * s(2 * M);
  }
  const fmCache = {};
  function fullMoons(y) {
    if (fmCache[y]) return fmCache[y];
    const out = [], k0 = Math.floor((y - 2000) * 12.3685) - 2;
    for (let k = k0; k < k0 + 16; k++) { const t = (fullMoonJD(k) - 2440587.5) * 864e5, d = Math.floor((t + 7 * 36e5) / 864e5); if (Y(d).y === y) out.push(d); }
    return (fmCache[y] = out);
  }
  const fullMoonIn = (y, m0, d0, m1, d1) => { const a = D(y, m0 - 1, d0), b = D(y, m1 - 1, d1); return fullMoons(y).find((d) => d >= a && d <= b) || null; };

  // ------------------------------------------------------------- the special days
  // Thai Buddhist days set by the government (Makha, Visakha, Asarnha, Khao Phansa); other years use the full moon
  const THB = { 2025: [[2, 12], [5, 11], [7, 10], [7, 11]], 2026: [[3, 3], [5, 31], [7, 29], [7, 30]], 2027: [[2, 21], [5, 20], [7, 18], [7, 19]] };
  const CNY = { 2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3] };
  const MV_OVR = { 2026: { ram: [2, 19], fit: [3, 20], haj: [5, 27], adh: [5, 28], iny: [6, 16], nat: [8, 15], mwl: [8, 25], emb: [9, 13] } };
  const TH_FIX = [
    [1, 1, 'New Year’s Day', 'วันขึ้นปีใหม่', '🎆', 1], [1, 16, 'Teachers’ Day', 'วันครู', '👩‍🏫', -1], [3, 13, 'Thai Elephant Day', 'วันช้างไทย', '🐘', -1],
    [4, 6, 'Chakri Day', 'วันจักรี', '👑', 1], [4, 13, 'Songkran', 'วันสงกรานต์', '💦', 0], [4, 14, 'Songkran · Family Day', 'วันสงกรานต์ · วันครอบครัว', '💦', 0], [4, 15, 'Songkran', 'วันสงกรานต์', '💦', 0],
    [5, 1, 'National Labour Day', 'วันแรงงานแห่งชาติ', '👷', 0], [5, 4, 'Coronation Day', 'วันฉัตรมงคล', '👑', 1], [6, 3, 'Queen Suthida’s Birthday', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี', '👑', 1],
    [7, 28, 'King’s Birthday', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', '👑', 1], [8, 12, 'Mother’s Day', 'วันแม่แห่งชาติ', '💐', 1],
    [10, 13, 'King Bhumibol Memorial Day', 'วันนวมินทรมหาราช', '🕯️', 1], [10, 23, 'Chulalongkorn Day', 'วันปิยมหาราช', '🎓', 1],
    [12, 5, 'Father’s Day', 'วันพ่อแห่งชาติ', '👔', 1], [12, 10, 'Constitution Day', 'วันรัฐธรรมนูญ', '📜', 1], [12, 31, 'New Year’s Eve', 'วันสิ้นปี', '🥂', 0]];
  const MV_FIX = [[1, 1, 'New Year’s Day', 'วันขึ้นปีใหม่', '🎆'], [5, 1, 'Workers’ Day', 'วันแรงงาน', '👷'], [7, 26, 'Independence Day', 'วันประกาศอิสรภาพ', '🇲🇻'],
    [11, 3, 'Victory Day', 'วันแห่งชัยชนะ', '🏆'], [11, 11, 'Republic Day', 'วันสาธารณรัฐ', '🇲🇻']];
  const MV_HIJ = [['ram', 9, 1, 'First of Ramadan', 'วันแรกของเดือนรอมฎอน', '🌙'], ['fit', 10, 1, 'Eid al-Fitr', 'วันอีดิลฟิฏริ', '🎉'], ['haj', 12, 9, 'Hajj Day', 'วันอะเราะฟะฮ์', '🕋'],
    ['adh', 12, 10, 'Eid al-Adha', 'วันอีดิลอัฎฮา', '🐑'], ['iny', 1, 1, 'Islamic New Year', 'วันขึ้นปีใหม่อิสลาม', '🌙'], ['nat', 3, 1, 'National Day', 'วันชาติมัลดีฟส์', '🇲🇻'],
    ['mwl', 3, 12, 'The Prophet’s Birthday', 'วันเมาลิดนบี', '🕌'], ['emb', 4, 1, 'The Day Maldives Embraced Islam', 'วันที่มัลดีฟส์รับศาสนาอิสลาม', '🕌']];

  const cache = {};
  function holidays(y) {
    if (cache[y]) return cache[y];
    const M = {}, add = (d, o) => { if (d == null) return; const a = M[d] || (M[d] = []); if (!a.some((x) => x.en === o.en && x.c === o.c)) a.push(o); };
    const wk = (d) => Y(d).w, F = (m, d) => D(y, m - 1, d);
    const nextWork = (d) => { let x = d + 1; while ([0, 6].includes(wk(x)) || (M[x] || []).some((o) => o.c === 'th' && o.off)) x++; return x; };
    const lieu = (x, o) => { if ([0, 6].includes(wk(x))) add(nextWork(x), { ...o, en: o.en + ' (day off in lieu)', th: 'วันหยุดชดเชย' + o.th }); };
    // Thailand
    TH_FIX.forEach(([m, d, en, th, ic, sub]) => { const x = F(m, d), o = { en, th, ic, c: 'th', off: sub >= 0 }; add(x, o); if (sub === 1) lieu(x, o); });
    { let wkend = 0; [13, 14, 15].forEach((d) => { if ([0, 6].includes(wk(F(4, d)))) wkend++; }); let x = F(4, 15); for (let i = 0; i < wkend; i++) { x = nextWork(x); add(x, { en: 'Songkran (day off in lieu)', th: 'วันหยุดชดเชยวันสงกรานต์', ic: '💦', c: 'th', off: true }); } }
    add(nth(y, 0, 6, 2), { en: 'Children’s Day', th: 'วันเด็กแห่งชาติ', ic: '🧒', c: 'th' });
    {
      let b = THB[y], ap = false;
      if (!b) { ap = true; const mk = fullMoonIn(y, 2, 6, 3, 7), vs = fullMoonIn(y, 5, 3, 6, 5), as = fullMoonIn(y, 7, 1, 8, 3); b = [mk, vs, as, as && as + 1].map((x) => x && [Y(x).m + 1, Y(x).d]); }
      const N4 = [['Makha Bucha', 'วันมาฆบูชา', '🪷'], ['Visakha Bucha', 'วันวิสาขบูชา', '🪷'], ['Asarnha Bucha', 'วันอาสาฬหบูชา', '🪷'], ['Buddhist Lent begins', 'วันเข้าพรรษา', '🕯️']];
      b.forEach((p, i) => { if (!p) return; const x = F(p[0], p[1]), o = { en: N4[i][0], th: N4[i][1], ic: N4[i][2], c: 'th', off: true, ap }; add(x, o); if (i !== 2) lieu(x, o); });
      const as = b[2] && F(b[2][0], b[2][1]);
      if (as) { const op = fullMoons(y).find((d) => d > as + 80 && d < as + 100); if (op) add(op, { en: 'End of Buddhist Lent', th: 'วันออกพรรษา', ic: '🕯️', c: 'th', ap: true }); }
    }
    { const c = CNY[y]; if (c) add(F(c[0], c[1]), { en: 'Chinese New Year', th: 'วันตรุษจีน', ic: '🧧', c: 'th' }); }
    add(fullMoonIn(y, 11, 1, 12, 2), { en: 'Loy Krathong', th: 'วันลอยกระทง', ic: '🏮', c: 'th', ap: true });
    // Maldives
    MV_FIX.forEach(([m, d, en, th, ic]) => add(F(m, d), { en, th, ic, c: 'mv', off: true }));
    const ov = MV_OVR[y] || {}, byKey = {};
    MV_HIJ.forEach((r) => { byKey[r[1] + '-' + r[2]] = r; const o = ov[r[0]]; if (o) add(F(o[0], o[1]), { en: r[3], th: r[4], ic: r[5], c: 'mv', off: true }); });
    for (let d = F(1, 1); d <= F(12, 31); d++) { const hj = hijri(d), r = byKey[hj.m + '-' + hj.d]; if (r && !ov[r[0]]) add(d, { en: r[3], th: r[4], ic: r[5], c: 'mv', off: true, ap: true }); }
    return (cache[y] = M);
  }
  const holOn = (d) => holidays(Y(d).y)[d] || [];

  // ------------------------------------------------------------- birthdays
  const parseIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
  const nextOcc = (b, from) => {
    const at = (y) => (b.m === 1 && b.d === 29 && dim(y, 1) < 29 ? D(y, 1, 28) : D(y, b.m, b.d));
    const y = Y(from).y; let n = at(y); if (n < from) n = at(y + 1); return n;
  };
  function birthdays(st) {
    const out = [];
    const her = parseIso(st && st.bday), me = parseIso(MUHAY_BDAY);
    if (her) out.push({ who: 'alvee', name: A.user ? A.user.name : 'Alvee', b: her, ic: '🐢' });
    out.push({ who: 'muhay', name: 'Muhay', b: me, ic: '🐼' });
    const t = today();
    return out.map((x) => { const n = nextOcc(x.b, t); return { ...x, next: n, left: n - t, age: Y(n).y - x.b.y }; });
  }
  const bdayOn = (st, d) => { const t = Y(d); return birthdays(st).filter((x) => x.b.m === t.m && x.b.d === t.d); };

  // ------------------------------------------------------------- setting her birthday
  function bdaySheet(st, after) {
    const cur = parseIso(st.bday); let sheet = null;
    const inp = h('input', { class: 'input', type: 'date', value: st.bday || '', max: A.dkey(), min: '1950-01-01', 'aria-label': 'Your birthday' });
    const box = h('div', { class: 'stack', style: { gap: '12px' } },
      h('div', { class: 'row', style: { gap: '10px' } }, h('div', { style: { fontSize: '2.4rem' } }, '🎂'), h('div', null, h('h2', null, 'Your birthday'), h('div', { class: 'small muted th' }, 'วันเกิดของคุณ · ใส่วันเดือนปีเกิด'))),
      inp,
      h('button', { class: 'btn primary block', onclick: () => {
        if (!parseIso(inp.value)) { A.toast('Please pick a date · กรุณาเลือกวันที่'); return; }
        st.bday = inp.value; A.saveSoon(); A.track('birthday_set', {}); sheet && sheet.close(); A.toast('🎂 Saved! · บันทึกแล้ว'); after && after();
      } }, cur ? 'Save' : 'Add my birthday'));
    sheet = A.sheet(box);
  }

  // ------------------------------------------------------------- countdown cards
  function bdCard(st, x, after) {
    const isToday = x.left === 0;
    return h('button', { class: 'bdc2 ' + x.who + (isToday ? ' party' : ''), onclick: () => (x.who === 'alvee' ? bdaySheet(st, after) : A.go('calendar', { sel: x.next })) },
      h('span', { class: 'bdc2-who' }, x.ic + ' ' + x.name),
      h('span', { class: 'bdc2-cd' }, isToday ? 'Today! 🎉' : String(x.left), isToday ? null : h('small', null, x.left === 1 ? ' day' : ' days')),
      h('small', { class: 'bdc2-sub' }, '🎂 ' + shortDate(x.next) + ' · turns ' + x.age),
      x.who === 'alvee' ? h('span', { class: 'bdc2-edit', 'aria-hidden': 'true' }, '✎') : null);
  }
  function addCard(st, after) {
    return h('button', { class: 'bdc2 alvee add', onclick: () => bdaySheet(st, after) },
      h('span', { class: 'bdc2-who' }, '🐢 ' + (A.user ? A.user.name : 'You')), h('b', null, 'Add your birthday'), h('small', { class: 'bdc2-sub th' }, 'แตะเพื่อใส่วันเกิด'));
  }
  function upcoming(st, days) {
    const t = today(), out = [];
    for (let d = t; d <= t + days; d++) {
      holOn(d).forEach((o) => { const same = out.find((x) => x.d === d && x.en === o.en); if (same) { same.c = 'both'; return; } out.push({ d, ...o }); });
      bdayOn(st, d).forEach((x) => out.push({ d, en: x.name + '’s birthday', th: 'วันเกิดของ ' + x.name, ic: '🎂', c: 'bd' }));
    }
    return out;
  }

  // the strip on the home page, under the map
  function homeStrip(st) {
    const wrap = h('div', { class: 'cal-home' });
    const draw = () => {
      const bs = birthdays(st), her = bs.find((x) => x.who === 'alvee'), me = bs.find((x) => x.who === 'muhay');
      const up = upcoming(st, 60).filter((o) => o.c !== 'bd').slice(0, 2);
      wrap.replaceChildren(
        h('div', { class: 'bd-row' }, her ? bdCard(st, her, draw) : addCard(st, draw), bdCard(st, me, draw)),
        h('button', { class: 'card cal-next', onclick: () => A.go('calendar') },
          h('div', { class: 'cal-mini' }, h('small', null, MN[Y(today()).m].slice(0, 3).toUpperCase()), h('b', null, Y(today()).d)),
          h('div', { class: 'cal-next-list' }, up.length ? up.map((o) => h('div', { class: 'cal-next-it' }, h('span', { class: 'dot ' + o.c }), o.ic + ' ', h('b', null, o.en), h('span', { class: 'muted' }, ' · ' + (o.d === today() ? 'today' : o.d - today() === 1 ? 'tomorrow' : 'in ' + (o.d - today()) + ' days')))) : h('div', { class: 'muted small' }, 'Thai & Maldives calendar')),
          h('span', { class: 'pill sea' }, '📅 ›')));
    };
    draw();
    return wrap;
  }

  // ------------------------------------------------------------- the full calendar page
  const CV = { y: null, m: null, sel: null };
  VIEWS.calendar = (arg) => {
    const st = A.state, t = today();
    if (arg && arg.sel != null) { CV.sel = arg.sel; CV.y = Y(arg.sel).y; CV.m = Y(arg.sel).m; }
    if (CV.sel == null) CV.sel = t;
    if (CV.y == null) { CV.y = Y(t).y; CV.m = Y(t).m; }
    const root = h('div', { class: 'screen cal-screen' });
    const body = h('div', { class: 'stack', style: { gap: '14px' } });
    root.append(h('div', { class: 'row' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: () => A.go('home') }, '‹'),
      h('div', null, h('h1', null, 'Calendar'), h('p', { class: 'muted th' }, 'ปฏิทินไทย · Thai and Maldives special days'))));
    root.append(body);
    const move = (n) => { let m = CV.m + n, y = CV.y; while (m < 0) { m += 12; y--; } while (m > 11) { m -= 12; y++; } CV.m = m; CV.y = y; draw(); };
    function draw() {
      const y = CV.y, m = CV.m, first = D(y, m, 1), lead = Y(first).w, n = dim(y, m);
      const bs = birthdays(st);
      const grid = h('div', { class: 'cal-grid' }, WD_TH.map((w, i) => h('div', { class: 'cal-wd' + (i === 0 || i === 6 ? ' we' : '') }, h('b', null, w), h('small', null, WD[i].slice(0, 2)))));
      for (let i = 0; i < lead; i++) grid.append(h('div', { class: 'cal-c empty' }));
      for (let i = 1; i <= n; i++) {
        const d = D(y, m, i), hol = holOn(d), bd = bdayOn(st, d), learned = A.active(st, keyOf(d));
        const cls = ['cal-c'];
        if (d === t) cls.push('today'); if (d === CV.sel) cls.push('sel'); if ([0, 6].includes(Y(d).w)) cls.push('we');
        if (hol.some((o) => o.c === 'th' && o.off)) cls.push('th-off'); if (hol.some((o) => o.c === 'mv')) cls.push('mv-day'); if (bd.length) cls.push('bd');
        grid.append(h('button', { class: cls.join(' '), 'aria-label': longDate(d), onclick: () => { CV.sel = d; draw(); } },
          h('span', { class: 'n' }, i),
          bd.length ? h('span', { class: 'cal-ic' }, '🎂') : hol.length ? h('span', { class: 'cal-ic' }, hol[0].ic) : null,
          h('span', { class: 'dots' }, hol.some((o) => o.c === 'th') ? h('i', { class: 'th' }) : null, hol.some((o) => o.c === 'mv') ? h('i', { class: 'mv' }) : null, learned ? h('i', { class: 'fire' }) : null)));
      }
      const sel = CV.sel, sh = holOn(sel), sb = bdayOn(st, sel);
      const items = [
        ...sb.map((x) => h('div', { class: 'cal-it bd' }, h('span', { class: 'cal-it-ic' }, '🎂'), h('div', null, h('b', null, x.name + '’s birthday'), h('small', { class: 'th' }, 'วันเกิดของ ' + x.name + ' · turns ' + (Y(sel).y - x.b.y))))),
        ...sh.map((o) => h('div', { class: 'cal-it ' + o.c }, h('span', { class: 'cal-it-ic' }, o.ic), h('div', null, h('b', null, o.en), h('small', { class: 'th' }, o.th + ' · ' + (o.c === 'th' ? '🇹🇭 Thailand' : '🇲🇻 Maldives') + (o.off ? ' · holiday' : '') + (o.ap ? ' · date may move a day' : ''))))),
      ];
      if (A.active(st, keyOf(sel))) items.push(h('div', { class: 'cal-it fire' }, h('span', { class: 'cal-it-ic' }, '🔥'), h('div', null, h('b', null, 'You learned English this day'), h('small', { class: 'th' }, 'วันนี้คุณเรียนภาษาอังกฤษ'))));
      const up = upcoming(st, 120).slice(0, 8);
      body.replaceChildren(
        h('div', { class: 'bd-row' }, ...bs.map((x) => bdCard(st, x, draw)), bs.some((x) => x.who === 'alvee') ? null : addCard(st, draw)),
        h('div', { class: 'card cal-card' },
          h('div', { class: 'cal-head' },
            h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => move(-1) }, '‹'),
            h('div', { class: 'cal-title' }, h('b', { class: 'th' }, MN_TH[m] + ' ' + (y + 543)), h('small', null, MN[m] + ' ' + y)),
            h('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => move(1) }, '›')),
          grid,
          h('div', { class: 'cal-leg' }, h('span', null, h('i', { class: 'th' }), '🇹🇭 Thailand'), h('span', null, h('i', { class: 'mv' }), '🇲🇻 Maldives'), h('span', null, h('i', { class: 'fire' }), 'Learned'), h('span', null, '🎂 Birthday')),
          (CV.y !== Y(t).y || CV.m !== Y(t).m) ? h('button', { class: 'btn ghost block', onclick: () => { CV.y = Y(t).y; CV.m = Y(t).m; CV.sel = t; draw(); } }, 'Back to today') : null),
        h('div', { class: 'card cal-day' }, h('div', { class: 'sec-title' }, longDate(sel)), h('div', { class: 'small muted th' }, longTh(sel)),
          items.length ? h('div', { class: 'stack', style: { gap: '8px', marginTop: '10px' } }, ...items) : h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'A normal day. A good day to learn a few words! · วันธรรมดา')),
        h('div', { class: 'card' }, h('div', { class: 'sec-title' }, 'Coming up'), h('div', { class: 'small muted th' }, 'วันสำคัญที่กำลังจะมาถึง'),
          h('div', { class: 'stack', style: { gap: '6px', marginTop: '10px' } }, ...up.map((o) => h('button', { class: 'cal-up', onclick: () => { CV.sel = o.d; CV.y = Y(o.d).y; CV.m = Y(o.d).m; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
            h('span', { class: 'cal-up-d' }, h('b', null, Y(o.d).d), h('small', null, MN[Y(o.d).m].slice(0, 3))), h('span', { class: 'dot ' + o.c }),
            h('span', { class: 'cal-up-t' }, h('b', null, o.ic + ' ' + o.en), h('small', { class: 'th' }, o.th)),
            h('span', { class: 'muted small' }, o.d === t ? 'today' : (o.d - t) + ' d'))))));
    }
    draw();
    return root;
  };

  A.cal = { homeStrip, holidays, birthdays, holOn, bdaySheet, MUHAY_BDAY };
})();
