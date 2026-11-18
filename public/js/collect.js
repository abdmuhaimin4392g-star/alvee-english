/* collect.js — three new collections, each found in its own special way.
   🌌 Glow of the Deep: glowing creatures that only come up from the sea at night (7 pm – 5 am).
   🗺️ Lost Royal Treasures: earn 4 map pieces (Word Chests, Idiom Coves, cleared storms, chapter tests) to complete a
      treasure map; every finished map digs up one royal treasure.
   💎 Prism Gems: twelve coloured gems from the Prism Chest, opened with 5 rainbow pearls from the Storm Jar. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h, T = A && A.treasure, V = A && A.voyage;
  if (!A || !T || !V) return;

  const SETS = {
    glow: { n: 'Glow of the Deep', ic: '🌌', title: 'Night Diver', gt: 'Queen of the Midnight Sea' },
    royal: { n: 'Lost Royal Treasures', ic: '🗺️', title: 'Map Reader', gt: 'Finder of Kings' },
    prism: { n: 'Prism Gems', ic: '💎', title: 'Gem Hunter', gt: 'Keeper of the Rainbow' },
  };
  const ITEMS = [
    ['g01', '🪼', 'Moon Jelly', 'c', 'glow', 'A soft jellyfish that glows pale blue. It drifts up to the surface only when the moon is out.'],
    ['g02', '🦐', 'Firefly Shrimp', 'c', 'glow', 'When this tiny shrimp is scared, it puffs out a cloud of blue light and swims away.'],
    ['g03', '🫧', 'Sea Sparkles', 'c', 'glow', 'Tiny plankton that flash when the water moves. On some Maldives beaches the waves look full of stars.'],
    ['g04', '🐠', 'Neon Reef Fish', 'c', 'glow', 'Its stripes shine under the moon, so its friends can find it in the dark.'],
    ['g05', '🦑', 'Glowing Squid', 'u', 'glow', 'It makes its own light to hide its shadow from the fish below. A clever trick called counter-lighting.'],
    ['g06', '🐡', 'Lantern Pufferfish', 'u', 'glow', 'Round, slow and glowing gold. Sailors used to say it carries a lantern for lost boats.'],
    ['g07', '🦞', 'Starlit Lobster', 'u', 'glow', 'Its shell catches the starlight like tiny mirrors. It walks the sand only after midnight.'],
    ['g08', '🐙', 'Midnight Octopus', 'r', 'glow', 'Eight arms, three hearts and a purple glow. It changes colour faster than you can blink.'],
    ['g09', '🌊', 'Bioluminescent Wave', 'r', 'glow', 'A wave that breaks in bright blue light. You can only keep it if you are awake to see it.'],
    ['g10', '🦈', 'Ghost Shark', 'r', 'glow', 'A pale, gentle shark from the deep sea, rarely seen by anyone. Its eyes shine green.'],
    ['g11', '🐋', 'Singing Whale', 'e', 'glow', 'Its song travels hundreds of kilometres under the sea. At night, its skin shines with sea sparkles.'],
    ['g12', '🌟', 'Heart of the Night Sea', 'l', 'glow', 'A star that fell into the ocean long ago and never stopped shining.'],
    ['k01', '🪙', 'Royal Gold Doubloon', 'u', 'royal', 'A heavy gold coin stamped with a crown. Found under sand where the map said X.'],
    ['k02', '📜', 'Sultan’s Decree', 'u', 'royal', 'An old royal letter, sealed with red wax. Its last line says: "Be kind to every traveller."'],
    ['k03', '🏺', 'Ancient Amphora', 'r', 'royal', 'A clay jar from a sunken trading ship. It once carried oil and spices across the Indian Ocean.'],
    ['k04', '🗝️', 'Key of the Vault', 'r', 'royal', 'It opens a door that nobody has found yet. Maybe the next map will show where.'],
    ['k05', '🛡️', 'Island King’s Shield', 'r', 'royal', 'Painted with waves and a crescent moon. It protected a king who never lost a battle.'],
    ['k06', '🧭', 'Admiral’s Compass', 'e', 'royal', 'Its needle points not north, but towards home.'],
    ['k07', '💍', 'Sapphire Ring', 'e', 'royal', 'A blue stone as deep as the lagoon, set in old gold. Given as a promise long ago.'],
    ['k08', '💰', 'Pirate King’s Purse', 'e', 'royal', 'Still full of silver after three hundred years under the sea.'],
    ['k09', '🔱', 'Sea King’s Trident', 'l', 'royal', 'The legend says whoever holds it can calm any storm.'],
    ['k10', '👑', 'Crown of the Atoll Kings', 'l', 'royal', 'Gold, coral and pearls. The greatest treasure on any map, and now it is yours.'],
    ['p01', '💎', 'Ruby', 'c', 'prism', 'Deep red, the stone of courage. Rubies are among the hardest gems on Earth.'],
    ['p02', '💎', 'Emerald', 'c', 'prism', 'Green like the jungle after rain. Cleopatra loved emeralds.'],
    ['p03', '💎', 'Sapphire', 'c', 'prism', 'Blue like the Maldives sea. Sapphires can also be pink, yellow and green.'],
    ['p04', '💎', 'Amethyst', 'c', 'prism', 'A purple stone that people once believed kept the mind clear.'],
    ['p05', '💎', 'Topaz', 'u', 'prism', 'Golden orange, warm like the evening sun.'],
    ['p06', '💎', 'Aquamarine', 'u', 'prism', 'Its name means “sea water”. Sailors carried it for a safe journey.'],
    ['p07', '💎', 'Rose Quartz', 'u', 'prism', 'A soft pink heart-shaped stone, the stone of gentle love.'],
    ['p08', '💎', 'Opal', 'r', 'prism', 'It shows every colour of the rainbow when it moves, like a storm turning into sunshine.'],
    ['p09', '💎', 'Black Onyx', 'r', 'prism', 'Dark and strong. A stone for staying calm and focused.'],
    ['p10', '💎', 'Citrine', 'r', 'prism', 'Bright yellow, known as the merchant’s stone. It is said to bring success.'],
    ['p11', '💎', 'Peridot', 'e', 'prism', 'Lime green, born deep inside volcanoes and even found in meteorites from space.'],
    ['p12', '💎', 'Moonstone', 'l', 'prism', 'A milky stone with a blue light that moves inside it, like the moon on water.'],
  ];
  // add them to the treasure book (once)
  Object.assign(T.SETS, SETS);
  ITEMS.forEach((x) => { if (!T.byId[x[0]]) { T.ITEMS.push(x); T.byId[x[0]] = x; } });
  T.IMG = T.IMG || {};
  ITEMS.forEach((x) => { if (x[4] === 'glow') T.IMG[x[0]] = 'img/glow/' + x[0] + '.webp'; if (x[4] === 'prism') T.IMG[x[0]] = 'img/gems/' + x[0] + '.webp'; });

  // the picture for any treasure
  V.itemPicHTML = (it) => (T.IMG[it[0]] ? '<img class="emo-img tre-img" src="' + T.IMG[it[0]] + '" alt="" draggable="false" loading="lazy" decoding="async">' : A.emoHTML(it[1]));
  V.itemPic = (it) => h('span', { class: 'tre-pic', html: V.itemPicHTML(it) });

  const night = () => { const hr = new Date().getHours(); return hr >= 19 || hr < 5; };
  V.isNight = night;
  // which treasures can drop: royal only from maps, gems only from the Prism Chest, glow only at night
  V.canDrop = (x, kind) => {
    if (kind === 'map') return x[4] === 'royal';
    if (kind === 'prism') return x[4] === 'prism';
    if (x[4] === 'royal' || x[4] === 'prism') return false;
    if (x[4] === 'glow') return night();
    return true;
  };

  // ---- treasure map pieces
  const ms = (st) => { const s = V.st(st); return s.tmap || (s.tmap = { f: 0, n: 0, log: [] }); };
  A.collect = {
    night,
    fragment(st, why) {
      const m = ms(st || A.state);
      m.f = (m.f || 0) + 1; m.log.unshift({ why, t: Date.now() }); m.log = m.log.slice(0, 12);
      A.track('map_piece', { why, f: m.f });
      if (m.f >= 4) {
        m.f = 0; m.n = (m.n || 0) + 1;
        const roll = V.rollTreasure('map');
        A.saveSoon();
        setTimeout(() => {
          A.toast('🗺️ Treasure map complete! You dug up a royal treasure!', 3200);
          try { if (A.map3d && A.map3d.reveal) A.map3d.reveal(roll, { golden: true }); else if (V.showReveal) V.showReveal(roll); } catch (e) { /* still saved */ }
        }, 900);
        return 'map';
      }
      A.saveSoon();
      setTimeout(() => A.toast('🧩 Map piece ' + m.f + ' of 4 · ' + why, 2600), 700);
      return m.f;
    },
    rainbow(st) { const S = A.storm && A.storm.box(st); if (!S) return 0; return Math.max(0, (S.calm || 0) - (S.rbSpent || 0)); },
    openPrism(st) {
      const S = A.storm.box(st); if (A.collect.rainbow(st) < 5) return null;
      S.rbSpent = (S.rbSpent || 0) + 5;
      const roll = V.rollTreasure('prism'); A.saveSoon(); A.track('prism_chest', { id: roll.item[0] });
      try { if (A.map3d && A.map3d.reveal) A.map3d.reveal(roll, { golden: true }); else if (V.showReveal) V.showReveal(roll); } catch (e) { /* saved */ }
      return roll;
    },
    // the "ways to find treasure" panel at the top of the treasure book
    panel(st) {
      const m = ms(st), rb = A.collect.rainbow(st), nt = night();
      const piece = (i) => h('i', { class: 'mp' + (i < m.f ? ' on' : '') });
      return h('div', { class: 'hunt' },
        h('div', { class: 'hunt-card map' }, h('div', { class: 'hc-top' }, h('span', { class: 'hc-ic', html: A.emoHTML('🗺️') }), h('b', null, 'Treasure Map')),
          h('div', { class: 'map-pieces' }, piece(0), piece(1), piece(2), piece(3)),
          h('small', null, m.f + ' / 4 pieces · ' + (m.n || 0) + ' map' + (m.n === 1 ? '' : 's') + ' found'),
          h('small', { class: 'hc-how' }, 'Pieces: Word Chests, Idiom Coves, cleared storms, chapter tests')),
        h('div', { class: 'hunt-card night' + (nt ? ' on' : '') }, h('div', { class: 'hc-top' }, h('span', { class: 'hc-ic' }, nt ? '🌙' : '☀️'), h('b', null, 'Night Dive')),
          h('small', null, nt ? '✨ The glowing creatures are awake now! Open chests tonight.' : 'Glowing creatures come up between 7 pm and 5 am.'),
          h('small', { class: 'hc-how' }, 'Chests opened at night can hold Glow of the Deep treasures')),
        h('div', { class: 'hunt-card prism' }, h('div', { class: 'hc-top' }, h('span', { class: 'hc-ic', html: A.emoHTML('🌈') }), h('b', null, 'Prism Chest')),
          h('small', null, rb + ' rainbow pearl' + (rb === 1 ? '' : 's') + ' · 5 opens a chest'),
          h('button', { class: 'btn ' + (rb >= 5 ? 'mango' : 'ghost') + ' sm', disabled: rb >= 5 ? null : true, onclick: () => { if (A.collect.openPrism(st)) setTimeout(() => A.go('treasure', 'book'), 400); } }, rb >= 5 ? '💎 Open (5 🌈)' : 'Clear storms to earn 🌈')));
    },
  };
})();
