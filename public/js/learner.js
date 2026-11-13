/* learner.js — Alvee's side: home, journey, lessons, talks, words, grammar, me */
(function () {
  'use strict';
  const A = window.AE, C = A.C, h = A.h, D = C.dict;
  const app = () => document.getElementById('app');

  // ================================================================ shared UI
  A.toast = (msg, ms) => {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), ms || 2200);
  };
  A.sheet = (content, opts) => {
    const veil = h('div', { class: 'veil' });
    const sh = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grab' }), h('div', { class: 'in' }, content));
    const close = () => { veil.remove(); sh.remove(); if (opts && opts.onClose) opts.onClose(); };
    veil.addEventListener('click', close);
    document.body.append(veil, sh);
    sh.close = close;
    sh.setContent = (c) => { const inn = sh.querySelector('.in'); A.clear(inn).append(c); sh.scrollTop = 0; };
    return sh;
  };
  A.confetti = () => {
    const cv = h('canvas', { class: 'confetti' });
    document.body.append(cv);
    const ctx = cv.getContext('2d');
    const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const cols = ['#FFB21E', '#0E8A8A', '#E5476C', '#17955A', '#7FCDEB'];
    const ps = Array.from({ length: 110 }, () => ({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: A.pick(cols), a: Math.random() * 6 }));
    let f = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r / 1.6); ctx.restore(); });
      if (++f < 120) requestAnimationFrame(tick); else cv.remove();
    })();
  };
  A.sayBtns = (text, opts) => {
    const o = opts || {};
    const b = h('button', { class: 'say' + (o.sm ? ' sm' : ''), 'aria-label': 'Listen', onclick: (e) => { e.stopPropagation(); A.speech.say(text); } }, '🔊');
    if (o.noSlow) return b;
    const s = h('button', { class: 'say slow' + (o.sm ? ' sm' : ''), 'aria-label': 'Listen slowly', onclick: (e) => { e.stopPropagation(); A.speech.say(text, true); } }, '🐢');
    return h('span', { class: 'row', style: { gap: '6px', flex: 'none' } }, b, s);
  };

  // English text where every word can be tapped for Thai help
  A.rich = (toks, ctx) => {
    const span = h('span', { class: 'rich' });
    const ph = (ctx && ctx.ph) || [];
    toks.forEach((t, i) => {
      if (i > 0 && !A.isPunct(t)) span.append(' ');
      if (A.isPunct(t) || t === '___') { span.append(t === '___' ? h('span', { class: 'gap-slot', 'data-gap': '1' }, ' ') : t); return; }
      const p = ph.find(([a, b]) => i >= a && i <= b);
      const el = h('span', { class: 'tok', role: 'button', tabindex: '0', onclick: (e) => { e.stopPropagation(); el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 400); A.wordPopup(t, { phrase: p && p[2], sentence: ctx && ctx.en }); } }, A.fill(t));
      span.append(el);
    });
    return span;
  };
  A.richS = (sid) => { const s = A.S(sid); return A.rich(s.t, s); };
  const textToks = (s) => (String(s).replace(/[’‘]/g, "'").match(/[$฿]?[A-Za-zÀ-ÿ0-9{}]+(?:'[A-Za-zÀ-ÿ]+)*(?:[-:][A-Za-zÀ-ÿ0-9]+)*%?|[.,!?;"()…]/g) || []);
  A.richText = (s) => A.rich(textToks(s), { en: s, ph: phrasesIn(textToks(s)) });
  function phrasesIn(toks) {
    const L = toks.map((t) => t.toLowerCase());
    const M = toks.map((t) => String(A.lemma(A.keyOf(t)) || t).toLowerCase());
    const out = [];
    for (let i = 0; i < L.length; i++) for (let n = 5; n >= 2; n--) {
      if (n > L.length - i) continue;
      const k = L.slice(i, i + n).join(' '), k2 = M.slice(i, i + n).join(' ');
      const hit = D[k] && D[k].p === 'phr' ? k : D[k2] && D[k2].p === 'phr' ? k2 : null;
      if (hit) { out.push([i, i + n - 1, hit]); i += n - 1; break; }
    }
    return out;
  }

  // ---------------------------------------------------------------- word popup
  function examplesFor(e, key) {
    const out = [];
    (e.ex || []).forEach(([en, th]) => out.push({ en, th }));
    (e.xs || []).forEach((sid) => { const s = A.S(sid); if (s && !out.some((o) => o.en === s.en)) out.push({ en: s.en, th: s.th }); });
    if (e.base && D[e.base]) (D[e.base].ex || []).forEach(([en, th]) => { if (!out.some((o) => o.en === en)) out.push({ en, th, base: 1 }); });
    return out;
  }
  function popupBody(tok, ctx) {
    const key = A.keyOf(tok);
    const e = A.entry(tok);
    const box = h('div', { class: 'stack', style: { gap: '12px' } });
    if (!e) { box.append(h('p', { class: 'th' }, 'ยังไม่มีคำแปลของคำนี้')); return box; }
    if (ctx && ctx.phrase && D[ctx.phrase]) {
      const p = D[ctx.phrase];
      box.append(h('div', { class: 'wp-phrase stack', style: { gap: '4px' } },
        h('div', { class: 'small muted th' }, 'ในประโยคนี้ใช้เป็นวลี'),
        h('div', { class: 'row between' }, h('b', null, A.capFirst(p.w)), A.sayBtns(p.w, { sm: true })),
        h('div', { class: 'wp-th', style: { fontSize: '1.2rem' } }, p.th),
        p.n ? h('div', { class: 'small th' }, p.n) : null));
    }
    box.append(h('div', { class: 'wp-head' },
      e.e ? h('div', { class: 'pic' }, e.e) : null,
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'w' }, A.fill(e.w)), h('div', { class: 'pos' }, (A.POS[e.p] || '') + (e.f ? ' · ' + A.FORM[e.f] : ''))),
      A.sayBtns(A.fill(e.w))));
    box.append(h('div', { class: 'wp-th' }, e.th));
    const kv = h('dl', { class: 'kv' });
    if (e.pr) kv.append(h('dt', null, 'คำอ่าน'), h('dd', null, e.pr));
    if (e.exp) kv.append(h('dt', null, 'ย่อมาจาก'), h('dd', null, h('b', null, e.exp)));
    if (e.base && D[e.base]) {
      const b = D[e.base];
      kv.append(h('dt', null, 'คำหลัก'), h('dd', null, h('button', { class: 'chip', onclick: () => A.wordPopup(e.base) }, b.w + ' = ' + A.thShort(b.th) + ' ›')));
    }
    if (e.forms) kv.append(h('dt', null, 'รูปอื่น ๆ'), h('dd', null, `${e.forms[0]} (he/she) · ${e.forms[1]} (อดีต) · ${e.forms[2]} (กำลัง)`));
    if (e.pl && e.pl !== e.w) kv.append(h('dt', null, 'หลายอัน'), h('dd', null, e.pl));
    if (kv.children.length) box.append(kv);
    (e.also || []).forEach((a) => box.append(h('div', { class: 'small th muted' }, `อีกความหมาย: ${a.th} (${A.FORM[a.f]} ของ ${D[a.base] ? D[a.base].w : a.base})`)));
    if (e.n) box.append(h('div', { class: 'note' }, e.n));
    const exs = examplesFor(e, key);
    if (exs.length) {
      const list = h('div', { class: 'stack', style: { gap: 0 } });
      const show = (n) => {
        A.clear(list);
        exs.slice(0, n).forEach((x) => list.append(h('div', { class: 'ex' }, A.sayBtns(x.en, { sm: true, noSlow: true }),
          h('div', { style: { flex: 1 } }, h('div', { class: 'en' }, A.richText(x.en)), h('div', { class: 'thx' }, x.th + (x.base ? ' · (คำหลัก)' : ''))))));
        if (exs.length > n) list.append(h('button', { class: 'btn ghost block', style: { marginTop: '8px', minHeight: '44px' }, onclick: () => show(exs.length) }, `ดูตัวอย่างเพิ่ม (${exs.length - n}) · More examples`));
      };
      show(3);
      box.append(h('div', { class: 'sec-title' }, 'ตัวอย่าง · Examples'), list);
    }
    return box;
  }
  let openSheet = null;
  A.wordPopup = (tok, ctx) => {
    const key = A.keyOf(tok);
    if (A.state && key && key !== '#') { A.state.look[key] = (A.state.look[key] || 0) + 1; A.saveSoon(); }
    A.track('lookup', { w: key || tok, s: ctx && ctx.sentence ? String(ctx.sentence).slice(0, 90) : undefined });
    if (A.session) A.session.lookups++;
    const body = popupBody(tok, ctx);
    if (openSheet && document.body.contains(openSheet)) openSheet.setContent(body);
    else openSheet = A.sheet(body, { onClose: () => { openSheet = null; } });
  };

  // ---------------------------------------------------------------- resort picture
  const DECO = [[96, 152, 14], [38, 136, 36], [118, 156, 13], [205, 157, 12], [288, 164, 15], [60, 172, 12], [252, 154, 16], [110, 118, 14],
    [18, 162, 16], [304, 152, 20], [334, 164, 15], [78, 92, 16], [268, 172, 22], [128, 204, 14], [52, 124, 12], [300, 198, 22],
    [60, 202, 17], [66, 38, 16], [234, 162, 14], [336, 140, 17], [200, 210, 14], [300, 70, 18], [126, 46, 18], [0, 0, 22]];
  A.resortSVG = (st, name) => {
    const hr = new Date().getHours();
    const phase = hr >= 6 && hr < 11 ? 'morning' : hr >= 11 && hr < 16 ? 'day' : hr >= 16 && hr < 19 ? 'sunset' : 'night';
    const sky = { morning: ['#BFE6F5', '#FDE6CC'], day: ['#79C9EA', '#D5F1F8'], sunset: ['#F39B79', '#FCD69A'], night: ['#16264A', '#3A4F7E'] }[phase];
    const W = 360, H = 220, G = 164;
    const ud = A.unitsDone(st), md = A.monthsDone(st);
    const floors = Math.min(6, md + 1);
    const cur = A.currentUnit(st);
    const bw = 156, bx = (W - bw) / 2, fh = 18;
    const winLit = (u) => A.unitDone(st, u);
    const part = (u) => { const ns = A.nodes.filter((n) => n.u === u); return ns.length ? ns.filter((n) => st.done[n.id]).length / ns.length : 0; };
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your resort: ${ud} of 24 units built">`;
    s += `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
      <linearGradient id="se" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${phase === 'night' ? '#1D5C6B' : '#2BB3B1'}"/><stop offset="1" stop-color="${phase === 'night' ? '#0D3340' : '#0E7F86'}"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#sk)"/>`;
    if (phase === 'night') {
      s += `<circle cx="300" cy="38" r="15" fill="#FFF6D8"/><circle cx="306" cy="33" r="13" fill="${sky[0]}"/>`;
      [[40, 30], [90, 18], [150, 34], [210, 16], [250, 44], [330, 70], [20, 70], [180, 60]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity=".85"/>`; });
    } else {
      const sy = phase === 'sunset' ? 92 : phase === 'morning' ? 58 : 40;
      s += `<circle cx="300" cy="${sy}" r="${phase === 'sunset' ? 24 : 17}" fill="${phase === 'sunset' ? '#FFD27A' : '#FFE07D'}" opacity=".95"/>`;
      s += `<g fill="#fff" opacity=".85"><ellipse cx="70" cy="56" rx="26" ry="9"/><ellipse cx="90" cy="50" rx="18" ry="9"/><ellipse cx="220" cy="34" rx="22" ry="7"/></g>`;
    }
    s += `<path d="M0 ${G - 14} Q 60 ${G - 44} 120 ${G - 16} T 240 ${G - 18} T 360 ${G - 26} V ${G} H 0 Z" fill="${phase === 'night' ? '#20405A' : '#8CCFB8'}" opacity=".7"/>`;
    s += `<rect y="${G + 8}" width="${W}" height="${H - G - 8}" fill="url(#se)"/>`;
    s += `<g stroke="#fff" stroke-width="1.6" fill="none" opacity=".45" stroke-linecap="round"><path d="M20 ${G + 26} q 8 -4 16 0"/><path d="M150 ${G + 40} q 8 -4 16 0"/><path d="M250 ${G + 30} q 8 -4 16 0"/><path d="M320 ${G + 48} q 8 -4 16 0"/></g>`;
    s += `<path d="M0 ${G - 2} Q 180 ${G - 10} 360 ${G - 2} V ${G + 12} Q 180 ${G + 20} 0 ${G + 12} Z" fill="${phase === 'night' ? '#B9A57F' : '#F3DDB0'}"/>`;
    // building
    for (let f = 0; f < floors; f++) {
      const y = G - (f + 1) * fh;
      s += `<rect x="${bx}" y="${y}" width="${bw}" height="${fh}" fill="${f % 2 ? '#FFF8EC' : '#FFFFFF'}" stroke="#D9C9AE" stroke-width="1"/>`;
      for (let w = 0; w < 4; w++) {
        const u = f * 4 + w + 1, wx = bx + 16 + w * 35, wy = y + 4;
        const lit = winLit(u), p = u === cur ? part(u) : 0;
        const col = lit ? '#FFC94A' : p ? '#FFE7A8' : (phase === 'night' ? '#304868' : '#BFDDE8');
        s += `<rect x="${wx}" y="${wy}" width="20" height="10" rx="2" fill="${col}"${p && !lit ? ` opacity="${0.45 + p * 0.55}"` : ''}/>`;
      }
    }
    if (floors < 6) { const y = G - (floors + 1) * fh; s += `<rect x="${bx}" y="${y}" width="${bw}" height="${fh}" fill="none" stroke="#9FB7B3" stroke-width="1.2" stroke-dasharray="4 3"/>`; }
    const top = G - floors * fh;
    s += `<path d="M${bx - 8} ${top} L${W / 2} ${top - 20} L${bx + bw + 8} ${top} Z" fill="#E5476C"/>`;
    s += `<rect x="${W / 2 - 60}" y="${top - 42}" width="120" height="19" rx="6" fill="#0A5F66"/>`;
    s += `<text x="${W / 2}" y="${top - 28.5}" text-anchor="middle" font-family="Mitr, sans-serif" font-size="11" fill="#fff">${A.esc((name || 'Alvee') + ' Resort')}</text>`;
    s += `<text x="${W / 2}" y="${top - 46}" text-anchor="middle" font-size="11" fill="#FFB21E">${'★'.repeat(Math.min(5, md))}<tspan fill="#ffffff" opacity=".7">${'☆'.repeat(Math.max(0, 5 - md))}</tspan></text>`;
    s += `<rect x="${W / 2 - 9}" y="${G - 13}" width="18" height="13" rx="3" fill="#0E8A8A"/>`;
    s += `<text x="${W / 2 + 22}" y="${G + 2}" font-size="16">💁‍♀️</text>`;
    for (let i = 0; i < 24; i++) {
      if (!winLit(i + 1)) continue;
      const u = C.units[i];
      let [x, y, z] = DECO[i];
      if (i === 23) { x = W / 2 - 11; y = top - 50; }
      s += `<text x="${x}" y="${y}" font-size="${z}">${u.deco}</text>`;
    }
    return s + '</svg>';
  };

  // ================================================================ router
  A.view = 'home';
  A.go = (view, arg) => {
    if (openSheet) { openSheet.close(); openSheet = null; }
    A.view = view;
    const root = A.clear(app());
    window.scrollTo(0, 0);
    const V = VIEWS[view];
    if (!V) return;
    root.append(V(arg));
    if (['home', 'journey', 'talks', 'words', 'me', 'grammar'].includes(view)) {
      root.append(nav(view));
      A.setPresence({ screen: view });
    }
  };
  function nav(cur) {
    const items = [['home', '🏝️', 'Home'], ['journey', '🗺️', 'Journey'], ['talks', '💬', 'Talk'], ['words', '📚', 'Words'], ['me', '🙂', 'Me']];
    return h('nav', { class: 'nav' }, h('div', { class: 'in' }, items.map(([v, e, t]) => h('button', { class: cur === v || (cur === 'grammar' && v === 'me') ? 'on' : '', onclick: () => A.go(v) }, h('span', { class: 'e' }, e), t))));
  }

  const VIEWS = {};

  // ---------------------------------------------------------------- login
  VIEWS.login = () => {
    const err = h('div', { class: 'err', role: 'alert' });
    const u = h('input', { class: 'input', id: 'lg-user', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', placeholder: 'username' });
    const p = h('input', { class: 'input', id: 'lg-pass', type: 'password', autocomplete: 'current-password', placeholder: 'password' });
    const go = async (e) => {
      e.preventDefault(); err.textContent = '';
      try { const me = await A.api.login(u.value, p.value); await A.enter(me); }
      catch (x) { err.textContent = (x && x.message) || 'Login failed'; }
    };
    const demo = A.api.mode === 'demo'
      ? h('div', { class: 'demo-box stack', style: { gap: '4px' } },
        h('b', null, 'Preview mode'),
        h('div', null, 'Alvee: ', h('b', null, 'alvee'), ' / ', h('b', null, '1234')),
        h('div', null, 'You (dashboard): ', h('b', null, 'admin'), ' / ', h('b', null, '1234')),
        h('div', { class: 'small muted' }, 'Progress is saved in this browser only. On your server, each of you logs in from your own phone.'),
        h('div', { class: 'row', style: { marginTop: '6px' } },
          h('button', { class: 'btn ghost', style: { flex: 1, minHeight: '44px' }, type: 'button', onclick: () => { u.value = 'alvee'; p.value = '1234'; } }, 'Fill Alvee'),
          h('button', { class: 'btn ghost', style: { flex: 1, minHeight: '44px' }, type: 'button', onclick: () => { u.value = 'admin'; p.value = '1234'; } }, 'Fill admin')))
      : null;
    return h('form', { class: 'screen full login', onsubmit: go },
      h('div', { class: 'logo' }, '🏝️'),
      h('h1', null, 'Alvee English'),
      h('p', { class: 'th muted', style: { textAlign: 'center' } }, 'เรียนภาษาอังกฤษวันละนิด · 6 เดือนพูดได้'),
      h('div', { class: 'card stack' },
        h('div', { class: 'field' }, h('label', { for: 'lg-user' }, 'Username · ชื่อผู้ใช้'), u),
        h('div', { class: 'field' }, h('label', { for: 'lg-pass' }, 'Password · รหัสผ่าน'), p),
        err,
        h('button', { class: 'btn block', type: 'submit' }, 'Log in · เข้าสู่ระบบ')),
      demo);
  };

  VIEWS.setup = () => {
    const err = h('div', { class: 'err' });
    const f = (id, label, type, ph) => h('div', { class: 'field' }, h('label', { for: id }, label), h('input', { class: 'input', id, type: type || 'text', placeholder: ph || '', autocapitalize: 'none' }));
    const go = async (e) => {
      e.preventDefault();
      const v = (id) => document.getElementById(id).value.trim();
      try {
        const me = await A.api.setup({ code: v('su-code'), adminUser: v('su-au'), adminPass: v('su-ap'), adminName: v('su-an'), learnerName: v('su-ln'), learnerUser: v('su-lu'), learnerPass: v('su-lp') });
        await A.enter(me);
      } catch (x) { err.textContent = x.message; }
    };
    return h('form', { class: 'screen full', onsubmit: go },
      h('h1', null, 'First-time setup'),
      h('p', { class: 'muted' }, 'Create your login and Alvee\'s login. The setup code is printed by the server when it starts.'),
      h('div', { class: 'card stack' }, f('su-code', 'Setup code'), f('su-an', 'Your name (shown on your messages)', 'text', 'e.g. Muhaimin'), f('su-au', 'Your username'), f('su-ap', 'Your password', 'password')),
      h('div', { class: 'card stack' }, f('su-ln', 'Her name', 'text', 'Alvee'), f('su-lu', 'Her username', 'text', 'alvee'), f('su-lp', 'Her password', 'password')),
      err, h('button', { class: 'btn block', type: 'submit' }, 'Create both logins'));
  };

  // ---------------------------------------------------------------- home
  VIEWS.home = () => {
    const st = A.state, cfg = A.user.cfg || {};
    const [gEn, gTh] = A.greeting();
    const tk = A.dkey();
    const xpToday = (st.days[tk] && st.days[tk].xp) || 0;
    const goal = cfg.goal || 30;
    const sk = A.streak(st), xp = A.totalXP(st), lvl = A.level(xp);
    const next = A.nextNode(st);
    const due = A.dueItems(st).length;
    const lessonsToday = (st.days[tk] && st.days[tk].les) || 0;
    const capped = cfg.newLimit > 0 && lessonsToday >= cfg.newLimit;
    const md = A.monthsDone(st), cm = Math.min(6, md + 1), month = C.months[cm - 1];
    const root = h('div', { class: 'screen' });

    root.append(h('div', { class: 'topbar' },
      h('div', { class: 'hello' }, h('h1', null, gEn + ', ' + A.user.name + '!'), h('p', { class: 'th' }, gTh + ' · ', h('span', null, 'ตอนนี้ทักทายว่า "' + gEn + '"'))),
      h('span', { class: 'stat', title: 'Streak' }, h('span', { class: 'e' }, '🔥'), sk),
      h('span', { class: 'stat', title: 'Level' }, h('span', { class: 'e' }, A.title(lvl)[3]), lvl)));

    const unread = (A.msgs || []).filter((m) => !m.readAt && A.msgUnlocked(m, st));
    if (unread.length) {
      root.append(h('button', { class: 'card msg-card', style: { textAlign: 'left' }, onclick: () => openMsg(unread[0]) },
        h('span', { class: 'env' }, '💌'),
        h('div', null, h('b', null, 'New message from ' + A.bf.name), h('div', { class: 'small th' }, 'มีข้อความใหม่ แตะเพื่ออ่าน'))));
    }

    const pct = Math.min(1, xpToday / goal);
    const ring = h('div', { class: 'ring', html: `<svg viewBox="0 0 36 36" width="58" height="58"><circle cx="18" cy="18" r="15.5" fill="none" style="stroke:var(--sea-tint)" stroke-width="4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="${pct >= 1 ? '#17955A' : '#FFB21E'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(pct * 97.4).toFixed(1)} 97.4"/></svg>` }, h('span', null, pct >= 1 ? '✓' : Math.round(pct * 100) + '%'));
    const today = h('div', { class: 'card today' });
    if (next) {
      const t = A.nodeTitle(next);
      const u = A.unit(next.u);
      today.append(h('div', { class: 'next' }, ring, h('div', { class: 't' },
        h('div', { class: 'k' }, (pct >= 1 ? 'Goal done! ' : 'Today · ') + 'Unit ' + next.u + ' · ' + t.k),
        h('h2', null, t.en), h('div', { class: 'th muted small' }, t.th + ' · ' + u.th))));
      if (capped) today.append(h('div', { class: 'note' }, 'วันนี้เรียนบทใหม่ครบแล้ว เก่งมาก! ทบทวนคำเก่าเพื่อให้จำได้นานขึ้นนะ'));
      else today.append(h('button', { class: 'btn mango block', onclick: () => A.play('node', next.id) }, t.icon + ' Start · เริ่มเลย'));
    } else {
      today.append(h('div', { class: 'next' }, ring, h('div', { class: 't' }, h('h2', null, 'All lessons done for now!'), h('div', { class: 'th muted small' }, 'บทเรียนใหม่กำลังจะมา ระหว่างนี้ทบทวนกันนะ'))));
    }
    today.append(h('div', { class: 'row' },
      h('button', { class: 'btn ghost', style: { flex: 1 }, disabled: Object.keys(st.srs).length ? null : true, onclick: () => A.play('review') }, '🔁 Review', due ? h('span', { class: 'pill mango' }, due) : null),
      h('button', { class: 'btn ghost', style: { flex: 1 }, disabled: Object.values(st.srs).some((s) => s.w > 0) ? null : true, onclick: () => A.play('mistakes') }, '🩹 Mistakes')));
    today.append(h('div', { class: 'stack', style: { gap: '6px' } },
      h('div', { class: 'row between small' }, h('span', { class: 'th' }, 'เป้าหมายวันนี้ · Daily goal'), h('b', { class: 'num' }, xpToday + ' / ' + goal + ' XP')),
      h('div', { class: 'goal-bar' }, h('i', { style: { width: pct * 100 + '%' } }))));
    root.append(today);
    const resort = h('div', { class: 'card resort' });
    resort.innerHTML = A.resortSVG(st, A.user.name);
    resort.append(h('div', { class: 'cap' },
      h('div', null, h('b', null, month.resort), h('div', { class: 'small muted th' }, 'เดือนที่ ' + cm + ' · ' + month.resortTh)),
      h('div', { class: 'stars', 'aria-label': md + ' of 5 stars' }, '★'.repeat(Math.min(5, md)), h('span', { class: 'off' }, '★'.repeat(Math.max(0, 5 - md))))));
    root.append(resort);

    root.append(h('div', { class: 'tiles' },
      h('button', { class: 'tile', onclick: () => A.go('talks') }, h('span', { class: 'e' }, '💬'), 'Conversations', h('span', { class: 'th' }, 'ฝึกบทสนทนา')),
      h('button', { class: 'tile', onclick: () => A.go('words') }, h('span', { class: 'e' }, '📚'), 'My words', h('span', { class: 'th' }, A.wordCount(st) + ' คำ')),
      h('button', { class: 'tile', onclick: () => A.go('grammar') }, h('span', { class: 'e' }, '📖'), 'Grammar', h('span', { class: 'th' }, 'คู่มือไวยากรณ์'))));
    return root;
  };

  function openMsg(m) {
    A.api.readMsg(m.id).catch(() => {});
    m.readAt = Date.now();
    A.track('msg_read', { id: m.id });
    const sh = A.sheet(h('div', { class: 'stack', style: { gap: '14px', textAlign: 'center' } },
      h('div', { style: { fontSize: '3rem' } }, '💌'),
      h('div', { class: 'small muted' }, 'From ' + A.bf.name),
      h('div', { style: { fontSize: '1.15rem', whiteSpace: 'pre-line', textAlign: 'left' } }, m.text),
      h('button', { class: 'btn block', onclick: () => { sh.close(); A.go('home'); } }, '💛 Thank you!')));
  }

  // ---------------------------------------------------------------- journey
  VIEWS.journey = () => {
    const st = A.state, cfg = A.user.cfg || {};
    const root = h('div', { class: 'screen' });
    root.append(h('div', null, h('h1', null, 'Your 6-month journey'), h('p', { class: 'th muted' }, 'เส้นทาง 6 เดือน · ทีละขั้น พูดได้จริง')));
    const nextId = (A.nextNode(st) || {}).id;
    let firstOpenEl = null;
    C.months.forEach((m) => {
      const units = C.units.filter((u) => u.m === m.n);
      const nodes = A.nodes.filter((n) => units.some((u) => u.id === n.u));
      const doneN = nodes.filter((n) => st.done[n.id]).length;
      const locked = nodes.length && !nodes.some((n) => A.isOpen(st, A.nodes.indexOf(n), cfg));
      const sec = h('section', { class: 'month' });
      sec.append(h('div', { class: 'month-head' + (locked || !nodes.length ? ' locked' : '') },
        h('div', { class: 'mn' }, m.n),
        h('div', { style: { flex: 1 } }, h('h2', null, 'Month ' + m.n + ' · ' + m.en), h('div', { class: 'small th muted' }, m.th + ' · ' + m.resortTh)),
        nodes.length ? h('span', { class: 'pill sea num' }, doneN + '/' + nodes.length) : h('span', { class: 'pill grey' }, 'soon')));
      units.forEach((u) => {
        const card = h('div', { class: 'card unit' });
        const un = A.nodes.filter((n) => n.u === u.id);
        card.append(h('div', { class: 'unit-head' }, h('div', { class: 'deco' }, u.deco),
          h('div', { style: { flex: 1 } }, h('h3', null, 'Unit ' + u.id + ' · ' + u.en), h('div', { class: 'small th muted' }, u.th + ' — ' + u.goal))));
        const row = h('div', { class: 'nodes' });
        if (!un.length) row.append(...Array.from({ length: 6 }, () => h('div', { class: 'node soon', 'aria-hidden': 'true' }, '·')), h('div', { class: 'small th muted soon-note' }, 'เนื้อหากำลังมา · coming soon'));
        un.forEach((n) => {
          const idx = A.nodes.indexOf(n);
          const done = st.done[n.id];
          const open = A.isOpen(st, idx, cfg);
          const t = A.nodeTitle(n);
          const b = h('button', {
            class: 'node' + (done ? ' done' : n.id === nextId ? ' open' : open ? '' : ' locked'),
            'aria-label': t.en + (done ? ' (done)' : open ? '' : ' (locked)'),
            onclick: () => (open ? nodeSheet(n) : A.toast('🔒 ทำบทก่อนหน้าให้เสร็จก่อนนะ')),
          }, done ? '✓' : open ? t.icon : '🔒', done && done.s ? h('span', { class: 'st' }, '★'.repeat(done.s)) : null);
          if (n.id === nextId) firstOpenEl = b;
          row.append(b);
        });
        card.append(row);
        sec.append(card);
      });
      root.append(sec);
    });
    if (firstOpenEl) setTimeout(() => firstOpenEl.scrollIntoView({ block: 'center' }), 60);
    return root;
  };
  function nodeSheet(n) {
    const t = A.nodeTitle(n), d = A.state.done[n.id];
    const extra = n.kind === 'lesson' ? C.lessons[n.id].words.slice(0, 8).map((k) => D[k] ? D[k].w : k).join(' · ') : n.kind === 'talk' ? C.talks[n.talk].th : 'ต้องได้ 70% ขึ้นไปจึงผ่าน · Pass with 70%';
    const sh = A.sheet(h('div', { class: 'stack', style: { gap: '12px' } },
      h('div', { class: 'small muted' }, 'Unit ' + n.u + ' · ' + t.k),
      h('h2', null, t.icon + ' ' + t.en), h('div', { class: 'th muted' }, t.th),
      h('div', { class: 'note' }, extra),
      d ? h('div', { class: 'row' }, h('span', { class: 'pill good' }, '✓ Done'), h('span', { class: 'stars' }, '★'.repeat(d.s || 0)), h('span', { class: 'small muted' }, (d.a || 0) + '%')) : null,
      h('button', { class: 'btn mango block', onclick: () => { sh.close(); A.play('node', n.id); } }, d ? 'Practice again · ทำอีกครั้ง' : 'Start · เริ่ม')));
  }

  // ---------------------------------------------------------------- talks library
  const CATS = { all: ['All', 'ทั้งหมด', '✨'], friends: ['Friends', 'เพื่อน', '👭'], family: ['Family', 'ครอบครัว', '🏡'], love: ['Love', 'แฟน', '💕'], work: ['Work', 'ที่ทำงาน', '💼'], hotel: ['Hotel', 'โรงแรม', '🛎️'], food: ['Food', 'อาหาร', '🍜'], shop: ['Shopping', 'ช้อปปิ้ง', '🛍️'], health: ['Health', 'สุขภาพ', '💊'], travel: ['Travel', 'เดินทาง', '🚕'], phone: ['Phone', 'โทรศัพท์', '📞'], home: ['Home', 'ที่บ้าน', '🏠'], weather: ['Weather', 'อากาศ', '🌦️'], fun: ['Fun', 'งานอดิเรก', '🎉'] };
  let talkCat = 'all';
  VIEWS.talks = () => {
    const st = A.state, reach = A.reachedUnit(st, A.user.cfg);
    const root = h('div', { class: 'screen' });
    root.append(h('div', null, h('h1', null, 'Conversations'), h('p', { class: 'th muted' }, 'ฝึกคุยในชีวิตจริง — เพื่อน ครอบครัว แฟน งาน โรงแรม และอีกมากมาย')));
    const talks = Object.values(C.talks);
    const used = A.uniq(talks.map((t) => t.cat));
    const cats = h('div', { class: 'cats' }, ['all', ...Object.keys(CATS).filter((c) => used.includes(c))].map((c) => h('button', { class: 'chip' + (c === talkCat ? ' on' : ''), onclick: () => { talkCat = c; A.go('talks'); } }, CATS[c][2] + ' ' + CATS[c][0])));
    root.append(cats);
    const list = h('div', { class: 'stack' });
    talks.filter((t) => talkCat === 'all' || t.cat === talkCat).sort((a, b) => a.u - b.u).forEach((t) => {
      const open = (t.u || 1) <= reach;
      const done = st.done['talk:' + t.id];
      list.append(h('button', { class: 'card talk-item' + (open ? '' : ' locked'), onclick: () => (open ? A.play('talk', t.id) : A.toast('🔒 เปิดเมื่อถึง Unit ' + t.u)) },
        h('div', { class: 'av' }, A.fill(t.ae)),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('b', null, A.fill(t.en)), h('div', { class: 'small th muted' }, t.th + ' · ' + (CATS[t.cat] ? CATS[t.cat][1] : t.cat))),
        open ? (done ? h('span', { class: 'pill good' }, '✓') : h('span', { class: 'pill sea' }, 'Unit ' + t.u)) : h('span', { class: 'pill grey' }, '🔒 ' + t.u)));
    });
    root.append(list);
    return root;
  };

  // ---------------------------------------------------------------- words
  let wordTab = 'mine', wordQ = '';
  VIEWS.words = () => {
    const st = A.state, reach = A.reachedUnit(st, A.user.cfg);
    const root = h('div', { class: 'screen' });
    root.append(h('div', null, h('h1', null, 'Words'), h('p', { class: 'th muted' }, 'แตะคำเพื่อดูคำแปล คำอ่าน และตัวอย่างประโยค')));
    const input = h('input', { class: 'input', id: 'w-search', placeholder: 'Search English or Thai · ค้นหา', value: wordQ, oninput: (e) => { wordQ = e.target.value; render(); } });
    root.append(h('div', { class: 'search' }, input));
    root.append(h('div', { class: 'row' }, [['mine', 'My words · คำที่เรียนแล้ว'], ['all', 'All · ทั้งหมด']].map(([k, t]) => h('button', { class: 'chip' + (wordTab === k ? ' on' : ''), onclick: () => { wordTab = k; A.go('words'); } }, t))));
    const list = h('div', { class: 'card wlist', style: { padding: '4px 14px' } });
    root.append(list);
    function render() {
      A.clear(list);
      const q = wordQ.trim().toLowerCase();
      let keys;
      if (wordTab === 'mine') keys = Object.keys(st.srs).filter((k) => k.startsWith('w:')).map((k) => k.slice(2)).filter((k) => D[k]);
      else keys = Object.keys(D).filter((k) => !D[k].base && (D[k].u || 99) <= Math.max(reach, 1) + 0);
      if (q) keys = Object.keys(D).filter((k) => !D[k].base && (k.toLowerCase().includes(q) || D[k].th.includes(q)));
      keys.sort((a, b) => (wordTab === 'mine' && !q ? (st.srs['w:' + a].b - st.srs['w:' + b].b) : 0) || a.localeCompare(b));
      if (!keys.length) list.append(h('p', { class: 'th muted', style: { padding: '14px 0' } }, wordTab === 'mine' ? 'ยังไม่มีคำ — เริ่มบทเรียนแรกกันเลย!' : 'ไม่พบคำนี้'));
      keys.slice(0, 300).forEach((k) => {
        const e = D[k], s = st.srs['w:' + k];
        const str = h('span', { class: 'str' + (s && s.w > s.c ? ' weak' : ''), 'aria-label': 'strength' }, Array.from({ length: 5 }, (_, i) => h('i', { class: s && s.b > i ? 'on' : '' })));
        list.append(h('button', { class: 'witem', onclick: () => A.wordPopup(k) }, h('span', { class: 'pic' }, e.e || '·'),
          h('span', { class: 'grow' }, h('div', { class: 'w' }, e.w), h('div', { class: 't' }, A.thShort(e.th))), s ? str : null));
      });
    }
    render();
    return root;
  };

  // ---------------------------------------------------------------- grammar book
  VIEWS.grammar = () => {
    const reach = A.reachedUnit(A.state, A.user.cfg);
    const root = h('div', { class: 'screen' });
    root.append(h('div', { class: 'row' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: () => A.go('me') }, '‹'), h('div', null, h('h1', null, 'Grammar book'), h('p', { class: 'th muted' }, 'คู่มือไวยากรณ์ฉบับภาษาไทย'))));
    Object.values(C.tips).forEach((t) => {
      const open = (t.u || 1) <= reach;
      root.append(h('button', { class: 'card talk-item' + (open ? '' : ' locked'), onclick: () => (open ? A.sheet(tipView(t.id)) : A.toast('🔒 เปิดเมื่อถึง Unit ' + t.u)) },
        h('div', { class: 'av' }, '📖'), h('div', { style: { flex: 1 } }, h('b', null, t.title), h('div', { class: 'small muted' }, 'Unit ' + t.u)), open ? '›' : '🔒'));
    });
    return root;
  };
  function tipView(id) {
    const t = C.tips[id];
    const box = h('div', { class: 'tip-card' }, h('div', { class: 'q-kind' }, '📖 Grammar tip · เคล็ดลับ'), h('h2', null, t.title));
    let table = null;
    t.blocks.forEach((b) => {
      if (b.k !== 'tr') table = null;
      if (b.k === 'p') box.append(h('p', null, A.richText ? b.v : b.v));
      else if (b.k === 'h') box.append(h('div', { class: 'tip-h' }, b.v));
      else if (b.k === 'ok' || b.k === 'no') box.append(h('div', { class: b.k === 'ok' ? 'tip-ok' : 'tip-no' }, h('span', { class: 'm' }, b.k === 'ok' ? '✅' : '❌'),
        h('div', { style: { flex: 1 } }, h('div', { class: 'en' }, b.k === 'ok' ? A.richText(b.en) : b.en), b.th ? h('div', { class: 'thx' }, b.th) : null), b.k === 'ok' ? A.sayBtns(b.en, { sm: true, noSlow: true }) : null));
      else if (b.k === 'tr') {
        if (!table) { table = h('table', { class: 'tip-table' }); box.append(table); }
        table.append(h('tr', null, b.cells.map((c) => h('td', { class: /[฀-๿]/.test(c) ? 'th' : '' }, c))));
      } else if (b.k === 'trick') box.append(h('div', { class: 'tip-trick' }, '💡 ' + b.v));
    });
    return box;
  }
  A.tipView = tipView;

  // ---------------------------------------------------------------- me
  VIEWS.me = () => {
    const st = A.state;
    const xp = A.totalXP(st), lvl = A.level(xp), tl = A.title(lvl);
    const days = Object.values(st.days).filter((d) => d.xp > 0).length;
    const n = Object.values(st.days).reduce((a, d) => a + (d.n || 0), 0), ok = Object.values(st.days).reduce((a, d) => a + (d.ok || 0), 0);
    const root = h('div', { class: 'screen' });
    root.append(h('div', { class: 'card stack', style: { alignItems: 'center', textAlign: 'center' } },
      h('div', { style: { fontSize: '3rem' } }, tl[3]), h('h1', null, A.user.name), h('div', { class: 'th muted' }, tl[2] + ' · ' + tl[1] + ' · Level ' + lvl),
      h('div', { class: 'goal-bar', style: { width: '100%' } }, h('i', { style: { width: ((xp - A.levelXP(lvl)) / (A.levelXP(lvl + 1) - A.levelXP(lvl))) * 100 + '%' } })),
      h('div', { class: 'small muted num' }, (A.levelXP(lvl + 1) - xp) + ' XP to level ' + (lvl + 1))));
    root.append(h('div', { class: 'kpis' },
      h('div', { class: 'kpi' }, h('b', null, xp), h('span', null, 'Total XP')),
      h('div', { class: 'kpi' }, h('b', null, A.wordCount(st)), h('span', null, 'Words · คำ')),
      h('div', { class: 'kpi' }, h('b', null, days), h('span', null, 'Days · วัน')),
      h('div', { class: 'kpi' }, h('b', null, A.streak(st) + '🔥'), h('span', null, 'Streak')),
      h('div', { class: 'kpi' }, h('b', null, n ? Math.round((ok / n) * 100) + '%' : '–'), h('span', null, 'Correct')),
      h('div', { class: 'kpi' }, h('b', null, st.freezes + '🧊'), h('span', null, 'Rest days'))));
    root.append(h('div', { class: 'small th muted' }, '🧊 Rest day: เรียนครบ 7 วันติด ได้วันพัก 1 วัน (เก็บได้ 2 วัน) ถ้าวันไหนไม่ได้เรียน ไฟ 🔥 จะไม่ดับ'));
    root.append(h('div', { class: 'sec-title' }, 'Badges · เหรียญรางวัล'));
    root.append(h('div', { class: 'badges' }, A.BADGES.map(([id, e, en, th]) => h('div', { class: 'badge ' + (st.badges[id] ? 'on' : 'off'), title: en }, h('span', { class: 'e' }, e), th))));
    root.append(h('button', { class: 'card talk-item', onclick: () => A.go('grammar') }, h('div', { class: 'av' }, '📖'), h('div', { style: { flex: 1 } }, h('b', null, 'Grammar book'), h('div', { class: 'small th muted' }, 'คู่มือไวยากรณ์')), '›'));
    const set = st.set;
    const sw = (label, on, fn) => h('div', { class: 'switch' }, h('span', { class: 'th' }, label), h('button', { class: 'toggle' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label, onclick: fn }));
    root.append(h('div', { class: 'card', style: { padding: '4px 16px' } },
      sw('🐢 เสียงพูดช้าลง · Slower voice', set.slow, () => { set.slow = !set.slow; applySettings(); A.saveSoon(); A.go('me'); }),
      sw('🔔 เสียงเอฟเฟกต์ · Sound effects', set.sfx, () => { set.sfx = !set.sfx; applySettings(); A.saveSoon(); A.go('me'); }),
      sw('🔠 ตัวหนังสือใหญ่ · Bigger text', set.big, () => { set.big = !set.big; applySettings(); A.saveSoon(); A.go('me'); }),
      sw('🇹🇭 แสดงคำแปลเสมอ · Always show Thai', set.thai, () => { set.thai = !set.thai; A.saveSoon(); A.go('me'); }),
      h('div', { class: 'switch' }, h('span', { class: 'th' }, '🌙 โหมดกลางคืน · Night mode', h('div', { class: 'tiny muted' }, 'Auto = ตามโทรศัพท์')), A.theme.picker((v) => { A.track('night_mode', { v }); A.go('me'); }))));
    if (!A.speech.ok) root.append(h('div', { class: 'note' }, 'เครื่องนี้ไม่รองรับเสียงพูด ลองเปิดใน Safari บน iPhone นะ'));
    root.append(h('button', { class: 'btn ghost block', onclick: async () => { await A.flush(); await A.api.logout(); A.user = null; A.state = null; A.go('login'); } }, 'Log out · ออกจากระบบ'));
    return root;
  };
  function applySettings() {
    const s = A.state.set;
    document.documentElement.classList.toggle('big', !!s.big);
    A.sfx.on = s.sfx !== false;
    A.speech.rate = s.slow ? 0.68 : 0.85;
  }
  A.applySettings = applySettings;

  // ================================================================ player
  const PRAISE = [['เก่งมาก!', 'Great job!'], ['ถูกต้อง!', 'Correct!'], ['สุดยอด!', 'Awesome!'], ['เยี่ยมเลย!', 'Excellent!'], ['ใช่เลย!', "That's right!"], ['เก่งที่สุด!', "You're the best!"]];
  const COMFORT = [['ไม่เป็นไร ลองใหม่นะ', "It's okay!"], ['เกือบแล้ว!', 'Almost!'], ['ค่อย ๆ ดูนะ', 'Take your time.'], ['จำไว้ครั้งหน้านะ', 'Next time!']];
  const TAG_WHY = {
    'drop-be': 'อย่าลืม am / is / are! ภาษาไทยไม่มีคำนี้ แต่ภาษาอังกฤษต้องมี',
    'swap-be': A.WHY.be,
    'add-be': 'ไม่ต้องใส่ am / is / are หน้ากริยา (คำที่บอกการกระทำ) เช่น I like ✅ / I am like ❌',
    'drop-s': 'He / She / It ต้องเติม s ที่กริยา เช่น she works ✅',
    'add-s': 'I / You / We / They ไม่ต้องเติม s เช่น I work ✅',
    past: 'เรื่องที่เกิดขึ้นแล้วใช้รูปอดีต · หลัง did / didn\'t ใช้กริยาธรรมดา',
    will: A.WHY.will, ing: 'am / is / are + กริยาเติม ing = กำลังทำ',
    order: 'คำถาม: ย้าย am / is / are (หรือ do / can) ไปไว้หน้าสุด',
    swap: 'ดูให้ดี: do / does · have / has · a / an', context: 'ประโยคนี้ไม่ตรงกับบทสนทนา ลองอ่านสิ่งที่อีกฝ่ายพูดอีกครั้ง',
  };
  const KIND = {
    w2th: ['🔤', 'What does it mean?', 'คำนี้แปลว่าอะไร'], th2w: ['🔤', 'Choose the English word', 'ภาษาอังกฤษคือคำไหน'], pic: ['🖼️', 'Which word is it?', 'รูปนี้คือคำไหน'],
    listenw: ['👂', 'Listen and choose', 'ฟังแล้วเลือกคำที่ได้ยิน'], match: ['🧩', 'Match the pairs', 'จับคู่คำกับคำแปล'], gap: ['✏️', 'Fill the gap', 'เติมคำในช่องว่าง'],
    build: ['🧱', 'Build the sentence', 'เรียงคำให้เป็นประโยค'], pick: ['✅', 'Which one is correct?', 'ประโยคไหนถูกต้อง'], meaning: ['🇹🇭', 'What does it mean?', 'ประโยคนี้แปลว่าอะไร'],
    listen: ['👂', 'What do you hear?', 'ฟังแล้วเลือกประโยค'], reply: ['💬', 'Choose your reply', 'ตอบว่าอะไรดี'],
  };
  const kindLabel = (t) => { const k = KIND[t]; return k ? h('div', { class: 'q-kind' }, k[0] + ' ' + k[1] + ' · ', h('span', { class: 'th', style: { fontWeight: 600 } }, k[2])) : null; };

  A.play = (kind, arg) => {
    const ses = A.buildSession(kind, arg, A.state);
    if (!ses.steps.length) { A.toast(kind === 'review' ? 'ยังไม่มีคำให้ทบทวน — เรียนบทใหม่ก่อนนะ' : 'Nothing here yet'); return; }
    A.session = ses;
    const title = ses.node ? A.nodeTitle(ses.node).en : kind === 'talk' ? A.fill(C.talks[arg].en) : kind === 'review' ? 'Review' : 'Mistakes';
    ses.title = title;
    ses.nodeId = ses.node ? ses.node.id : kind === 'talk' ? 'talk:' + arg : kind;
    A.track('lesson_start', { node: ses.nodeId, kind: ses.node ? ses.node.kind : kind, title, steps: ses.steps.length });
    A.go('player');
  };

  VIEWS.player = () => {
    const ses = A.session;
    const root = h('div', { class: 'player' });
    const bar = h('i', { style: { width: '0%' } });
    const top = h('div', { class: 'player-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Close lesson', onclick: () => quit() }, '✕'),
      h('div', { class: 'progress' }, bar),
      h('span', { class: 'small muted num', id: 'step-n' }, ''));
    const body = h('div', { class: 'player-body' });
    root.append(top, body);
    let stepStart = Date.now();

    function quit() {
      const sh = A.sheet(h('div', { class: 'stack', style: { gap: '12px', textAlign: 'center' } },
        h('div', { style: { fontSize: '2.6rem' } }, '🥺'), h('h2', null, 'Leave the lesson?'), h('p', { class: 'th muted' }, 'ถ้าออกตอนนี้ ความคืบหน้าของบทนี้จะไม่ถูกบันทึกนะ'),
        h('button', { class: 'btn block', onclick: () => sh.close() }, 'Keep learning · เรียนต่อ'),
        h('button', { class: 'btn ghost block', onclick: () => { sh.close(); A.track('lesson_quit', { node: ses.nodeId, at: ses.i + 1, of: ses.steps.length }); A.session = null; A.flush(); A.go('home'); } }, 'Quit · ออก')));
    }

    function render() {
      const step = ses.steps[ses.i];
      if (!step) return finish();
      bar.style.width = Math.round((ses.i / ses.steps.length) * 100) + '%';
      top.querySelector('#step-n').textContent = ses.i + 1 + '/' + ses.steps.length;
      A.presence = { screen: 'lesson', node: ses.nodeId, title: ses.title, step: ses.i + 1, total: ses.steps.length };
      A.beat();
      stepStart = Date.now();
      A.clear(body);
      const R = RENDER[step.type];
      body.append(R ? R(step, ctl) : h('div', null, 'Unknown step'));
      window.scrollTo(0, 0);
    }

    const ctl = {
      next() { ses.i++; render(); },
      // record an answer; show feedback; continue
      answer(step, ok, info) {
        const ms = Date.now() - stepStart;
        const retry = !!step.retry;
        if (!retry) { ses.graded++; if (ok) ses.firstOk++; }
        if (step.item) ses.items[step.item] = (ses.items[step.item] !== false) && ok;
        A.track('answer', { node: ses.nodeId, ex: step.type, item: step.item, q: info.q, a: info.a, c: info.c, ok: ok ? 1 : 0, ms, retry: retry ? 1 : 0, rev: step.review ? 1 : 0 });
        A.sfx.play(ok ? 'good' : 'bad');
        if (!ok && !ses.test && step.item) {
          ses.retries[step.item] = (ses.retries[step.item] || 0) + 1;
          if (ses.retries[step.item] <= 2) { const r = A.retryFor(step, A.state); if (r) ses.steps.push({ ...r, retry: 1 }); }
        }
        feedback(ok, info, () => ctl.next());
      },
      plain(info) { A.track('answer', { node: ses.nodeId, ...info }); },
    };

    function feedback(ok, info, cont) {
      const [th, en] = A.pick(ok ? PRAISE : COMFORT);
      const fb = h('div', { class: 'fb ' + (ok ? 'ok' : 'no'), role: 'status' }, h('div', { class: 'in' },
        h('h3', null, ok ? '🎉' : '💛', h('span', null, en + ' · ', h('span', { class: 'th' }, th))),
        info.show ? h('div', { class: 'row', style: { alignItems: 'flex-start' } }, h('div', { style: { flex: 1 } },
          ok ? null : h('div', { class: 'small th' }, 'คำตอบที่ถูก · Correct answer:'),
          h('div', { class: 'ans' }, info.show), info.showTh ? h('div', { class: 'th small' }, info.showTh) : null),
        info.say ? A.sayBtns(info.say, { sm: true }) : null) : null,
        !ok && info.why ? h('div', { class: 'why' }, '💡 ' + info.why) : null,
        h('button', { class: 'btn block ' + (ok ? 'good' : 'bad'), id: 'fb-next', onclick: () => { fb.remove(); cont(); } }, 'Continue · ต่อไป')));
      document.body.append(fb);
      if (info.say && ok) A.speech.say(info.say);
      setTimeout(() => { const b = document.getElementById('fb-next'); if (b) b.focus({ preventScroll: true }); }, 50);
    }

    function finish() {
      const st = A.state;
      const now = Date.now();
      const secs = Math.min(2400, Math.round((now - ses.started) / 1000));
      const acc = ses.graded ? Math.round((ses.firstOk / ses.graded) * 100) : 100;
      const node = ses.node;
      const passed = !ses.test || acc >= 70;
      let xp = ses.firstOk;
      if (node && node.kind !== 'check') xp += 10 + (acc === 100 ? 5 : 0);
      if (ses.test && passed) xp += 20 + (acc === 100 ? 5 : 0);
      if (ses.kind === 'review' || ses.kind === 'mistakes') { xp += 5; st.reviews = (st.reviews || 0) + 1; }
      if (ses.kind === 'talk') xp += 6;
      const day = A.day(st);
      day.xp += xp; day.sec += secs; day.n += ses.graded; day.ok += ses.firstOk;
      const before = { units: A.unitsDone(st), months: A.monthsDone(st) };
      const doneKey = node ? node.id : ses.kind === 'talk' ? 'talk:' + ses.arg : null;
      const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : 1;
      if (doneKey && passed) {
        const prev = st.done[doneKey];
        if (!prev && node && node.kind === 'lesson') day.les = (day.les || 0) + 1;
        st.done[doneKey] = { s: Math.max(stars, (prev && prev.s) || 0), a: Math.max(acc, (prev && prev.a) || 0), t: now, n: ((prev && prev.n) || 0) + 1 };
      }
      if (!ses.test || passed) Object.entries(ses.items).forEach(([id, ok]) => A.srsApply(st, id, ok));
      const hr = new Date().getHours();
      if (hr < 8) st.badges.early = st.badges.early || now;
      if (hr >= 22) st.badges.night = st.badges.night || now;
      const sk = A.streak(st);
      if (sk > 0 && sk % 7 === 0 && !st.badges['fz' + sk]) { st.badges['fz' + sk] = now; st.freezes = Math.min(2, (st.freezes || 0) + 1); }
      const newBadges = A.checkBadges(st);
      const after = { units: A.unitsDone(st), months: A.monthsDone(st) };
      A.saveSoon();
      const lvlBefore = A.level(A.totalXP(st) - xp), lvlAfter = A.level(A.totalXP(st));
      A.track('lesson_end', { node: ses.nodeId, title: ses.title, acc, xp, secs, passed: passed ? 1 : 0, wrong: ses.graded - ses.firstOk, graded: ses.graded, looks: ses.lookups, badges: newBadges.join(',') || undefined, unitDone: after.units > before.units ? 1 : undefined, lvl: lvlAfter > lvlBefore ? lvlAfter : undefined });
      A.flush();
      A.session = null;
      A.go('result', { ses, acc, xp, secs, passed, stars, newBadges, unitUp: after.units > before.units, monthUp: after.months > before.months, lvlUp: lvlAfter > lvlBefore ? lvlAfter : 0 });
    }

    setTimeout(render, 0);
    return root;
  };

  // ---------------------------------------------------------------- result
  VIEWS.result = (r) => {
    const st = A.state;
    if (r.passed) { A.sfx.play('done'); setTimeout(A.confetti, 120); }
    const ses = r.ses;
    const root = h('div', { class: 'screen full result' });
    const head = !r.passed ? ['🌱', 'Almost there!', 'เกือบผ่านแล้ว! ต้องได้ 70% ขึ้นไป ลองทบทวนแล้วทำใหม่นะ']
      : r.monthUp ? ['🏆', 'Month complete!', 'จบเดือนแล้ว! รีสอร์ทของคุณได้ดาวเพิ่ม ★']
        : r.unitUp ? ['🎊', 'Unit complete!', 'จบบทแล้ว! รีสอร์ทของคุณมีของตกแต่งใหม่']
          : r.acc === 100 ? ['💯', 'Perfect!', 'ไม่ผิดเลยสักข้อ เก่งมาก!'] : ['🎉', 'Lesson done!', 'เรียนจบแล้ว เก่งมาก!'];
    root.append(h('div', { class: 'big-e' }, head[0]), h('h1', null, head[1]), h('p', { class: 'th muted' }, head[2]));
    if (r.passed && ses.node && ses.node.kind !== 'check') root.append(h('div', { class: 'stars', style: { fontSize: '2rem' } }, '★'.repeat(r.stars), h('span', { class: 'off' }, '★'.repeat(3 - r.stars))));
    root.append(h('div', { class: 'boxes' },
      h('div', { class: 'box' }, h('b', null, '+' + r.xp), h('span', null, 'XP')),
      h('div', { class: 'box' }, h('b', null, r.acc + '%'), h('span', null, 'Correct · ถูก')),
      h('div', { class: 'box' }, h('b', null, Math.max(1, Math.round(r.secs / 60)) + 'm'), h('span', null, 'Time · เวลา'))));
    if (r.unitUp || r.monthUp) { const card = h('div', { class: 'card resort', style: { width: '100%' } }); card.innerHTML = A.resortSVG(st, A.user.name); root.append(card); }
    if (r.monthUp && A.monthsDone(st) >= 6) {
      root.append(h('div', { class: 'card stack', style: { width: '100%', border: '3px double var(--mango)', background: 'var(--mango-tint)', textAlign: 'center' } },
        h('div', { style: { fontSize: '2.6rem' } }, '🎓'),
        h('div', { class: 'small muted' }, 'CERTIFICATE · ประกาศนียบัตร'),
        h('h2', null, A.user.name),
        h('div', null, 'completed the 6-month English course'),
        h('div', { class: 'th small' }, 'เรียนจบหลักสูตรภาษาอังกฤษ 6 เดือน — พูดภาษาอังกฤษพื้นฐานได้อย่างมั่นใจ'),
        h('div', { class: 'small muted' }, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + A.wordCount(st) + ' words · ' + A.totalXP(st) + ' XP')));
    }
    if (r.lvlUp) root.append(h('div', { class: 'pill mango', style: { fontSize: '1rem', padding: '8px 14px' } }, '⬆️ Level ' + r.lvlUp + ' · ' + A.title(r.lvlUp)[2]));
    r.newBadges.forEach((id) => { const b = A.BADGES.find((x) => x[0] === id); if (b) root.append(h('div', { class: 'pill love', style: { fontSize: '.95rem', padding: '8px 14px' } }, b[1] + ' New badge: ' + b[3])); });
    const lessonSents = ses.node && ses.node.kind === 'lesson' ? C.lessons[ses.node.id].sents.slice(0, 3) : ses.node && ses.node.kind === 'talk' ? C.talks[ses.node.talk].lines.filter((l) => l.s === 'B').slice(0, 3).map((l) => l.id) : [];
    if (r.passed && lessonSents.length) {
      root.append(h('div', { class: 'card can-say stack' }, h('div', { class: 'sec-title' }, 'Now you can say · ตอนนี้คุณพูดได้แล้ว'),
        lessonSents.map((sid) => h('div', { class: 'ex' }, A.sayBtns(A.S(sid).en, { sm: true, noSlow: true }), h('div', null, h('div', { class: 'en' }, A.S(sid).en), h('div', { class: 'thx' }, A.S(sid).th))))));
    }
    const nextN = A.nextNode(st);
    const btns = h('div', { class: 'stack', style: { width: '100%' } });
    if (!r.passed) btns.append(h('button', { class: 'btn mango block', onclick: () => A.play('node', ses.node.id) }, 'Try again · ลองอีกครั้ง'), h('button', { class: 'btn ghost block', onclick: () => A.play('review') }, 'Review first · ทบทวนก่อน'));
    else if (nextN && ses.node) btns.append(h('button', { class: 'btn mango block', onclick: () => A.play('node', nextN.id) }, 'Next: ' + A.nodeTitle(nextN).en));
    btns.append(h('button', { class: 'btn ghost block', onclick: () => A.go('home') }, 'Home · กลับหน้าแรก'));
    root.append(btns);
    return root;
  };

  // ================================================================ step renderers
  const RENDER = {};
  A.RENDER = RENDER;
  const continueBtn = (label, fn, cls) => h('button', { class: 'btn block ' + (cls || ''), onclick: fn }, label);
  const showThai = () => A.state && A.state.set && A.state.set.thai;
  function thaiReveal(th, startOpen) {
    const t = h('span', { class: 'hint-th th' + (startOpen || showThai() ? '' : ' hidden') }, th);
    const b = h('button', { class: 'chip thai-toggle' + (startOpen || showThai() ? ' hidden' : ''), onclick: () => { t.classList.remove('hidden'); b.classList.add('hidden'); A.track('hint', { th: th.slice(0, 60) }); } }, '🇹🇭 แปล · Show Thai');
    return [t, b];
  }

  RENDER.tip = (step, ctl) => h('div', { class: 'stack', style: { gap: '16px' } }, A.tipView(step.tip), continueBtn('เข้าใจแล้ว! · Got it', () => { A.track('tip_view', { tip: C.tips[step.tip].title }); ctl.next(); }));

  RENDER.wintro = (step, ctl) => {
    const e = D[step.key];
    setTimeout(() => A.speech.say(A.fill(e.w)), 150);
    const exs = examplesFor(e, step.key).slice(0, 2);
    return h('div', { class: 'intro' },
      h('div', { class: 'q-kind' }, '✨ New word · ', h('span', { class: 'th' }, 'คำใหม่')),
      h('div', { class: 'card hero' }, e.e ? h('div', { class: 'pic' }, e.e) : null, h('div', { class: 'w' }, A.fill(e.w)), A.sayBtns(A.fill(e.w)),
        h('div', { class: 'tr' }, e.th), e.pr ? h('div', { class: 'pr' }, 'คำอ่าน: ' + e.pr) : null, h('div', { class: 'small muted th' }, A.POS[e.p] || '')),
      e.n ? h('div', { class: 'note' }, e.n) : null,
      exs.length ? h('div', { class: 'card flat', style: { padding: '4px 14px' } }, exs.map((x) => h('div', { class: 'ex' }, A.sayBtns(x.en, { sm: true, noSlow: true }), h('div', null, h('div', { class: 'en' }, A.richText(x.en)), h('div', { class: 'thx' }, x.th))))) : null,
      continueBtn('จำได้แล้ว! · Got it', () => ctl.next()));
  };

  RENDER.sintro = (step, ctl) => {
    const s = A.S(step.sid);
    setTimeout(() => A.speech.say(s.en), 150);
    const chips = h('div', { class: 'chips-wbw' }, A.words(s.t).map((t) => { const e = A.entry(t); return h('button', { class: 'wbw', onclick: () => A.wordPopup(t, { sentence: s.en }) }, h('b', null, A.fill(t)), h('span', null, e ? A.thShort(e.th) : '')); }));
    return h('div', { class: 'intro' },
      h('div', { class: 'q-kind' }, '💡 New sentence · ', h('span', { class: 'th' }, 'ประโยคใหม่')),
      h('div', { class: 'prompt' }, h('div', { class: 'bubble' }, A.richS(step.sid)), A.sayBtns(s.en)),
      h('div', { class: 'card flat' }, h('div', { class: 'th', style: { fontSize: '1.2rem', fontWeight: 600, color: 'var(--sea-deep)' } }, s.th)),
      h('div', { class: 'small muted th' }, 'คำต่อคำ · Word by word (แตะเพื่อดูรายละเอียด)'), chips,
      s.note ? h('div', { class: 'note' }, '💡 ' + s.note) : null,
      continueBtn('เข้าใจแล้ว · Next', () => ctl.next()));
  };

  function optionList(opts, render, onPick, cls) {
    const box = h('div', { class: 'opts' + (cls ? ' ' + cls : '') });
    let done = false;
    opts.forEach((o, i) => {
      const b = h('button', { class: 'opt', onclick: () => { if (done) return; done = true; onPick(o, b, box); } }, h('span', { class: 'k' }, i + 1), render(o));
      box.append(b);
    });
    return box;
  }
  function markOpts(box, rightIdx, pickedBtn, ok) {
    [...box.children].forEach((b, i) => { if (i === rightIdx) b.classList.add('right'); else if (b === pickedBtn && !ok) b.classList.add('wrong'); else b.classList.add('dim'); });
  }

  // ---- word quizzes
  RENDER.w2th = (step, ctl) => {
    const e = D[step.key];
    return h('div', { class: 'stack', style: { gap: '18px' } }, kindLabel('w2th'),
      h('div', { class: 'card', style: { textAlign: 'center' } }, h('div', { style: { fontSize: '2rem', fontWeight: 600 } }, A.fill(e.w)), h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '6px' } }, A.sayBtns(A.fill(e.w)))),
      optionList(step.opts, (k) => h('span', { class: 'th', style: { fontSize: '1.1rem' } }, A.thShort(D[k].th)), (k, b, box) => {
        const ok = k === step.key; markOpts(box, step.opts.indexOf(step.key), b, ok);
        ctl.answer(step, ok, { q: e.w, a: A.thShort(D[k].th), c: A.thShort(e.th), show: A.fill(e.w) + ' = ' + e.th, say: A.fill(e.w) });
      }));
  };
  RENDER.th2w = (step, ctl) => {
    const e = D[step.key];
    return h('div', { class: 'stack', style: { gap: '18px' } }, kindLabel('th2w'),
      h('div', { class: 'card', style: { textAlign: 'center' } }, h('div', { class: 'th', style: { fontSize: '1.7rem', fontWeight: 600, color: 'var(--sea-deep)' } }, A.thShort(e.th))),
      optionList(step.opts, (k) => h('span', null, A.fill(D[k].w)), (k, b, box) => {
        const ok = k === step.key; markOpts(box, step.opts.indexOf(step.key), b, ok);
        ctl.answer(step, ok, { q: A.thShort(e.th), a: D[k].w, c: e.w, show: A.fill(e.w) + ' = ' + e.th, say: A.fill(e.w) });
      }));
  };
  RENDER.pic = (step, ctl) => {
    const e = D[step.key];
    return h('div', { class: 'stack', style: { gap: '18px' } }, kindLabel('pic'),
      h('div', { class: 'card', style: { textAlign: 'center', fontSize: '4.5rem', lineHeight: 1.1 } }, e.e),
      optionList(step.opts, (k) => h('span', null, A.fill(D[k].w)), (k, b, box) => {
        const ok = k === step.key; markOpts(box, step.opts.indexOf(step.key), b, ok);
        ctl.answer(step, ok, { q: e.e, a: D[k].w, c: e.w, show: e.e + ' ' + A.fill(e.w) + ' = ' + e.th, say: A.fill(e.w) });
      }));
  };
  RENDER.listenw = (step, ctl) => {
    const e = D[step.key];
    setTimeout(() => A.speech.say(A.fill(e.w)), 200);
    return h('div', { class: 'stack', style: { gap: '18px' } }, kindLabel('listenw'),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '14px', padding: '10px 0' } },
        h('button', { class: 'say', style: { width: '84px', height: '84px', fontSize: '2rem' }, onclick: () => A.speech.say(A.fill(e.w)) }, '🔊'),
        h('button', { class: 'say slow', style: { width: '60px', height: '60px', fontSize: '1.4rem' }, onclick: () => A.speech.say(A.fill(e.w), true) }, '🐢')),
      optionList(step.opts, (k) => h('span', null, A.fill(D[k].w)), (k, b, box) => {
        const ok = k === step.key; markOpts(box, step.opts.indexOf(step.key), b, ok);
        ctl.answer(step, ok, { q: '🔊 ' + e.w, a: D[k].w, c: e.w, show: A.fill(e.w) + ' = ' + e.th, say: A.fill(e.w) });
      }));
  };
  RENDER.match = (step, ctl) => {
    const left = A.shuffle(step.keys), right = A.shuffle(step.keys);
    let sel = null, left2 = step.keys.length;
    const wrongs = new Set();
    const L = h('div', { class: 'col' }), R = h('div', { class: 'col' });
    const tryPair = (a, b) => {
      if (!a || !b) return;
      if (a.dataset.k === b.dataset.k) {
        [a, b].forEach((x) => { x.classList.remove('sel'); x.classList.add('right'); setTimeout(() => x.classList.add('gone'), 350); });
        A.sfx.play('tap');
        A.speech.say(A.fill(D[a.dataset.k].w));
        if (--left2 === 0) setTimeout(() => {
          const ok = wrongs.size === 0;
          step.keys.forEach((k) => { A.session.items['w:' + k] = (A.session.items['w:' + k] !== false) && !wrongs.has(k); });
          ctl.answer({ ...step, item: null }, ok, { q: 'match ' + step.keys.join(', '), a: ok ? 'all right' : 'mistakes: ' + [...wrongs].join(', '), c: '', show: ok ? null : 'จับคู่ครบแล้ว! คำที่ผิด: ' + [...wrongs].join(', ') });
        }, 450);
      } else {
        wrongs.add(a.dataset.k); wrongs.add(b.dataset.k);
        [a, b].forEach((x) => { x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong', 'sel'), 450); });
        A.sfx.play('bad');
      }
      sel = null;
    };
    left.forEach((k) => { const b = h('button', { class: 'opt', 'data-k': k, 'data-side': 'L', onclick: () => pickSide(b) }, A.fill(D[k].w)); L.append(b); });
    right.forEach((k) => { const b = h('button', { class: 'opt th', 'data-k': k, 'data-side': 'R', onclick: () => pickSide(b) }, A.thShort(D[k].th)); R.append(b); });
    function pickSide(b) {
      if (b.classList.contains('right')) return;
      if (b.dataset.side === 'L') A.speech.say(A.fill(D[b.dataset.k].w));
      if (!sel) { sel = b; b.classList.add('sel'); return; }
      if (sel === b) { b.classList.remove('sel'); sel = null; return; }
      if (sel.dataset.side === b.dataset.side) { sel.classList.remove('sel'); sel = b; b.classList.add('sel'); return; }
      tryPair(sel.dataset.side === 'L' ? sel : b, sel.dataset.side === 'L' ? b : sel);
    }
    return h('div', { class: 'stack', style: { gap: '18px' } }, kindLabel('match'), h('div', { class: 'match' }, L, R));
  };

  // ---- sentence quizzes
  RENDER.gap = (step, ctl) => {
    const s = A.S(step.sid), g = step.gap;
    const toks = g.toks.slice(); toks[g.at] = '___';
    const line = A.rich(toks, { en: s.en });
    const [thT, thB] = thaiReveal(s.th, true);
    return h('div', { class: 'stack', style: { gap: '18px' } }, kindLabel('gap'),
      h('div', { class: 'prompt' }, h('div', { class: 'bubble' }, line, thT)),
      thB,
      optionList(g.opts, (o) => h('span', { style: { fontSize: '1.25rem', fontWeight: 600 } }, o), (o, b, box) => {
        const ok = o.toLowerCase() === g.answer.toLowerCase();
        const slot = line.querySelector('[data-gap]');
        slot.textContent = o; slot.classList.add(ok ? 'filled-ok' : 'filled-bad');
        markOpts(box, g.opts.findIndex((x) => x.toLowerCase() === g.answer.toLowerCase()), b, ok);
        const full = A.capFirst(A.join(g.toks));
        ctl.answer(step, ok, { q: A.join(toks), a: o, c: g.answer, show: full, showTh: s.th, say: full, why: s.note || A.WHY[g.why] });
      }, 'grid'));
  };

  RENDER.build = (step, ctl) => {
    const s = A.S(step.sid);
    const ans = step.tiles.answer;
    const line = h('div', { class: 'build-line', 'aria-label': 'Your sentence' });
    const bank = h('div', { class: 'bank' });
    const placed = [];
    const check = h('button', { class: 'btn block', disabled: true }, 'Check · ตรวจคำตอบ');
    step.tiles.tiles.forEach((t) => {
      const b = h('button', { class: 'wtile', onclick: () => {
        if (b.classList.contains('used')) return;
        b.classList.add('used'); A.sfx.play('tap');
        const p = h('button', { class: 'wtile', onclick: () => { p.remove(); b.classList.remove('used'); placed.splice(placed.indexOf(t), 1); check.disabled = !placed.length; } }, t.w);
        placed.push(t); line.append(p); check.disabled = false;
        if (D[A.keyOf(t.w)]) A.speech.say(t.w);
      } }, t.w);
      bank.append(b);
    });
    // accepted word orders: as written, clauses swapped around a comma, or a time word moved to the other end
    const accepted = (() => {
      const low = ans.map((w) => w.toLowerCase());
      const out = [low.join(' ')];
      const ci = s.t.indexOf(',');
      if (ci > 0 && s.t.filter((x) => x === ',').length === 1) {
        const a = A.words(s.t.slice(0, ci)).map((w) => w.toLowerCase()), b = A.words(s.t.slice(ci + 1)).map((w) => w.toLowerCase());
        out.push([...b, ...a].join(' '));
      }
      const TIME = ['yesterday', 'today', 'tomorrow', 'tonight', 'now', 'sometimes', 'usually'];
      if (TIME.includes(low[0])) out.push([...low.slice(1), low[0]].join(' '));
      if (TIME.includes(low.at(-1))) out.push([low.at(-1), ...low.slice(0, -1)].join(' '));
      return out.map((x) => x.replace(/\bi\b/g, 'i'));
    })();
    check.onclick = () => {
      const given = placed.map((t) => t.w);
      const ok = accepted.includes(given.join(' ').toLowerCase());
      check.disabled = true;
      [...line.children, ...bank.children].forEach((x) => { x.disabled = true; });
      ctl.answer(step, ok, { q: s.th, a: A.capFirst(given.join(' ')), c: s.en, show: s.en, showTh: s.th, say: s.en, why: ok ? null : (s.note || 'ดูลำดับคำให้ดี: ใคร + am/is/are หรือ กริยา + ส่วนที่เหลือ') });
    };
    return h('div', { class: 'stack', style: { gap: '14px' } }, kindLabel('build'),
      h('div', { class: 'prompt' }, h('div', { style: { fontSize: '2rem' } }, '🙋‍♀️'), h('div', { class: 'bubble th' }, s.th)),
      line, bank, check);
  };

  RENDER.pick = (step, ctl) => {
    const s = A.S(step.sid);
    return h('div', { class: 'stack', style: { gap: '16px' } }, kindLabel('pick'),
      h('div', { class: 'card flat' }, h('div', { class: 'small muted th' }, 'ความหมาย · Meaning'), h('div', { class: 'th', style: { fontSize: '1.2rem', fontWeight: 600 } }, s.th)),
      optionList(step.opts, (o) => h('span', null, o.s), (o, b, box) => {
        const ok = !!o.ok;
        markOpts(box, step.opts.findIndex((x) => x.ok), b, ok);
        ctl.answer(step, ok, { q: s.th, a: o.s, c: s.en, show: s.en, showTh: s.th, say: s.en, why: ok ? null : (TAG_WHY[o.tag] || s.note) });
      }));
  };

  RENDER.meaning = (step, ctl) => {
    const s = A.S(step.sid);
    setTimeout(() => A.speech.say(s.en), 150);
    return h('div', { class: 'stack', style: { gap: '16px' } }, kindLabel('meaning'),
      h('div', { class: 'prompt' }, h('div', { class: 'bubble' }, A.richS(step.sid)), A.sayBtns(s.en)),
      optionList(step.opts, (sid) => h('span', { class: 'th' }, A.S(sid).th), (sid, b, box) => {
        const ok = sid === step.sid;
        markOpts(box, step.opts.indexOf(step.sid), b, ok);
        ctl.answer(step, ok, { q: s.en, a: A.S(sid).th, c: s.th, show: s.en, showTh: s.th, say: s.en });
      }));
  };

  RENDER.listen = (step, ctl) => {
    const s = A.S(step.sid);
    setTimeout(() => A.speech.say(s.en), 200);
    return h('div', { class: 'stack', style: { gap: '16px' } }, kindLabel('listen'),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '14px', padding: '8px 0' } },
        h('button', { class: 'say', style: { width: '84px', height: '84px', fontSize: '2rem' }, onclick: () => A.speech.say(s.en) }, '🔊'),
        h('button', { class: 'say slow', style: { width: '60px', height: '60px', fontSize: '1.4rem' }, onclick: () => A.speech.say(s.en, true) }, '🐢')),
      optionList(step.opts, (sid) => h('span', null, A.S(sid).en), (sid, b, box) => {
        const ok = sid === step.sid;
        markOpts(box, step.opts.indexOf(step.sid), b, ok);
        ctl.answer(step, ok, { q: '🔊 ' + s.en, a: A.S(sid).en, c: s.en, show: s.en, showTh: s.th, say: s.en });
      }));
  };

  RENDER.reply = (step, ctl) => {
    const s = A.S(step.sid), c = A.S(s.ctx);
    setTimeout(() => A.speech.say(A.fill(c.en)), 150);
    const [thT, thB] = thaiReveal(c.th);
    return h('div', { class: 'stack', style: { gap: '16px' } }, kindLabel('reply'),
      h('div', { class: 'chat' }, h('div', { class: 'msg' }, h('div', { class: 'av' }, '🙂'), h('div', { class: 'b' }, h('div', { class: 'en' }, A.richS(s.ctx)), thT)), thB),
      h('div', { class: 'row', style: { justifyContent: 'flex-start' } }, A.sayBtns(A.fill(c.en), { sm: true })),
      optionList(step.opts, (o) => h('span', null, A.fill(o.s)), (o, b, box) => {
        const ok = !!o.ok;
        markOpts(box, step.opts.findIndex((x) => x.ok), b, ok);
        ctl.answer(step, ok, { q: c.en, a: o.s, c: s.en, show: A.fill(s.en), showTh: s.th, say: A.fill(s.en), why: ok ? null : (TAG_WHY[o.tag] || s.note) });
      }));
  };

  // ---- conversations
  function bubble(line, t, showTh) {
    const s = A.S(line.id);
    const me = line.s === 'B';
    return h('div', { class: 'msg' + (me ? ' me' : '') },
      h('div', { class: 'av' }, me ? '🙋‍♀️' : A.fill(t.ae)),
      h('div', { class: 'b' }, h('div', { class: 'who' }, me ? A.user.name : A.fill(t.a)), h('div', { class: 'en' }, A.richS(line.id)), h('div', { class: 'thx' + (showTh ? '' : ' hidden') }, s.th)));
  }
  RENDER.talkread = (step, ctl) => {
    const t = C.talks[step.talk];
    let i = 0, showTh = true;
    const chat = h('div', { class: 'chat' });
    const nextB = h('button', { class: 'btn block' }, 'Next ▶ · ต่อไป');
    const thBtn = h('button', { class: 'chip on', onclick: () => { showTh = !showTh; thBtn.classList.toggle('on', showTh); chat.querySelectorAll('.thx').forEach((x) => x.classList.toggle('hidden', !showTh)); } }, '🇹🇭 คำแปล');
    const add = () => {
      const line = t.lines[i++];
      chat.append(bubble(line, t, showTh));
      A.speech.say(A.fill(A.S(line.id).en));
      if (i >= t.lines.length) { nextB.textContent = "Let's practice! · มาฝึกพูดกัน"; nextB.classList.add('mango'); }
      setTimeout(() => nextB.scrollIntoView({ behavior: 'smooth', block: 'end' }), 30);
    };
    nextB.onclick = () => { if (i >= t.lines.length) { A.track('talk_read', { talk: t.id }); ctl.next(); } else add(); };
    setTimeout(add, 120);
    return h('div', { class: 'stack', style: { gap: '14px' } },
      h('div', { class: 'row between' }, h('div', null, h('div', { class: 'q-kind' }, '💬 Read & listen · ', h('span', { class: 'th' }, 'อ่านและฟัง')), h('div', { class: 'q-title' }, A.fill(t.en), h('span', { class: 'th' }, t.th))), thBtn),
      chat, nextB);
  };
  RENDER.talkplay = (step, ctl) => {
    const t = C.talks[step.talk];
    let i = 0;
    const chat = h('div', { class: 'chat' });
    const area = h('div', { class: 'stack' });
    const fin = () => { A.clear(area).append(continueBtn('Finish · เสร็จแล้ว', () => ctl.next(), 'mango')); area.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
    const advance = () => {
      if (i >= t.lines.length) return fin();
      const line = t.lines[i];
      if (line.s === 'A') {
        chat.append(bubble(line, t, false));
        A.speech.say(A.fill(A.S(line.id).en));
        i++;
        setTimeout(advance, 700);
        return;
      }
      const s = A.S(line.id);
      let wrong = (line.x || []).map((x) => ({ s: x, tag: guessTag(x, s.en) }));
      if (wrong.length < 2) wrong = wrong.concat(A.corruptions(s.t).slice(0, 2 - wrong.length));
      const opts = A.shuffle([{ s: s.en, ok: 1 }, ...wrong.slice(0, 2)]);
      A.clear(area).append(h('div', { class: 'q-kind' }, '💬 Your turn · ', h('span', { class: 'th' }, 'ถึงตาคุณแล้ว ตอบว่าอะไรดี')),
        optionList(opts, (o) => h('span', null, A.fill(o.s)), (o, b, box) => {
          const ok = !!o.ok;
          markOpts(box, opts.findIndex((x) => x.ok), b, ok);
          A.session.graded++; if (ok) A.session.firstOk++;
          A.session.items['s:' + line.id] = (A.session.items['s:' + line.id] !== false) && ok;
          A.track('answer', { node: A.session.nodeId, ex: 'talk', item: 's:' + line.id, q: s.ctx ? A.S(s.ctx).en : t.en, a: o.s, c: s.en, ok: ok ? 1 : 0 });
          A.sfx.play(ok ? 'good' : 'bad');
          const go = () => { chat.append(bubble(line, t, false)); A.speech.say(A.fill(s.en)); i++; A.clear(area); setTimeout(advance, 800); };
          if (ok) setTimeout(go, 500);
          else {
            area.append(h('div', { class: 'card', style: { background: 'var(--bad-bg)' } }, h('div', { class: 'small th' }, 'คำตอบที่ถูก:'), h('b', null, A.fill(s.en)), h('div', { class: 'th small' }, s.th),
              TAG_WHY[o.tag] ? h('div', { class: 'why small th', style: { marginTop: '6px' } }, '💡 ' + TAG_WHY[o.tag]) : null),
            h('button', { class: 'btn bad block', onclick: go }, 'OK, continue · ต่อไป'));
          }
        }));
      area.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };
    setTimeout(advance, 150);
    return h('div', { class: 'stack', style: { gap: '14px' } },
      h('div', null, h('div', { class: 'q-kind' }, '🎭 Role-play · ', h('span', { class: 'th' }, 'เล่นบทบาท — คุณคือ ' + A.user.name)), h('div', { class: 'q-title' }, A.fill(t.en), h('span', { class: 'th' }, t.th))),
      chat, area);
  };
  function guessTag(wrong, right) {
    const w = wrong.toLowerCase(), r = right.toLowerCase();
    const cnt = (s, re) => (s.match(re) || []).length;
    const be = /\b(am|is|are|i'm|you're|he's|she's|it's|we're|they're)\b/g;
    if (cnt(w, be) < cnt(r, be)) return 'drop-be';
    if (cnt(w, be) > cnt(r, be)) return 'add-be';
    if (cnt(w, /\b(am|is|are)\b/g) && w.replace(/\b(am|is|are)\b/g, '') === r.replace(/\b(am|is|are)\b/g, '')) return 'swap-be';
    return 'context';
  }

  // ================================================================ boot
  A.enter = async (me) => {
    A.user = me;
    if (me.role === 'admin') { A.bf.name = me.name; return A.admin.start(); }
    try { A.bf.name = await A.api.coachName(); } catch (e) { /* keep default */ }
    A.loadQueue();
    A.state = A.fixState(A.newerState(await A.api.loadState().catch(() => null)));
    applySettings();
    const fz = A.applyFreezes(A.state);
    if (fz) { A.saveSoon(); A.track('rest_day_used', { days: fz }); setTimeout(() => A.toast('🧊 ใช้วันพัก ' + fz + ' วัน — ไฟ 🔥 ยังไม่ดับ!', 3200), 600); }
    try { A.msgs = await A.api.inbox(); } catch (e) { A.msgs = []; }
    A.track('app_open', { ua: navigator.userAgent.slice(0, 120) });
    A.go('home');
  };

  async function start(hot) {
    A.api = await A.connect();
    await A.api.init();
    if (!A.speech.ok) document.documentElement.classList.add('no-speech');
    if (A.api.mode === 'server' && await A.api.setupNeeded().catch(() => false)) return A.go('setup');
    const me = await A.api.me();
    if (!me) return A.go('login');
    await A.enter(me);
    if (hot && hot.view && A.user.role === 'learner' && ['journey', 'talks', 'words', 'me', 'grammar'].includes(hot.view)) A.go(hot.view);
    if (hot && hot.tab && A.user.role === 'admin') A.admin.tab(hot.tab);
  }
  A.boot = () => {
    const hot = window.claude && window.claude.hot;
    if (hot && hot.snapshot) hot.snapshot(() => ({ view: A.view === 'player' || A.view === 'result' ? 'home' : A.view, tab: A.admin && A.admin.cur }));
    if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
  };
})();
