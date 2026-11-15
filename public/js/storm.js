/* storm.js — Storm Echoes. Every question she gets wrong becomes a little storm cloud.
   Unit tests end with a Storm Round: three of those clouds come back. Answer one right and the storm
   clears into a 🌈 rainbow pearl for her Storm Jar. Miss it again and the cloud grows (☁️ → 🌧️ → ⛈️). */
(function () {
  'use strict';
  const A = window.AE, h = A && A.h;
  if (!A || !A.RENDER) return;
  const OK_TYPES = ['gap', 'pick', 'build', 'listen', 'reply', 'wfit', 'pic', 'typegap', 'dict'];
  const CLOUD = ['', '☁️', '🌧️', '⛈️'];
  const CLOUD_N = ['', 'Little cloud', 'Rain cloud', 'Thunderstorm'];
  const CLOUD_TH = ['', 'เมฆก้อนเล็ก', 'เมฆฝน', 'พายุฝนฟ้าคะนอง'];

  // the first time, her earlier mistakes (kept in her word memory) become the first clouds
  const seed = (st) => Object.keys(st.srs || {}).filter((id) => st.srs[id].w > 0 && (id.startsWith('s:') ? A.S(id.slice(2)) : A.C.dict[id.slice(2)]))
    .sort((a, b) => st.srs[b].w - st.srs[a].w).slice(0, 24)
    .map((id) => ({ i: id, t: id.startsWith('w:') ? 'wfit' : 'gap', sid: id.startsWith('s:') ? id.slice(2) : undefined, key: id.startsWith('w:') ? id.slice(2) : undefined, lv: Math.min(3, st.srs[id].w), at: Date.now() }));
  const box = (st) => { const S = st.storm || (st.storm = { list: seed(st), calm: 0, log: [] }); S.list = S.list || []; S.log = S.log || []; S.calm = S.calm || 0; return S; };
  const S_ = {
    box,
    add(st, step) {
      if (!step || !step.item || !OK_TYPES.includes(step.type)) return;
      const S = box(st), cur = S.list.find((e) => e.i === step.item);
      if (cur) { cur.lv = Math.min(3, (cur.lv || 1) + (step.storm ? 1 : 0)); cur.t = step.type; cur.at2 = Date.now(); return; }
      S.list.push({ i: step.item, t: step.type, sid: step.sid || undefined, key: step.key || undefined, lv: 1, at: Date.now() });
      if (S.list.length > 60) { S.list.sort((a, b) => (b.lv || 1) - (a.lv || 1) || b.at - a.at); S.list.length = 60; }
    },
    waiting: (st) => box(st).list.length,
    settle(st, ses) {
      const storms = ses.steps.filter((x) => x.storm && x.item && !x.retry);
      if (!storms.length) return null;
      const S = box(st), calmed = [], stayed = [];
      storms.forEach((x) => {
        const ok = ses.items[x.item] === true;
        const e = S.list.find((y) => y.i === x.item);
        const label = x.sid && A.S(x.sid) ? A.S(x.sid).en : x.key && A.C.dict[x.key] ? A.fill(A.C.dict[x.key].w) : x.item;
        if (ok) {
          S.list = S.list.filter((y) => y.i !== x.item);
          S.calm++; S.log.unshift({ i: x.item, at: Date.now(), lv: x.storm });
          if (S.log.length > 40) S.log.length = 40;
          calmed.push({ label, lv: x.storm });
        } else stayed.push({ label, lv: e ? e.lv : x.storm });
      });
      A.track('storm_round', { calmed: calmed.length, stayed: stayed.length });
      if (calmed.length && A.voyage && A.voyage.addPearls) { try { A.voyage.addPearls(calmed.length * 2, st); } catch (e) { /* pearls are extras */ } }
      return { calmed, stayed, total: S.calm };
    },
    label(step) {
      const lv = step.storm || 1;
      return h('div', { class: 'storm-tag lv' + lv }, h('span', { class: 'storm-ic' }, CLOUD[lv]), h('div', null, h('b', null, 'Storm Echo · ' + CLOUD_N[lv]), h('small', { class: 'th' }, 'คุณเคยตอบข้อนี้ผิด ตอบให้ถูกเพื่อสยบพายุ')));
    },
    resultBlock(r) {
      return h('div', { class: 'card storm-res' },
        h('div', { class: 'row', style: { gap: '10px' } }, h('span', { style: { fontSize: '2rem' } }, r.calmed.length ? '🌈' : '⛈️'),
          h('div', null, h('b', null, r.calmed.length ? 'You calmed ' + r.calmed.length + ' storm' + (r.calmed.length > 1 ? 's' : '') + '!' : 'The storms are still here'),
            h('div', { class: 'small muted th' }, r.calmed.length ? '+' + r.calmed.length + ' rainbow pearl · +' + r.calmed.length * 2 + ' pearls · ไข่มุกสายรุ้ง' : 'They will come back in the next test. You can do it! · ครั้งหน้าลองอีกนะ'))),
        h('div', { class: 'storm-list' },
          ...r.calmed.map((x) => h('div', { class: 'storm-li ok' }, h('span', null, CLOUD[x.lv] + '→🌈'), h('span', null, x.label))),
          ...r.stayed.map((x) => h('div', { class: 'storm-li no' }, h('span', null, CLOUD[x.lv] || '☁️'), h('span', null, x.label)))),
        h('div', { class: 'tiny muted' }, '🫙 Storm Jar: ' + r.total + ' rainbow pearl' + (r.total === 1 ? '' : 's')));
    },
    // the jar card (Me page and treasure page)
    jar(st) {
      const S = box(st), by = [0, 0, 0, 0];
      S.list.forEach((e) => { by[e.lv || 1]++; });
      const pearls = Math.min(S.calm, 24);
      const jar = '<svg viewBox="0 0 90 110" class="jar-svg" aria-hidden="true"><defs><linearGradient id="jarg" x1="0" x2="1"><stop offset="0" stop-color="#cfefff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#bfe3ff" stop-opacity=".55"/></linearGradient></defs>' +
        '<rect x="28" y="6" width="34" height="12" rx="4" fill="#c99a5b"/><path d="M24 20h42c6 6 10 14 10 26v44c0 9-7 16-16 16H30c-9 0-16-7-16-16V46c0-12 4-20 10-26z" fill="url(#jarg)" stroke="#9cc9e6" stroke-width="2"/>' +
        Array.from({ length: pearls }, (_, i) => { const col = ['#ff7a8a', '#ffb347', '#ffe066', '#7be0a0', '#6cc6ff', '#a98bff'][i % 6], x = 26 + (i % 6) * 8 + ((i / 6 | 0) % 2) * 4, y = 96 - (i / 6 | 0) * 8; return '<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + col + '" stroke="#fff" stroke-width="1"/>'; }).join('') +
        '<path d="M22 40c2-8 6-14 10-18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7" fill="none"/></svg>';
      return h('div', { class: 'card storm-jar' },
        h('div', { class: 'jar-pic', html: jar }),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { class: 'sec-title' }, '🫙 Storm Jar'),
          h('div', { class: 'small muted th' }, 'Every mistake becomes a cloud. Tests bring 3 back. Answer right → 🌈 · คำตอบผิดกลายเป็นเมฆ ตอบถูกในการสอบ = ไข่มุกสายรุ้ง'),
          h('div', { class: 'jar-row' },
            h('span', { class: 'jar-chip rb' }, '🌈 ' + S.calm),
            ...[1, 2, 3].map((lv) => (by[lv] ? h('span', { class: 'jar-chip lv' + lv, title: CLOUD_N[lv] + ' · ' + CLOUD_TH[lv] }, CLOUD[lv] + ' ' + by[lv]) : null)))));
    },
  };
  A.storm = S_;

  // the gate before the Storm Round
  A.RENDER.stormgate = (step, ctl) => {
    A.sfx && A.sfx.play && A.sfx.play('bad');
    return h('div', { class: 'storm-gate' },
      h('div', { class: 'sg-sky', 'aria-hidden': 'true' }, h('i', { class: 'bolt b1' }), h('i', { class: 'bolt b2' }), ...Array.from({ length: 14 }, (_, i) => h('i', { class: 'drop', style: { left: (i * 7 + 3) + '%', animationDelay: (i * 0.13) + 's' } }))),
      h('div', { class: 'sg-ic' }, '⛈️'),
      h('h2', null, 'Storm Round'),
      h('p', null, step.n + ' question' + (step.n > 1 ? 's' : '') + ' you missed before ' + (step.n > 1 ? 'have' : 'has') + ' come back.'),
      h('p', { class: 'th' }, 'ข้อที่คุณเคยตอบผิดกลับมาแล้ว ' + step.n + ' ข้อ ตอบให้ถูกเพื่อสยบพายุ'),
      h('div', { class: 'sg-prize' }, 'Each right answer: 🌈 rainbow pearl + 2 pearls'),
      h('button', { class: 'btn primary block', onclick: () => ctl.next() }, '⚡ Face the storm'));
  };
})();
