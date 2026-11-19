/* cabin.js — the Cat Cabin: Alvee's cat lives with her inside the boat.
   The cat is cut from the picture Muhay chose (same cat, same colours) and moved in layers:
   body, head (turns and tilts), eyelids (blink, sleep, happy eyes) and things she wears.
   The cat has needs (food, joy, energy, clean fur, love) that change with real time, a hidden
   personality (favourite food, toy and petting spot, bedtime, how much petting she likes) that
   Alvee discovers by caring for her, and moods worked out from everything around her:
   the time of day, the Kraken, the boat's hull, Alvee's lessons today and how she is treated. */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h, V = A && A.voyage, VIEWS = A && A.VIEWS;
  if (!A || !V || !VIEWS) return;
  const C = (A.cabin = {});
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const now = () => Date.now();
  const MIN = 6e4, HOUR = 36e5;
  const thHour = (t) => { const d = new Date(t || now()); return (d.getUTCHours() + 7 + d.getUTCMinutes() / 60) % 24; };
  const pic = (e, cls) => h('span', { class: 'cb-emo' + (cls ? ' ' + cls : ''), html: A.emoHTML(e) });

  // ------------------------------------------------------------------ things for the cat
  // [id, emoji, name, thai, price (0 = only in chests), kind, extra]
  const ITEMS = [
    ['f_dry', '🥣', 'Crunchy food', 'อาหารเม็ด', 25, 'food', { h: 30, j: 2 }],
    ['f_milk', '🥛', 'Cat milk', 'นมแมว', 35, 'food', { h: 15, j: 7 }],
    ['f_cookie', '🍪', 'Fish cookie', 'คุกกี้ปลา', 40, 'food', { h: 10, j: 12 }],
    ['f_fish', '🐟', 'Fresh fish', 'ปลาสด', 55, 'food', { h: 45, j: 7 }],
    ['f_tuna', '🥫', 'Tuna can', 'ทูน่ากระป๋อง', 70, 'food', { h: 50, j: 10 }],
    ['f_shrimp', '🍤', 'Shrimp', 'กุ้ง', 90, 'food', { h: 40, j: 14 }],
    ['f_sushi', '🍣', 'Salmon sushi', 'ซูชิแซลมอน', 0, 'food', { h: 50, j: 25 }],
    ['t_yarn', '🧶', 'Yarn ball', 'ลูกไหมพรม', 150, 'toy', { p: 'roll' }],
    ['t_ball', '🎾', 'Bouncy ball', 'ลูกบอลเด้ง', 120, 'toy', { p: 'bounce' }],
    ['t_mouse', '🐭', 'Toy mouse', 'หนูของเล่น', 180, 'toy', { p: 'run' }],
    ['t_feather', '🪶', 'Feather wand', 'ไม้ขนนก', 200, 'toy', { p: 'wave' }],
    ['t_laser', '🔴', 'Laser dot', 'ไฟเลเซอร์', 260, 'toy', { p: 'laser' }],
    ['t_kite', '🪁', 'Little kite', 'ว่าวน้อย', 0, 'toy', { p: 'wave' }],
    ['t_bear', '🧸', 'Teddy bear', 'ตุ๊กตาหมี', 0, 'toy', { p: 'hug' }],
    ['t_box', '📦', 'Cardboard box', 'กล่องกระดาษ', 0, 'toy', { p: 'box' }],
    ['x_brush', '🪮', 'Soft brush', 'แปรงขนนุ่ม', 120, 'tool', {}],
    ['w_bow', '🎀', 'Pink bow', 'โบว์ชมพู', 300, 'wear', { x: 128, y: 96, s: 84, r: -18 }],
    ['w_flower', '🌺', 'Hibiscus', 'ดอกชบา', 250, 'wear', { x: 292, y: 72, s: 74, r: 10 }],
    ['w_hat', '🎩', 'Top hat', 'หมวกทรงสูง', 450, 'wear', { x: 200, y: 26, s: 112, r: -10 }],
    ['w_star', '⭐', 'Star clip', 'กิ๊บดาว', 0, 'wear', { x: 140, y: 104, s: 54, r: -10 }],
    ['w_crown', '👑', 'Little crown', 'มงกุฎน้อย', 0, 'wear', { x: 204, y: 44, s: 104, r: -12 }],
    ['d_plant', '🪴', 'Plant', 'ต้นไม้', 200, 'decor', { slot: 'floor' }],
    ['d_basket', '🧺', 'Toy basket', 'ตะกร้าของเล่น', 180, 'decor', { slot: 'floor2' }],
    ['d_bowl', '🐠', 'Fish bowl', 'โหลปลา', 350, 'decor', { slot: 'shelf' }],
    ['d_candle', '🕯️', 'Candle', 'เทียน', 150, 'decor', { slot: 'shelf2' }],
    ['d_frame', '🖼️', 'Sea painting', 'ภาพทะเล', 260, 'decor', { slot: 'wall' }],
    ['d_chime', '🎐', 'Wind chime', 'กระดิ่งลม', 220, 'decor', { slot: 'hang' }],
    ['d_moon', '🌙', 'Moon lamp', 'โคมพระจันทร์', 0, 'decor', { slot: 'shelf3' }],
    ['d_balloon', '🎈', 'Balloon', 'ลูกโป่ง', 0, 'decor', { slot: 'hang2' }],
  ];
  const IT = {}; ITEMS.forEach((x) => (IT[x[0]] = x));
  C.ITEMS = ITEMS;
  const FAV_FOODS = ['f_milk', 'f_fish', 'f_tuna', 'f_shrimp', 'f_sushi'];
  const FAV_TOYS = ['t_yarn', 't_ball', 't_mouse', 't_feather', 't_laser'];
  const SPOTS = { head: ['head', 'หัว'], cheek: ['cheeks', 'แก้ม'], chin: ['chin', 'คาง'] };

  // ------------------------------------------------------------------ her cat's state (made once, never reset)
  C.st = (st) => {
    st = st || A.state;
    if (!st.cabin) {
      const r = Math.random;
      st.cabin = {
        born: now(), t: now(), name: '', hunger: 70, joy: 70, energy: 80, clean: 80, bond: 10,
        inv: { f_dry: 3, f_milk: 2 }, own: { t_yarn: 1 }, wear: null, decor: {},
        pers: { food: FAV_FOODS[Math.floor(r() * FAV_FOODS.length)], toy: FAV_TOYS[Math.floor(r() * FAV_TOYS.length)], spot: ['head', 'cheek', 'chin'][Math.floor(r() * 3)], petMax: 6 + Math.floor(r() * 5), bed: 21 + Math.floor(r() * 3) },
        known: {}, cnt: {}, visits: 0, lastVisit: 0, lonely: 0, proudDay: '', krCalm: 0, calmPets: 0, nap: 0, wake: 0, grumpy: 0, startle: 0, newT: 0, lastPlay: 0, toyLog: [], fedDay: '',
      };
    }
    const c = st.cabin;
    c.inv = c.inv || {}; c.own = c.own || {}; c.decor = c.decor || {}; c.known = c.known || {}; c.cnt = c.cnt || {}; c.toyLog = c.toyLog || [];
    return c;
  };
  C.name = (st) => { const c = st && st.cabin; return (c && c.name) || 'your cat'; };

  // needs move with real time, also while the app is closed
  const asleepAt = (c, t) => {
    if (c.nap > t) return true;
    if (c.wake && t - c.wake < 4 * MIN) return false;
    const hr = thHour(t), bed = (c.pers && c.pers.bed) || 22;
    return hr >= bed || hr < 6.5;
  };
  C.tick = (c, t) => {
    t = t || now();
    let dt = Math.min(72, Math.max(0, (t - (c.t || t)) / HOUR));
    if (dt <= 0) { c.t = t; return; }
    const sleeping = asleepAt(c, t);
    c.hunger = clamp(c.hunger - 4 * dt);
    c.joy = clamp(c.joy - (2.4 + (c.hunger < 25 ? 2 : 0)) * dt);
    c.energy = clamp(c.energy + (sleeping ? 14 : -3) * dt);
    c.clean = clamp(c.clean - 1.2 * dt);
    c.bond = clamp(c.bond + (c.joy > 60 && c.hunger > 30 ? 0.25 : c.hunger < 12 ? -0.4 : 0) * dt);
    if (!sleeping && c.energy < 12) c.nap = t + 40 * MIN;
    c.t = t;
  };

  // ------------------------------------------------------------------ moods
  // The cat cannot talk. She only has thoughts (pictures) and body language that Alvee can watch.
  // Alvee must read the clues and guess the feeling word in English; then she sees what her cat needs.
  // [emoji, mood name, thai, colour, guess word, thought pictures (vague → clear), signs she can see, what helps]
  const MD = {
    scared: ['🙀', 'Scared', 'กลัว', '#6a5acd', 'scared', ['💥', '🌊', '🐙'], [['Her eyes are very big and round.', 'ตาเธอโตและกลมมาก'], ['She is shaking and stays low.', 'เธอตัวสั่นและหมอบต่ำ'], ['She keeps looking at the window.', 'เธอมองไปที่หน้าต่างตลอด']], ['Pet her gently three times to make her feel safe.', 'ลูบเธอเบา ๆ สามครั้งให้รู้สึกปลอดภัย']],
    startled: ['🙀', 'Scared', 'ตกใจ', '#6a5acd', 'scared', ['⚡', '✋', '💦'], [['She jumped when you tapped so fast.', 'เธอสะดุ้งตอนแตะเร็ว ๆ'], ['Her eyes are wide open.', 'ตาเธอเบิกกว้าง'], ['She does not move.', 'เธอไม่ขยับเลย']], ['Wait a little and touch her slowly.', 'รอสักครู่แล้วค่อย ๆ ลูบ']],
    excited: ['😸', 'Excited', 'ตื่นเต้น', '#e08a00', 'excited', ['⚔️', '🐙', '🏆'], [['Her eyes shine and she looks at you.', 'ตาเธอเป็นประกายและมองเธอ'], ['She sits up tall.', 'เธอนั่งตัวตรง'], ['The battle outside is over and it is quiet now.', 'การต่อสู้ข้างนอกจบแล้ว ตอนนี้เงียบ']], ['Pet her. She is proud of her captain!', 'ลูบเธอสิ เธอภูมิใจในกัปตัน']],
    sleeping: ['💤', 'Sleeping', 'กำลังหลับ', '#3b4a8a', 'sleepy', ['💤', '🌙', '🛏️'], [['She is sleeping. Let her rest.', 'เธอกำลังหลับ ปล่อยให้พัก'], ['Her paws twitch. She is dreaming.', 'อุ้งเท้ากระตุก เธอกำลังฝัน'], ['She breathes slowly.', 'เธอหายใจช้า ๆ']], ['Let her sleep. Come back later.', 'ปล่อยให้หลับ แล้วค่อยกลับมา']],
    drowsy: ['😽', 'Sleepy', 'ง่วง', '#5a6ab0', 'sleepy', ['🌙', '🛏️', '💤'], [['Her eyes are half closed.', 'ตาเธอปรือ'], ['She yawns again and again.', 'เธอหาวไม่หยุด'], ['It is the middle of the night.', 'ตอนนี้กลางดึก']], ['Leave her alone. She will sleep again.', 'อย่ากวน เดี๋ยวเธอจะหลับต่อ']],
    grumpy: ['😾', 'Grumpy', 'หงุดหงิด', '#c5163f', 'grumpy', ['💢', '✋', '🚫'], [['She turned her back to you.', 'เธอหันหลังให้'], ['Her tail flicks fast.', 'หางเธอสะบัดเร็ว'], ['She moves away from your hand.', 'เธอขยับหนีมือ']], ['Give her some space for a minute.', 'ให้พื้นที่เธอสักนาที']],
    hungry: ['😿', 'Hungry', 'หิว', '#f07b1d', 'hungry', ['🍽️', '🐟', '🥣'], [['She keeps looking at her empty bowl.', 'เธอมองชามที่ว่างอยู่เรื่อย ๆ'], ['Her tummy makes a little sound.', 'ท้องเธอร้องเบา ๆ'], ['She sniffs the air and licks her lips.', 'เธอดมกลิ่นแล้วเลียปาก']], ['Give her food.', 'ให้อาหารเธอ']],
    lonely: ['😿', 'Lonely', 'เหงา', '#2867c9', 'lonely', ['🚪', '⏳', '💗'], [['She ran to you when you came in.', 'เธอวิ่งมาหาตอนเข้ามา'], ['She meows softly and follows you.', 'เธอร้องเบา ๆ และเดินตาม'], ['You were away for a long time.', 'เธอไม่ได้มานาน']], ['Stay and pet her for a while.', 'อยู่ลูบเธอสักพัก']],
    worried: ['😿', 'Worried', 'กังวล', '#0f8aa6', 'worried', ['💧', '🪵', '⛵'], [['She looks at the floor and listens.', 'เธอมองพื้นและฟังเสียง'], ['She hears water dripping somewhere.', 'เธอได้ยินเสียงน้ำหยด'], ['The boat is hurt.', 'เรือได้รับความเสียหาย']], ['Repair the boat with wood logs on the map.', 'ซ่อมเรือด้วยท่อนไม้บนแผนที่']],
    itchy: ['😾', 'Itchy', 'คัน', '#8a6a00', 'itchy', ['🪶', '🫧', '🪮'], [['She scratches behind her ear.', 'เธอเกาหลังหู'], ['Her fur looks messy.', 'ขนเธอดูยุ่ง'], ['She licks her fur again and again.', 'เธอเลียขนซ้ำ ๆ']], ['Brush her fur.', 'แปรงขนให้เธอ']],
    tired: ['😽', 'Tired', 'เหนื่อย', '#5a6ab0', 'tired', ['🥱', '🛏️', '💤'], [['She lies down and moves slowly.', 'เธอนอนลงและขยับช้า ๆ'], ['She does not want to play.', 'เธอไม่อยากเล่น'], ['Her eyes close for a second.', 'ตาเธอปิดไปชั่วครู่']], ['Let her take a nap.', 'ให้เธองีบ']],
    proud: ['😻', 'Proud', 'ภูมิใจ', '#d4357a', 'proud', ['📚', '⭐', '🏅'], [['She looks at your English book.', 'เธอมองหนังสือภาษาอังกฤษของเธอ'], ['She sits next to you and purrs.', 'เธอนั่งข้าง ๆ และครางเบา ๆ'], ['You finished a lesson today.', 'วันนี้เธอเรียนจบหนึ่งบท']], ['Pet her or play. She is proud of you!', 'ลูบหรือเล่นกับเธอ เธอภูมิใจในตัวเธอ']],
    curious: ['😺', 'Curious', 'อยากรู้', '#0d8a5f', 'curious', ['❓', '👀', '✨'], [['She stares at something new.', 'เธอจ้องของใหม่'], ['Her ears point forward.', 'หูเธอชี้ไปข้างหน้า'], ['She walks around it slowly.', 'เธอเดินวนรอบ ๆ ช้า ๆ']], ['Let her explore her new things.', 'ปล่อยให้เธอสำรวจของใหม่']],
    playful: ['😸', 'Playful', 'อยากเล่น', '#e08a00', 'playful', ['⚡', '🧶', '🐭'], [['Her tail moves left and right.', 'หางเธอส่ายไปมา'], ['She jumps at a shadow.', 'เธอกระโดดใส่เงา'], ['She brings you a toy.', 'เธอคาบของเล่นมาให้']], ['Play with her.', 'เล่นกับเธอ']],
    cuddly: ['😻', 'Loving', 'อยากอ้อน', '#d4357a', 'loving', ['💗', '✋', '💞'], [['She rubs her head on your hand.', 'เธอเอาหัวถูมือ'], ['She purrs loudly.', 'เธอครางเสียงดัง'], ['She slowly blinks at you.', 'เธอกะพริบตาช้า ๆ ใส่เธอ']], ['Pet her favourite spot.', 'ลูบตรงที่เธอชอบ']],
    happy: ['😺', 'Happy', 'มีความสุข', '#17955a', 'happy', ['🌞', '🎵', '💛'], [['She purrs and her eyes are soft.', 'เธอครางและตาดูอ่อนโยน'], ['Her tail is up high.', 'หางเธอตั้งสูง'], ['She stretches and rolls over.', 'เธอยืดตัวและกลิ้ง']], ['Keep doing what you do!', 'ทำแบบนี้ต่อไป']],
    bored: ['😼', 'Bored', 'เบื่อ', '#6a6a6a', 'bored', ['🕰️', '😑', '🧶'], [['She stares at the wall.', 'เธอจ้องผนัง'], ['She sighs and lies down.', 'เธอถอนหายใจและนอนลง'], ['She looks at the toy basket.', 'เธอมองตะกร้าของเล่น']], ['Play with her or buy a new toy.', 'เล่นกับเธอหรือซื้อของเล่นใหม่']],
    calm: ['😺', 'Calm', 'สบายใจ', '#0e8a8a', 'calm', ['🌊', '☁️', '🎶'], [['She watches the waves quietly.', 'เธอดูคลื่นเงียบ ๆ'], ['She breathes slowly.', 'เธอหายใจช้า ๆ'], ['Everything looks peaceful.', 'ทุกอย่างดูสงบ']], ['She is fine. Pet her if you like.', 'เธอสบายดี ลูบเธอได้นะ']],
  };
  const MOODS = {};
  Object.keys(MD).forEach((k) => { const m = MD[k]; MOODS[k] = { e: m[0], en: m[1], th: m[2], col: m[3], word: m[4], think: m[5], signs: m[6], help: m[7] }; });
  const WORDS = { scared: 'กลัว', excited: 'ตื่นเต้น', sleepy: 'ง่วง', grumpy: 'หงุดหงิด', hungry: 'หิว', lonely: 'เหงา', worried: 'กังวล', itchy: 'คัน', tired: 'เหนื่อย', proud: 'ภูมิใจ', curious: 'อยากรู้', playful: 'อยากเล่น', loving: 'อยากอ้อน', happy: 'มีความสุข', bored: 'เบื่อ', calm: 'สบายใจ' };
  C.WORDS = WORDS;
  // words too close to tell apart are never offered together
  const NEAR = [['sleepy', 'tired'], ['happy', 'calm', 'loving'], ['scared', 'worried'], ['excited', 'playful', 'proud'], ['lonely', 'loving'], ['bored', 'calm']];
  C.MOODS = MOODS;
  const krInfo = (st) => {
    const s = V.st(st), kr = s.kr || {}, t = now();
    if (!kr.last || t - kr.last > 30 * MIN) return null;
    return { last: kr.last, res: kr.end && kr.end >= kr.last ? kr.res : 'on' };
  };
  // the mood is worked out fresh every time from everything around her (first match wins)
  C.mood = (st, c, t) => {
    t = t || now();
    const kr = krInfo(st), s = V.st(st), tk = A.dkey(t), day = st.days && st.days[tk];
    if (c.startle > t) return ['startled', 'You tapped too fast'];
    if (kr && kr.res === 'won' && c.krCalm !== kr.last) return ['excited', 'You beat the Kraken'];
    if (kr && c.krCalm !== kr.last) return ['scared', kr.res === 'on' ? 'The Kraken is near the boat' : 'The Kraken attacked the boat'];
    if (asleepAt(c, t)) return ['sleeping', c.nap > t ? 'Taking a nap' : 'It is night in Thailand'];
    if (c.wake && t - c.wake < 3 * MIN && (thHour(t) >= ((c.pers && c.pers.bed) || 22) || thHour(t) < 6.5)) return ['drowsy', 'You woke her up at night'];
    if (c.grumpy > t) return ['grumpy', 'Too much petting'];
    if (c.hunger < 25) return ['hungry', 'Her food bowl is empty'];
    if (c.lonely) return ['lonely', 'You were away for a long time'];
    if ((s.hull || 100) < 50) return ['worried', 'The hull is at ' + s.hull + '%'];
    if (c.clean < 25) return ['itchy', 'Her fur needs brushing'];
    if (c.energy < 25) return ['tired', 'Low energy'];
    if (day && (day.les || 0) > 0 && c.proudDay !== tk) return ['proud', 'You finished a lesson today'];
    if (c.newT && t - c.newT < 8 * MIN) return ['curious', 'Something new in the cabin'];
    if (c.energy > 55 && c.hunger > 40 && t - (c.lastPlay || 0) > 3 * HOUR) return ['playful', 'No play for a while'];
    if (c.bond > 70 && c.joy > 75) return ['cuddly', 'She loves you'];
    if (c.joy > 62) return ['happy', 'All her needs are met'];
    if (c.joy < 35) return ['bored', 'She needs fun'];
    return ['calm', 'A quiet day at sea'];
  };
  const BONDS = [[0, 'New friend', 'เพื่อนใหม่'], [20, 'Friend', 'เพื่อน'], [45, 'Good friend', 'เพื่อนสนิท'], [70, 'Best friend', 'เพื่อนรักที่สุด'], [90, 'Family', 'ครอบครัว']];
  const bondOf = (b) => BONDS.filter((x) => b >= x[0]).pop();

  // ------------------------------------------------------------------ discoveries (her hidden personality)
  const DISC = [
    ['food', '🍽️', 'Favourite food', (c) => IT[c.pers.food][2]],
    ['toy', '🧸', 'Favourite toy', (c) => IT[c.pers.toy][2]],
    ['spot', '✋', 'Favourite petting spot', (c) => 'Her ' + SPOTS[c.pers.spot][0]],
    ['limit', '⏱️', 'Petting limit', (c) => 'About ' + c.pers.petMax + ' pets, then a break'],
    ['bed', '🌙', 'Bedtime', (c) => (c.pers.bed - 12) + ' pm, Thai time'],
    ['paws', '🐾', 'Paws', () => 'Does not like her paws touched'],
    ['kraken', '🐙', 'Biggest fear', () => 'The Kraken'],
    ['sea', '🌊', 'Loves to watch', () => 'The sea from the window'],
  ];
  const discover = (st, c, k) => {
    if (c.known[k]) return;
    c.known[k] = now();
    c.bond = clamp(c.bond + 3);
    try { V.addPearls(3); } catch (e) { /* ok */ }
    const d = DISC.find((x) => x[0] === k);
    A.toast('💡 You found out: ' + d[2] + ' — ' + d[3](c) + ' (+3 pearls)', 3800);
    A.track('cabin_discover', { k });
    A.saveSoon();
  };

  // ------------------------------------------------------------------ getting cat things from chests and lessons
  C.give = (st, id, n) => {
    const c = C.st(st), it = IT[id];
    if (!it) return null;
    if (it[5] === 'food') c.inv[id] = (c.inv[id] || 0) + (n || 1);
    else c.own[id] = 1;
    return it;
  };
  C.drop = (st, golden) => {
    const c = C.st(st), r = Math.random();
    const rare = ITEMS.filter((x) => !x[4] && x[5] !== 'food' && !c.own[x[0]]);
    let it;
    if (rare.length && r < (golden ? 0.35 : 0.18)) it = A.pick(rare);
    else if (r < 0.88) it = A.pick(golden ? ['f_fish', 'f_tuna', 'f_shrimp', 'f_sushi', 'f_cookie'].map((x) => IT[x]) : ['f_dry', 'f_dry', 'f_milk', 'f_fish', 'f_cookie', 'f_tuna', 'f_sushi'].map((x) => IT[x]));
    else { const shop = ITEMS.filter((x) => x[4] && x[5] !== 'food' && !c.own[x[0]]); it = shop.length ? A.pick(shop) : IT.f_fish; }
    C.give(st, it[0]);
    A.track('cabin_drop', { id: it[0] });
    return it;
  };
  const r0 = V.reward;
  V.reward = function (ses, acc, passed) {
    const out = r0.apply(this, arguments);
    try {
      const st = A.state, c = C.st(st), nm = C.name(st), tk = A.dkey();
      if (out && out.chest && Math.random() < (out.golden ? 0.5 : 0.3)) {
        const it = C.drop(st, out.golden);
        out.lines.push(['+1 ' + it[1] + ' ' + it[2] + ' for ' + nm + ' 🐱']);
      }
      if (passed && ses.node && c.fedDay !== tk) { c.fedDay = tk; c.inv.f_dry = (c.inv.f_dry || 0) + 1; out.lines.push(['+1 🥣 free meal for ' + nm + ' · first lesson today']); }
    } catch (e) { /* cat extras never break rewards */ }
    return out;
  };

  // ------------------------------------------------------------------ sounds (made by the phone, no files)
  const SND = {
    ctx() { A.sfx.init(); const x = A.sfx.ctx; if (x && x.state === 'suspended') x.resume(); return A.sfx.on ? x : null; },
    meow(sad) {
      const x = this.ctx(); if (!x) return;
      const t = x.currentTime, o = x.createOscillator(), f = x.createBiquadFilter(), g = x.createGain(), lfo = x.createOscillator(), lg = x.createGain();
      o.type = 'sawtooth'; f.type = 'bandpass'; f.Q.value = 3;
      const b = sad ? 520 : 640;
      o.frequency.setValueAtTime(b, t); o.frequency.linearRampToValueAtTime(b * 1.45, t + 0.18); o.frequency.linearRampToValueAtTime(b * (sad ? 0.75 : 0.9), t + 0.6);
      f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1700, t + 0.2); f.frequency.linearRampToValueAtTime(900, t + 0.6);
      lfo.frequency.value = 7; lg.gain.value = 12; lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(f).connect(g).connect(x.destination); o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
    },
    purr(sec) {
      const x = this.ctx(); if (!x) return;
      const t = x.currentTime, o = x.createOscillator(), f = x.createBiquadFilter(), g = x.createGain(), am = x.createOscillator(), ag = x.createGain();
      o.type = 'sawtooth'; o.frequency.value = 52; f.type = 'lowpass'; f.frequency.value = 320;
      am.frequency.value = 24; ag.gain.value = 0.05; am.connect(ag).connect(g.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.2); g.gain.setValueAtTime(0.07, t + sec - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + sec);
      o.connect(f).connect(g).connect(x.destination); o.start(t); am.start(t); o.stop(t + sec + 0.1); am.stop(t + sec + 0.1);
    },
    crunch(n) {
      const x = this.ctx(); if (!x) return;
      for (let i = 0; i < n; i++) {
        const t = x.currentTime + i * 0.32, len = 0.07, buf = x.createBuffer(1, x.sampleRate * len, x.sampleRate), d = buf.getChannelData(0);
        for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 2);
        const s = x.createBufferSource(), f = x.createBiquadFilter(), g = x.createGain();
        s.buffer = buf; f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = 0.25;
        s.connect(f).connect(g).connect(x.destination); s.start(t);
      }
    },
    hiss() {
      const x = this.ctx(); if (!x) return;
      const t = x.currentTime, len = 0.6, buf = x.createBuffer(1, x.sampleRate * len, x.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.min(1, k / 800) * (1 - k / d.length);
      const s = x.createBufferSource(), f = x.createBiquadFilter(), g = x.createGain();
      s.buffer = buf; f.type = 'bandpass'; f.frequency.value = 4200; f.Q.value = 0.8; g.gain.value = 0.18;
      s.connect(f).connect(g).connect(x.destination); s.start(t);
    },
  };

  // ------------------------------------------------------------------ her photo (kept on the server, only for signed-in users)
  let PHOTO = undefined;
  const loadPhoto = async () => {
    if (PHOTO !== undefined) return PHOTO;
    try { PHOTO = (A.api.photo && (await A.api.photo())) || null; } catch (e) { PHOTO = null; }
    return PHOTO;
  };
  const pickPhoto = (done) => {
    const inp = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]; inp.remove();
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = async () => {
          const S = 480, cv = document.createElement('canvas'); cv.width = cv.height = S;
          const m = Math.min(img.width, img.height), sx = (img.width - m) / 2, sy = Math.max(0, (img.height - m) / 2 - m * 0.08);
          cv.getContext('2d').drawImage(img, sx, sy, m, m, 0, 0, S, S);
          const data = cv.toDataURL('image/jpeg', 0.86);
          try { await A.api.setPhoto(data); PHOTO = data; A.track('cabin_photo', {}); A.toast('📸 Photo saved!'); done && done(); }
          catch (e) { A.toast('Could not save the photo. Try again with signal.'); }
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    document.body.append(inp); inp.click();
  };

  // ------------------------------------------------------------------ the cat, in layers
  const EYES = [[172, 140, 19, 15], [250, 121, 18, 15]];
  const catEl = () => {
    const eyes = EYES.map(([x, y, rx, ry]) => `<g class="eye" transform="rotate(-13 ${x} ${y})">
        <ellipse class="pup" cx="${x}" cy="${y + 1}" rx="${rx * 0.62}" ry="${ry * 0.78}"/>
        <ellipse class="lid" cx="${x}" cy="${y - 1}" rx="${rx + 4}" ry="${ry + 4}"/>
        <path class="shut" d="M${x - rx - 1} ${y + 1} Q${x} ${y + ry + 1} ${x + rx + 1} ${y + 1}"/>
        <path class="joy" d="M${x - rx} ${y + 6} Q${x} ${y - ry + 2} ${x + rx} ${y + 6}"/></g>`).join('');
    const svg = `<svg class="cb-eyes" viewBox="0 0 391 473" aria-hidden="true"><defs><radialGradient id="cbfur" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#f7c491"/><stop offset="1" stop-color="#e39a63"/></radialGradient><filter id="cbsoft"><feGaussianBlur stdDeviation="1.1"/></filter></defs>${eyes}</svg>`;
    const front = `<svg class="cb-front" viewBox="0 0 391 473" preserveAspectRatio="none" aria-hidden="true"><defs>
        <linearGradient id="cbbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c72c9"/><stop offset=".45" stop-color="#4a4fa6"/><stop offset="1" stop-color="#2b2f72"/></linearGradient>
        <pattern id="cbq" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><rect width="34" height="34" fill="none"/><path d="M0 17H34M17 0V34" stroke="rgba(255,255,255,.16)" stroke-width="2" stroke-dasharray="4 4"/></pattern></defs>
      <path d="M-46 318 Q-10 330 22 352 Q90 392 150 420 Q205 448 250 452 Q300 456 352 446 Q372 440 380 424 Q410 418 440 430 L446 560 L-46 560 Z" fill="url(#cbbl)"/>
      <path d="M-46 318 Q-10 330 22 352 Q90 392 150 420 Q205 448 250 452 Q300 456 352 446 Q372 440 380 424 Q410 418 440 430 L446 560 L-46 560 Z" fill="url(#cbq)"/>
      <path d="M-30 330 Q20 352 80 384 Q160 430 250 452" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="5" stroke-linecap="round"/></svg>`;
    return h('div', { class: 'cb-unit' },
      h('div', { class: 'cb-flip' },
        h('div', { class: 'cb-bedback' }),
        h('div', { class: 'cb-cat' },
          h('img', { class: 'cb-body', src: 'img/cabin/cat_body.webp', alt: '', draggable: 'false' }),
          h('div', { class: 'cb-head' }, h('img', { src: 'img/cabin/cat_head.webp', alt: '', draggable: 'false' }), h('span', { html: svg }), h('div', { class: 'cb-wear' }))),
        h('span', { class: 'cb-frontwrap', html: front })));
  };

  // ------------------------------------------------------------------ the page
  VIEWS.cabin = () => {
    const st = A.state, c = C.st(st), s = V.st(st);
    C.tick(c);
    const t0 = now();
    if (c.lastVisit && t0 - c.lastVisit > 20 * HOUR) c.lonely = 3;
    if (!c.lastVisit || t0 - c.lastVisit > 30 * MIN) c.visits = (c.visits || 0) + 1;
    c.lastVisit = t0;
    A.track('cabin_open', {});
    A.saveSoon();

    const root = h('div', { class: 'screen cabin' });
    const goldEl = h('span', { class: 'num' }, V.fmtN(s.gold));
    root.append(h('div', { class: 'cb-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: () => A.back('me') }, '‹'),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('h1', null, (c.name || 'Your cat') + '’s Cabin'), h('div', { class: 'small th muted' }, 'ห้องของเราในเรือ')),
      h('button', { class: 'cb-gold', onclick: () => shop() }, V.coinEl(), goldEl, h('b', null, '+'))));

    // --- the scene
    const scene = h('div', { class: 'cb-scene' });
    const hr = new Date().getHours();
    const sky = hr >= 6 && hr < 17 ? 'day' : hr >= 17 && hr < 19 ? 'dusk' : 'night';
    const win = h('div', { class: 'cb-win ' + sky },
      h('div', { class: 'cb-sky' }, ...(sky === 'night' ? Array.from({ length: 14 }, (_, i) => h('i', { class: 'star', style: { left: (i * 37 % 100) + '%', top: (i * 23 % 55) + '%', animationDelay: (i * 0.4) + 's' } })) : []), h('i', { class: sky === 'night' ? 'moon' : 'sun' })),
      h('div', { class: 'cb-sea' }, h('i', { class: 'wave w1' }), h('i', { class: 'wave w2' })),
      h('span', { class: 'cb-boat', html: A.emoHTML('⛵') }),
      h('span', { class: 'cb-tent', html: A.emoHTML('🐙') }));
    const frame = h('button', { class: 'cb-frame', 'aria-label': 'My photo', onclick: () => photoSheet() }, h('div', { class: 'cb-photo' }, pic('📷'), h('small', null, 'Add my photo')), h('span', { class: 'cb-ribbon' }, A.user.name));
    const paintPhoto = () => { const ph = frame.querySelector('.cb-photo'); A.clear(ph); if (PHOTO) ph.append(h('img', { src: PHOTO, alt: A.user.name })); else ph.append(pic('📷'), h('small', null, 'Add my photo')); };
    loadPhoto().then(paintPhoto);
    const lantern = h('div', { class: 'cb-lantern' }, h('i'), pic('🏮'));
    const decorL = h('div', { class: 'cb-decor' });
    const cat = catEl();
    const fx = h('div', { class: 'cb-fx' });
    const bubble = h('button', { class: 'cb-bubble', onclick: () => { const l = bubble._line; if (l) A.speech.say(l[0]); } });
    const think = h('div', { class: 'cb-think', 'aria-label': 'What she is thinking' });
    scene.append(h('div', { class: 'cb-wall' }), h('div', { class: 'cb-shelf l' }), h('div', { class: 'cb-shelf r' }), win, frame, lantern, decorL, h('div', { class: 'cb-floor' }), cat, think, fx);
    root.append(scene, bubble);

    // --- reading her mind: guess the feeling, then her needs show
    const guessBox = h('div', { class: 'card cb-guess' });
    const moodBox = h('div', { class: 'card cb-mood' });
    const bars = h('div', { class: 'cb-bars' });
    root.append(guessBox, moodBox, bars);

    // --- actions
    const act = (ic, en, th, fn, cls) => h('button', { class: 'cb-act ' + (cls || ''), onclick: fn }, pic(ic), h('b', null, en), h('small', { class: 'th' }, th));
    root.append(h('div', { class: 'cb-acts' },
      act('✋', 'Pet', 'ลูบ', () => petHint(), 'a-pet'),
      act('🍽️', 'Feed', 'ให้อาหาร', () => feedSheet(), 'a-feed'),
      act('🧶', 'Play', 'เล่น', () => playSheet(), 'a-play'),
      act('🪮', 'Brush', 'แปรงขน', () => brush(), 'a-brush'),
      act('💤', 'Nap', 'นอน', () => napOrWake(), 'a-nap'),
      act('🛒', 'Shop', 'ร้านค้า', () => shop(), 'a-shop'),
      act('🎀', 'Style', 'แต่งตัว', () => styleSheet(), 'a-style'),
      act('📖', 'Diary', 'สมุดแมว', () => diary(), 'a-diary')));

    // ------------------------------------------------ painting
    const unit = cat, catBox = cat.querySelector('.cb-cat'), flip = cat.querySelector('.cb-flip');
    let mood = null, line = null, busy = 0, lastMood = '';
    const paintWear = () => {
      const w = cat.querySelector('.cb-wear'); A.clear(w);
      const it = c.wear && IT[c.wear];
      if (it) { const p = it[6]; w.append(h('span', { class: 'cb-w', style: { left: ((p.x - p.s / 2) / 391 * 100) + '%', top: ((p.y - p.s / 2) / 473 * 100) + '%', width: (p.s / 391 * 100) + '%', transform: 'rotate(' + p.r + 'deg)' }, html: A.emoHTML(it[1]) })); }
    };
    const paintDecor = () => {
      A.clear(decorL);
      Object.keys(c.decor).filter((k) => c.decor[k] && IT[k]).forEach((k) => decorL.append(h('span', { class: 'cb-d s-' + IT[k][6].slot, html: A.emoHTML(IT[k][1]) })));
    };
    const say = (l, ms) => {
      line = l; bubble._line = l;
      A.clear(bubble).append(h('span', { class: 'cb-see' }, '👀 What you see'), h('b', null, l[0]), h('small', { class: 'th' }, l[1]), h('span', { class: 'cb-spk', html: A.emoHTML('🔊') }));
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      clearTimeout(say.t); if (ms) say.t = setTimeout(() => sayMood(), ms);
    };
    // the clue state lives in her save, so a half-solved puzzle is still there next time
    const clue = () => {
      const m = mood[0], M = MOODS[m];
      if (!c.clue || c.clue.m !== m) {
        const near = [M.word, ...NEAR.filter((g) => g.includes(M.word)).flat()];
        const others = Object.keys(WORDS).filter((w) => !near.includes(w)).sort(() => Math.random() - 0.5).slice(0, 3);
        c.clue = { m, n: 1, tries: 0, ok: m === 'sleeping' ? 1 : 0, opts: [M.word, ...others].sort(() => Math.random() - 0.5), bad: [] };
      }
      return c.clue;
    };
    const sayMood = () => { const M = MOODS[mood[0]], q = clue(); say(M.signs[Math.min(M.signs.length, q.ok ? 3 : q.n) - 1 - (q.ok ? Math.floor(Math.random() * 3) : 0)] || M.signs[0]); };
    const paintThink = () => {
      const M = MOODS[mood[0]], q = clue();
      const list = q.ok ? [M.think[M.think.length - 1]] : M.think.slice(0, q.n);
      A.clear(think).append(h('i', { class: 'd1' }), h('i', { class: 'd2' }), h('div', { class: 'cb-cloud' + (q.ok ? ' ok' : '') }, ...list.map((e) => pic(e))));
    };
    const paintGuess = () => {
      const M = MOODS[mood[0]], q = clue(), nm = c.name || 'She';
      A.clear(guessBox);
      guessBox.classList.toggle('solved', !!q.ok);
      if (q.ok) { guessBox.append(h('div', { class: 'cb-g-ok' }, pic('💡'), h('div', null, h('b', null, 'You understand ' + (c.name || 'her') + '!'), h('div', { class: 'small' }, M.help[0]), h('small', { class: 'th muted' }, M.help[1])))); return; }
      guessBox.append(
        h('div', { class: 'cb-g-head' }, pic('💭'), h('div', null, h('b', null, nm + ' cannot talk. What is she feeling?'), h('small', { class: 'th muted' }, 'แมวพูดไม่ได้ ดูท่าทางแล้วทายว่าเธอรู้สึกอย่างไร'))),
        h('div', { class: 'cb-g-opts' }, ...q.opts.map((w) => h('button', { class: 'cb-g-o' + (q.bad.includes(w) ? ' bad' : ''), disabled: q.bad.includes(w) ? true : null, onclick: () => guess(w) }, h('b', null, 'She is ' + w), h('small', { class: 'th' }, WORDS[w])))),
        h('div', { class: 'row between' },
          h('button', { class: 'btn ghost cb-g-more', disabled: q.n >= 3 ? true : null, onclick: () => { q.n = Math.min(3, q.n + 1); A.track('cabin_clue', { m: mood[0], n: q.n }); save(); paintThink(); sayMood(); paintGuess(); } }, '👀 Watch closer (' + (3 - q.n) + ')'),
          h('small', { class: 'muted' }, 'First try: +5 pearls')));
    };
    const guess = (w) => {
      const M = MOODS[mood[0]], q = clue();
      A.speech.say('She is ' + w);
      if (w === M.word) {
        const pr = [5, 3, 2, 1][Math.min(3, q.tries)];
        q.ok = 1; c.bond = clamp(c.bond + (q.tries ? 1 : 2)); c.cnt.read = (c.cnt.read || 0) + 1; if (!q.tries) c.cnt.read1 = (c.cnt.read1 || 0) + 1;
        try { V.addPearls(pr); } catch (e) { /* ok */ }
        A.sfx.play('good'); A.track('cabin_guess', { m: mood[0], ok: 1, tries: q.tries });
        A.toast('💡 Yes! She is ' + w + ' · ' + WORDS[w] + '  (+' + pr + ' pearls)', 3200);
        happyEyes(1500); burst('✨', 3, 50, 35); SND.meow(); say(M.help, 6000);
      } else {
        q.tries++; q.bad.push(w); q.n = Math.min(3, q.n + 1);
        A.sfx.play('bad'); A.track('cabin_guess', { m: mood[0], ok: 0, w });
        anim('pull', 600); say(['Hmm… not ' + w + '. Watch her again.', 'ยังไม่ใช่ ลองดูท่าทางเธออีกที'], 3500);
      }
      save(); paint();
    };
    const NEEDS = [['hunger', '🍗', 'Food', 'อิ่ม', '#ff9a4a'], ['joy', '😸', 'Joy', 'สุข', '#ff6f91'], ['energy', '⚡', 'Energy', 'พลัง', '#ffc94a'], ['clean', '🫧', 'Clean fur', 'สะอาด', '#4fc3e6'], ['bond', '💖', 'Love', 'ความผูกพัน', '#c86bff']];
    const paint = () => {
      const t = now();
      mood = C.mood(st, c, t);
      const M = MOODS[mood[0]];
      const cls = 'cb-unit m-' + mood[0] + (mood[0] === 'scared' && c.own.t_box ? ' in-box' : '') + (flip._turn ? ' turned' : '');
      unit.className = cls;
      win.classList.toggle('storm', mood[0] === 'scared');
      scene.classList.toggle('dim', mood[0] === 'sleeping');
      if (mood[0] !== lastMood) { lastMood = mood[0]; clue(); sayMood(); if (mood[0] === 'scared') { discover(st, c, 'kraken'); SND.hiss(); } }
      const b = bondOf(c.bond), q = clue();
      paintThink(); paintGuess();
      A.clear(moodBox).append(
        q.ok ? h('div', { class: 'cb-mood-ic', style: { background: M.col } }, pic(M.e)) : h('div', { class: 'cb-mood-ic unknown' }, pic('❓')),
        h('div', { style: { flex: 1, minWidth: 0 } }, q.ok ? h('b', null, (c.name || 'She') + ' is ' + M.en.toLowerCase()) : h('b', null, (c.name || 'She') + ' seems…'), h('small', { class: 'th' }, q.ok ? M.th + ' · ' + mood[1] : 'Read the clues to find out')),
        h('div', { class: 'cb-bond' }, h('small', null, b[1]), h('div', { class: 'cb-hearts' }, ...[0, 1, 2, 3, 4].map((i) => h('i', { class: c.bond >= i * 20 + 10 ? 'on' : '' }, '♥')))));
      bars.classList.toggle('locked', !q.ok);
      if (!q.ok) { A.clear(bars).append(h('div', { class: 'cb-lock' }, pic('🔒'), h('div', null, h('b', null, 'Her needs are a secret'), h('small', { class: 'th' }, 'Guess her feeling first, then you can see her needs. · ทายความรู้สึกก่อน แล้วจะเห็นความต้องการของเธอ')))); }
      else A.clear(bars).append(...NEEDS.map(([k, e, en, th, col]) => {
        const v = Math.round(c[k]);
        return h('div', { class: 'cb-bar' + (v < 25 ? ' low' : '') }, pic(e), h('div', { style: { flex: 1 } }, h('div', { class: 'cb-bl' }, h('span', null, en, ' ', h('small', { class: 'th' }, th)), h('b', { class: 'num' }, v)), h('div', { class: 'cb-bt' }, h('i', { style: { width: v + '%', background: col } }))));
      }));
      goldEl.textContent = V.fmtN(s.gold);
      const nap = root.querySelector('.a-nap');
      if (nap) { const sl = mood[0] === 'sleeping'; nap.querySelector('b').textContent = sl ? 'Wake up' : 'Nap'; nap.querySelector('small').textContent = sl ? 'ปลุก' : 'นอน'; }
    };

    // ------------------------------------------------ little effects
    const burst = (e, n, x, y) => {
      for (let i = 0; i < n; i++) {
        const p = h('span', { class: 'cb-p', html: A.emoHTML(e), style: { left: (x + (Math.random() - 0.5) * 18) + '%', top: y + '%', animationDelay: (i * 0.12) + 's', '--dx': ((Math.random() - 0.5) * 80) + 'px' } });
        fx.append(p); setTimeout(() => p.remove(), 2200 + i * 120);
      }
    };
    const anim = (cls, ms) => { catBox.classList.remove(cls); void catBox.offsetWidth; catBox.classList.add(cls); setTimeout(() => catBox.classList.remove(cls), ms); };
    const blink = () => { if (/m-(sleeping)/.test(unit.className) || catBox.classList.contains('happy-eyes')) return; catBox.classList.add('blink'); setTimeout(() => catBox.classList.remove('blink'), 190); };
    const happyEyes = (ms) => { catBox.classList.add('happy-eyes'); clearTimeout(happyEyes.t); happyEyes.t = setTimeout(() => catBox.classList.remove('happy-eyes'), ms); };
    const turn = (to) => { flip._turn = to == null ? !flip._turn : to; anim('hop', 600); setTimeout(paint, 250); };
    const look = (dir) => { catBox.style.setProperty('--look', dir + 'deg'); clearTimeout(look.t); look.t = setTimeout(() => catBox.style.setProperty('--look', '0deg'), 1800); };

    // ------------------------------------------------ petting (tap or stroke the cat)
    const pets = [];
    let taps = [];
    const zoneAt = (e) => {
      const r = catBox.getBoundingClientRect();
      let x = (e.clientX - r.left) / r.width * 391; const y = (e.clientY - r.top) / r.height * 473;
      if (flip._turn) x = 391 - x;
      if (y < 255) { if (y > 180 && x > 170 && x < 270) return 'chin'; if (y > 125 && (x < 165 || x > 275)) return 'cheek'; return 'head'; }
      if (y > 395 && x > 215) return 'paws';
      return 'back';
    };
    const pet = (zone, ex, ey) => {
      const t = now(), M = mood[0];
      c.cnt.pet = (c.cnt.pet || 0) + 1;
      A.track('cabin_pet', { z: zone, m: M });
      if (M === 'sleeping') { c.wake = t; c.nap = 0; c.joy = clamp(c.joy - 3); SND.meow(true); paint(); say(['She opens one eye and looks at you. She was sleeping!', 'เธอลืมตาข้างเดียวมองเธอ เธอกำลังหลับอยู่'], 5000); if (thHour(t) >= c.pers.bed || thHour(t) < 6.5) discover(st, c, 'bed'); return save(); }
      if (M === 'scared') {
        c.calmPets = (c.calmPets || 0) + 1; burst('💖', 2, ex, ey); SND.purr(0.8);
        if (c.calmPets >= 3) { const kr = krInfo(st); if (kr) c.krCalm = kr.last; c.calmPets = 0; c.bond = clamp(c.bond + 3); happyEyes(2200); paint(); say(['She stops shaking and purrs. She feels safe now.', 'เธอหยุดสั่นและครางเบา ๆ ตอนนี้เธอรู้สึกปลอดภัยแล้ว'], 6000); }
        else say(['She pushes her head into your hand. She is still shaking a little.', 'เธอซุกหัวกับมือเธอ ยังตัวสั่นอยู่นิดหน่อย'], 0);
        return save();
      }
      if (M === 'excited') { const kr = krInfo(st); if (kr) c.krCalm = kr.last; }
      if (M === 'grumpy') { c.joy = clamp(c.joy - 2); anim('shake', 500); SND.hiss(); say(['She hisses softly and moves away.', 'เธอขู่เบา ๆ แล้วขยับหนี'], 4000); return save(); }
      pets.push(t); while (pets.length && t - pets[0] > 45000) pets.shift();
      if (pets.length > c.pers.petMax) {
        c.grumpy = t + 75000; pets.length = 0; c.joy = clamp(c.joy - 4); turn(true); SND.meow(true); discover(st, c, 'limit');
        setTimeout(() => turn(false), 8000);
        paint(); return save();
      }
      if (zone === 'paws') { c.joy = clamp(c.joy - 1); anim('pull', 600); say(['She pulls her paws away quickly.', 'เธอดึงอุ้งเท้าหนีอย่างเร็ว'], 4000); c.cnt.paws = (c.cnt.paws || 0) + 1; if (c.cnt.paws >= 2) discover(st, c, 'paws'); return save(); }
      const fav = zone === c.pers.spot && zone !== 'back';
      const hungry = c.hunger < 25;
      c.joy = clamp(c.joy + (hungry ? 2 : fav ? 8 : 4));
      c.bond = clamp(c.bond + (fav ? 1.4 : 0.7));
      if (c.lonely) { c.lonely--; if (!c.lonely) say(['She rubs against you again and again. She missed you!', 'เธอคลอเคลียไม่หยุด เธอคิดถึงเธอมาก'], 6000); }
      if (M === 'proud') c.proudDay = A.dkey();
      burst(fav ? '💖' : '❤️', fav ? 3 : 1, ex, ey);
      happyEyes(fav ? 2400 : 1300);
      catBox.style.setProperty('--lean', (zone === 'cheek' ? (ex < 50 ? -7 : 7) : zone === 'chin' ? -9 : 4) + 'deg');
      anim('lean', 1300);
      SND.purr(fav ? 2.2 : 1.2);
      if (fav) { c.cnt['spot_' + zone] = (c.cnt['spot_' + zone] || 0) + 1; if (c.cnt['spot_' + zone] >= 3) discover(st, c, 'spot'); if (Math.random() < 0.3) say(['She closes her eyes and leans in. She loves this spot!', 'เธอหลับตาและเอนเข้าหา เธอชอบตรงนี้มาก'], 4500); }
      else if (Math.random() < 0.12) say(['She purrs quietly.', 'เธอครางเบา ๆ'], 3500);
      save(); paintSoon();
    };
    let down = null, moved = 0, lastPet = 0;
    catBox.addEventListener('pointerdown', (e) => {
      if (busy) return;
      const t = now(); taps.push(t); taps = taps.filter((x) => t - x < 1500);
      if (taps.length >= 7) { taps = []; c.startle = t + 25000; c.joy = clamp(c.joy - 3); SND.hiss(); anim('jump', 700); paint(); save(); return; }
      down = { x: e.clientX, y: e.clientY }; moved = 0;
      try { catBox.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });
    catBox.addEventListener('pointermove', (e) => {
      if (!down) return;
      moved += Math.hypot(e.clientX - down.x, e.clientY - down.y); down = { x: e.clientX, y: e.clientY };
      if (moved > 40 && now() - lastPet > 450) { moved = 0; lastPet = now(); const r = scene.getBoundingClientRect(); pet(zoneAt(e), (e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100); }
    });
    catBox.addEventListener('pointerup', (e) => {
      if (!down) return; down = null;
      if (now() - lastPet > 450) { lastPet = now(); const r = scene.getBoundingClientRect(); pet(zoneAt(e), (e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100); }
    });
    // tapping the room: she looks where Alvee taps (and chases the laser)
    scene.addEventListener('pointerdown', (e) => {
      if (catBox.contains(e.target) || e.target.closest('button')) return;
      const r = scene.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
      if (laser.on) return laser.go(x, y);
      if (!/m-sleeping/.test(unit.className)) look(x < 50 ? -8 : 8);
    });
    const petHint = () => { if (mood[0] === 'sleeping') return pet('head', 50, 50); A.toast('✋ Stroke ' + (c.name || 'her') + ' with your finger. Try her head, cheeks or chin!', 3200); anim('lean', 900); };

    // ------------------------------------------------ feeding
    const bowl = (e) => { const b = h('div', { class: 'cb-bowl' }, pic('🥣', 'bw'), pic(e, 'fd')); fx.append(b); return b; };
    const feed = (id) => {
      const it = IT[id], M = mood[0];
      if (!c.inv[id]) return shop('food');
      if (c.hunger > 92) { say(['She sniffs the food and walks away. She is not hungry.', 'เธอดมอาหารแล้วเดินหนี เธอยังไม่หิว'], 4000); return; }
      if (M === 'sleeping') { c.wake = now(); c.nap = 0; }
      c.inv[id]--; if (!c.inv[id]) delete c.inv[id];
      const fav = id === c.pers.food;
      c.hunger = clamp(c.hunger + it[6].h); c.joy = clamp(c.joy + it[6].j + (fav ? 14 : 0)); c.bond = clamp(c.bond + (fav ? 3 : 1));
      if (c.startle) c.startle = 0;
      c.cnt.fed = (c.cnt.fed || 0) + 1; if (fav) { c.cnt.favFood = (c.cnt.favFood || 0) + 1; if (c.cnt.favFood >= 2) discover(st, c, 'food'); }
      A.track('cabin_feed', { id, fav: fav ? 1 : 0 });
      busy = 1; const b = bowl(it[1]); catBox.classList.add('eat'); SND.crunch(5);
      setTimeout(() => { catBox.classList.remove('eat'); b.remove(); busy = 0; happyEyes(1600); burst(fav ? '💖' : '✨', fav ? 4 : 2, 50, 40); SND.meow(); paint();
        say(fav ? ['She eats every bit and licks the bowl clean. She loves it!', 'เธอกินหมดและเลียชามจนเกลี้ยง เธอชอบมาก'] : A.pick([['She eats happily.', 'เธอกินอย่างมีความสุข'], ['She licks her lips. Her tummy is full.', 'เธอเลียปาก ท้องอิ่มแล้ว']]), 5000); }, 2100);
      save();
    };
    const feedSheet = () => {
      const foods = ITEMS.filter((x) => x[5] === 'food' && c.inv[x[0]]);
      const sh = A.sheet(h('div', { class: 'stack' }, h('h2', null, '🍽️ Feed ' + (c.name || 'her')), h('p', { class: 'small th muted' }, 'เลือกอาหาร · Food bar: ' + Math.round(c.hunger) + '%'),
        foods.length ? h('div', { class: 'cb-grid' }, ...foods.map((x) => h('button', { class: 'cb-item', onclick: () => { sh.close(); feed(x[0]); } }, pic(x[1]), h('b', null, x[2]), h('small', { class: 'th' }, x[3]), h('span', { class: 'pill' }, '×' + c.inv[x[0]]))))
          : h('div', { class: 'note' }, 'No food left. Buy some in the shop, or open chests on the map: they can hold cat food!'),
        h('button', { class: 'btn ghost block', onclick: () => { sh.close(); shop('food'); } }, '🛒 Buy food')));
    };

    // ------------------------------------------------ playing
    const laser = { on: false, el: null, go() {} };
    const play = (id) => {
      const it = IT[id], M = mood[0], t = now();
      if (M === 'sleeping') { pet('head', 50, 50); return; }
      if (M === 'scared') { say(['She hides from the toy. She is too scared to play.', 'เธอหลบของเล่น เธอกลัวเกินกว่าจะเล่น'], 4500); return; }
      if (c.hunger < 20) { say(['She looks at the toy, then at her bowl.', 'เธอมองของเล่น แล้วมองชามอาหาร'], 4000); return; }
      if (c.energy < 15) { say(['She watches the toy but does not move.', 'เธอมองของเล่นแต่ไม่ขยับ'], 4000); return; }
      c.toyLog = (c.toyLog || []).filter((x) => t - x[1] < 10 * MIN); const same = c.toyLog.filter((x) => x[0] === id).length;
      c.toyLog.push([id, t]);
      const fav = id === c.pers.toy, bored = same >= 2 && id !== 't_laser';
      c.joy = clamp(c.joy + (bored ? 3 : fav ? 18 : 11)); c.energy = clamp(c.energy - 10); c.bond = clamp(c.bond + (bored ? 0.3 : 1.2)); c.hunger = clamp(c.hunger - 3);
      c.lastPlay = t; c.cnt.play = (c.cnt.play || 0) + 1; if (M === 'proud') c.proudDay = A.dkey();
      if (fav && !bored) { c.cnt.favToy = (c.cnt.favToy || 0) + 1; if (c.cnt.favToy >= 2) discover(st, c, 'toy'); }
      A.track('cabin_play', { id, fav: fav ? 1 : 0 });
      save();
      const kind = it[6].p;
      if (kind === 'laser') return startLaser();
      busy = 1;
      const toy = h('span', { class: 'cb-toy k-' + kind, html: A.emoHTML(it[1]) }); fx.append(toy);
      if (kind === 'box') { unit.classList.add('in-box'); toy.classList.add('k-boxfront'); }
      catBox.classList.add('play-' + kind);
      const end = () => { toy.remove(); catBox.classList.remove('play-' + kind); unit.classList.remove('in-box'); busy = 0; happyEyes(1500); burst(fav ? '💖' : '✨', fav ? 4 : 2, 50, 40); paint();
        say(bored ? ['She yawns at the toy. She played with it too many times.', 'เธอหาวใส่ของเล่น เล่นอันนี้บ่อยเกินไปแล้ว'] : fav ? ['She runs in circles. That is her favourite game!', 'เธอวิ่งวน นี่คือเกมโปรดของเธอ'] : A.pick([['She had fun!', 'เธอสนุกมาก'], ['She looks at you for more.', 'เธอมองเธอเหมือนอยากเล่นอีก'], ['She caught it!', 'เธอจับได้แล้ว']]), 5000); if (!bored) SND.meow(); };
      setTimeout(end, kind === 'box' ? 4200 : 3000);
    };
    const startLaser = () => {
      laser.on = true; busy = 1;
      const dot = h('i', { class: 'cb-laser' }); fx.append(dot);
      say(['Tap anywhere in the room. She will chase the red dot!', 'แตะที่ไหนก็ได้ในห้อง เธอจะไล่จับจุดแดง'], 0);
      laser.go = (x, y) => { dot.style.left = x + '%'; dot.style.top = y + '%'; look(x < 50 ? -10 : 10); anim('pounce', 520); if (x < 38 && !flip._turn) turn(true); else if (x > 62 && flip._turn) turn(false); };
      laser.go(30, 70);
      setTimeout(() => { laser.on = false; dot.remove(); busy = 0; if (flip._turn) turn(false); happyEyes(1500); burst('✨', 3, 50, 40); paint(); say(['She looks everywhere for the red dot.', 'เธอมองหาจุดแดงทุกที่'], 5000); }, 9000);
    };
    const playSheet = () => {
      const toys = ITEMS.filter((x) => x[5] === 'toy' && c.own[x[0]]);
      const sh = A.sheet(h('div', { class: 'stack' }, h('h2', null, '🧶 Play with ' + (c.name || 'her')), h('p', { class: 'small th muted' }, 'เลือกของเล่น · Energy: ' + Math.round(c.energy) + '%'),
        h('div', { class: 'cb-grid' }, ...toys.map((x) => h('button', { class: 'cb-item', onclick: () => { sh.close(); play(x[0]); } }, pic(x[1]), h('b', null, x[2]), h('small', { class: 'th' }, x[3])))),
        h('button', { class: 'btn ghost block', onclick: () => { sh.close(); shop('toy'); } }, '🛒 More toys')));
    };

    // ------------------------------------------------ brushing, napping
    const brush = () => {
      if (!c.own.x_brush) { A.toast('🪮 You need a soft brush first. Find it in the shop.'); return shop('tool'); }
      if (mood[0] === 'sleeping' || mood[0] === 'scared' || busy) return pet('head', 50, 50);
      const itchy = c.clean < 25;
      c.clean = clamp(c.clean + 40); c.joy = clamp(c.joy + (itchy ? 12 : 5)); c.bond = clamp(c.bond + 1);
      A.track('cabin_brush', {}); save();
      busy = 1; const b = h('span', { class: 'cb-toy k-brush', html: A.emoHTML('🪮') }); fx.append(b); SND.purr(2.6); happyEyes(2600);
      setTimeout(() => { b.remove(); busy = 0; burst('🫧', 4, 50, 55); paint(); say(itchy ? ['She stops scratching. Her fur is soft again.', 'เธอหยุดเกา ขนนุ่มอีกครั้ง'] : ['Her fur is soft and shiny.', 'ขนเธอนุ่มและเงางาม'], 5000); }, 2600);
    };
    const napOrWake = () => {
      const t = now();
      if (mood[0] === 'sleeping') return pet('head', 50, 50);
      if (c.energy > 75 && mood[0] !== 'drowsy') { say(['She jumps off the bed. She is not sleepy.', 'เธอกระโดดลงจากที่นอน เธอยังไม่ง่วง'], 4000); return; }
      c.nap = t + (c.energy < 40 ? 60 : 30) * MIN; c.wake = 0; A.track('cabin_nap', {}); save(); paint();
    };

    // ------------------------------------------------ shop
    const shop = (tab) => {
      const TABS = [['food', '🍽️', 'Food'], ['toy', '🧶', 'Toys'], ['wear', '🎀', 'Style'], ['decor', '🪴', 'Cabin'], ['tool', '🪮', 'Care']];
      let cur = tab || 'food';
      const sh = A.sheet(h('div'));
      const draw = () => {
        const list = ITEMS.filter((x) => x[5] === cur);
        sh.setContent(h('div', { class: 'stack' },
          h('div', { class: 'row between' }, h('h2', null, '🛒 Cat shop'), h('span', { class: 'cb-gold' }, V.coinEl(), h('span', { class: 'num' }, V.fmtN(s.gold)))),
          h('div', { class: 'cb-tabs' }, ...TABS.map(([k, e, n]) => h('button', { class: 'cb-tab' + (k === cur ? ' on' : ''), onclick: () => { cur = k; draw(); } }, pic(e), n))),
          h('div', { class: 'cb-grid' }, ...list.map((x) => {
            const [id, e, n, th, price, kind] = x, owned = kind === 'food' ? c.inv[id] || 0 : c.own[id];
            const chestOnly = !price;
            let btn;
            if (chestOnly) btn = h('span', { class: 'pill ' + (owned ? 'sea' : 'grey') }, owned ? (kind === 'food' ? '×' + owned : '✓ Found') : '🎁 Only in chests');
            else if (kind !== 'food' && owned) btn = h('span', { class: 'pill sea' }, '✓ Yours');
            else btn = h('button', { class: 'btn ' + (s.gold >= price ? 'mango' : 'ghost') + ' cb-buy', disabled: s.gold >= price ? null : true, onclick: () => buy(id, draw) }, V.coinEl(), ' ' + price);
            return h('div', { class: 'cb-item' + (chestOnly && !owned ? ' secret' : '') }, pic(chestOnly && !owned ? '🎁' : e), h('b', null, chestOnly && !owned ? '???' : n), h('small', { class: 'th' }, chestOnly && !owned ? 'หาได้จากหีบสมบัติ' : th),
              kind === 'food' && owned && !chestOnly ? h('small', { class: 'muted' }, 'You have ' + owned) : null, btn);
          })),
          h('p', { class: 'tiny muted th' }, '🎁 Chests on the map can also hold cat food, toys and special treasures. · หีบสมบัติก็มีของให้แมวด้วย')));
      };
      draw();
    };
    const buy = (id, redraw) => {
      const it = IT[id];
      if (s.gold < it[4]) return;
      s.gold -= it[4]; C.give(st, id);
      if (it[5] === 'decor') { c.decor[id] = 1; c.newT = now(); paintDecor(); }
      if (it[5] === 'wear') { c.wear = id; c.newT = now(); paintWear(); }
      A.track('cabin_buy', { id, g: it[4] }); A.sfx.play('done'); A.toast(it[1] + ' ' + it[2] + ' is yours!');
      save(); paint(); redraw && redraw();
    };

    // ------------------------------------------------ style + decorate
    const styleSheet = () => {
      const sh = A.sheet(h('div'));
      const draw = () => {
        const wears = ITEMS.filter((x) => x[5] === 'wear' && c.own[x[0]]), decs = ITEMS.filter((x) => x[5] === 'decor' && c.own[x[0]]);
        sh.setContent(h('div', { class: 'stack' }, h('h2', null, '🎀 Style and cabin'),
          h('div', { class: 'sec-title' }, 'Wear'),
          wears.length ? h('div', { class: 'cb-grid' }, h('button', { class: 'cb-item' + (!c.wear ? ' on' : ''), onclick: () => { c.wear = null; paintWear(); save(); draw(); } }, pic('🐱'), h('b', null, 'Nothing')),
            ...wears.map((x) => h('button', { class: 'cb-item' + (c.wear === x[0] ? ' on' : ''), onclick: () => { c.wear = x[0]; c.newT = now(); paintWear(); save(); paint(); draw(); } }, pic(x[1]), h('b', null, x[2]))))
            : h('div', { class: 'note' }, 'No bows or hats yet. Buy one, or find a crown in a chest!'),
          h('div', { class: 'sec-title' }, 'Cabin things'),
          decs.length ? h('div', { class: 'cb-grid' }, ...decs.map((x) => h('button', { class: 'cb-item' + (c.decor[x[0]] ? ' on' : ''), onclick: () => { c.decor[x[0]] = c.decor[x[0]] ? 0 : 1; if (c.decor[x[0]]) c.newT = now(); paintDecor(); save(); paint(); draw(); } }, pic(x[1]), h('b', null, x[2]), h('small', null, c.decor[x[0]] ? 'In the cabin' : 'Put out'))))
            : h('div', { class: 'note' }, 'Make the cabin cosy: plants, a fish bowl, a candle… from the shop.'),
          h('button', { class: 'btn ghost block', onclick: () => { sh.close(); shop('wear'); } }, '🛒 Shop')));
      };
      draw();
    };

    // ------------------------------------------------ the cat diary (what she has found out)
    const diary = () => {
      const b = bondOf(c.bond), nextB = BONDS.find((x) => x[0] > c.bond);
      A.sheet(h('div', { class: 'stack' },
        h('div', { class: 'cb-diary-head' }, h('img', { src: 'img/cabin/cat_head.webp', alt: '' }), h('div', null, h('h2', null, (c.name || 'Your cat') + '’s diary'), h('div', { class: 'small' }, b[1] + ' · ' + b[2]), h('div', { class: 'tiny muted' }, nextB ? 'Next: ' + nextB[1] + ' at ' + nextB[0] + ' love' : 'The closest friends there are'))),
        h('p', { class: 'small th muted' }, 'Care for her to find out who she is. Every secret gives +3 pearls. · ดูแลเธอเพื่อรู้จักเธอมากขึ้น'),
        h('div', { class: 'cb-disc' }, ...DISC.map(([k, e, n, val]) => h('div', { class: 'cb-dc' + (c.known[k] ? ' on' : '') }, pic(c.known[k] ? e : '❓'), h('div', null, h('b', null, n), h('small', null, c.known[k] ? val(c) : 'Not found yet'))))),
        h('div', { class: 'cb-reader' }, pic('💭'), h('div', null, h('b', null, 'Cat reader: understood ' + (c.cnt.read || 0) + ' times'), h('small', null, (c.cnt.read1 || 0) + ' on the first try'))),
        h('div', { class: 'small muted' }, 'Meals: ' + (c.cnt.fed || 0) + ' · Games: ' + (c.cnt.play || 0) + ' · Pets: ' + (c.cnt.pet || 0)),
        h('button', { class: 'btn ghost block', onclick: () => nameSheet(true) }, '✏️ Change her name')));
    };

    // ------------------------------------------------ her photo
    const photoSheet = () => {
      const sh = A.sheet(h('div', { class: 'stack', style: { textAlign: 'center' } },
        h('h2', null, '📸 My photo'), h('p', { class: 'small th muted' }, 'Your photo hangs on the cabin wall, next to your cat. · รูปของเธอบนผนังห้อง'),
        PHOTO ? h('img', { class: 'cb-photo-big', src: PHOTO, alt: '' }) : null,
        h('button', { class: 'btn mango block', onclick: () => { sh.close(); pickPhoto(paintPhoto); } }, PHOTO ? '🔄 Change photo' : '📷 Choose a photo'),
        PHOTO ? h('button', { class: 'btn ghost block', onclick: async () => { try { await A.api.setPhoto(null); PHOTO = null; paintPhoto(); } catch (e) { /* offline */ } sh.close(); } }, 'Remove photo') : null));
    };

    // ------------------------------------------------ naming her (first visit)
    const nameSheet = (again) => {
      const inp = h('input', { class: 'input', value: c.name || 'Mango', maxlength: '16', 'aria-label': 'Cat name' });
      const sh = A.sheet(h('div', { class: 'stack', style: { textAlign: 'center' } },
        h('img', { class: 'cb-meet', src: 'img/cabin/cat_full.webp', alt: '' }),
        h('h2', null, again ? 'Her name' : 'A little cat came on board!'),
        again ? null : h('p', null, 'She lives with you in the boat cabin now. Feed her, play with her and keep her safe from the Kraken.'),
        again ? null : h('p', { class: 'small th muted' }, 'แมวน้อยขึ้นเรือมาแล้ว เธออยู่ในห้องของเราบนเรือ ให้อาหาร เล่นด้วย และปกป้องเธอจากคราเคน'),
        h('b', null, 'What is her name?'), inp,
        h('button', { class: 'btn mango block', onclick: () => { const n = String(inp.value || '').trim().slice(0, 16) || 'Mango'; c.name = n; A.track('cabin_name', { n }); save(); sh.close(); A.go('cabin'); } }, again ? 'Save' : '🐱 Welcome aboard!')), { noX: !again });
      setTimeout(() => inp.focus(), 300);
    };

    // ------------------------------------------------ saving + life loop
    function save() { A.saveSoon(); }
    let ps = 0; const paintSoon = () => { clearTimeout(ps); ps = setTimeout(paint, 400); };
    paintWear(); paintDecor(); paint();
    if (!c.name) setTimeout(() => nameSheet(false), 350);
    else if (c.lonely) setTimeout(() => SND.meow(true), 600);
    let tickN = 0, nextIdle = now() + 5000, nextBlink = now() + 2500;
    const loop = setInterval(() => {
      if (!root.isConnected) { clearInterval(loop); return; }
      const t = now();
      if (mood && mood[0] === 'sleeping' && tickN % 3 === 0) burst('💤', 1, 64, 30);
      if (t > nextBlink) { blink(); nextBlink = t + 2200 + Math.random() * 4200; }
      if (++tickN % 30 === 0) { C.tick(c, t); paint(); }
      if (t > nextIdle && !busy) {
        nextIdle = t + 6000 + Math.random() * 7000;
        const M = mood[0];
        if (M === 'sleeping') { if (Math.random() < 0.3) anim('twitch', 700); return; }
        if (M === 'scared') { anim('shake', 900); return; }
        const r = Math.random();
        if (r < 0.22) look(Math.random() < 0.5 ? -9 : 9);
        else if (r < 0.36) { anim('sit', 1400); }
        else if (r < 0.48) { anim('stretch', 1600); }
        else if (r < 0.6 && M !== 'grumpy') { turn(true); say(['She turns and watches the sea.', 'เธอหันไปดูทะเล'], 4000); c.cnt.sea = (c.cnt.sea || 0) + 1; if (c.cnt.sea >= 3) discover(st, c, 'sea'); setTimeout(() => turn(false), 4500); }
        else if (r < 0.7) anim('yawn', 1500);
        else if (r < 0.8 && (M === 'hungry' || M === 'lonely' || M === 'playful' || M === 'itchy')) { SND.meow(M !== 'playful'); sayMood(); }
      }
    }, 1000);
    return root;
  };

  // ------------------------------------------------------------------ doors into the cabin
  C.meTile = (st) => {
    const c = C.st(st); C.tick(c);
    const m = C.mood(st, c), M = MOODS[m[0]];
    return h('button', { class: 'me-tile mt-cabin', onclick: () => A.go('cabin') },
      h('img', { class: 'mt-cat', src: 'img/cabin/cat_full.webp', alt: '' }),
      h('span', { class: 'mt-pic', html: A.emoHTML('🐱') }),
      h('b', null, c.name ? c.name + '’s Cabin' : 'My Cat Cabin'), h('small', { class: 'th' }, 'ห้องแมวในเรือ'),
      h('span', { class: 'mt-sub' }, !c.name ? '✨ Someone is waiting…' : c.clue && c.clue.m === m[0] && c.clue.ok ? M.e + ' ' + M.en : '💭 What is she feeling?'));
  };
  C.homeCard = (st) => {
    const c = st.cabin; if (!c || !c.name) return null;
    C.tick(c);
    const m = C.mood(st, c); if (!['hungry', 'scared', 'lonely', 'itchy', 'proud', 'excited', 'playful', 'worried'].includes(m[0])) return null;
    const M = MOODS[m[0]], l = M.signs[0];
    return h('button', { class: 'card cb-home', onclick: () => A.go('cabin') }, h('img', { src: 'img/cabin/cat_head.webp', alt: '' }),
      h('div', { style: { flex: 1, minWidth: 0, textAlign: 'left' } }, h('b', null, '💭 Something is on ' + c.name + '’s mind…'), h('div', { class: 'small' }, l[0]), h('div', { class: 'tiny th muted' }, l[1])),
      h('span', { class: 'pill' }, 'Go ›'));
  };
})();
