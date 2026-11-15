/* voyage-ui.js — the voyage map, islands, chests, the treasure book, the fleet and daily quests */
(function () {
  'use strict';
  const A = window.AE, C = A.C, h = A.h, V = A.voyage, T = A.treasure, SC = A.scenes;
  const VIEWS = A.VIEWS;
  const mascot = (m, s) => A.art.mascotEl(m, s);
  const STEP = 128;
  const RAR = T.RAR;

  // ---------------------------------------------------------------- HUD (pearls, gold, keys, treasure, quests, boat)
  const fmtN = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n));
  V.fmtN = fmtN;
  V.coinEl = (cls) => h('span', { class: 'coin ' + (cls || '') });
  V.hud = (st) => {
    const s = V.st(st);
    const q = V.ctl().questOff ? [] : V.quests();
    const qOpen = q.filter((x) => x.done && !x.claimed).length;
    return h('div', { class: 'v-hud' },
      h('button', { class: 'hud-i', 'aria-label': V.pearlTotal(st) + ' pearls', onclick: () => A.go('treasure', 'shop') }, V.pearlEl(), h('b', { class: 'num' }, V.pearlTotal(st))),
      h('button', { class: 'hud-i', 'aria-label': s.gold + ' gold', onclick: () => A.go('treasure', 'shop') }, V.coinEl(), h('b', { class: 'num' }, fmtN(s.gold))),
      h('button', { class: 'hud-i' + (s.keys ? ' has-key' : ''), 'aria-label': s.keys + ' keys', onclick: () => keySheet() }, '🔑', h('b', { class: 'num' }, s.keys)),
      h('button', { class: 'hud-i', 'aria-label': 'Treasure', onclick: () => A.go('treasure', 'book') }, h('span', { html: V.chestSVG(false, true) }), h('b', { class: 'num' }, V.treCount(st))),
      q.length ? h('button', { class: 'hud-i quest-btn' + (qOpen ? ' ping' : ''), 'aria-label': 'Daily quests', onclick: () => questSheet() }, '📜', h('b', { class: 'num' }, q.filter((x) => x.claimed).length + '/3')) : null,
      h('button', { class: 'hud-i boat-btn', 'aria-label': 'Your boats', onclick: () => A.go('treasure', 'shop'), html: V.boatPic(s.boat, false, 'hud-boat') }));
  };
  function keySheet() {
    const s = V.st();
    A.sheet(h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center', gap: '10px' } },
      h('div', { class: 'key-stage' }, '🔑'), h('h2', null, s.keys ? 'You have ' + s.keys + ' key' + (s.keys > 1 ? 's' : '') : 'No keys yet'),
      h('p', null, 'Keys open the sealed chests that drift along the route. A sealed chest only holds rare, epic or legendary treasure.'),
      h('div', { class: 'note', style: { textAlign: 'left' } }, h('b', null, 'How to get a key'), h('div', null, '📜 Finish all three daily quests'), h('div', null, '🏰 Pass a timed test for the first time'))));
  }
  V.keySheet = keySheet;
  // ---------------------------------------------------------------- the map (2D: used when a phone cannot draw 3D, and on your dashboard)
  VIEWS.journey = (arg) => (A.map3d && A.map3d.ok() ? A.map3d.view(A.state, arg) : V.mapView(A.state, {}));
  V.mapView = (st, opts) => {
    const o = opts || {};
    const s = V.st(st), R = V.route(), cur = V.curIndex(st);
    const root = h('div', { class: 'screen voyage v2d' + (o.readOnly ? ' read-only' : '') });
    if (!o.readOnly) root.append(V.hud(st));
    const total = R.main.length, pct = Math.round((V.boatP(st) + 1) / total * 100);
    root.append(h('div', { class: 'v-title' },
      h('div', null, h('h1', null, (o.name || A.user.name) + '’s Voyage'), h('p', { class: 'muted' }, 'Thailand → Maldives')),
      h('div', { class: 'route-bar', 'aria-label': 'Chapter ' + (cur + 1) + ' of ' + total },
        h('span', { class: 'flagc', html: flag('th') }), h('div', { class: 'rb' }, h('i', { style: { width: pct + '%' } }), h('span', { class: 'rb-boat', style: { left: pct + '%' }, html: V.boatPic(s.boat, false, 'tiny') })), h('span', { class: 'flagc', html: flag('mv') })),
      h('div', { class: 'small muted num' }, 'Chapter ' + (cur + 1) + ' of ' + total + ' · ' + V.SEAS[R.main[cur].sea].en)));
    if (!o.readOnly) {
      const near = V.dailySpawns().concat(V.gifts()).concat(V.spawnsFor(cur - 1)).filter((sp) => !s.got[sp.id]);
      if (near.length) root.append(h('div', { class: 'card stack' }, h('b', null, '🌊 Floating near your boat'), h('div', { class: 'spawn-row' }, near.map((sp) => spawnEl(sp)))));
    }
    V.SEAS.forEach((sea, si) => {
      const isles = R.all.filter((x) => x.sea === si);
      if (!isles.length) return;
      const sec = h('section', { class: 'sea-sec2', style: { '--s1': sea.col[0], '--s2': sea.col[1] } }, h('div', { class: 'sea-h' }, h('span', { class: 'flagc sm', html: flag(sea.flag) }), h('b', null, sea.en)));
      isles.forEach((isl) => {
        const open = V.islandOpen(st, isl);
        if (isl.kind === 'side') { const d = s.side[isl.id]; sec.append(h('button', { class: 'chap-row side' + (open ? '' : ' lk'), onclick: () => (o.readOnly ? null : islandSheet(isl)) }, h('span', { class: 'cr-ic' }, d ? '✅' : '🧭'), h('div', { class: 'cr-tx' }, h('b', null, isl.name), h('span', { class: 'small muted' }, 'Side mission')))); return; }
        const c = V.chap(st, isl), here = isl.gi === cur && !c.all;
        sec.append(h('button', { class: 'chap-row' + (c.all ? ' done' : '') + (here ? ' here' : '') + (open ? '' : ' lk'), onclick: () => (o.readOnly ? null : islandSheet(isl)) },
          h('span', { class: 'cr-art', html: V.islandSVG(isl, {}) }),
          h('div', { class: 'cr-tx' }, h('span', { class: 'small muted' }, 'Chapter ' + (isl.gi + 1)), h('b', null, isl.name), h('span', { class: 'small' }, isl.title),
            h('div', { class: 'mini-bar wide' }, h('i', { style: { width: (c.done / c.total) * 100 + '%' } }))),
          (c.all ? h('span', { class: 'cr-st' }, '✅') : here ? h('span', { class: 'cr-st', html: V.boatPic(s.boat, false, 'tiny') }) : h('span', { class: 'cr-st' }, open ? '▶' : '🔒'))));
      });
      root.append(sec);
    });
    root.append(h('div', { class: 'card dest-card' }, h('div', { html: SC.svg('mv3', 'art') }), h('div', { class: 'dest-tx' }, h('b', null, '🏁 Destination: Addu Atoll, Maldives'), h('div', { class: 'small muted' }, 'The last island of the voyage.'))));
    if (!o.readOnly) A.presence = { screen: 'voyage', title: 'Chapter ' + (cur + 1) };
    return root;
  };
  const flag = (k) => k === 'mv'
    ? '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#d21034"/><rect x="7" y="5" width="16" height="10" fill="#007e3a"/><circle cx="15.4" cy="10" r="3.7" fill="#fff"/><circle cx="16.9" cy="10" r="3.1" fill="#007e3a"/></svg>'
    : '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#a51931"/><rect y="3.34" width="30" height="13.33" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.66" fill="#2c3590"/></svg>';
  V.flag = flag;
  const LOG_SVG = `<svg viewBox="0 0 48 34" width="40" height="28" aria-hidden="true"><ellipse cx="24" cy="27" rx="19" ry="4.2" fill="rgba(255,255,255,.35)"/><g transform="rotate(-12 24 17)"><rect x="6" y="9" width="34" height="15" rx="7.5" fill="#8b5a2b"/><rect x="8" y="10.5" width="30" height="4" rx="2" fill="#b98350"/><rect x="8" y="19" width="30" height="3.4" rx="1.7" fill="#5f3a1b"/><ellipse cx="38.5" cy="16.5" rx="4.2" ry="7.5" fill="#dcaa6a"/><ellipse cx="38.5" cy="16.5" rx="2.8" ry="5.2" fill="none" stroke="#a97235" stroke-width=".9"/></g></svg>`;
  V.logSVG = () => LOG_SVG;
  function spawnEl(sp) {
    let inner;
    const gk = sp.gift && sp.gift.kind;
    if (sp.kind === 'shell') inner = h('span', null, '🐚');
    else if (sp.kind === 'pearl' || sp.kind === 'pearls') inner = h('span', null, '🦪');
    else if (sp.kind === 'log' || gk === 'logs') inner = h('span', { html: LOG_SVG });
    else if (sp.kind === 'bottle') inner = h('span', { html: V.bottleSVG() });
    else inner = h('span', { html: V.chestSVG(sp.kind === 'golden' || sp.kind === 'sealed' || gk === 'golden') });
    const el = h('button', { class: 'spawn2 k-' + sp.kind, 'aria-label': sp.gift ? 'A gift for you' : sp.kind, onclick: (e) => { e.stopPropagation(); collect(sp, el, true); } }, inner);
    return el;
  }
  function floatText(el, txt) { const r = el.getBoundingClientRect(); const f = h('div', { class: 'float-txt', style: { left: r.left + r.width / 2 + 'px', top: r.top + 'px' } }, txt); document.body.append(f); setTimeout(() => f.remove(), 1600); }
  function collect(sp, el, reach) {
    const s = V.st();
    const g = sp.gift, gk = g && g.kind, n = g ? Math.max(1, g.n || 1) : 1;
    if (g && g.note) A.toast('💌 ' + g.note, 3200);
    const take = (txt, track) => { s.got[sp.id] = Date.now(); floatText(el, txt); el.classList.add('picked', 'gone'); setTimeout(() => el.remove(), 500); if (track) A.track('collect', Object.assign({ gift: g ? 1 : undefined }, track)); A.saveSoon(); refreshHud(); };
    if (sp.kind === 'shell' || gk === 'shells') {
      const id = sp.shell || (g && g.shell) || 'cowrie';
      for (let i = 0; i < n; i++) { const sid = g && !g.shell ? A.pick(V.SHELLS.filter((x) => x[3] !== 'l'))[0] : id; s.sh[sid] = (s.sh[sid] || 0) + 1; }
      V.count('shells', n); A.sfx.play('good');
      const sh = V.shell(id);
      take(g ? '+' + n + ' shells' : '🐚 ' + sh[1], { k: 'shell', id });
      if (!g && s.sh[id] === 1) A.notify({ quiet: 1, ic: '🐚', t: 'New shell: ' + sh[1], go: ['treasure', 'shells:' + id] });
      if (!g && s.sh[id] === 1) setTimeout(() => A.sheet(h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center', gap: '8px' } }, h('div', { class: 'shell-stage', html: V.shellSVG(id, 120) }), h('div', { class: 'small muted' }, 'A new kind of shell!'), h('h2', null, sh[1]), h('span', { class: 'rar-chip', style: { '--rc': RAR[sh[3]].col } }, RAR[sh[3]].n), h('div', { class: 'small muted' }, V.SHELLS.filter((x) => s.sh[x[0]]).length + ' of ' + V.SHELLS.length + ' kinds found'))), 400);
      return;
    }
    if (gk === 'pearls') { const k = V.addPearls(n); A.sfx.play('good'); take('+' + k + ' pearls', { k: 'pearl', n: k }); return; }
    if (sp.kind === 'pearl') {
      const k = V.oyster(), P = V.PEARLS.find((x) => x[0] === k); V.count('pearls');
      A.sfx.play(k === 'w' ? 'good' : 'done'); take('🦪 ' + P[1] + '!', { k: 'pearl', q: k });
      if (k !== 'w') { A.notify({ ic: k === 'g' ? '🌟' : '🦪', t: 'A ' + P[1].toLowerCase() + '!', s: 'Today it sells for ' + V.price(k) + ' gold at the pearl market.', go: ['treasure', 'shop:pearls'] }); if (k === 'g' || k === 'b') A.confetti(); }
      return;
    }
    if (sp.kind === 'log' || gk === 'logs') { const k = g ? n : 1 + (Math.random() < 0.3 ? 1 : 0); s.logs += k; A.sfx.play('good'); take('🪵 +' + k + ' wood log' + (k > 1 ? 's' : ''), { k: 'log', n: k }); if (s.hull < 100) A.notify({ ic: '🪵', t: 'Wood for your boat!', s: 'Your hull is at ' + s.hull + '%. Tap to repair it.', go: ['boat'] }); return; }
    if (gk === 'gold') { V.addGold(n); A.sfx.play('done'); take('+' + n + ' gold', { k: 'gold', n }); return; }
    if (gk === 'key') { s.keys += n; A.sfx.play('done'); take('+' + n + ' 🔑', { k: 'key', n }); return; }
    if (gk === 'item') {
      const cur = s.tre[g.item]; s.tre[g.item] = { n: ((cur && cur.n) || 0) + 1, t: (cur && cur.t) || Date.now() }; s.got[sp.id] = Date.now();
      A.saveSoon(); el.remove(); A.track('collect', { k: 'item', id: g.item, gift: 1 });
      treasureReveal({ item: T.byId[g.item], isNew: !cur }, true); return;
    }
    if (gk === 'boat') {
      if (!s.boats.includes(g.boat)) s.boats.push(g.boat);
      s.got[sp.id] = Date.now(); A.saveSoon(); el.remove(); A.track('collect', { k: 'boat', id: g.boat, gift: 1 });
      const b = V.boat(g.boat);
      const sh = A.sheet(h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center' } }, h('div', { class: 'boat-stage', html: V.boatPic(b.id) }), h('div', { class: 'small muted' }, '🎁 A new boat!'), h('h2', null, b.n), h('p', null, b.d), h('button', { class: 'btn block', onclick: () => { s.boat = b.id; A.saveSoon(); sh.close(); A.go('journey'); } }, '⛵ Sail it now')));
      return;
    }
    // chests, sealed chests and bottles open with a small English task
    const golden = sp.kind === 'golden' || gk === 'golden';
    const sealed = sp.kind === 'sealed' || gk === 'sealed';
    const isBottle = sp.kind === 'bottle';
    if (sealed && s.keys < 1) {
      A.sheet(h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center', gap: '10px' } },
        h('div', { class: 'chest-stage sealed', html: V.chestSVG(true) }), h('h2', null, 'A sealed chest'),
        h('p', null, 'It is locked with an iron lock. Only rare, epic and legendary treasure is sealed away like this.'),
        h('div', { class: 'note', style: { textAlign: 'left' } }, h('b', null, 'You need a 🔑 key'), h('div', null, '📜 Finish all three daily quests'), h('div', null, '🏰 Pass a timed test for the first time')),
        h('div', { class: 'small muted' }, 'The chest will wait here for you.')));
      return;
    }
    const sh = A.sheet(h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center', gap: '10px' } },
      h('div', { class: 'chest-stage wobble' + (sealed ? ' sealed' : ''), html: isBottle ? V.bottleSVG() : V.chestSVG(golden || sealed) }),
      h('h2', null, isBottle ? 'A message in a bottle!' : sealed ? 'A sealed chest!' : golden ? 'A golden chest!' : 'A treasure chest!'),
      h('p', null, isBottle ? 'Listen and answer 5 questions to open it.' : sealed ? 'Use 1 key and answer 3 English questions. Get 2 right and the treasure is yours. The key is only used if it opens.' : 'Answer 3 English questions to unlock it. Get 2 right!'),
      sealed ? h('div', { class: 'small muted' }, '🔑 You have ' + s.keys + ' key' + (s.keys > 1 ? 's' : '')) : null,
      h('button', { class: 'btn mango block', onclick: () => { sh.close(); A.play(isBottle ? 'bottle' : 'chest', { id: sp.id, golden, sealed }); } }, isBottle ? '🍾 Open it' : sealed ? '🔑 Use a key' : '🗝️ Unlock'),
      h('button', { class: 'btn ghost block', onclick: () => sh.close() }, 'Later')));
  }
  V.collect = collect;
  function refreshHud() { const old = document.querySelector('.v-hud'); if (old) old.replaceWith(V.hud(A.state)); }
  V.refreshHud = refreshHud;

  // ---------------------------------------------------------------- island details: a chapter and its lessons
  function teaser(gi) {
    const R = V.route().main, out = [], s = V.st();
    const b = V.BOATS.find((x) => x.isl > gi && !s.boats.includes(x.id));
    if (b) out.push(h('div', null, '⛵ A mystery boat waits at chapter ' + (b.isl + 1)));
    const nx = R[gi + 1];
    if (nx) out.push(h('div', null, '🗺️ Next: ' + nx.name + (nx.sea !== R[gi].sea ? ', in a new sea: the ' + V.SEAS[nx.sea].en : '')));
    if ((gi + 3) % 3 === 0) out.push(h('div', null, '🔒 A sealed chest drifts just past this island'));
    return out.length ? h('div', { class: 'teaser' }, h('b', null, 'Coming up'), out) : null;
  }
  const NODE_IC = (n) => n.boost ? '💪' : n.kind === 'lesson' ? '📖' : n.kind === 'talk' ? '💬' : '⏱️';
  function islandSheet(isl) {
    const st = A.state, sea = V.SEAS[isl.sea];
    const open = V.islandOpen(st, isl);
    const content = h('div', { class: 'stack isl-sheet', style: { gap: '10px' } });
    content.append(h('div', { class: 'isl-hero', style: { '--s1': sea.col[0], '--s2': sea.col[1] }, html: V.islandSVG(isl, {}) }));
    content.append(h('div', { class: 'small muted' }, h('span', { class: 'flagc sm', html: flag(sea.flag) }), ' ' + sea.en));
    if (isl.kind === 'chap') {
      const c = V.chap(st, isl);
      content.append(h('div', { class: 'row between' }, h('div', null, h('div', { class: 'small muted' }, 'Chapter ' + (isl.gi + 1) + ' of ' + V.route().main.length), h('h2', null, isl.name), h('div', null, h('b', null, isl.title)), isl.focus ? h('div', { class: 'small muted' }, '📘 English: ' + isl.focus) : null), h('div', { class: 'chap-ring', style: { '--p': (c.done / c.total) * 100 } }, h('b', null, c.done + '/' + c.total))));
      const g = V.gate(st, isl);
      if (g && !g.ok) content.append(h('div', { class: 'gate' }, h('b', null, '⭐ Sea gate'), h('div', null, 'Collect ' + g.need + ' stars in the ' + g.sea.en + ' to sail into the ' + sea.en + '. You have ' + g.have + '.'), h('div', { class: 'gate-bar' }, h('i', { style: { width: Math.min(100, g.have / g.need * 100) + '%' } })), h('div', { class: 'small muted' }, 'Replay lessons and get 3 stars (90% or more).')));
      if (V.capped(st) && !c.all) content.append(h('div', { class: 'note' }, '⏳ You learned ' + V.newToday(st) + ' new lesson' + (V.newToday(st) > 1 ? 's' : '') + ' today. New ones open again tomorrow. Meanwhile: replay for stars, review, collect on the sea, or fight the Kraken!'));
      const list = h('div', { class: 'les-list' });
      isl.nodes.forEach((n, i) => {
        if (n.kind === 'check' && A.bonus) A.bonus.rows(st, n.u, () => sh.close()).forEach((r) => list.append(r));
        const d = st.done[n.id], op = V.nodeOpen(st, n), t = A.nodeTitle(n), isNext = c.next === n;
        list.append(h('button', { class: 'les-row' + (d ? ' done' : '') + (isNext && op ? ' next' : '') + (op ? '' : ' lk') + (n.kind === 'check' ? ' test' : ''), onclick: () => { if (!op) { const w = V.lockWhy(st, n); A.toast(w === 'today' ? '⏳ That was enough new lessons for today. Come back tomorrow! Replay a lesson for more stars.' : w === 'gate' ? '⭐ Collect more stars in the sea behind you first.' : w === 'bonus' ? '🏝️💎 Finish the Word Chest and the Idiom Cove first. They open the test!' : '🔒 Finish the one before it first.', 3400); return; } sh.close(); A.play('node', n.id); } },
          h('span', { class: 'lr-ic' }, d ? '✅' : op ? NODE_IC(n) : V.lockWhy(st, n) === 'today' ? '⏳' : '🔒'),
          h('div', { class: 'lr-tx' }, h('b', null, t.en), h('span', { class: 'small muted' }, n.kind === 'check' ? '⏱️ Timed test · pass with ' + A.passMark(n) + '%' + (A.typingOn && A.typingOn(n) ? ' · ⌨️ typing' : '') : n.boost ? 'Booster · extra practice for a tricky point' : n.kind === 'talk' ? 'Conversation' : 'Lesson ' + n.id)),
          h('span', { class: 'lr-st' }, d ? '★'.repeat(d.s) : isNext && op ? '▶' : '')));
      });
      content.append(list);
      content.append(h('div', { class: 'prize' }, '🎁 Each lesson: pearls. The test: a golden chest, 🔑 a key and 6 pearls.'));
      if (c.next && V.nodeOpen(st, c.next)) content.append(h('button', { class: 'btn mango block', onclick: () => { sh.close(); A.play('node', c.next.id); } }, NODE_IC(c.next) + ' Start: ' + A.nodeTitle(c.next).en));
      else if (!open) { const prev = V.route().main[isl.gi - 1]; content.append(h('div', { class: 'note' }, '🔒 Finish “' + (prev ? prev.name : '') + '” first. Then this island opens.')); }
      else if (c.all) content.append(h('div', { class: 'note' }, '✅ Chapter finished! You can play any lesson again.'));
      const tz = teaser(isl.gi); if (tz) content.append(tz);
    } else {
      const MS = {
        speed: ['⚡ Speed round', 'Answer 10 questions against the clock.'],
        listen: ['👂 Listening cove', 'Listen and answer 8 questions.'],
        talk: ['💬 Islanders’ chat', 'Help the islanders in a conversation.'],
        words: ['🧩 Word hunt', 'Find the right words 10 times.'],
        build: ['🧱 Sentence builders', 'Build 8 sentences.'],
      }[isl.mission];
      const d = V.st(st).side[isl.id];
      content.append(h('h2', null, isl.name), h('div', { class: 'pill mango' }, MS[0]), h('div', null, MS[1]),
        h('div', { class: 'prize' }, '🎁 Prize: golden chest and 5 pearls (first time)'));
      if (d) content.append(h('div', { class: 'small' }, '✅ Done · best ' + d.a + '%'));
      if (open) content.append(h('button', { class: 'btn mango block', onclick: () => { sh.close(); A.play('side', isl); } }, d ? '🔁 Play again' : '🧭 Start the mission'));
      else content.append(h('div', { class: 'note' }, V.ctl().sideOff ? 'Side missions are closed for now.' : '🔒 Finish the chapter “' + isl.anchor.name + '” first. Then this mission opens.'));
    }
    const sh = A.sheet(content);
  }
  V.islandSheet = islandSheet;

  // ---------------------------------------------------------------- the boat: hull, wood logs and repairs
  V.REPAIR = 15;
  V.boatSheet = () => {
    const s = V.st(), b = V.boat(s.boat);
    const box = h('div', { class: 'stack', style: { gap: '10px', alignItems: 'center', textAlign: 'center' } });
    const paint = () => {
      A.clear(box);
      box.append(h('div', { class: 'boat-stage', html: V.boatPic(b.id) }), h('h2', null, b.n),
        h('div', { class: 'hull-row' }, h('span', null, '🛟 Hull'), h('div', { class: 'hull-bar ' + (s.hull < 35 ? 'l' : s.hull < 70 ? 'm' : '') }, h('i', { style: { width: s.hull + '%' } })), h('b', null, s.hull + '%')),
        h('div', { class: 'small muted' }, s.hull >= 100 ? 'Your boat is in perfect shape.' : 'The Kraken left some damage. Wood logs fix it: +' + V.REPAIR + '% each.'),
        h('div', { class: 'row', style: { gap: '8px', justifyContent: 'center' } }, h('span', { html: LOG_SVG }), h('b', null, s.logs + ' wood log' + (s.logs === 1 ? '' : 's'))),
        h('button', { class: 'btn mango block', disabled: s.logs > 0 && s.hull < 100 ? null : true, onclick: () => { s.logs -= 1; s.hull = Math.min(100, s.hull + V.REPAIR); A.saveSoon(); A.sfx.play('good'); A.track('repair', { hull: s.hull }); paint(); refreshHud(); } }, '🔨 Repair with 1 log'),
        h('div', { class: 'small muted' }, 'Logs float on the sea. If the hull breaks, the boat sinks and some treasure is lost.'),
        h('button', { class: 'btn ghost block', onclick: () => { sh.close(); A.go('treasure', 'shop'); } }, '⛵ Boatyard'));
    };
    paint();
    const sh = A.sheet(box);
  };

  // ---------------------------------------------------------------- home: the voyage hero
  V.homeHero = (st, o) => {
    const s = V.st(st), R = V.route(), cur = V.curIndex(st), chap = R.main[cur], c = V.chap(st, chap), sea = V.SEAS[chap.sea];
    const dots = h('div', { class: 'hh-dots' }, chap.nodes.map((n) => h('i', { class: st.done[n.id] ? 'on' : c.next === n ? 'now' : '' })));
    return h('button', { class: 'home-hero', style: { '--s1': sea.col[0], '--s2': sea.col[1] }, onclick: () => A.go('journey') },
      h('div', { class: 'hh-sky' }), h('div', { class: 'hh-sun' }), h('div', { class: 'hh-sea' }, h('i'), h('i'), h('i')),
      h('div', { class: 'hh-isl', html: V.islandSVG(chap, {}) }),
      h('div', { class: 'hh-boat' }, h('span', { html: V.boatPic(s.boat, false) }), h('span', { class: 'boat-tao', html: A.art.mascot('happy', 26) })),
      h('div', { class: 'hh-tx' },
        h('div', { class: 'hh-hi-row' }, h('span', { class: 'hh-tao' }, mascot('wave', 54)), h('div', { class: 'hh-hi' }, o.greet + ',', h('br'), A.user.name + '!')),
        h('div', { class: 'hh-chap' }, h('span', { class: 'flagc sm', html: flag(sea.flag) }), ' Chapter ' + (cur + 1) + ' of ' + R.main.length),
        h('b', { class: 'hh-name' }, chap.name), dots),
      h('div', { class: 'hh-stats' }, h('span', null, '🔥 ' + o.streak), h('span', null, '⭐ ' + o.lvl), h('span', null, V.pearlEl(), ' ' + V.pearlTotal(st)), h('span', null, V.coinEl(), ' ' + V.fmtN(s.gold)), h('span', null, '🔑 ' + s.keys)),
      h('span', { class: 'hh-go' }, '🗺️ Map'));
  };
  V.questCard = (st) => {
    if (V.ctl().questOff) return null;
    const q = V.quests();
    return h('button', { class: 'card quest-card', onclick: () => questSheet() }, h('div', { class: 'row between' }, h('b', null, '📜 Today’s quests'), h('span', { class: 'small muted' }, q.filter((x) => x.claimed).length + '/3 · all three = 🔑')),
      h('div', { class: 'qc-list' }, q.map((x) => h('span', { class: 'qc' + (x.claimed ? ' claimed' : x.done ? ' ready' : '') }, (x.claimed ? '✅ ' : x.done ? '🎁 ' : '⬜ ') + x.en))));
  };

  // ---------------------------------------------------------------- treasure reveal (after a chest)
  function treasureCard(it, isNew, big) {
    const r = RAR[it[3]], set = T.SETS[it[4]];
    return h('div', { class: 'tre-card r-' + it[3] + (big ? ' big' : ''), style: { '--rc': r.col } },
      h('div', { class: 'tre-e' }, A.emoEl(it[1])),
      h('div', { class: 'tre-n' }, it[2]),
      h('div', { class: 'tre-m' }, h('span', { class: 'rar-chip', style: { '--rc': r.col } }, r.n), ' ' + set.ic + ' ' + set.n, isNew ? h('span', { class: 'new-chip' }, 'NEW') : null),
      big ? h('p', { class: 'tre-story' }, it[5]) : null);
  }
  V.treasureCard = treasureCard;
  function treasureReveal(roll, gift) {
    if (A.map3d && A.map3d.reveal) { A.map3d.reveal(roll, { gift: !!gift }); return; }
    A.sfx.play('done'); setTimeout(A.confetti, 100);
    A.sheet(h('div', { class: 'stack', style: { alignItems: 'center', textAlign: 'center', gap: '10px' } },
      h('div', { class: 'small muted' }, gift ? '🎁 A gift for you' : '✨ You found'),
      treasureCard(roll.item, roll.isNew, true)));
  }
  V.treasureReveal = treasureReveal;

  // result-screen block for voyage rewards
  V.resultBlock = (rw, ses) => {
    if (!rw) return null;
    const box = h('div', { class: 'stack', style: { width: '100%', gap: '10px', alignItems: 'center' } });
    if (rw.locked) box.append(h('div', { class: 'card stack', style: { width: '100%', textAlign: 'center' } }, h('div', { class: 'chest-stage', html: ses.kind === 'bottle' ? V.bottleSVG() : V.chestSVG(ses.arg && (ses.arg.golden || ses.arg.sealed)) }), h('b', null, 'The lock stayed shut'), h('div', { class: 'small' }, 'Try again. The chest is still there' + (ses.arg && ses.arg.sealed ? ', and you kept your key.' : '.'))));
    if (rw.chest) {
      if (!rw.shown && A.map3d && A.map3d.reveal) { rw.shown = 1; setTimeout(() => A.map3d.reveal(rw.chest, { golden: !!rw.golden, sealed: !!rw.sealed }), 450); }
      box.append(h('div', { class: 'chest-stage open', html: V.chestSVG(!!(rw.golden || rw.sealed), true) }));
      box.append(treasureCard(rw.chest.item, rw.chest.isNew, true));
    }
    if (rw.lines && rw.lines.length) box.append(h('div', { class: 'reward-lines' }, rw.lines.map(([en]) => h('div', { class: 'rw' }, /key/.test(en) ? h('span', null, '🔑') : V.pearlEl(), h('span', null, en)))));
    return box;
  };

  // ---------------------------------------------------------------- daily quests
  function questSheet() {
    const q = V.quests(), s = V.st();
    const box = h('div', { class: 'stack', style: { gap: '10px' } },
      h('div', { class: 'row', style: { gap: '10px' } }, mascot('party', 56), h('div', null, h('h2', null, 'Quests' + (q[0] && q[0].round ? ' · round ' + (q[0].round + 1) : '')), h('div', { class: 'muted small' }, 'Finish all three for +5 bonus pearls and a 🔑 key. Then three new quests start right away.'))));
    q.forEach((x) => box.append(h('div', { class: 'quest' + (x.claimed ? ' claimed' : x.done ? ' ready' : '') },
      h('span', { class: 'qi' }, x.claimed ? '✅' : x.done ? '🎁' : '⬜'),
      h('div', { style: { flex: 1 } }, h('b', null, x.en)),
      x.done && !x.claimed ? h('button', { class: 'btn mango', style: { minHeight: '40px', padding: '6px 12px' }, onclick: () => { const had = s.keys; const k = V.claimQuest(x.id); A.sfx.play('good'); sh.close(); refreshHud(); if (V.st().keys > had) { A.confetti(); A.notify({ ic: '🔑', t: 'You earned a key!', s: 'All three quests done. Use it on a sealed chest.', go: ['journey'] }); } else A.toast('+' + k + ' pearls'); questSheet(); } }, 'Claim +3') : h('span', { class: 'small muted' }, x.claimed ? 'claimed' : '+3 pearls'))));
    box.append(h('div', { class: 'small muted' }, 'There is always a new quest round waiting. No limit!'));
    const sh = A.sheet(box);
  }
  V.questSheet = questSheet;

  // ---------------------------------------------------------------- treasure: book, shells, postcards, medals, shop
  const sil = (e) => h('span', { class: 'te sil' }, e);
  VIEWS.treasure = (arg) => {
    const st = A.state, s = V.st(st);
    let tab = arg || 'book', focus = null;
    if (tab.includes(':')) { [tab, focus] = tab.split(':'); }
    if (tab === 'fleet') tab = 'shop';
    const root = h('div', { class: 'screen treasure-scr' });
    root.append(V.hud(st));
    root.append(h('div', null, h('h1', null, 'Treasure'), h('p', { class: 'muted' }, 'Everything you found on the voyage')));
    const tabs = [['book', '📖 Book'], ['shop', '🪙 Shop'], ['shells', '🐚 Shells'], ['cards', '🖼️ Postcards'], ['medals', '🏅 Medals']];
    root.append(h('div', { class: 'tabs scroll' }, tabs.map(([k, t]) => h('button', { class: k === tab ? 'on' : '', onclick: () => (k === 'medals' ? A.go('medals') : A.go('treasure', k)) }, t))));
    if (tab === 'book') {
      const got = Object.keys(s.tre).length;
      if (A.storm) root.append(A.storm.jar(st));
      root.append(h('div', { class: 'card chest' }, h('div', { html: V.chestSVG(true, true), class: 'chest-mini' }), h('div', { style: { flex: 1 } }, h('div', { class: 'chest-n' }, h('b', null, got), ' / ' + T.ITEMS.length), h('div', { class: 'small muted' }, 'Open chests on the sea to fill the book. Every ? is a treasure still waiting for you.'), h('div', { class: 'goal-bar', style: { marginTop: '6px' } }, h('i', { style: { width: (got / T.ITEMS.length) * 100 + '%' } })))));
      Object.entries(T.SETS).forEach(([k, set]) => {
        const items = T.ITEMS.filter((x) => x[4] === k).sort((a, b) => T.ORDER.indexOf(a[3]) - T.ORDER.indexOf(b[3]));
        const n = items.filter((x) => s.tre[x[0]]).length;
        root.append(h('div', { class: 'set-head' }, h('span', { class: 'set-ic' }, set.ic), h('div', { style: { flex: 1 } }, h('b', null, set.n), h('div', { class: 'small muted' }, n === items.length ? '👑 ' + set.gt : n >= items.length / 2 ? '🎖️ ' + set.title : 'Collect half for the title “' + set.title + '”')), h('span', { class: 'pill' + (n === items.length ? ' good' : '') }, n + '/' + items.length)));
        root.append(h('div', { class: 'tre-grid' }, items.map((it) => {
          const own = s.tre[it[0]];
          const where = it[3] === 'l' ? 'Only in golden or sealed chests' : it[3] === 'e' ? 'Best found in golden or sealed chests' : it[3] === 'r' ? 'Sealed chests always hold rare or better' : 'Any chest on the sea';
          return h('button', { class: 'tre-cell r-' + it[3] + (own ? ' own' : '') + (focus === it[0] ? ' focus' : ''), 'data-id': it[0], style: { '--rc': RAR[it[3]].col }, onclick: () => own ? A.sheet(h('div', { class: 'stack', style: { alignItems: 'center' } }, treasureCard(it, false, true), h('div', { class: 'small muted' }, '× ' + own.n + ' · found ' + new Date(own.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })))) : A.toast('🔍 ' + RAR[it[3]].n + ' · ' + where, 3200) },
            own ? h('span', { class: 'te' }, A.emoEl(it[1])) : h('span', { class: 'te mys', 'aria-label': 'Not found yet' }, h('i', null, '?')), h('span', { class: 'tn' }, own ? it[2] : '???'), own && own.n > 1 ? h('span', { class: 'tx' }, '×' + own.n) : null);
        })));
      });
    } else if (tab === 'shells') {
      const kinds = V.SHELLS.filter((x) => s.sh[x[0]]).length;
      root.append(h('div', { class: 'card chest' }, h('div', { html: V.shellSVG('conch', 64) }), h('div', null, h('div', { class: 'chest-n' }, h('b', null, kinds), ' / ' + V.SHELLS.length + ' kinds'), h('div', { class: 'small muted' }, V.shellCount(st) + ' shells in all. Pick them up on the sea.'))));
      root.append(h('div', { class: 'shell-grid' }, V.SHELLS.map((x) => {
        const n = s.sh[x[0]] || 0;
        return h('div', { class: 'shell-cell' + (n ? ' own' : '') + (focus === x[0] ? ' focus' : ''), style: { '--rc': RAR[x[3]].col } }, (n ? h('span', { html: V.shellSVG(x[0], 54) }) : h('span', { class: 'te mys sm' }, h('i', null, '?'))), h('b', null, n ? x[1] : '???'), h('span', { class: 'small muted' }, RAR[x[3]].n), n ? h('span', { class: 'tx' }, '×' + n) : null);
      })));
    } else if (tab === 'cards') {
      const pcs = V.postcards(st);
      root.append(h('div', { class: 'small muted' }, 'A painted postcard from each sea, collected as you sail · ' + pcs.filter((p) => p.on).length + ' / ' + pcs.length));
      root.append(h('div', { class: 'pc-grid' }, pcs.map((p) => h('button', { class: 'pc' + (p.on ? ' on' : ''), onclick: () => p.on ? A.sheet(h('div', { class: 'stack' }, h('div', { class: 'pc-big', html: SC.svg(p.id, 'art') }), h('b', null, p.alt), h('div', { class: 'small muted' }, V.SEAS[p.sea].en))) : A.toast('🔒 Sail further to get this postcard') },
        p.on ? h('div', { class: 'pc-art', html: SC.svg(p.id, 'art') }) : h('div', { class: 'pc-art pc-mys' }, h('i', null, '?')), h('span', { class: 'pc-cap' }, p.on ? V.SEAS[p.sea].en : '🔒 ' + V.SEAS[p.sea].en)))));
    } else if (tab === 'shop') root.append(shopView(st, focus));
    if (focus) setTimeout(() => { const el = root.querySelector('.focus'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); } }, 120);
    return root;
  };

  // ---------------------------------------------------------------- the shop: sell pearls for gold, buy boats with gold
  function shopView(st, focus) {
    const s = V.st(st), cur = V.curIndex(st), box = h('div', { class: 'stack', style: { gap: '12px' } });
    const y = V.yesterday();
    box.append(h('div', { class: 'card gold-card' }, V.coinEl('big'), h('div', { style: { flex: 1 } }, h('div', { class: 'chest-n' }, h('b', null, s.gold.toLocaleString('en-US')), ' gold'), h('div', { class: 'small muted' }, 'Sell pearls at the market. Buy boats at the boatyard.'))));
    const mk = h('div', { class: 'card stack market' + (focus === 'pearls' ? ' focus' : ''), style: { gap: '8px' } }, h('div', { class: 'row between' }, h('b', null, '🦪 Pearl market'), h('span', { class: 'small muted' }, 'Prices change every day')));
    V.PEARLS.forEach(([k, name]) => {
      const n = V.pearlN(k), p = V.price(k), py = V.price(k, y), up = p > py, dn = p < py;
      mk.append(h('div', { class: 'mk-row' },
        h('span', { class: 'pearl big q-' + k }),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('b', null, name), h('div', { class: 'small muted' }, 'You have ' + n)),
        h('div', { class: 'mk-price ' + (up ? 'up' : dn ? 'dn' : '') }, V.coinEl(), h('b', null, p), h('span', null, up ? '▲' : dn ? '▼' : '•')),
        h('button', { class: 'btn ghost sm', disabled: n ? null : true, onclick: () => { const g = V.sell(k, 1); if (g) { A.sfx.play('good'); A.toast('+' + g + ' gold'); A.go('treasure', 'shop'); } } }, 'Sell 1'),
        h('button', { class: 'btn mango sm', disabled: n > 1 ? null : true, onclick: () => { const g = V.sell(k, n); if (g) { A.sfx.play('done'); A.toast('+' + g + ' gold'); A.go('treasure', 'shop'); } } }, 'All')));
    });
    mk.append(h('div', { class: 'small muted' }, 'Oysters on the sea hold pearls. Most are white; a few are pink, black or golden.'));
    box.append(mk);
    box.append(h('div', { class: 'row between' }, h('h2', null, '⛵ Boatyard'), h('span', { class: 'small muted' }, s.boats.length + ' of ' + V.BOATS.length + ' boats')));
    box.append(h('div', { class: 'fleet' }, V.BOATS.map((b) => {
      const own = s.boats.includes(b.id), on = s.boat === b.id, seen = own || cur >= b.isl, can = !own && seen && s.gold >= b.g;
      if (!seen) return h('div', { class: 'boat-card mystery' }, h('div', { class: 'bc-pic mys-boat' }, h('i', null, '?')), h('div', { class: 'bc-tx' }, h('b', null, '??? Mystery boat'), h('div', { class: 'small muted' }, 'Reach chapter ' + (b.isl + 1) + ' to see it. (' + (b.isl - cur) + ' more chapter' + (b.isl - cur > 1 ? 's' : '') + ')')), h('span', { class: 'pill' }, '🔒'));
      return h('div', { class: 'boat-card' + (on ? ' on' : '') + (own ? ' own' : '') + (focus === b.id ? ' focus' : '') },
        h('div', { class: 'bc-pic', html: V.boatPic(b.id) }),
        h('div', { class: 'bc-tx' }, h('b', null, b.n), h('div', { class: 'small muted' }, b.d),
          own ? null : h('div', { class: 'small num price' }, V.coinEl(), ' ' + b.g.toLocaleString('en-US') + ' gold')),
        on ? h('span', { class: 'pill good' }, 'Sailing') : own ? h('button', { class: 'btn', onclick: () => { s.boat = b.id; A.saveSoon(); A.track('boat_select', { id: b.id }); A.go('treasure', 'shop'); } }, 'Sail it')
          : h('button', { class: 'btn ' + (can ? 'mango' : 'ghost'), disabled: can ? null : true, onclick: () => { if (!can) return; s.gold -= b.g; s.boats.push(b.id); s.boat = b.id; A.saveSoon(); A.track('boat_unlock', { id: b.id, g: b.g }); A.sfx.play('done'); A.confetti(); A.notify({ ic: '⛵', t: 'You bought the ' + b.n + '!', s: 'It is sailing on your map now.', go: ['journey'] }); A.go('treasure', 'shop:' + b.id); } }, can ? 'Buy' : 'Need ' + (b.g - s.gold).toLocaleString('en-US')));
    })));
    return box;
  }

})();
