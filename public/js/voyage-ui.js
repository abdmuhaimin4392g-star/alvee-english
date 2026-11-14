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
  // ---------------------------------------------------------------- the map
  const posX = (k, si) => 50 + Math.sin(k * 0.95 + si * 1.7) * 30;
  VIEWS.journey = (arg) => (A.crab && A.crab.ok() ? A.crab.view(A.state, arg) : V.mapView(A.state, {}));
  V.mapView = (st, opts) => {
    const o = opts || {};
    const s = V.st(st), R = V.route(), cur = V.curIndex(st), night = A.art.phase() === 'night';
    const root = h('div', { class: 'screen voyage' + (o.readOnly ? ' read-only' : '') });
    if (!o.readOnly) root.append(V.hud(st));
    const total = R.main.length;
    const pct = Math.round((cur / Math.max(1, total - 1)) * 100);
    root.append(h('div', { class: 'v-title' },
      h('div', null, h('h1', null, (o.name || A.user.name) + '’s Voyage'), h('p', { class: 'muted' }, 'Thailand → Maldives')),
      h('div', { class: 'route-bar', 'aria-label': 'Island ' + (cur + 1) + ' of ' + total },
        h('span', { class: 'flagc', html: flag('th') }), h('div', { class: 'rb' }, h('i', { style: { width: pct + '%' } }), h('span', { class: 'rb-boat', style: { left: pct + '%' }, html: V.boatPic(s.boat, false, 'tiny') })), h('span', { class: 'flagc', html: flag('mv') })),
      h('div', { class: 'small muted num' }, 'Island ' + (cur + 1) + ' of ' + total + ' · ' + V.SEAS[R.main[cur].sea].en)));
    const map = h('div', { class: 'v-map' });
    root.append(map);
    const islEls = {};
    V.SEAS.forEach((sea, si) => {
      const isles = R.all.filter((x) => x.sea === si);
      const mains = isles.filter((x) => x.kind === 'node');
      const firstGi = mains.length ? mains[0].gi : 0;
      const reached = firstGi <= cur;
      const sec = h('section', { class: 'sea-sec ter-' + sea.ter + (reached ? '' : ' far'), style: { '--s1': sea.col[0], '--s2': sea.col[1] } });
      const doneN = mains.filter((x) => st.done[x.node.id]).length;
      const pc = sea.art[0];
      sec.append(h('div', { class: 'sea-head' },
        h('div', { class: 'sea-art' + (reached ? '' : ' blur'), html: SC.svg(pc, 'art') }),
        h('div', { class: 'sea-tx' },
          h('div', { class: 'small' }, h('span', { class: 'flagc sm', html: flag(sea.flag) }), ' Sea ' + (si + 1) + ' of ' + V.SEAS.length),
          h('h2', null, sea.en), h('div', { class: 'th' }, sea.th),
          h('div', { class: 'mini-bar wide' }, h('i', { style: { width: (mains.length ? (doneN / mains.length) * 100 : 0) + '%' } })),
          h('div', { class: 'small num' }, doneN + ' / ' + mains.length + ' islands' + (reached ? '' : ' · 🔒')))));
      const H = mains.length * STEP + 40;
      const field = h('div', { class: 'field', style: { height: H + 'px' } });
      // the dotted sea route between this sea's islands
      const pts = mains.map((x, k) => [posX(k, si), k * STEP + 54]);
      if (pts.length > 1) {
        let d = `M${pts[0][0]} ${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += ` C${x0} ${y0 + STEP / 2} ${x1} ${y1 - STEP / 2} ${x1} ${y1}`; }
        const doneTo = mains.filter((x) => st.done[x.node.id]).length;
        field.innerHTML = `<svg class="route-svg" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" class="rt-bg"/><path d="${d}" class="rt-done" pathLength="100" style="stroke-dasharray:${(doneTo / Math.max(1, mains.length - 1)) * 100} 100"/></svg>`;
      }
      // waves
      field.append(h('div', { class: 'waves-bg', 'aria-hidden': 'true' }));
      isles.forEach((isl) => {
        let x, y;
        if (isl.kind === 'node') { x = posX(isl.k, si); y = isl.k * STEP + 54; }
        else { const ak = isl.anchor.k; const ax = posX(ak, si); x = ax > 50 ? 13 : 87; y = ak * STEP + 54 + STEP * 0.5; }
        if (isl.kind === 'node' && isl.gi === total - 1) isl.final = 1;
        const el = islandEl(st, isl, cur, o);
        el.style.left = x + '%'; el.style.top = y + 'px';
        if (isl.kind === 'side') field.append(h('div', { class: 'side-link' + (x > 50 ? ' r' : ''), style: { top: y - STEP * 0.5 + 'px', left: Math.min(x, posX(isl.anchor.k, si)) + '%', width: Math.abs(x - posX(isl.anchor.k, si)) + '%', height: STEP * 0.5 + 'px' } }));
        field.append(el);
        if (isl.kind === 'node') islEls[isl.gi] = { el, x, y, field };
      });
      // things floating between islands
      if (!o.readOnly) mains.forEach((isl, k) => {
        if (k === mains.length - 1) return;
        V.spawnsFor(isl.gi).forEach((sp) => {
          if (s.got[sp.id]) return;
          const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
          // float on open water beside the route, away from the islands and their names
          const mx = (x0 + x1) / 2, side = mx < 50 ? 1 : -1, j = +sp.id.split('.')[1] || 0;
          const x = Math.max(7, Math.min(93, mx + side * (26 + sp.fx * 12) - side * j * 14)), y = (y0 + y1) / 2 + (sp.fy - 0.5) * 34 + j * 22;
          field.append(spawnEl(sp, x, y, isl.gi < cur));
        });
      });
      sec.append(field);
      map.append(sec);
    });
    // destination card
    map.append(h('div', { class: 'card dest-card' }, h('div', { html: SC.svg('mv3', 'art') }), h('div', { class: 'dest-tx' }, h('b', null, '❤️ Destination: Addu Atoll, Maldives'), h('div', { class: 'small muted' }, 'Someone is waiting for you there.'))));

    // boat + daily tide + gifts, placed once the map is drawn
    const boat = h('div', { class: 'v-boat', 'aria-label': 'Your boat' });
    const paintBoat = (flip) => { boat.innerHTML = `<div class="wake"></div>${V.boatPic(s.boat, flip)}`; boat.append(h('div', { class: 'boat-tao', html: A.art.mascot('happy', 34) })); };
    paintBoat(false);
    requestAnimationFrame(() => {
      const target = islEls[cur];
      if (!target) return;
      const place = (gi, flip) => { const t = islEls[gi]; if (!t) return; if (boat.parentNode !== t.field) t.field.append(boat); boat.style.left = (t.x > 50 ? t.x - 33 : t.x + 33) + '%'; boat.style.top = t.y + 10 + 'px'; if (flip != null) paintBoat(flip); };
      if (!o.readOnly) {
        V.dailySpawns().concat(V.gifts()).forEach((sp, j) => {
          if (s.got[sp.id]) return;
          const side = target.x > 50 ? -1 : 1;
          const x = Math.max(7, Math.min(93, target.x + side * (22 + j * 9))), y = target.y + 52 + j * 24;
          target.field.append(spawnEl(sp, x, y, true));
        });
      }
      const from = Math.max(0, Math.min(s.at < 0 ? cur : s.at, cur));
      place(from, false);
      const scrollTo = (gi) => { const t = islEls[gi]; if (t) t.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
      if (o.readOnly || from >= cur) { place(cur); setTimeout(() => scrollTo(cur), 60); if (!o.readOnly && s.at !== cur) { s.at = cur; A.saveSoon(); } return; }
      // sail island by island
      let gi = from;
      scrollTo(gi);
      boat.classList.add('sailing');
      const hop = () => {
        if (!boat.isConnected) return;
        if (gi >= cur) { boat.classList.remove('sailing'); s.at = cur; A.saveSoon(); A.sfx.play('done'); landBubble(islEls[cur]); return; }
        const a = islEls[gi], b = islEls[gi + 1];
        gi++;
        place(gi, b && a ? b.x > a.x : false);
        scrollTo(gi);
        setTimeout(hop, 950);
      };
      setTimeout(hop, 700);
    });
    if (!o.readOnly) A.presence = { screen: 'voyage', title: 'Island ' + (cur + 1) };
    return root;
  };
  function landBubble(t) { if (!t) return; const b = h('div', { class: 'land-bubble' }, '⚓ Land ho!'); t.field.append(b); b.style.left = t.x + '%'; b.style.top = t.y - 70 + 'px'; setTimeout(() => b.remove(), 2600); }
  const flag = (k) => k === 'mv'
    ? '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#d21034"/><rect x="7" y="5" width="16" height="10" fill="#007e3a"/><circle cx="15.4" cy="10" r="3.7" fill="#fff"/><circle cx="16.9" cy="10" r="3.1" fill="#007e3a"/></svg>'
    : '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#a51931"/><rect y="3.34" width="30" height="13.33" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.66" fill="#2c3590"/></svg>';
  V.flag = flag;

  function islandEl(st, isl, cur, o) {
    const s = V.st(st);
    let done, open, isCur, kindIc, label;
    if (isl.kind === 'node') {
      const d = st.done[isl.node.id];
      done = !!d; open = V.islandOpen(st, isl); isCur = isl.gi === cur && !done;
      const t = A.nodeTitle(isl.node);
      kindIc = isl.node.kind === 'lesson' ? 'book' : isl.node.kind === 'talk' ? 'chat' : 'trophy';
      label = h('div', { class: 'isl-lbl' }, h('b', null, isl.name), h('span', null, t.en), d && d.s ? h('span', { class: 'isl-stars' }, '★'.repeat(d.s), h('i', null, '★'.repeat(3 - d.s))) : null);
    } else {
      const d = s.side[isl.id];
      done = !!d; open = V.islandOpen(st, isl); isCur = false; kindIc = 'search';
      label = h('div', { class: 'isl-lbl side' }, h('b', null, isl.name), h('span', null, 'Side mission'));
    }
    const el = h('button', { class: 'isl' + (done ? ' done' : '') + (open ? ' open' : ' locked') + (isCur ? ' cur' : '') + (isl.kind === 'side' ? ' side' : '') + (isl.final ? ' final' : '') + (isl.kind === 'node' && isl.node.kind === 'check' ? ' test' : ''),
      'data-gi': isl.gi != null ? isl.gi : '', 'aria-label': (isl.name || '') + (done ? ', done' : open ? ', open' : ', locked'),
      onclick: () => (o.readOnly ? null : islandSheet(isl)) },
      h('div', { class: 'isl-art', html: V.islandSVG(isl, { night: false }) }),
      h('span', { class: 'isl-badge', html: A.art.icon(done ? 'check' : open ? kindIc : 'lock', 16) }),
      done ? h('span', { class: 'isl-flag', html: flag(V.SEAS[isl.sea].flag) }) : null,
      isCur ? h('span', { class: 'isl-go' }, '▶ START') : null,
      label);
    return el;
  }

  function spawnEl(sp, x, y, reach) {
    let inner;
    if (sp.kind === 'shell') inner = h('span', { html: V.shellSVG(sp.shell || (sp.gift && sp.gift.shell) || 'cowrie', 30) });
    else if (sp.kind === 'pearl' || sp.kind === 'pearls') inner = V.pearlEl('big');
    else if (sp.kind === 'chest' || sp.kind === 'golden' || sp.kind === 'sealed') inner = h('span', { html: V.chestSVG(sp.kind === 'golden' || (sp.gift && sp.gift.kind === 'golden')) });
    else if (sp.kind === 'bottle') inner = h('span', { html: V.bottleSVG() });
    else if (sp.kind === 'item' || sp.kind === 'boat' || sp.kind === 'shells') inner = h('span', { class: 'gift-box' }, '🎁');
    else inner = h('span', null, '✨');
    const el = h('button', { class: 'spawn k-' + sp.kind + (reach ? '' : ' far') + (sp.gift ? ' gift' : '') + (sp.daily ? ' daily' : ''), style: { left: x + '%', top: y + 'px' }, 'aria-label': sp.gift ? 'A gift for you' : sp.kind,
      onclick: (e) => { e.stopPropagation(); collect(sp, el, reach); } }, inner, sp.gift ? h('span', { class: 'gift-tag' }, '🎁') : null);
    return el;
  }
  function floatText(el, txt) { const r = el.getBoundingClientRect(); const f = h('div', { class: 'float-txt', style: { left: r.left + r.width / 2 + 'px', top: r.top + 'px' } }, txt); document.body.append(f); setTimeout(() => f.remove(), 1600); }
  function collect(sp, el, reach) {
    if (!reach) { A.toast('⛵ Sail closer first: finish the islands before it.'); return; }
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

  // ---------------------------------------------------------------- island details
  // what is coming next on the route: the next fortress, the next mystery boat
  function teaser(gi) {
    const R = V.route().main, out = [];
    const t = R.find((x) => x.gi > gi && x.node.kind === 'check');
    if (t) out.push(h('div', null, '🏰 Fortress test in ' + (t.gi - gi) + ' island' + (t.gi - gi > 1 ? 's' : '') + ': golden chest and a 🔑 key'));
    const s = V.st(), b = V.BOATS.find((x) => x.isl > gi && !s.boats.includes(x.id));
    if (b) out.push(h('div', null, '⛵ A mystery boat appears at island ' + (b.isl + 1)));
    const sea = V.SEAS[R[gi].sea], nx = V.SEAS[R[gi].sea + 1], left = R.filter((x) => x.sea === R[gi].sea && x.gi > gi).length;
    if (nx) out.push(h('div', null, '🗺️ ' + (left ? left + ' more island' + (left > 1 ? 's' : '') + ' in the ' + sea.en + ', then the ' + nx.en : 'Next sea: the ' + nx.en)));
    return out.length ? h('div', { class: 'teaser' }, h('b', null, 'Coming up'), out) : null;
  }
  function islandSheet(isl) {
    const st = A.state, sea = V.SEAS[isl.sea];
    const open = V.islandOpen(st, isl);
    const content = h('div', { class: 'stack isl-sheet', style: { gap: '10px' } });
    content.append(h('div', { class: 'isl-hero', style: { '--s1': sea.col[0], '--s2': sea.col[1] }, html: V.islandSVG(isl, {}) }));
    content.append(h('div', { class: 'small muted' }, h('span', { class: 'flagc sm', html: flag(sea.flag) }), ' ' + sea.en));
    if (isl.kind === 'node') {
      const n = isl.node, t = A.nodeTitle(n), d = st.done[n.id];
      const kind = n.boost ? ['💪', 'Booster island'] : n.kind === 'lesson' ? ['📖', 'Lesson island'] : n.kind === 'talk' ? ['💬', 'Conversation island'] : ['⏱️', 'Timed test fortress'];
      content.append(h('h2', null, isl.name), h('div', { class: 'pill sea' }, kind[0] + ' ' + kind[1]), h('div', null, h('b', null, t.en)));
      if (n.boost) content.append(h('div', { class: 'note' }, '💪 Extra practice for “' + (A.SKILLS[n.boost] || [n.boost])[0] + '”. Your answers showed this one is tricky, so the sea added this island for you.'));
      if (n.kind === 'check') {
        const sec = V.ctl().testSec || 30;
        content.append(h('div', { class: 'note' }, '⏱️ Timed test: about ' + sec + ' seconds per question. Pass with 70%.'), h('div', { class: 'prize' }, '🎁 Prize: golden chest, 🔑 a key and 6 pearls'));
      } else content.append(h('div', { class: 'prize' }, '🎁 Prize: ' + (n.kind === 'talk' ? '3 pearls' : '3 pearls, 5 if you get 100%')));
      if (d) content.append(h('div', { class: 'small' }, 'Best: ' + d.a + '% · ' + '★'.repeat(d.s) + ' · played ' + d.n + '×'));
      if (open) content.append(h('button', { class: 'btn mango block', onclick: () => { sh.close(); A.play('node', n.id); } }, d ? '🔁 Sail here again' : '⛵ Start'));
      else {
        const prev = V.route().main[isl.gi - 1];
        content.append(h('div', { class: 'note' }, '🔒 Finish “' + (prev ? prev.name : '') + '” first. Then this island opens.'));
      }
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
      else content.append(h('div', { class: 'note' }, V.ctl().sideOff ? 'Side missions are closed for now.' : '🔒 Finish “' + isl.anchor.name + '” first. Then this mission opens.'));
    }
    const sh = A.sheet(content);
  }
  V.islandSheet = islandSheet;

  // ---------------------------------------------------------------- treasure reveal (after a chest)
  function treasureCard(it, isNew, big) {
    const r = RAR[it[3]], set = T.SETS[it[4]];
    return h('div', { class: 'tre-card r-' + it[3] + (big ? ' big' : ''), style: { '--rc': r.col } },
      h('div', { class: 'tre-e' }, it[1]),
      h('div', { class: 'tre-n' }, it[2]),
      h('div', { class: 'tre-m' }, h('span', { class: 'rar-chip', style: { '--rc': r.col } }, r.n), ' ' + set.ic + ' ' + set.n, isNew ? h('span', { class: 'new-chip' }, 'NEW') : null),
      big ? h('p', { class: 'tre-story' }, it[5]) : null);
  }
  V.treasureCard = treasureCard;
  function treasureReveal(roll, gift) {
    if (A.crab && A.crab.reveal) { A.crab.reveal(roll, { gift: !!gift }); return; }
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
      if (!rw.shown && A.crab && A.crab.reveal) { rw.shown = 1; setTimeout(() => A.crab.reveal(rw.chest, { golden: !!rw.golden, sealed: !!rw.sealed }), 450); }
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
      h('div', { class: 'row', style: { gap: '10px' } }, mascot('party', 56), h('div', null, h('h2', null, 'Today’s quests'), h('div', { class: 'muted small' }, 'Finish all three for +5 bonus pearls and a 🔑 key.'))));
    q.forEach((x) => box.append(h('div', { class: 'quest' + (x.claimed ? ' claimed' : x.done ? ' ready' : '') },
      h('span', { class: 'qi' }, x.claimed ? '✅' : x.done ? '🎁' : '⬜'),
      h('div', { style: { flex: 1 } }, h('b', null, x.en)),
      x.done && !x.claimed ? h('button', { class: 'btn mango', style: { minHeight: '40px', padding: '6px 12px' }, onclick: () => { const had = s.keys; const k = V.claimQuest(x.id); A.sfx.play('good'); sh.close(); refreshHud(); if (V.st().keys > had) { A.confetti(); A.notify({ ic: '🔑', t: 'You earned a key!', s: 'All three quests done. Use it on a sealed chest.', go: ['journey'] }); } else A.toast('+' + k + ' pearls'); questSheet(); } }, 'Claim +3') : h('span', { class: 'small muted' }, x.claimed ? 'claimed' : '+3 pearls'))));
    box.append(h('div', { class: 'small muted' }, 'New quests every day at midnight.'));
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
      root.append(h('div', { class: 'card chest' }, h('div', { html: V.chestSVG(true, true), class: 'chest-mini' }), h('div', { style: { flex: 1 } }, h('div', { class: 'chest-n' }, h('b', null, got), ' / ' + T.ITEMS.length), h('div', { class: 'small muted' }, 'Open chests on the sea to fill the book. The dark shapes are still waiting for you.'), h('div', { class: 'goal-bar', style: { marginTop: '6px' } }, h('i', { style: { width: (got / T.ITEMS.length) * 100 + '%' } })))));
      Object.entries(T.SETS).forEach(([k, set]) => {
        const items = T.ITEMS.filter((x) => x[4] === k).sort((a, b) => T.ORDER.indexOf(a[3]) - T.ORDER.indexOf(b[3]));
        const n = items.filter((x) => s.tre[x[0]]).length;
        root.append(h('div', { class: 'set-head' }, h('span', { class: 'set-ic' }, set.ic), h('div', { style: { flex: 1 } }, h('b', null, set.n), h('div', { class: 'small muted' }, n === items.length ? '👑 ' + set.gt : n >= items.length / 2 ? '🎖️ ' + set.title : 'Collect half for the title “' + set.title + '”')), h('span', { class: 'pill' + (n === items.length ? ' good' : '') }, n + '/' + items.length)));
        root.append(h('div', { class: 'tre-grid' }, items.map((it) => {
          const own = s.tre[it[0]];
          const where = it[3] === 'l' ? 'Only in golden or sealed chests' : it[3] === 'e' ? 'Best found in golden or sealed chests' : it[3] === 'r' ? 'Rare: sealed chests always hold rare or better' : 'Any chest on the sea';
          return h('button', { class: 'tre-cell r-' + it[3] + (own ? ' own' : '') + (focus === it[0] ? ' focus' : ''), 'data-id': it[0], style: { '--rc': RAR[it[3]].col }, onclick: () => own ? A.sheet(h('div', { class: 'stack', style: { alignItems: 'center' } }, treasureCard(it, false, true), h('div', { class: 'small muted' }, '× ' + own.n + ' · found ' + new Date(own.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })))) : A.toast('🔍 ' + RAR[it[3]].n + ' · ' + where, 3200) },
            own ? h('span', { class: 'te' }, it[1]) : sil(it[1]), h('span', { class: 'tn' }, own ? it[2] : '???'), own && own.n > 1 ? h('span', { class: 'tx' }, '×' + own.n) : null);
        })));
      });
    } else if (tab === 'shells') {
      const kinds = V.SHELLS.filter((x) => s.sh[x[0]]).length;
      root.append(h('div', { class: 'card chest' }, h('div', { html: V.shellSVG('conch', 64) }), h('div', null, h('div', { class: 'chest-n' }, h('b', null, kinds), ' / ' + V.SHELLS.length + ' kinds'), h('div', { class: 'small muted' }, V.shellCount(st) + ' shells in all. Pick them up on the sea.'))));
      root.append(h('div', { class: 'shell-grid' }, V.SHELLS.map((x) => {
        const n = s.sh[x[0]] || 0;
        return h('div', { class: 'shell-cell' + (n ? ' own' : '') + (focus === x[0] ? ' focus' : ''), style: { '--rc': RAR[x[3]].col } }, h('span', { class: n ? '' : 'sil', html: V.shellSVG(x[0], 54) }), h('b', null, n ? x[1] : '???'), h('span', { class: 'small muted' }, RAR[x[3]].n), n ? h('span', { class: 'tx' }, '×' + n) : null);
      })));
    } else if (tab === 'cards') {
      const pcs = V.postcards(st);
      root.append(h('div', { class: 'small muted' }, 'A painted postcard from each sea, collected as you sail · ' + pcs.filter((p) => p.on).length + ' / ' + pcs.length));
      root.append(h('div', { class: 'pc-grid' }, pcs.map((p) => h('button', { class: 'pc' + (p.on ? ' on' : ''), onclick: () => p.on ? A.sheet(h('div', { class: 'stack' }, h('div', { class: 'pc-big', html: SC.svg(p.id, 'art') }), h('b', null, p.alt), h('div', { class: 'small muted' }, V.SEAS[p.sea].en))) : A.toast('🔒 Sail further to get this postcard') },
        h('div', { class: 'pc-art', html: SC.svg(p.id, 'art') }), h('span', { class: 'pc-cap' }, p.on ? V.SEAS[p.sea].en : '🔒')))));
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
      if (!seen) return h('div', { class: 'boat-card mystery' }, h('div', { class: 'bc-pic sil', html: V.boatPic(b.id) }), h('div', { class: 'bc-tx' }, h('b', null, '??? Mystery boat'), h('div', { class: 'small muted' }, 'Sail to island ' + (b.isl + 1) + ' to see it. (' + (b.isl - cur) + ' more islands)')), h('span', { class: 'pill' }, '🔒'));
      return h('div', { class: 'boat-card' + (on ? ' on' : '') + (own ? ' own' : '') + (focus === b.id ? ' focus' : '') },
        h('div', { class: 'bc-pic', html: V.boatPic(b.id) }),
        h('div', { class: 'bc-tx' }, h('b', null, b.n), h('div', { class: 'small muted' }, b.d),
          own ? null : h('div', { class: 'small num price' }, V.coinEl(), ' ' + b.g.toLocaleString('en-US') + ' gold')),
        on ? h('span', { class: 'pill good' }, 'Sailing') : own ? h('button', { class: 'btn', onclick: () => { s.boat = b.id; A.saveSoon(); A.track('boat_select', { id: b.id }); A.go('treasure', 'shop'); } }, 'Sail it')
          : h('button', { class: 'btn ' + (can ? 'mango' : 'ghost'), disabled: can ? null : true, onclick: () => { if (!can) return; s.gold -= b.g; s.boats.push(b.id); s.boat = b.id; A.saveSoon(); A.track('boat_unlock', { id: b.id, g: b.g }); A.sfx.play('done'); A.confetti(); A.notify({ ic: '⛵', t: 'You bought the ' + b.n + '!', s: 'It is sailing on your map now.', go: ['journey'] }); A.go('treasure', 'shop:' + b.id); } }, can ? 'Buy' : 'Need ' + (b.g - s.gold).toLocaleString('en-US')));
    })));
    return box;
  }

  // ---------------------------------------------------------------- home: the voyage card
  V.homeCard = (st) => {
    const s = V.st(st), R = V.route(), cur = V.curIndex(st), isl = R.main[cur], sea = V.SEAS[isl.sea];
    const card = h('button', { class: 'card voyage-card', style: { '--s1': sea.col[0], '--s2': sea.col[1] }, onclick: () => A.go('journey') },
      h('div', { class: 'vc-sea' },
        h('div', { class: 'vc-isl', html: V.islandSVG(isl, {}) }),
        h('div', { class: 'vc-boat', html: V.boatPic(s.boat, false) }, h('span', { class: 'boat-tao', html: A.art.mascot('happy', 26) })),
        h('div', { class: 'waves-bg', 'aria-hidden': 'true' })),
      h('div', { class: 'vc-tx' },
        h('div', { class: 'small' }, h('span', { class: 'flagc sm', html: flag(sea.flag) }), ' ' + sea.en),
        h('b', null, isl.name), h('div', { class: 'small num' }, 'Island ' + (cur + 1) + ' of ' + R.main.length),
        h('span', { class: 'pill mango' }, '🗺️ Open the map')));
    return card;
  };
})();
