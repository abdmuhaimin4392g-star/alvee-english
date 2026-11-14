/* notify.js — pop-ups and the notification list.
   Anything worth knowing (a new treasure, a rare pearl, a key, a finished quest, a gift, a new boat in the boatyard)
   pops up at the top of the screen. Tapping it takes her straight to that thing: the item in the book, the pearl market,
   the chest on the map. The bell keeps the last forty, and the menu shows a dot on the tab that has something new. */
(function () {
  'use strict';
  const A = window.AE, h = A.h;
  const inbox = () => { const st = A.state; if (!st) return []; if (!Array.isArray(st.inbox)) st.inbox = []; return st.inbox; };
  const tabOf = (go) => { const v = go && go[0]; return v === 'treasure' || v === 'medals' ? 'treasure' : v === 'journey' || v === 'quests' ? 'journey' : v === 'talks' ? 'talks' : v === 'me' || v === 'words' || v === 'grammar' ? 'me' : 'home'; };
  A.unread = (tab) => inbox().filter((n) => !n.read && (!tab || tabOf(n.go) === tab)).length;

  // open what a notification points at
  A.openNote = (n) => {
    if (!n) return;
    n.read = 1; A.saveSoon();
    document.querySelectorAll('.sheet,.veil').forEach((x) => x.remove());
    const go = n.go || ['home'];
    if (go[0] === 'quests') { if (A.view !== 'journey') A.go('journey'); setTimeout(() => A.voyage.questSheet(), 300); return; }
    A.go(go[0], go[1]);
    paintBadges();
  };

  // a pop-up at the top of the screen; it also goes into the list
  let q = [], showing = null;
  A.notify = (o) => {
    if (!A.state || !A.user || A.user.role !== 'learner') return;
    const n = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ic: o.ic || '✨', t: o.t, s: o.s || '', go: o.go || null, at: Date.now() };
    if (o.key) { const L = inbox(); if (L.some((x) => x.key === o.key)) return; n.key = o.key; }
    const L = inbox(); L.unshift(n); if (L.length > 40) L.length = 40;
    A.saveSoon();
    if (o.quiet) { paintBadges(); return; }
    q.push(n); if (!showing) next();
    paintBadges();
  };
  function next() {
    const n = q.shift(); if (!n) { showing = null; return; }
    if (A.view === 'player') { q.unshift(n); showing = null; setTimeout(next, 4000); return; }
    const el = h('button', { class: 'pop-note', type: 'button', 'aria-live': 'polite' },
      h('span', { class: 'pn-ic' }, n.ic), h('span', { class: 'pn-tx' }, h('b', null, n.t), n.s ? h('span', null, n.s) : null),
      n.go ? h('span', { class: 'pn-go' }, 'Open ›') : null);
    showing = el;
    let gone = false;
    const hide = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => { el.remove(); setTimeout(next, 250); }, 380); };
    el.addEventListener('click', () => { hide(); if (n.go) A.openNote(n); else { n.read = 1; A.saveSoon(); paintBadges(); } });
    let sy = null;
    el.addEventListener('touchstart', (e) => { sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchmove', (e) => { if (sy != null && e.touches[0].clientY < sy - 20) hide(); }, { passive: true });
    document.body.append(el);
    try { A.sfx.play('tap'); } catch (e) { /* quiet */ }
    try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { /* none */ }
    setTimeout(hide, 5200);
  }

  // the bell and its list
  A.bellBtn = (cls) => {
    const n = A.unread();
    return h('button', { class: 'bell-btn ' + (cls || ''), type: 'button', 'aria-label': 'Notifications' + (n ? ', ' + n + ' new' : ''), onclick: () => A.inboxSheet() }, '🔔', n ? h('span', { class: 'bdg' }, n > 9 ? '9+' : n) : null);
  };
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  A.inboxSheet = () => {
    const L = inbox();
    const box = h('div', { class: 'stack', style: { gap: '8px' } }, h('div', { class: 'row between' }, h('h2', null, 'Notifications'), L.some((x) => !x.read) ? h('button', { class: 'btn ghost sm', onclick: () => { L.forEach((x) => { x.read = 1; }); A.saveSoon(); sh.close(); paintBadges(); A.inboxSheet(); } }, 'Mark all read') : null));
    if (!L.length) box.append(h('p', { class: 'muted' }, 'Nothing yet. Sail on, and things will start to happen!'));
    L.forEach((n) => box.append(h('button', { class: 'note-row' + (n.read ? '' : ' new'), onclick: () => { sh.close(); A.openNote(n); } },
      h('span', { class: 'pn-ic' }, n.ic), h('span', { class: 'pn-tx' }, h('b', null, n.t), n.s ? h('span', null, n.s) : null, h('i', null, ago(n.at))), n.go ? h('span', { class: 'pn-go' }, '›') : null)));
    const sh = A.sheet(box);
  };

  // dots on the menu
  function paintBadges() {
    document.querySelectorAll('.nav button[data-v]').forEach((b) => {
      const n = A.unread(b.dataset.v);
      let d = b.querySelector('.bdg');
      if (n) { if (!d) { d = h('span', { class: 'bdg' }); b.append(d); } d.textContent = n > 9 ? '9+' : n; } else if (d) d.remove();
    });
    document.querySelectorAll('.bell-btn').forEach((b) => b.replaceWith(A.bellBtn(b.className.replace('bell-btn', '').trim())));
  }
  A.paintBadges = paintBadges;

  // things the app notices by itself when she opens it
  A.dailyNotes = () => {
    const st = A.state, V = A.voyage; if (!st || !V) return;
    const s = V.st(st), day = A.dkey();
    const cur = V.curIndex(st);
    const tide = V.dailySpawns().filter((x) => !s.got[x.id]).length;
    if (tide) A.notify({ key: 'tide' + day, ic: '🌊', t: 'The morning tide brought ' + tide + ' new thing' + (tide > 1 ? 's' : ''), s: 'They are floating right next to your boat.', go: ['journey', { near: 1 }] });
    // pearls selling high today
    const hi = V.PEARLS.filter(([k]) => k !== 'w' && V.pearlN(k) > 0 && V.price(k) > V.price(k, V.yesterday()) * 1.12);
    if (hi.length) A.notify({ key: 'mk' + day, ic: '📈', t: hi[0][1] + 's are selling high today', s: 'Now is a good day to sell at the pearl market.', go: ['treasure', 'shop:pearls'] });
    // gifts from the admin
    (V.gifts() || []).filter((g) => !s.got[g.id]).forEach((g) => A.notify({ key: 'gift' + g.id, ic: '🎁', t: 'A gift is floating near your boat!', s: g.gift && g.gift.note ? '“' + g.gift.note + '”' : 'Tap to sail over and pick it up.', go: ['journey', { sp: g.id }] }));
    // a key in the pocket and a sealed chest on the sea
    if (s.keys > 0) { const sp = V.route().main.slice(0, cur).map((m) => V.spawnsFor(m.gi).find((x) => x.kind === 'sealed' && !s.got[x.id])).find(Boolean); if (sp) A.notify({ key: 'seal' + day, ic: '🔑', t: 'You have a key, and a sealed chest is waiting', s: 'Sealed chests hold only rare treasure.', go: ['journey', { sp: sp.id }] }); }
    // quests ready to claim
    if (!V.ctl().questOff) { const ready = V.quests().filter((x) => x.done && !x.claimed).length; if (ready) A.notify({ key: 'qr' + day + ready, ic: '📜', t: ready + ' quest' + (ready > 1 ? 's' : '') + ' ready to claim', s: 'Collect your pearls.', go: ['quests'] }); }
  };
  // after an island: is there a new mystery boat in the boatyard?
  A.boatNotes = (before, after) => {
    const V = A.voyage; if (!V) return;
    V.BOATS.forEach((b) => { if (b.isl > before && b.isl <= after) A.notify({ key: 'boat' + b.id, ic: '⛵', t: 'A new boat arrived at the boatyard', s: 'The ' + b.n + '. Come and see it!', go: ['treasure', 'shop:' + b.id] }); });
  };
})();
