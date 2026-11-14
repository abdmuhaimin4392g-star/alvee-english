/* voyage.js — Alvee's voyage from Thailand to the Maldives.
   Every lesson, conversation and test is an island. Her boat sails to the next island when she finishes one.
   On the way: shells, pearls, chests (opened with a small English task), bottles, side islands and daily quests.
   No money and no trading: pearls unlock boats, chests fill the treasure book. */
(function () {
  'use strict';
  const A = window.AE, C = A.C, h = A.h;
  const T = A.treasure, SC = A.scenes;
  const V = (A.voyage = {});

  // ---------------------------------------------------------------- the eight seas (3 units each)
  V.SEAS = [
    { id: 'cp', en: 'The Golden River', th: 'แม่น้ำสายทอง', from: 1, to: 3, ter: 'river', col: ['#4FA59C', '#2B6E6A'], art: ['th1', 'th2', 'th10'], flag: 'th',
      names: ['Sunrise Pier', 'Lotus Landing', 'Golden Steps', 'Temple Bend', 'Lantern Dock', 'Flower Market Quay', 'Night Market Wharf', 'Bamboo Bridge', 'Kingfisher Bend', 'Mango Grove', 'Rice Barge Rest', 'Teak House Pier', 'Floating Market', 'Orchid Garden', 'Silk Weaver Landing', 'Paper Kite Point', 'Elephant Rock', 'Willow Creek', 'Firefly Bend', 'River Mouth', 'Lily Pad Pond', 'Boat Noodle Dock'] },
    { id: 'gulf', en: 'Gulf of Thailand', th: 'อ่าวไทย', from: 4, to: 6, ter: 'jungle', col: ['#38B6C4', '#16707F'], art: ['th6', 'th5', 'th9'], flag: 'th',
      names: ['Coconut Cove', 'Seashell Beach', 'Parrot Point', 'Sandy Bay', 'Pineapple Isle', 'Starfish Shoal', 'Jade Lagoon', 'Pearl Diver Rock', 'Sunset Point', 'Hammock Island', 'Turtle Bay', 'Crystal Cove', 'Coral Garden', 'Sea Breeze Cay', 'Lighthouse Hill', 'Mangrove Maze', 'Butterfly Isle', 'Fisherman’s Rest', 'Rainbow Reef', 'Moonlight Bay', 'Palm Tree Point', 'Kite Beach'] },
    { id: 'mal', en: 'Strait of Malacca', th: 'ช่องแคบมะละกา', from: 7, to: 9, ter: 'jungle', col: ['#2E9FB2', '#145F74'], art: ['th3', 'th4'], flag: 'th',
      names: ['Spice Harbour', 'Monsoon Gate', 'Merchant’s Wharf', 'Old Fort Point', 'Clocktower Quay', 'Copper Bell Isle', 'Cinnamon Cove', 'Sailmaker’s Rest', 'Anchor Rock', 'Lantern Strait', 'Silver Fish Bay', 'Tea Clipper Point', 'Compass Rose Isle', 'Hidden Harbour', 'Captain’s Table', 'Ginger Island', 'Nutmeg Cay', 'Windmill Point', 'Rope Walk', 'Harbour Light', 'Seagull Rock', 'Pirate’s Rest'] },
    { id: 'and', en: 'Andaman Sea', th: 'ทะเลอันดามัน', from: 10, to: 12, ter: 'karst', col: ['#20B7B0', '#0B6E7A'], art: ['th7', 'th8'], flag: 'th',
      names: ['Emerald Cliffs', 'Limestone Towers', 'Monkey Island', 'Cave Lagoon', 'Sea Eagle Rock', 'Jungle Falls', 'Hornbill Ridge', 'Secret Beach', 'Blue Grotto', 'Dragon’s Back', 'Whale Shark Point', 'Manta Bay', 'Coral Castle', 'Sea Nomad Village', 'Granite Arch', 'Turquoise Pool', 'Banyan Isle', 'Thunder Rock', 'Andaman Gate', 'Twin Peaks', 'Kayak Cove', 'Seahorse Reef'] },
    { id: 'bob', en: 'Bay of Bengal', th: 'อ่าวเบงกอล', from: 13, to: 15, ter: 'open', col: ['#2C7FB8', '#123E73'], art: ['mv4', 'mv6'], flag: 'th',
      names: ['Open Water', 'Dolphin Drift', 'Flying Fish Reach', 'Whale Road', 'Albatross Rest', 'Star Compass Rock', 'Moonwater', 'Turtle Current', 'Lantern Shoal', 'Blue Hole', 'Sailor’s Rest', 'Storm Petrel Isle', 'Wave Rider', 'Driftwood Cay', 'Northern Star', 'Deep Blue', 'Calm Water', 'Trade Wind Isle', 'Cloud Harbour', 'Horizon Point', 'Morning Mist', 'Rainbow Shoal'] },
    { id: 'sl', en: 'Sri Lanka Coast', th: 'ชายฝั่งศรีลังกา', from: 16, to: 18, ter: 'jungle', col: ['#2EA59A', '#0E6460'], art: ['mv7', 'mv10'], flag: 'th',
      names: ['Tea Hills Bay', 'Spice Garden', 'Elephant Beach', 'Peacock Point', 'Cinnamon Cliffs', 'Stilt Fisher Bay', 'Leopard Rock', 'Gem Market', 'Lighthouse of Hope', 'Whale Watch Point', 'Surfer’s Bay', 'Coconut Hill', 'Lotus Pond', 'Sea Fort', 'Golden Sands', 'Rock Temple Cove', 'Cricket Green', 'Monsoon Bay', 'Mango Cliff', 'Sapphire Point', 'Kite Hill', 'Lagoon Gate'] },
    { id: 'nm', en: 'Northern Atolls', th: 'อะทอลล์ตอนเหนือ (มัลดีฟส์)', from: 19, to: 21, ter: 'atoll', col: ['#2FD0C6', '#0F8792'], art: ['mv3', 'mv5', 'mv9'], flag: 'mv',
      names: ['Coral Gate', 'Lagoon Light', 'White Sand Isle', 'Manta Point', 'Reef Garden', 'Hammock Cay', 'Turtle Nest Island', 'Palm Shadow', 'Glass Water', 'Fish Market Isle', 'Shark Fin Reef', 'Pearl Lagoon', 'Sea Star Sandbank', 'Sun Deck Island', 'Dhoni Harbour', 'Seaplane Bay', 'Coconut Crab Isle', 'Lagoon Swing', 'Starlight Beach', 'Glowing Bay', 'Driftwood Isle', 'Sandbar Picnic'] },
    { id: 'south', en: 'Malé to Addu', th: 'จากมาเลถึงอัดดู', from: 22, to: 24, ter: 'atoll', col: ['#3DDCCB', '#0C97A0'], art: ['mv1', 'mv2', 'mv8'], flag: 'mv',
      names: ['Capital Harbour', 'Airport Island', 'Blue Mosque Point', 'Sunset Jetty', 'Surf Point', 'Garden Island', 'Fish Market Pier', 'Wedding Beach', 'Equator Line', 'Coral Stone Mosque', 'Mangrove Lake', 'Seven Wonders Reef', 'Kite Lagoon', 'Banana Reef', 'Swing Beach', 'Runway Island', 'Link Road', 'Freshwater Lake', 'Turtle Sands', 'Last Lighthouse', 'Almost Home', 'Harbour of Dreams'] },
  ];
  V.seaOfUnit = (u) => V.SEAS.find((s) => u >= s.from && u <= s.to) || V.SEAS[V.SEAS.length - 1];

  // ---------------------------------------------------------------- shells (a collection of 16 kinds)
  // [id, English, Thai, rarity, shape, main colour, second colour]
  V.SHELLS = [
    ['cowrie', 'Cowrie', 'หอยเบี้ย', 'c', 'cowrie', '#F2D6A2', '#B07A3A'],
    ['scallop', 'Scallop', 'หอยพัด', 'c', 'scallop', '#F6A07B', '#C8563A'],
    ['clam', 'Clam', 'หอยลาย', 'c', 'clam', '#E9E1CF', '#9C8A6A'],
    ['auger', 'Auger', 'หอยเจดีย์', 'c', 'auger', '#E8C9A0', '#8C5A2B'],
    ['turban', 'Turban', 'หอยนมสาว', 'c', 'turban', '#9FD2B8', '#3E7F64'],
    ['cone', 'Cone', 'หอยเต้าปูน', 'u', 'cone', '#F7E6B8', '#B5651D'],
    ['moon', 'Moon Snail', 'หอยพระจันทร์', 'u', 'turban', '#DCD6F2', '#7D73B8'],
    ['tiger', 'Tiger Cowrie', 'หอยเบี้ยลายเสือ', 'u', 'cowrie', '#F4C77C', '#5A3A1E'],
    ['sanddollar', 'Sand Dollar', 'เหรียญทะเล', 'u', 'dollar', '#F1E7D0', '#BBA57E'],
    ['conch', 'Queen Conch', 'หอยสังข์', 'r', 'conch', '#FFC1A8', '#E0607A'],
    ['murex', 'Murex', 'หอยหนาม', 'r', 'murex', '#EFE3CF', '#8E6B4A'],
    ['spider', 'Spider Conch', 'หอยแมงมุม', 'r', 'murex', '#F7D9B0', '#C96A3A'],
    ['abalone', 'Abalone', 'หอยเป๋าฮื้อ', 'e', 'abalone', '#8FD3E8', '#B184E0'],
    ['giantclam', 'Giant Clam', 'หอยมือเสือ', 'e', 'clam', '#7EE0C6', '#3B6FD8'],
    ['nautilus', 'Nautilus', 'หอยงวงช้าง', 'e', 'nautilus', '#FFF3DE', '#C2622E'],
    ['goldcowrie', 'Golden Cowrie', 'หอยเบี้ยทองคำ', 'l', 'cowrie', '#FFE17A', '#C58A00'],
  ];
  V.shell = (id) => V.SHELLS.find((s) => s[0] === id);
  const SHAPE = {
    cowrie: (a, b) => `<ellipse cx="30" cy="30" rx="20" ry="25" fill="${a}"/><ellipse cx="30" cy="24" rx="15" ry="16" fill="#fff" opacity=".25"/><path d="M30 8v44" stroke="${b}" stroke-width="3"/><path d="M27 14h-4M27 20h-5M27 26h-5M27 32h-5M27 38h-5M27 44h-4M33 14h4M33 20h5M33 26h5M33 32h5M33 38h5M33 44h4" stroke="${b}" stroke-width="1.6"/>`,
    scallop: (a, b) => `<path d="M30 52L8 24Q30 0 52 24Z" fill="${a}"/><path d="M30 52L12 22M30 52L19 15M30 52L25 11M30 52V10M30 52L35 11M30 52L41 15M30 52L48 22" stroke="${b}" stroke-width="1.8"/><path d="M22 52h16l-3 5h-10z" fill="${b}"/>`,
    clam: (a, b) => `<path d="M8 32Q8 8 30 8T52 32Q52 50 30 52Q8 50 8 32Z" fill="${a}"/><path d="M14 32Q14 14 30 14T46 32M19 33Q19 20 30 20T41 33M24 34Q24 26 30 26T36 34" stroke="${b}" stroke-width="1.6" fill="none"/>`,
    auger: (a, b) => `<path d="M30 4L42 54H18Z" fill="${a}"/><path d="M22 46L38 42M23 38L37 34M25 30L35 27M26 22L34 20M28 15L33 13" stroke="${b}" stroke-width="2"/>`,
    turban: (a, b) => `<path d="M10 40Q10 14 32 12Q52 14 50 36Q48 52 28 52Q10 52 10 40Z" fill="${a}"/><path d="M18 40Q18 22 32 22Q42 24 41 34Q40 42 30 42Q24 42 24 36" stroke="${b}" stroke-width="2.4" fill="none"/>`,
    cone: (a, b) => `<path d="M14 10H46L30 56Z" fill="${a}"/><g fill="${b}"><path d="M18 14h6l-2 5h-5zM28 14h6l-2 5h-5zM38 14h5l-2 5h-4zM21 24h6l-2 5h-5zM32 24h6l-2 5h-5zM25 35h5l-2 5h-4zM32 35h4l-1 4h-4zM28 45h4l-2 4h-3z"/></g>`,
    dollar: (a, b) => `<circle cx="30" cy="30" r="24" fill="${a}"/><g fill="none" stroke="${b}" stroke-width="2"><path d="M30 14Q34 22 30 28Q26 22 30 14Z"/><path d="M45 25Q37 28 32 31Q38 22 45 25Z"/><path d="M15 25Q23 28 28 31Q22 22 15 25Z"/><path d="M40 44Q34 38 32 33Q41 37 40 44Z"/><path d="M20 44Q26 38 28 33Q19 37 20 44Z"/></g>`,
    conch: (a, b) => `<path d="M14 18Q30 2 48 14L56 34Q44 56 22 52Q8 46 14 18Z" fill="${a}"/><path d="M48 14L56 34Q46 40 36 34Q42 24 48 14Z" fill="${b}" opacity=".8"/><path d="M16 22l-6-6M22 14l-3-8M30 10l1-8M40 10l5-6" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`,
    murex: (a, b) => `<path d="M30 6L42 30L34 56H26L18 30Z" fill="${a}"/><path d="M18 30L6 24M19 38L8 40M42 30L54 24M41 38L52 40M22 20L12 14M38 20L48 14M26 48L18 54M34 48L42 54" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`,
    abalone: (a, b) => `<defs><linearGradient id="abg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="#F5D0F0"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><path d="M8 30Q8 8 34 8Q54 10 52 32Q50 52 26 52Q8 50 8 30Z" fill="url(#abg)"/><g fill="#fff" opacity=".7"><circle cx="18" cy="20" r="2.2"/><circle cx="25" cy="15" r="2.2"/><circle cx="33" cy="13" r="2.2"/><circle cx="41" cy="14" r="2.2"/></g>`,
    nautilus: (a, b) => `<circle cx="30" cy="30" r="24" fill="${a}"/><path d="M30 6Q54 8 54 30M30 54Q8 52 8 30M14 14Q22 24 22 34M44 46Q38 38 34 28M42 10Q40 20 36 26" stroke="${b}" stroke-width="3" fill="none"/><path d="M30 30m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" fill="${b}" opacity=".5"/>`,
  };
  V.shellSVG = (id, size) => { const s = V.shell(id) || V.SHELLS[0]; return `<svg class="shell-svg" viewBox="0 0 60 60" width="${size || 40}" height="${size || 40}" aria-hidden="true">${SHAPE[s[4]](s[5], s[6])}<ellipse cx="22" cy="18" rx="6" ry="3" fill="#fff" opacity=".35"/></svg>`; };

  // ---------------------------------------------------------------- boats (all the Op Crab boats, unlocked with pearls)
  V.BOATS = [
    { id: 'sloop', n: 'Little Sloop', th: 'เรือใบลำน้อย', g: 0, isl: 0, w: 60, d: 'A small wooden sailing boat flying the Thai flag. Every great voyage starts with one.' },
    { id: 'hb', n: 'Harbour Houseboat', th: 'เรือบ้าน', g: 300, isl: 1, w: 58, d: 'A cosy floating home with glowing windows. Slow, snug and surprisingly sturdy.' },
    { id: 'toy', n: 'Toy Corsair', th: 'เรือโจรสลัดของเล่น', g: 700, isl: 3, w: 58, d: 'A cheerful toy pirate ship with a striped sail and a very yellow bowsprit.' },
    { id: 'gal', n: 'Striped-Sail Galleon', th: 'เรือใบลายทาง', g: 1400, isl: 5, w: 56, d: 'A proper wooden galleon with candy-striped sails and a carved figurehead.' },
    { id: 'ym', n: 'Modern Motor Yacht', th: 'เรือยอชต์', g: 2400, isl: 8, w: 70, d: 'Sleek white hull, tinted glass and a flybridge.' },
    { id: 'sy', n: 'Grand Superyacht', th: 'ซูเปอร์ยอชต์', g: 3600, isl: 11, w: 84, d: 'Four decks, a sundeck with a pool and a swim platform.' },
    { id: 'nv', n: 'Expedition Voyager', th: 'เรือสำรวจ', g: 5200, isl: 14, w: 88, d: 'A navy-blue expedition yacht with a helipad on the bow. It goes where the charts end.' },
    { id: 'sap', n: 'Sapphire Terrace', th: 'เรือแซฟไฟร์', g: 7000, isl: 17, w: 94, d: 'A towering sapphire megayacht with five white terraces and a stern pool.' },
    { id: 'lev', n: 'Leviathan Liner', th: 'เรือสำราญยักษ์', g: 9000, isl: 20, w: 104, d: 'A floating city: eight decks, a rooftop water park and slides that spiral into the sky.' },
  ];
  V.boat = (id) => V.BOATS.find((b) => b.id === id) || V.BOATS[0];
  V.boatPic = (id, flip, cls) => {
    const b = V.boat(id);
    if (b.id === 'sloop') return `<span class="boat-pic ${cls || ''}" style="--bw:${b.w}px">${T.sloop(flip)}</span>`;
    return `<img class="boat-pic ${cls || ''}" src="img/boats/${b.id}.webp" alt="" draggable="false" style="--bw:${b.w}px${flip ? ';transform:scaleX(-1)' : ''}">`;
  };

  // ---------------------------------------------------------------- state
  V.st = (st) => {
    st = st || A.state;
    const s = st.sea || (st.sea = {});
    s.p = s.p || 0; s.pt = s.pt || 0; s.sh = s.sh || {}; s.tre = s.tre || {}; s.got = s.got || {};
    s.boats = s.boats || ['sloop']; s.rp = s.rp || { p: 0, b: 0, g: 0 }; s.gold = s.gold || 0; s.goldT = s.goldT || 0; s.keys = s.keys || 0; if (s.hull == null) s.hull = 100; s.logs = s.logs || 0; s.kr = s.kr || { won: 0, lost: 0, sunk: 0, last: 0, day: '', n: 0 }; s.boat = s.boat || 'sloop'; s.side = s.side || {}; s.q = s.q || {}; s.pc = s.pc || {};
    if (s.at == null) s.at = -1;
    return s;
  };
  V.ctl = () => A.ctl || {};
  const mult = () => { const m = V.ctl().mult; return m && m.until > Date.now() ? m : null; };
  V.addPearls = (n, st) => { const s = V.st(st); const m = mult(); const k = Math.round(n * (m && m.p ? m.p : 1)); s.p += k; s.pt += k; return k; };
  // ---------------------------------------------------------------- pearls and gold
  // White pearls are the everyday ones. Oysters sometimes hold a pink, black or (very rarely) golden pearl.
  // Pearls sell for gold at the pearl market; the price moves a little every day, so some days are better than others.
  V.PEARLS = [['w', 'White pearl', 8, '#F4F1EA'], ['p', 'Pink pearl', 30, '#FFB3C8'], ['b', 'Black pearl', 90, '#3B3F4A'], ['g', 'Golden pearl', 300, '#FFCF4A']];
  V.pearlN = (k, st) => { const s = V.st(st); return k === 'w' ? s.p : s.rp[k] || 0; };
  V.pearlTotal = (st) => { const s = V.st(st); return s.p + s.rp.p + s.rp.b + s.rp.g; };
  V.market = (day) => { const r = seeded(hashStr('mk' + (day || A.dkey()))); r(); return 0.75 + r() * 0.6; };
  V.price = (k, day) => { const P = V.PEARLS.find((x) => x[0] === k); return Math.max(1, Math.round(P[2] * V.market(day))); };
  V.yesterday = () => { const d = new Date(Date.now() - 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  V.sell = (k, n) => {
    const s = V.st(); n = Math.min(n, V.pearlN(k)); if (n <= 0) return 0;
    if (k === 'w') s.p -= n; else s.rp[k] -= n;
    const g = n * V.price(k); s.gold += g; s.goldT += g; s.sold = (s.sold || 0) + n;
    A.track('sell', { k: V.PEARLS.find((x) => x[0] === k)[1].split(' ')[0].toLowerCase(), n, gold: g }); A.saveSoon(); return g;
  };
  V.addGold = (n) => { const s = V.st(); s.gold += n; s.goldT += n; return n; };
  // an oyster: what is inside?
  V.oyster = () => { const x = Math.random(); const k = x < 0.62 ? 'w' : x < 0.87 ? 'p' : x < 0.97 ? 'b' : 'g'; const s = V.st(); if (k === 'w') V.addPearls(1); else s.rp[k] += 1; return k; };
  V.shellCount = (st) => Object.values(V.st(st).sh).reduce((a, b) => a + b, 0);
  V.treCount = (st) => Object.keys(V.st(st).tre).filter((k) => T.byId[k]).length;

  // daily quest counters
  const QDEF = [
    ['les1', 'Finish 1 lesson', 'จบ 1 เกาะ', (d) => (d.les || 0) >= 1],
    ['les2', 'Finish 2 lessons', 'จบ 2 เกาะ', (d) => (d.les || 0) >= 2],
    ['les3', 'Finish 3 lessons', 'จบ 3 เกาะ', (d) => (d.les || 0) >= 3],
    ['shell5', 'Pick up 5 shells', 'เก็บเปลือกหอย 5 ชิ้น', (d) => (d.shells || 0) >= 5],
    ['pearl3', 'Find 3 pearls on the sea', 'เก็บไข่มุกในทะเล 3 เม็ด', (d) => (d.pearls || 0) >= 3],
    ['chest1', 'Open a treasure chest', 'เปิดหีบสมบัติ 1 ใบ', (d) => (d.chest || 0) >= 1],
    ['ans25', 'Answer 25 questions', 'ตอบคำถาม 25 ข้อ', (d) => (d.ans || 0) >= 25],
    ['ans50', 'Answer 50 questions', 'ตอบคำถาม 50 ข้อ', (d) => (d.ans || 0) >= 50],
    ['focus', 'Practise your weak spot', 'ฝึกจุดอ่อน 1 ครั้ง', (d) => (d.focus || 0) >= 1],
    ['talk', 'Finish a conversation', 'ฝึกบทสนทนาจบ 1 เรื่อง', (d) => (d.talk || 0) >= 1],
    ['perfect', 'Get 100% in a lesson', 'ได้ 100% ใน 1 เกาะ', (d) => (d.perfect || 0) >= 1],
    ['review', 'Do one review', 'ทบทวน 1 ครั้ง', (d) => (d.review || 0) >= 1],
  ];
  const seeded = (seed) => { let a = seed * 7919 + 13; return () => ((a = (a * 16807) % 2147483647) / 2147483647); };
  const hashStr = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x) + 1; };
  V.qday = (st) => { const s = V.st(st); const k = A.dkey(); if (!s.q[k]) { s.q = { [k]: { claimed: {} } }; } return s.q[k]; };
  V.count = (key, n) => { if (V.ctl().questOff) return; const d = V.qday(); d[key] = (d[key] || 0) + (n || 1); };
  V.quests = () => {
    const r = seeded(hashStr(A.dkey()));
    const pool = QDEF.slice(), out = [];
    const fam = (id) => id.replace(/\d+$/, '');
    while (out.length < 3 && pool.length) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0]; if (!out.some((x) => fam(x[0]) === fam(q[0]))) out.push(q); }
    const d = V.qday();
    return out.map(([id, en, th, test]) => ({ id, en, th, done: test(d), claimed: !!d.claimed[id] }));
  };
  V.claimQuest = (id) => {
    const d = V.qday(); if (d.claimed[id]) return 0;
    const q = V.quests().find((x) => x.id === id); if (!q || !q.done) return 0;
    d.claimed[id] = Date.now();
    let got = V.addPearls(3);
    if (V.quests().every((x) => x.claimed)) { got += V.addPearls(5); V.st().keys += 1; d.key = 1; }
    A.track('quest_claim', { id, got });
    A.saveSoon();
    return got;
  };

  // ---------------------------------------------------------------- the route: one island per chapter (unit); each island holds its lessons,
  // the conversation and the timed test. Plus a side island after every third chapter.
  let ROUTE = null;
  V.resetRoute = () => { ROUTE = null; };
  V.route = () => {
    if (ROUTE) return ROUTE;
    const main = [], all = [];
    V.SEAS.forEach((sea, si) => {
      for (let u = sea.from; u <= sea.to; u++) {
        const nodes = A.nodes.filter((n) => n.u === u);
        if (!nodes.length) continue;
        const k = u - sea.from, unit = A.unit(u);
        const isl = { kind: 'chap', u, nodes, node: nodes[nodes.length - 1], sea: si, k, name: sea.names[(k * 7) % sea.names.length], title: unit ? unit.en : '', gi: main.length };
        main.push(isl); all.push(isl);
        if (main.length % 3 === 2) {
          const sid = 'side:' + sea.id + ':' + k;
          const MISS = ['speed', 'listen', 'talk', 'words', 'build'];
          all.push({ kind: 'side', id: sid, sea: si, k, anchor: isl, mission: MISS[(main.length) % MISS.length], name: ['Hidden Cove', 'Secret Lagoon', 'Pirate Rock', 'Mermaid Bay', 'Lost Lighthouse', 'Firefly Isle', 'Treasure Key', 'Coconut Cay'][Math.floor(main.length / 3) % 8] });
        }
      }
    });
    if (main.length) { const last = main[main.length - 1]; last.name = 'Home: Addu Atoll'; last.final = 1; }
    ROUTE = { main, all };
    return ROUTE;
  };
  // a chapter: how many of its lessons are done, and which one is next
  V.chap = (st, isl) => { st = st || A.state; const done = isl.nodes.filter((n) => st.done[n.id]).length; return { done, total: isl.nodes.length, all: done === isl.nodes.length, next: isl.nodes.find((n) => !st.done[n.id]) || null }; };
  // where the boat is heading: the first chapter not finished yet
  V.curIndex = (st) => { st = st || A.state; const r = V.route().main; const i = r.findIndex((x) => !x.nodes.every((n) => st.done[n.id])); return i < 0 ? r.length - 1 : i; };
  // the boat: between the last finished island and the next one, closer with every lesson
  V.boatP = (st) => { st = st || A.state; const R = V.route().main, cur = V.curIndex(st), c = V.chap(st, R[cur]); return c.all ? cur : cur - 1 + (c.done / c.total) * 0.85; };
  V.chapOf = (n) => V.route().main.find((x) => x.nodes.includes(n));
  // a long voyage: a few new lessons a day (set on your dashboard), and stars to cross into each new sea
  V.dayLimit = () => (A.user && A.user.cfg && +A.user.cfg.newLimit) || 0;
  V.newToday = (st) => ((st || A.state).days[A.dkey()] || {}).les || 0;
  V.capped = (st) => V.dayLimit() > 0 && V.newToday(st) >= V.dayLimit();
  V.gate = (st, isl) => {
    if (!isl || isl.kind !== 'chap' || isl.k !== 0 || isl.sea === 0) return null;
    const ls = V.route().main.filter((x) => x.sea === isl.sea - 1).flatMap((x) => x.nodes.filter((n) => n.kind === 'lesson'));
    const need = Math.ceil(ls.length * 2.5), have = ls.reduce((a, n) => a + (((st || A.state).done[n.id] || {}).s || 0), 0);
    return { need, have, ok: have >= need || !!(A.user && A.user.cfg && A.user.cfg.unlockAll), sea: V.SEAS[isl.sea - 1] };
  };
  V.lockWhy = (st, n) => {
    if (!A.isOpen(st, A.nodes.indexOf(n), A.user && A.user.cfg)) return 'order';
    if (st.done[n.id]) return null;
    const ch = V.chapOf(n);
    if (ch && ch.nodes[0] === n) { const g = V.gate(st, ch); if (g && !g.ok) return 'gate'; }
    if (n.kind === 'lesson' && !n.boost && V.capped(st)) return 'today';
    return null;
  };
  V.nodeOpen = (st, n) => !V.lockWhy(st, n);
  V.islandOpen = (st, isl) => {
    if (isl.kind === 'side') return V.chap(st, isl.anchor).all && !V.ctl().sideOff;
    const w = V.lockWhy(st, isl.nodes[0]);
    return !w || w === 'today';
  };
  V.seasDone = (st) => V.SEAS.filter((s) => A.nodes.filter((n) => n.u >= s.from && n.u <= s.to).every((n) => st.done[n.id])).length;

  // postcards: the painted scenes, earned as she sails through each sea
  V.postcards = (st) => {
    const out = [];
    V.SEAS.forEach((sea, si) => {
      const nodes = A.nodes.filter((n) => n.u >= sea.from && n.u <= sea.to);
      const done = nodes.filter((n) => st.done[n.id]).length, frac = nodes.length ? done / nodes.length : 0;
      const entered = si === 0 || V.route().main.some((x) => x.sea === si && x.nodes.some((n) => st.done[n.id])) || (V.route().main[V.curIndex(st)] || {}).sea === si;
      sea.art.forEach((id, k) => {
        const need = k / Math.max(1, sea.art.length - 1);
        out.push({ id, sea: si, on: entered && (k === 0 || frac >= need), alt: SC.ALT[id] });
      });
    });
    return out;
  };

  // ---------------------------------------------------------------- things floating on the sea
  // between island i and i+1: a shell, a pearl, a chest or a bottle (the same for ever, so she can plan)
  // between chapter gi and gi+1 (gi = -1: from the dock to the first island). Always the same, so she can plan.
  V.spawnsFor = (gi) => {
    const r = seeded(gi * 13 + 40), out = [];
    const n = 2 + (r() < 0.6 ? 1 : 0);
    for (let j = 0; j < n; j++) {
      const x = r();
      const kind = x < 0.36 ? 'shell' : x < 0.62 ? 'pearl' : x < 0.76 ? 'chest' : x < 0.9 ? 'log' : 'bottle';
      out.push({ id: `s${gi}.${j}`, kind, gi, fx: r(), fy: r(), shell: kind === 'shell' ? pickShell(r) : null });
    }
    if ((gi + 3) % 3 === 1) out.push({ id: `k${gi}`, kind: 'sealed', gi, fx: r(), fy: r() });
    return out;
  };
  function pickShell(r) {
    const W = { c: 60, u: 26, r: 10, e: 3.6, l: 0.4 }; let t = r() * 100;
    for (const rar of ['c', 'u', 'r', 'e', 'l']) { t -= W[rar]; if (t <= 0 || rar === 'l') { const L = V.SHELLS.filter((s) => s[3] === rar); return L[Math.floor(r() * L.length)][0]; } }
    return 'cowrie';
  }
  // three gifts from the tide each day, near the boat
  // the tide brings new things every four hours; things from the tide before stay a little longer, then drift away
  V.tideKey = (back) => { const d = new Date(Date.now() - (back || 0) * 4 * 36e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + 'w' + Math.floor(d.getHours() / 4); };
  V.nextTide = () => { const d = new Date(); return 4 * 36e5 - ((d.getHours() % 4) * 36e5 + d.getMinutes() * 6e4 + d.getSeconds() * 1e3); };
  V.dailySpawns = () => [1, 0].flatMap((back) => {
    const k = V.tideKey(back), r = seeded(hashStr(k));
    return [0, 1, 2].map((j) => { const x = r(); return { id: 't' + k + '.' + j, kind: j === 2 && x < 0.5 ? 'log' : x < 0.5 ? 'shell' : x < 0.86 ? 'pearl' : x < 0.95 ? 'chest' : 'log', daily: 1, shell: pickShell(r), fx: r(), fy: r() }; });
  });
  V.gifts = () => (V.ctl().gifts || []).map((g) => ({ id: 'g' + g.id, kind: g.kind, gift: g }));

  // ---------------------------------------------------------------- treasure rolls
  V.rollTreasure = (golden) => {
    // ordinary chests never hold legendary things; golden chests rarely; sealed chests (opened with a key) hold only rare and better
    const W = golden === 'sealed' ? { c: 0, u: 0, r: 62, e: 32, l: 6 } : golden ? { c: 34, u: 36, r: 22, e: 7, l: 1 } : { c: 62, u: 27, r: 9.2, e: 1.8, l: 0 };
    let t = Math.random() * Object.values(W).reduce((a, b) => a + b, 0), rar = 'c';
    for (const k of T.ORDER) { t -= W[k]; if (t <= 0) { rar = k; break; } }
    const s = V.st();
    const L = T.ITEMS.filter((x) => x[3] === rar);
    const fresh = L.filter((x) => !s.tre[x[0]]);
    const it = (fresh.length && Math.random() < (rar === 'e' || rar === 'l' ? 0.5 : 0.7) ? A.pick(fresh) : A.pick(L));
    const cur = s.tre[it[0]];
    s.tre[it[0]] = { n: ((cur && cur.n) || 0) + 1, t: (cur && cur.t) || Date.now() };
    return { item: it, isNew: !cur };
  };

  // ---------------------------------------------------------------- rewards after a session (called by the lesson player)
  V.reward = (ses, acc, passed) => {
    const st = A.state, s = V.st(st), out = { lines: [] };
    const add = (n, en) => { const k = V.addPearls(n); out.pearls = (out.pearls || 0) + k; out.lines.push([`+${k} pearl${k > 1 ? 's' : ''} · ${en}`]); };
    V.count('ans', ses.graded);
    const node = ses.node;
    if (node && passed) {
      const first = !ses.wasDone;
      V.count('les');
      if (acc === 100) V.count('perfect');
      if (node.kind === 'lesson') add(first ? 3 + (acc === 100 ? 2 : 0) : 1, 'island finished');
      else if (node.kind === 'talk') { add(first ? 3 : 1, 'conversation'); V.count('talk'); }
      else { add(first ? 6 + (acc === 100 ? 3 : 0) : 2, 'test passed'); if (first) { out.chest = V.rollTreasure(true); out.golden = 1; s.keys += 1; out.lines.push(['+1 key 🔑 · test passed']); } }
    }
    if (ses.kind === 'talk') V.count('talk');
    if (['review', 'mistakes', 'focus'].includes(ses.kind)) { add(1, 'practice'); V.count(ses.kind === 'focus' ? 'focus' : 'review'); }
    if (ses.kind === 'chest') {
      const sp = ses.arg;
      if (ses.firstOk >= Math.ceil(ses.graded * 0.6)) {
        s.got[sp.id] = Date.now(); V.count('chest');
        if (sp.sealed) { if (s.keys > 0) s.keys -= 1; out.sealed = 1; }
        out.chest = V.rollTreasure(sp.sealed ? 'sealed' : sp.golden); out.golden = sp.golden ? 1 : 0;
        add(1 + Math.floor(Math.random() * 3), 'from the chest');
        out.opened = 1;
      } else out.locked = 1;
    }
    if (ses.kind === 'bottle') {
      const sp = ses.arg;
      if (acc >= 60) { s.got[sp.id] = Date.now(); add(3, 'message in a bottle'); if (Math.random() < 0.5) out.chest = V.rollTreasure(false); out.opened = 1; }
      else out.locked = 1;
    }
    if (ses.kind === 'side') {
      const isl = ses.arg;
      if (acc >= 70) {
        const first = !s.side[isl.id];
        s.side[isl.id] = { a: Math.max(acc, (s.side[isl.id] && s.side[isl.id].a) || 0), t: Date.now() };
        if (first) { add(5, 'side mission'); out.chest = V.rollTreasure(true); out.golden = 1; } else add(1, 'side mission');
        out.opened = 1;
      } else out.locked = 1;
    }
    A.saveSoon();
    return out;
  };

  // ---------------------------------------------------------------- drawings
  const ISL = {
    river: (r, c) => `<ellipse cx="60" cy="70" rx="50" ry="13" fill="#9FD58F"/><ellipse cx="60" cy="66" rx="44" ry="10" fill="#6CBF6A"/>
      <rect x="20" y="66" width="42" height="5" fill="#8a5a2e"/><g fill="#6b4423"><rect x="24" y="70" width="3" height="8"/><rect x="40" y="70" width="3" height="8"/><rect x="56" y="70" width="3" height="8"/></g>
      <g transform="translate(70 34)"><rect x="-12" y="16" width="24" height="16" fill="#FBEBD0"/><path d="M-18 18L0 4 18 18Z" fill="#C8102E"/><path d="M-14 10L0 -2 14 10Z" fill="#E0A100"/><path d="M-9 2L0 -10 9 2Z" fill="#C8102E"/><path d="M0 -10V-18" stroke="#E0A100" stroke-width="2"/><rect x="-4" y="22" width="8" height="10" fill="#7a2a1a"/></g>
      ${palm(30, 64, 0.55, c)}`,
    jungle: (r, c) => `<ellipse cx="60" cy="72" rx="52" ry="12" fill="#F3DFA6"/><path d="M14 70Q24 30 52 36Q64 18 84 34Q104 38 106 70Z" fill="${r() < 0.5 ? '#3FA45E' : '#2F9150'}"/><path d="M30 68Q38 46 56 50Q70 40 86 52" stroke="#1F6E3B" stroke-width="2" fill="none" opacity=".5"/>${palm(24, 70, 0.6, c)}${palm(96, 70, 0.55, c, 1)}${r() < 0.4 ? '<g transform="translate(60 40)"><rect x="-6" y="-14" width="12" height="16" fill="#fff"/><path d="M-9 -14L0 -22 9 -14Z" fill="#E5476C"/></g>' : ''}`,
    karst: (r, c) => `<ellipse cx="60" cy="74" rx="50" ry="10" fill="#F3DFA6"/>${karst(42, 72, 1.15, '#3C8F6B')}${karst(74, 74, 0.85, '#2F7F5F')}${r() < 0.6 ? karst(92, 74, 0.6, '#4A9E7A') : ''}${palm(22, 74, 0.5, c)}`,
    open: (r, c) => `<ellipse cx="60" cy="72" rx="34" ry="10" fill="#C9B79A"/><path d="M34 72Q44 52 62 56Q80 50 88 72Z" fill="#8E8572"/><g transform="translate(64 30)"><rect x="-5" y="0" width="10" height="28" fill="#F6F6F2"/><rect x="-5" y="8" width="10" height="5" fill="#E5476C"/><rect x="-7" y="-8" width="14" height="9" rx="2" fill="#FFB21E"/><path d="M-8 -8l8 -7 8 7z" fill="#E5476C"/></g>${r() < 0.5 ? palm(40, 70, 0.4, c) : ''}`,
    atoll: (r, c) => `<ellipse cx="60" cy="66" rx="52" ry="20" fill="#FBE6B0"/><ellipse cx="60" cy="66" rx="38" ry="12" fill="#5EE3D3"/><ellipse cx="60" cy="66" rx="28" ry="7" fill="#9AF3E6" opacity=".7"/>${palm(22, 62, 0.6, c)}${palm(98, 64, 0.55, c, 1)}${r() < 0.55 ? '<g transform="translate(74 50)"><path d="M0 14V24M12 14V24" stroke="#8a5a2e" stroke-width="1.6"/><rect x="-3" y="6" width="18" height="9" fill="#F8EBD3"/><path d="M-5 7L6 -2 17 7Z" fill="#B97A3E"/></g>' : ''}`,
  };
  function palm(x, y, s, c, flip) {
    const night = c && c.night;
    const lf = night ? '#1F5A4A' : '#2FA36B', lf2 = night ? '#174636' : '#1F8455', tr = night ? '#5E4A36' : '#9A6B42';
    return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M0 0C2 -18 6 -34 14 -48" stroke="${tr}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M14 -48C2 -56 -12 -52 -18 -40C-8 -48 4 -50 14 -46Z M14 -48C26 -58 40 -54 44 -42C34 -50 24 -50 14 -46Z" fill="${lf}"/><path d="M14 -48C8 -64 18 -72 30 -70C20 -66 16 -58 15 -48Z M14 -48C4 -62 -8 -64 -14 -58C-4 -58 6 -54 13 -47Z" fill="${lf2}"/><circle cx="12" cy="-45" r="2.6" fill="#7A4E2A"/></g>`;
  }
  function karst(x, y, s, col) { return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0L-9 -34 -4 -26 1 -48 6 -30 12 -38 16 0Z" fill="${col}"/><path d="M-14 0L-9 -34 -4 -26 -3 0Z" fill="#000" opacity=".18"/><path d="M-6 -30q4 6 10 2" stroke="#7FD49C" stroke-width="3" fill="none" stroke-linecap="round"/></g>`; }
  V.islandSVG = (isl, opts) => {
    const o = opts || {};
    const sea = V.SEAS[isl.sea];
    const r = seeded(hashStr(isl.kind === 'side' ? isl.id : isl.node.id));
    const ter = isl.kind === 'side' ? 'jungle' : sea.ter;
    let body = (ISL[ter] || ISL.atoll)(r, { night: o.night });
    if (isl.kind === 'chap' && isl.u % 3 === 0) body += `<g transform="translate(60 30)"><path d="M-14 22V0h28v22Z" fill="#D9CBB0"/><path d="M-16 0v-6h6v4h4v-4h4v4h4v-4h4v4h4v-4h2v6Z" fill="#C2B190"/><rect x="-4" y="10" width="8" height="12" rx="4" fill="#6B4F35"/><path d="M0 -6V-20" stroke="#5B4130" stroke-width="1.6"/><path d="M0 -20h12l-3 4 3 4H0Z" fill="#FFB21E"/></g>`;
    if (isl.final) body += `<g transform="translate(60 20)"><path d="M0 10C-10 -2 -14 -10 -6 -14C-2 -16 0 -12 0 -10C0 -12 2 -16 6 -14C14 -10 10 -2 0 10Z" fill="#E5476C"/></g>`;
    return `<svg class="isl-svg" viewBox="0 0 120 90" aria-hidden="true">${body}</svg>`;
  };
  V.chestSVG = (golden, open) => `<svg class="chest-svg" viewBox="0 0 64 56" aria-hidden="true">
    <defs><linearGradient id="chw${golden ? 'g' : 'n'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${golden ? '#FFE07D' : '#B9733A'}"/><stop offset="1" stop-color="${golden ? '#D29A0B' : '#7A4520'}"/></linearGradient></defs>
    <rect x="6" y="24" width="52" height="28" rx="4" fill="url(#chw${golden ? 'g' : 'n'})" stroke="#4A2A10" stroke-width="2"/>
    ${open ? `<path d="M8 24L14 6H50L56 24Z" fill="#5A3416" stroke="#4A2A10" stroke-width="2"/><ellipse cx="32" cy="24" rx="22" ry="5" fill="#FFE27A"/><g class="sparkle-rise" fill="#FFF6C8"><circle cx="22" cy="16" r="2"/><circle cx="40" cy="12" r="2.6"/><circle cx="32" cy="6" r="1.8"/></g>`
      : `<path d="M6 26Q6 8 32 8T58 26Z" fill="url(#chw${golden ? 'g' : 'n'})" stroke="#4A2A10" stroke-width="2"/>`}
    <rect x="6" y="24" width="52" height="5" fill="${golden ? '#FFF3B8' : '#E3B347'}" stroke="#4A2A10" stroke-width="1.4"/>
    <rect x="16" y="24" width="5" height="28" fill="${golden ? '#FFF3B8' : '#E3B347'}"/><rect x="43" y="24" width="5" height="28" fill="${golden ? '#FFF3B8' : '#E3B347'}"/>
    <rect x="27" y="26" width="10" height="12" rx="2" fill="#3A2210"/><circle cx="32" cy="31" r="2" fill="#FFD27A"/></svg>`;
  V.bottleSVG = () => `<svg class="bottle-svg" viewBox="0 0 40 60" aria-hidden="true"><rect x="15" y="2" width="10" height="8" rx="2" fill="#A8743A"/><path d="M14 10h12v8q8 6 8 16v18q0 6 -6 6H12q-6 0 -6 -6V34q0 -10 8 -16Z" fill="#9EE6D8" opacity=".75" stroke="#3D8F84" stroke-width="1.5"/><rect x="12" y="28" width="16" height="20" rx="2" fill="#F8EBC8" transform="rotate(-8 20 38)"/><path d="M15 33h10M15 37h8M15 41h10" stroke="#B49A6A" stroke-width="1.2" transform="rotate(-8 20 38)"/><ellipse cx="13" cy="30" rx="2" ry="8" fill="#fff" opacity=".5"/></svg>`;
  V.pearlEl = (cls) => h('span', { class: 'pearl ' + (cls || '') });
})();
