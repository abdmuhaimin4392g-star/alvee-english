/* admin.js — your private dashboard: presence, every step, mistakes, progress, messages */
(function () {
  'use strict';
  const A = window.AE, C = A.C, h = A.h, D = C.dict;
  const app = () => document.getElementById('app');
  const ADM = (A.admin = { cur: 'live', uid: null, learners: [], events: [], since: 0, data: null, timer: null, filter: 'all', showAudio: false });

  const EXL = { wfit: 'Word fits sentence', focus: 'Extra practice', w2th: 'Word → Thai', th2w: 'Thai → word', pic: 'Picture → word', listenw: 'Listen → word', match: 'Match pairs', gap: 'Fill the gap', build: 'Build sentence', pick: 'Correct sentence', meaning: 'Meaning', listen: 'Listening', reply: 'Reply', talk: 'Role-play' };

  ADM.start = async () => {
    // the demo page: /?sbx=<her id> opens her app with a copy of her progress (shown inside the Demo tab)
    const sbx = new URLSearchParams(location.search).get('sbx');
    if (sbx && A.sandbox && A.sandbox.auto) return A.sandbox.auto(sbx);
    A.view = 'admin';
    ADM.learners = await A.api.learners();
    ADM.uid = ADM.uid && ADM.learners.some((l) => l.id === ADM.uid) ? ADM.uid : (ADM.learners[0] && ADM.learners[0].id);
    ADM.events = []; ADM.since = 0;
    await ADM.refresh(true);
    clearInterval(ADM.timer);
    ADM.timer = setInterval(() => { if (A.view === 'admin' && document.visibilityState === 'visible') ADM.refresh(false); }, 4000);
  };
  ADM.tab = (t) => { ADM.cur = t; ADM.render(); };

  ADM.refresh = async (full) => {
    if (!ADM.uid) return ADM.render();
    try {
      ADM.learners = await A.api.learners();
      const evs = await A.api.events(ADM.uid, ADM.since);
      if (evs.length) {
        ADM.since = evs[evs.length - 1].t;
        // answers to the old translation questions don't count any more
        ADM.events = ADM.events.concat(evs.filter((e) => !(e.type === 'answer' && ['w2th', 'th2w', 'match', 'meaning'].includes(e.ex))));
      }
      if (full || evs.length || !ADM.data) ADM.data = await A.api.learner(ADM.uid);
    } catch (e) { /* keep last data */ }
    if (full) ADM.render(); else ADM.update();
  };

  const L = () => ADM.learners.find((l) => l.id === ADM.uid);
  const stOf = () => { const st = A.fixState(ADM.data && ADM.data.state); if (ADM.boostKey !== String(st.boost)) { ADM.boostKey = String(st.boost); try { A.applyBoost(st); if (A.voyage) A.voyage.resetRoute(); } catch (e) { /* extras */ } } return st; };

  // ---------------------------------------------------------------- frame
  ADM.render = () => {
    const root = A.clear(app());
    const s = h('div', { class: 'screen full adm' });
    s.append(A.topStrip());
    s.append(h('div', { class: 'topbar' },
      h('div', { class: 'hello' }, h('h1', null, 'Dashboard'), h('p', null, 'Only you can see this page' + (A.api.mode === 'demo' ? ' · preview mode' : ''))),
      h('button', { class: 'btn ghost', style: { minHeight: '40px', padding: '8px 12px' }, onclick: async () => { clearInterval(ADM.timer); await A.api.logout(); A.user = null; A.go('login'); } }, 'Log out')));
    if (!ADM.uid) { s.append(h('div', { class: 'card' }, 'No learner account yet. Create one in Settings.')); root.append(s); return; }
    s.append(h('div', { id: 'adm-status' }, statusCard()));
    s.append(h('button', { class: 'card talk-item sbx-open', onclick: () => ADM.tab('demo') }, h('div', { class: 'av' }, '🎮'), h('div', { style: { flex: 1 } }, h('b', null, 'Play her app (demo copy)'), h('div', { class: 'small muted' }, 'Her screens with a copy of her progress. Nothing you do reaches her account or this dashboard.')), h('span', { class: 'muted' }, '›')));
    const tabs = [['demo', '📱 Demo'], ['live', '⚡ Live'], ['watch', '📺 Her screen'], ['control', '🎮 Control Room'], ['insights', '🧠 Insights'], ['progress', '📈 Progress'], ['ptest', '🧭 Personality'], ['voice', '🎙️ Voice'], ['mistakes', '❌ Mistakes'], ['words', '📚 Words'], ['msgs', '💌 Messages'], ['settings', '⚙️ Settings']];
    s.append(h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, t]) => h('button', { class: 'chip' + (ADM.cur === k ? ' on' : ''), role: 'tab', 'aria-selected': ADM.cur === k ? 'true' : 'false', onclick: () => ADM.tab(k) }, t))));
    s.append(h('div', { id: 'adm-body', class: 'stack', style: { gap: '14px' } }, body()));
    root.append(s);
  };
  ADM.update = () => {
    const stEl = document.getElementById('adm-status');
    if (stEl) A.clear(stEl).append(statusCard());
    if (ADM.cur === 'live') { const b = document.getElementById('adm-body'); if (b) { const y = window.scrollY; A.clear(b).append(body()); window.scrollTo(0, y); } }
  };
  function body() {
    if (ADM.cur === 'demo') return demo();
    if (ADM.cur === 'voice') return voiceTab();
    if (ADM.cur === 'live') return live();
    if (ADM.cur === 'progress') return progress();
    if (ADM.cur === 'ptest') return personality();
    if (ADM.cur === 'insights') return insights();
    if (ADM.cur === 'control') return control();
    if (ADM.cur === 'watch') return watch();
    if (ADM.cur === 'mistakes') return mistakes();
    if (ADM.cur === 'words') return words();
    if (ADM.cur === 'msgs') return messages();
    return settings();
  }

  function statusCard() {
    const l = L();
    if (!l) return h('div');
    const p = l.presence;
    const doing = !p ? 'Has not opened the app yet'
      : p.screen === 'lesson' ? `Doing “${p.title || p.node}” — step ${p.step}/${p.total}`
        : p.screen === 'logged out' ? 'Logged out' : 'On the ' + (p.screen || 'home') + ' screen';
    return h('div', { class: 'card status' },
      h('span', { class: 'dot' + (l.online ? ' on' : '') }),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('b', null, l.name + (l.online ? ' is online now' : ' is offline')),
        h('div', { class: 'small muted' }, l.online ? doing : 'Last seen ' + A.ago(l.lastSeen) + (p ? ' · ' + doing.toLowerCase() : ''))),
      l.online ? h('span', { class: 'pill good' }, 'LIVE') : null);
  }

  // ---------------------------------------------------------------- live
  function todayStats() {
    const st = stOf(), d = st.days[A.dkey()] || {};
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const evs = ADM.events.filter((e) => e.t >= start.getTime());
    const ans = evs.filter((e) => e.type === 'answer' && !e.retry);
    return { min: Math.round(A.studySec(d) / 60), app: Math.round(A.appSec(d) / 60), xp: d.xp || 0, les: evs.filter((e) => e.type === 'lesson_end').length, ans: ans.length, wrong: ans.filter((e) => !e.ok).length, looks: evs.filter((e) => e.type === 'lookup').length };
  }
  function live() {
    const t = todayStats();
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    box.append(h('div', { class: 'kpis' },
      kpi(t.min + 'm', 'Study today'), kpi(t.app + 'm', 'On app today'), kpi(t.xp, 'XP today'), kpi(t.les, 'Lessons done'),
      kpi(t.ans ? Math.round(((t.ans - t.wrong) / t.ans) * 100) + '%' : '–', 'Correct today'), kpi(t.wrong, 'Mistakes today'), kpi(t.looks, 'Words looked up')));
    const filters = [['all', 'All steps'], ['answers', 'Answers'], ['mistakes', 'Mistakes'], ['lookups', 'Looked up'], ['lessons', 'Lessons']];
    box.append(h('div', { class: 'row wrap' }, filters.map(([k, t2]) => h('button', { class: 'chip' + (ADM.filter === k ? ' on' : ''), onclick: () => { ADM.filter = k; ADM.update(); } }, t2)),
      h('button', { class: 'chip' + (ADM.showAudio ? ' on' : ''), onclick: () => { ADM.showAudio = !ADM.showAudio; ADM.update(); } }, '🔊 audio taps')));
    box.append(feed());
    return box;
  }
  const kpi = (v, label) => h('div', { class: 'kpi' }, h('b', null, v), h('span', null, label));
  function feed(limit) {
    let evs = ADM.events.slice().reverse();
    const f = ADM.filter;
    if (!ADM.showAudio) evs = evs.filter((e) => e.type !== 'audio');
    if (f === 'answers') evs = evs.filter((e) => e.type === 'answer');
    if (f === 'mistakes') evs = evs.filter((e) => e.type === 'answer' && !e.ok);
    if (f === 'lookups') evs = evs.filter((e) => e.type === 'lookup' || e.type === 'hint');
    if (f === 'lessons') evs = evs.filter((e) => /lesson_|talk_read/.test(e.type));
    evs = evs.slice(0, limit || 250);
    const list = h('div', { class: 'card feed', style: { padding: '4px 12px' } });
    if (!evs.length) {
      list.append(h('div', { class: 'stack', style: { padding: '14px 2px' } }, h('b', null, 'Nothing here yet'),
        h('div', { class: 'small muted' }, A.api.mode === 'demo' ? 'Log out, log in as alvee / 1234, play a lesson, then come back here — or fill the dashboard with a sample week in Settings.' : 'Her steps will appear here as soon as she starts.')));
      return list;
    }
    let lastDay = '';
    evs.forEach((e) => {
      const dk = A.dkey(e.t);
      if (dk !== lastDay) { lastDay = dk; list.append(h('div', { class: 'small muted', style: { padding: '10px 0 4px', fontWeight: 700 } }, dayLabel(dk))); }
      list.append(evRow(e));
    });
    return list;
  }
  function dayLabel(dk) {
    const t = A.dkey(), y = A.dkey(Date.now() - 864e5);
    return dk === t ? 'Today' : dk === y ? 'Yesterday' : new Date(dk + 'T12:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function evRow(e) {
    let icon = '•', main = e.type, detail = null, bad = false;
    switch (e.type) {
      case 'login': icon = '🔑'; main = 'Logged in'; detail = shortUA(e.dev); break;
      case 'logout': icon = '🚪'; main = 'Logged out'; break;
      case 'app_open': icon = '📱'; main = 'Opened the app'; detail = shortUA(e.ua); break;
      case 'app_show': icon = '👀'; main = 'Came back to the app'; break;
      case 'app_hide': icon = '💤'; main = 'Left the app'; detail = e.screen ? 'from ' + e.screen : null; break;
      case 'lesson_start': icon = '▶️'; main = 'Started: ' + (e.title || e.node); detail = e.kind + ' · ' + e.steps + ' steps'; break;
      case 'lesson_end': icon = e.passed ? '🏁' : '❗'; main = (e.passed ? 'Finished: ' : 'Did not pass: ') + (e.title || e.node); detail = `${e.acc}% correct · ${e.wrong} mistakes · +${e.xp} XP · ${Math.max(1, Math.round(e.secs / 60))} min · ${e.looks || 0} look-ups${e.badges ? ' · badge ' + e.badges : ''}${e.lvl ? ' · level ' + e.lvl : ''}`; bad = !e.passed; break;
      case 'lesson_quit': icon = '🚪'; main = 'Quit ' + e.node; detail = 'at step ' + e.at + '/' + e.of; bad = true; break;
      case 'answer': {
        icon = e.ok ? '✅' : '❌'; bad = !e.ok;
        main = (EXL[e.ex] || e.ex) + (e.retry ? ' (2nd try)' : '') + (e.rev ? ' · review' : '');
        detail = h('span', null, e.q ? h('span', null, '“' + e.q + '” ') : null, h('br'),
          e.ok ? h('span', { class: 'right' }, e.a) : h('span', null, h('span', { class: 'yours' }, e.a || '—'), ' → ', h('span', { class: 'right' }, e.c || '')),
          e.ms ? h('span', { class: 'muted' }, ' · ' + (e.ms / 1000).toFixed(1) + 's') : null);
        break;
      }
      case 'lookup': icon = '🔎'; main = 'Looked up “' + e.w + '”'; detail = e.s ? 'in: ' + e.s : null; break;
      case 'hint': icon = '🇹🇭'; main = 'Showed the Thai translation'; detail = e.th; break;
      case 'tip_view': icon = '📖'; main = 'Read grammar tip'; detail = e.tip; break;
      case 'talk_read': icon = '💬'; main = 'Read the conversation'; detail = e.talk; break;
      case 'msg_read': icon = '💌'; main = 'Read your message'; break;
      case 'audio': icon = '🔊'; main = 'Played audio' + (e.slow ? ' (slow)' : ''); detail = e.text; break;
      case 'rest_day_used': icon = '🧊'; main = 'Used ' + e.days + ' rest day(s)'; break;
      case 'collect': icon = e.k === 'pearl' ? '⚪' : e.k === 'shell' ? '🐚' : e.k === 'boat' ? '⛵' : '💎'; main = (e.gift ? 'Picked up your gift: ' : 'Picked up ') + (e.k === 'pearl' ? (e.n || 1) + ' pearl(s)' : e.k === 'shell' ? 'a ' + (A.voyage.shell(e.id) || [0, 'shell'])[1] : e.k === 'boat' ? A.voyage.boat(e.id).n : ((A.treasure.byId[e.id] || [])[2] || 'treasure')); break;
      case 'quest_claim': icon = '📜'; main = 'Finished a daily quest'; detail = '+' + e.got + ' pearls'; break;
      case 'boat_unlock': icon = '⛵'; main = 'Bought a boat: ' + A.voyage.boat(e.id).n; detail = (e.g != null ? e.g + ' gold' : e.p + ' pearls'); break;
      case 'sell': icon = '🪙'; main = 'Sold ' + e.n + ' ' + e.k + ' pearl' + (e.n > 1 ? 's' : ''); detail = '+' + e.gold + ' gold'; break;
      case 'boat_select': icon = '⛵'; main = 'Now sailing: ' + A.voyage.boat(e.id).n; break;
      case 'test_timeup': icon = '⏰'; main = 'Time ran out in a test'; detail = e.unanswered + ' questions not answered'; break;
      case 'ptest_open': icon = '🧭'; main = 'Opened the personality test'; detail = (e.n ? e.n + ' of 60 answered' : 'not started yet') + (e.from ? ' · from the ' + ({ map: 'voyage map', me: 'Me page', note: 'notification' }[e.from] || e.from) : ''); break;
      case 'ptest_answer': { const q = ptQ(e.q); icon = '🧭'; main = 'Personality Q' + (q ? q.n : '?') + ': ' + ptLabel(e.v) + (e.change ? ' (changed)' : ''); detail = q ? q.en : e.q; break; }
      case 'ptest_explain': { const q = ptQ(e.q); icon = '💡'; main = 'Opened “Explain more” on personality Q' + (q ? q.n : '?'); detail = q ? q.en : e.q; break; }
      case 'ptest_pause': icon = '⏸️'; main = 'Paused the personality test'; detail = e.n + ' of 60 answered'; break;
      case 'ptest_done': { const T = window.PTEST && window.PTEST.types[String(e.code || '').slice(0, 4)]; icon = '🏆'; main = 'Finished the personality test: ' + e.code; detail = (T ? T.n + ' · ' : '') + (e.mins || '?') + ' min'; break; }
      case 'admin_reset': icon = '↺'; main = 'You reset ' + (e.what || 'lessons'); detail = (e.n || 0) + ' finished steps cleared'; break;
      case 'night_mode': icon = '🌙'; main = 'Night mode: ' + e.v; break;
      case 'install_help': case 'install_prompt': case 'app_installed': icon = '📲'; main = e.type === 'app_installed' ? 'Installed the app' : 'Looked at how to install the app'; break;
      default: detail = JSON.stringify(e).slice(0, 80);
    }
    return h('div', { class: 'ev' + (bad ? ' bad' : '') }, h('span', { class: 'i' }, icon), h('div', null, h('div', null, main), detail ? h('div', { class: 'd' }, detail) : null), h('span', { class: 'tm' }, A.clock(e.t)));
  }
  function shortUA(ua) {
    if (!ua) return null;
    if (/iPhone/.test(ua)) return 'iPhone'; if (/iPad/.test(ua)) return 'iPad'; if (/Android/.test(ua)) return 'Android';
    if (/Mac/.test(ua)) return 'Mac'; if (/Windows/.test(ua)) return 'Windows'; return null;
  }

  // ---------------------------------------------------------------- 🎙️ Voice: record the whole course with a real American voice (server/voice.js)
  function voiceTab() {
    const box = h('div', { class: 'stack vc-tab', style: { gap: '12px' } }, h('div', { class: 'card' }, 'Loading…'));
    let timer = null;
    const call = (p, b) => A.api.call(p, b);
    async function draw() {
      let d; try { d = await call('admin/voice'); } catch (e) { box.replaceChildren(h('div', { class: 'card' }, '⚠️ ' + e.message)); return; }
      if (!document.body.contains(box) && timer) { clearInterval(timer); return; }
      const pct = d.total ? Math.round((d.have / d.total) * 100) : 0;
      const msg = h('div', { class: 'small', style: { minHeight: '1.2em' } });
      const err = (e) => { msg.textContent = '⚠️ ' + (e.message || e); };
      const keyIn = h('input', { class: 'input', type: 'password', autocomplete: 'off', placeholder: d.hasKey ? 'Saved key ends in …' + d.keyEnd + ' (paste to replace)' : 'Paste your Google API key' });
      let pick = d.voice || d.voices[0][0];
      const cards = h('div', { class: 'vc-voices' }, ...d.voices.map(([id, name, desc]) => h('label', { class: 'vc-v' + (pick === id ? ' on' : '') },
        h('input', { type: 'radio', name: 'vc', checked: pick === id ? true : null, onchange: (ev) => { pick = id; [...cards.children].forEach((c) => c.classList.toggle('on', c.contains(ev.target))); } }),
        h('div', { style: { flex: 1 } }, h('b', null, name), h('div', { class: 'small muted' }, desc)),
        h('button', { class: 'chip', disabled: d.hasKey ? null : true, onclick: async (e) => { e.preventDefault(); const b = e.currentTarget; b.textContent = '…'; try { const r = await call('admin/voice/sample', { voice: id }); const a = new Audio(r.audio); a.play().catch((x) => err(x)); b.textContent = '▶ Play'; } catch (x) { b.textContent = '▶ Play'; err(x); } } }, '▶ Play'))));
      const j = d.job || {};
      const bar = h('div', { class: 'vc-bar' }, h('i', { style: { width: pct + '%' } }));
      const usingPack = d.pack && !d.voice && !d.off;
      box.replaceChildren(
        d.pack ? h('div', { class: 'card stack', style: { gap: '8px', borderLeft: '5px solid #0e8a8a' } },
          h('b', null, usingPack ? '✅ She hears the free built-in voice: ' + d.pack.v : '🎙️ Free built-in voice: ' + d.pack.v),
          h('div', { class: 'small muted' }, d.pack.n + ' lines recorded with an open American voice (Kokoro). No key, no billing, nothing to set up.' + (d.off ? ' · The real voice is OFF for her now.' : '')),
          !usingPack ? h('button', { class: 'btn block', onclick: async () => { await call('admin/voice/pack', {}); if (d.off) await call('admin/voice/off', { off: false }); draw(); } }, '✅ Use the built-in voice') : null,
          h('button', { class: 'btn ghost block', onclick: async () => { await call('admin/voice/off', { off: !d.off }); draw(); } }, d.off ? '▶ Turn the real voice ON for her' : '⏸ Turn the real voice OFF for her')) : null,
        h('div', { class: 'small muted', style: { padding: '0 4px' } }, 'Optional: Google voices (needs a Google Cloud account with billing).'),
        h('div', { class: 'card stack', style: { gap: '8px' } },
          h('b', null, '🎙️ Google voice (optional)'),
          h('div', { class: 'small muted' }, 'Records every English line of the course once (' + d.total + ' lines, about ' + Math.round(d.chars / 1000) + 'k characters) with a Google Chirp 3 HD voice and keeps the files on your server. Google gives 1 million characters free each month, so this should cost nothing. Lines without a recording keep the phone voice.'),
          h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('div', { class: 'vc-bar-wrap', style: { flex: 1 } }, bar), h('b', null, pct + '%')),
          h('div', { class: 'small' }, d.have + ' of ' + d.total + ' lines recorded' + (d.voice ? ' · voice: ' + d.voice.split('-').pop() : '') + (d.off ? ' · turned OFF for her' : '')),
          j.on ? h('div', { class: 'small' }, '⏺ Recording… ' + j.done + ' done' + (j.fail ? ' · ' + j.fail + ' failed' : '') + ' · ' + Math.max(0, j.total - j.done - j.fail) + ' to go') : j.err ? h('div', { class: 'small', style: { color: '#c0392b' } }, '⚠️ Last error: ' + j.err) : null),
        h('div', { class: 'card stack', style: { gap: '8px' } },
          h('b', null, '1 · Google key'),
          h('div', { class: 'small muted' }, d.hasKey ? '✅ A key is saved on the server.' : 'Google Cloud Console → new project → turn on billing → APIs & Services → enable “Cloud Text-to-Speech API” → Credentials → Create credentials → API key → restrict it to Cloud Text-to-Speech API.'),
          h('div', { class: 'row', style: { gap: '8px' } }, keyIn, h('button', { class: 'btn', onclick: async () => { msg.textContent = 'Checking the key with Google…'; try { await call('admin/voice/key', { key: keyIn.value }); msg.textContent = '✅ Key saved'; draw(); } catch (e) { err(e); } } }, 'Save'))),
        h('div', { class: 'card stack', style: { gap: '8px' } }, h('b', null, '2 · Choose the voice'), cards),
        h('div', { class: 'card stack', style: { gap: '8px' } },
          h('b', null, '3 · Record'),
          j.on ? h('button', { class: 'btn block', onclick: async () => { await call('admin/voice/stop', {}); draw(); } }, '⏹ Stop') :
            h('button', { class: 'btn mango block', disabled: d.hasKey ? null : true, onclick: async () => { try { await call('admin/voice/start', { voice: pick }); msg.textContent = 'Started'; setTimeout(draw, 800); } catch (e) { err(e); } } }, d.voice && pick === d.voice && d.have ? '⏺ Record the missing ' + (d.total - d.have) + ' lines' : '⏺ Record all ' + d.total + ' lines with this voice'),
          d.have && !d.pack ? h('button', { class: 'btn ghost block', onclick: async () => { await call('admin/voice/off', { off: !d.off }); draw(); } }, d.off ? '▶ Turn the real voice ON for her' : '⏸ Turn the real voice OFF for her') : null,
          h('div', { class: 'small muted' }, 'She can also switch it on or off on her Me page. Changing the voice records everything again in the new voice.')),
        msg);
      if (j.on && !timer) timer = setInterval(() => { if (!document.body.contains(box)) { clearInterval(timer); timer = null; return; } draw(); }, 2500);
      if (!j.on && timer) { clearInterval(timer); timer = null; }
    }
    draw();
    return box;
  }

  // ---------------------------------------------------------------- the Demo tab: her app in a phone frame (an iframe of /?sbx=<id>)
  function demo() {
    const l = L(); if (!l) return h('div', { class: 'card' }, 'Loading…');
    const url = (fresh) => location.pathname + '?sbx=' + encodeURIComponent(ADM.uid) + (fresh ? '&new=' + Date.now() : '&t=' + Date.now());
    const frame = h('iframe', { class: 'demo-frame', title: 'Her app (demo copy)', src: url(false), allow: 'autoplay' });
    const has = !!A.store.get('ae.sbx.' + ADM.uid, null);
    return h('div', { class: 'stack demo-tab', style: { gap: '12px' } },
      h('div', { class: 'demo-head' }, h('div', null, h('b', null, '🎮 ' + l.name + '’s app · demo copy'), h('div', { class: 'small muted' }, (has ? 'Your saved demo copy. ' : 'A new copy of her progress. ') + 'Nothing here reaches her account.')),
        h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } },
          h('button', { class: 'chip', onclick: () => { frame.src = url(false); } }, '↻ Reload'),
          h('button', { class: 'chip', onclick: () => { frame.src = url(true); } }, '📥 Fresh copy'),
          h('a', { class: 'chip', href: url(false), target: '_blank', rel: 'noopener' }, '⛶ Full screen'))),
      h('div', { class: 'demo-phone' }, h('div', { class: 'demo-notch' }), frame));
  }

  // ---------------------------------------------------------------- play a demo copy of her app (sandbox.js)
  function playSheet() {
    const l = L(); if (!l || !A.sandbox) return;
    const has = !!A.store.get('ae.sbx.' + ADM.uid, null);
    const go = (fresh) => { sh.close(); A.sandbox.start(ADM.uid, l, ADM.data && ADM.data.state, fresh); };
    const sh = A.sheet(h('div', { class: 'stack', style: { gap: '10px' } },
      h('h2', null, '🎮 Play her app'),
      h('p', { class: 'small muted' }, 'You see exactly what ' + l.name + ' sees, with a copy of her progress. Play lessons, the map, the test, anything. It is saved only on this phone, never on the server: her account, her feed and this dashboard do not change.'),
      has ? h('button', { class: 'btn block', onclick: () => go(false) }, '▶ Go on with my demo copy') : null,
      h('button', { class: 'btn ' + (has ? 'ghost ' : '') + 'block', onclick: () => go(true) }, has ? '📥 Start again from a fresh copy of her account' : '▶ Make a copy and play'),
      h('div', { class: 'small muted' }, 'Tap “Exit” at the top (or Log out in her app) to come back here.')));
  }

  // ---------------------------------------------------------------- personality test (her answers, one by one)
  const ptQ = (id) => { const P = window.PTEST; if (!P) return null; const i = P.qs.findIndex((q) => q.id === id); return i < 0 ? null : { ...P.qs[i], n: i + 1 }; };
  const ptLabel = (v) => { const P = window.PTEST, x = P && P.scale.find((s) => s[0] === v); return x ? x[1] : String(v); };
  function personality() {
    const P = window.PTEST, PT = A.ptest, box = h('div', { class: 'stack', style: { gap: '14px' } });
    if (!P || !PT) return box;
    const st = stOf(), p = PT.st(st), n = PT.count(p), N = P.qs.length, sc = PT.score(p);
    const DIMN = { mind: 'Mind', energy: 'Energy', nature: 'Nature', tactics: 'Tactics', identity: 'Identity' };
    const explained = Object.keys(p.x || {}).filter((k) => p.x[k] > 0);
    const last = Object.values(p.a).reduce((m, r) => Math.max(m, r[1] || 0), 0);
    const status = p.done ? 'Finished ' + new Date(p.done).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · took about ' + Math.max(1, Math.round((p.done - (p.start || p.done)) / 60000)) + ' min'
      : n ? 'In progress: ' + n + ' of ' + N + ' answered · last answer ' + A.ago(last) : 'Not started yet. It opens on her phone every time she opens the voyage map.';
    box.append(h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('b', null, '🧭 What kind of sailor is she?'), h('span', { class: 'pill ' + (p.done ? 'good' : n ? 'sea' : 'grey') }, p.done ? 'Done' : n + ' / ' + N)),
      h('div', { class: 'small muted' }, status),
      h('div', { class: 'small muted' }, '60 questions on the five scales of the 16 personalities model, in English with Thai. She opened “Explain more” on ' + explained.length + ' question' + (explained.length === 1 ? '' : 's') + '.')));
    const res = p.done && p.res ? p.res : n ? { code: sc.code, id: sc.id, full: sc.full, pct: sc.pct } : null;
    if (res) {
      const T = P.types[res.code];
      box.append(h('div', { class: 'card stack pt-adm-res' },
        h('div', { class: 'small muted' }, p.done ? 'Her result' : 'So far she leans towards (not final yet)'),
        h('div', { class: 'row', style: { gap: '14px', alignItems: 'center' } }, h('div', { style: { fontSize: '2.6rem' } }, T.ic),
          h('div', { style: { flex: 1 } }, h('div', { class: 'pt-adm-code' }, res.full), h('b', null, T.n), h('div', { class: 'small muted' }, T.th))),
        h('div', { class: 'small' }, ((window.PTPROF || {})[res.code] || {}).intro ? window.PTPROF[res.code].intro[0] : T.en),
        h('div', { class: 'small muted' }, P.ident[res.id][0]),
        ...P.dims.map((d) => {
          const letter = d.k === 'identity' ? res.id : res.code['mind energy nature tactics'.split(' ').indexOf(d.k)], pa = res.pct[d.k], lead = letter === d.a ? pa : 100 - pa;
          return h('div', { class: 'pt-adm-scl' },
            h('div', { class: 'row between small' }, h('span', { class: letter === d.a ? 'b' : 'muted' }, P.poles[d.k][d.a][0] + ' ' + d.a), h('span', { class: 'muted tiny' }, DIMN[d.k]), h('span', { class: letter === d.b ? 'b' : 'muted' }, d.b + ' ' + P.poles[d.k][d.b][0])),
            h('div', { class: 'pt-bar ' + d.k + (letter === d.b ? ' r' : '') }, h('i', { style: { width: lead + '%' } })),
            h('div', { class: 'tiny muted', style: { textAlign: letter === d.b ? 'right' : 'left' } }, lead + '% ' + P.poles[d.k][letter][0] + ' · ' + sc.dims[d.k].n + ' answers'));
        })));
    }
    // every question with her answer
    ADM.ptDim = ADM.ptDim || 'all';
    const chips = h('div', { class: 'row wrap' }, [['all', 'All 60'], ['mind', 'Mind E/I'], ['energy', 'Energy N/S'], ['nature', 'Nature T/F'], ['tactics', 'Tactics J/P'], ['identity', 'Identity A/T'], ['explained', '💡 Explained']].map(([k, t]) => h('button', { class: 'chip' + (ADM.ptDim === k ? ' on' : ''), onclick: () => { ADM.ptDim = k; ADM.render(); } }, t)));
    const list = h('div', { class: 'card feed', style: { padding: '4px 12px' } });
    P.qs.forEach((q, i) => {
      if (ADM.ptDim === 'explained' ? !(p.x[q.id] > 0) : ADM.ptDim !== 'all' && q.dim !== ADM.ptDim) return;
      const r = p.a[q.id], v = r ? r[0] : null, d = P.dims.find((x) => x.k === q.dim);
      const toward = v == null || v === 0 ? null : v > 0 ? q.pole : q.pole === d.a ? d.b : d.a;
      list.append(h('div', { class: 'ev pt-adm-q' + (r ? '' : ' none') },
        h('span', { class: 'i' }, q.ic),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', null, h('b', null, 'Q' + (i + 1) + ' '), q.en),
          h('div', { class: 'd th' }, q.th),
          h('div', { class: 'row wrap', style: { gap: '6px', marginTop: '4px' } },
            r ? h('span', { class: 'pill ' + (v > 0 ? 'good' : v < 0 ? 'pt-dg' : 'grey') }, ptLabel(v)) : h('span', { class: 'pill grey' }, 'not answered yet'),
            toward ? h('span', { class: 'tiny muted' }, '→ ' + toward + ' (' + P.poles[q.dim][toward][0].toLowerCase() + ')') : null,
            p.x[q.id] ? h('span', { class: 'tiny muted' }, '💡 explained ×' + p.x[q.id]) : null,
            h('span', { class: 'tiny muted' }, DIMN[q.dim] + ': agree = ' + q.pole))),
        h('span', { class: 'tm' }, r ? A.clock(r[1]) : '')));
    });
    if (!list.childNodes.length) list.append(h('div', { class: 'small muted', style: { padding: '12px 0' } }, 'Nothing here yet.'));
    box.append(h('div', { class: 'stack', style: { gap: '8px' } }, h('b', null, 'Her answers'), chips, list));
    if (n || p.done) box.append(h('button', { class: 'btn ghost block', onclick: async () => {
      if (!confirm('Let her take the personality test again from question 1? Her answers now are kept in the archive on the server.')) return;
      try { await A.api.resetPart(ADM.uid, { ptest: 1, label: 'the personality test' }); A.toast('Done — it starts again the next time she opens the map'); await ADM.refresh(true); } catch (e) { A.toast('Could not reset: ' + e.message); }
    } }, '↺ Let her take the test again'));
    return box;
  }

  // ---------------------------------------------------------------- progress
  function progress() {
    const st = stOf(), l = L(), cfg = l.cfg || {};
    const xp = A.totalXP(st), lvl = A.level(xp);
    const V = A.voyage, R = V.route(), cur = V.curIndex(st), isl = R.main[cur];
    const totalNodes = A.nodes.length, doneNodes = A.nodes.filter((n) => st.done[n.id]).length;
    const days = Object.entries(st.days);
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    box.append(h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('b', null, 'Chapter ' + (cur + 1) + ' of ' + R.main.length + ' · ' + isl.name), h('span', { class: 'pill sea' }, V.SEAS[isl.sea].en)),
      h('div', { class: 'progress' }, h('i', { style: { width: Math.round((doneNodes / totalNodes) * 100) + '%' } })),
      h('div', { class: 'small muted' }, `No fixed timeline: she sails at her own pace. She has finished ${doneNodes} of ${totalNodes} islands (lessons, conversations and timed tests) and ${Object.keys(V.st(st).side).length} side missions.`)));
    const secs = days.reduce((a, [, d]) => a + A.studySec(d), 0), appSecs = days.reduce((a, [, d]) => a + A.appSec(d), 0);
    const n = days.reduce((a, [, d]) => a + (d.n || 0), 0), ok = days.reduce((a, [, d]) => a + (d.ok || 0), 0);
    box.append(h('div', { class: 'kpis' },
      kpi(xp, 'Total XP'), kpi(lvl, 'Level · ' + A.title(lvl)[1]), kpi(A.streak(st) + '🔥', 'Learning days'),
      kpi(A.wordCount(st), 'Words learned'), kpi(days.filter(([, d]) => d.xp > 0).length, 'Days studied'), kpi(A.fmtMin(secs), 'Study time'), kpi(A.fmtMin(appSecs), 'Time on app'),
      kpi(n ? Math.round(ok / n * 100) + '%' : '–', 'First-try correct'), kpi(A.dueItems(st).length, 'Due for review')));
    // 21-day chart
    const bars = h('div', { class: 'bars', role: 'img', 'aria-label': 'Minutes studied per day, last 21 days' });
    const vals = [];
    for (let i = 20; i >= 0; i--) { const k = A.dkey(Date.now() - i * 864e5); vals.push([k, Math.round(A.studySec(st.days[k]) / 60), Math.round(A.appSec(st.days[k]) / 60)]); }
    const max = Math.max(5, ...vals.map((v) => v[2]));
    vals.forEach(([k, v, ap], i) => bars.append(h('div', { class: 'b two' + (i === 20 ? ' today' : '') }, h('i', { class: 'app', style: { height: Math.round((ap / max) * 100) + '%' }, title: k + ': ' + ap + ' min on the app' }), h('i', { style: { height: Math.round((v / max) * 100) + '%' }, title: k + ': ' + v + ' min studying' }), h('span', null, i % 3 === 2 || i === 20 ? (i === 20 ? 'today' : k.slice(8)) : ''))));
    box.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, 'Minutes per day'), h('span', { class: 'small muted' }, 'last 3 weeks · max ' + max + 'm')), bars, h('div', { class: 'small muted' }, '▮ study (lessons, words, grammar, talks) · ▯ total time on the app')));
    // journey grid with reset: tap a lesson to reset it, or reset a whole unit / month
    const grid = h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, 'Lessons'), h('span', { class: 'small muted' }, 'Tap ↺ to reset')),
      h('div', { class: 'small muted' }, 'Reset makes her do it again. Other lessons, her streak, medals and history stay.'));
    A.voyage.SEAS.forEach((sea, si) => {
      const units = C.units.filter((u) => u.id >= sea.from && u.id <= sea.to && A.nodes.some((x) => x.u === u.id));
      const mNodes = A.nodes.filter((x) => units.some((u) => u.id === x.u));
      grid.append(h('div', { class: 'row between month-reset' }, h('b', { class: 'small' }, 'Sea ' + (si + 1) + ' · ' + sea.en), resetBtn('Reset sea ' + (si + 1), mNodes, 'month')));
      units.forEach((u) => {
        const ns = A.nodes.filter((x) => x.u === u.id);
        grid.append(h('div', { class: 'row', style: { gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { class: 'small', style: { width: '52px', flex: 'none' } }, u.deco + ' U' + u.id),
          ns.map((x) => { const d = st.done[x.id]; return h('button', { class: 'pill ' + (d ? (d.a >= 90 ? 'good' : d.a >= 70 ? 'sea' : 'mango') : 'grey'), title: A.nodeTitle(x).en + (d ? ' — tap to reset' : ''), onclick: () => { if (d) resetSheet([x], A.nodeTitle(x).en); } }, d ? d.a + '% ↺' : A.nodeTitle(x).icon); }),
          resetBtn('Reset unit ' + u.id, ns, 'unit')));
      });
    });
    box.append(grid);
    return box;
  }

  // ---------------------------------------------------------------- her screen, live
  function watch() {
    const box = h('div', { class: 'stack', style: { gap: '10px' } });
    const meta = h('div', { class: 'card watch-meta' }, h('span', { class: 'small muted' }, 'Connecting to her phone…'));
    const frame = h('iframe', { class: 'live-frame', title: 'Her screen', sandbox: 'allow-same-origin', referrerpolicy: 'no-referrer' });
    const phone = h('div', { class: 'phone' }, h('div', { class: 'phone-notch' }), frame);
    box.append(meta, phone, h('div', { class: 'small muted' }, 'Her phone only sends its screen while this tab is open. She is not told and sees nothing different. It updates about once a second while the app is open on her phone.'));
    let lastHtml = '', lastT = 0;
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    const tick = async () => {
      if (!box.isConnected || ADM.cur !== 'watch') return;
      try {
        const lv = await A.api.liveGet(ADM.uid);
        const l = L() || {};
        if (lv && Date.now() - lv.t < 15000) {
          A.clear(meta).append(h('div', { class: 'row between' }, h('b', null, (l.online ? '🟢 ' : '🟡 ') + (l.name || 'Alvee') + ' is on: ' + (lv.title || lv.view || '')), h('span', { class: 'small muted' }, A.ago(lv.t))),
            h('div', { class: 'small muted' }, (lv.step ? 'Step ' + lv.step + ' of ' + lv.total + ' · ' : '') + (lv.timer || '')));
          if (lv.html && lv.html !== lastHtml) {
            lastHtml = lv.html;
            frame.srcdoc = `<!doctype html><html class="${lv.dark ? 'dark' : ''}"><head><meta charset="utf-8"><base href="${base}"><link rel="stylesheet" href="styles.css"><style>body{pointer-events:none;margin:0}.nav{position:fixed}</style></head><body>${lv.html}</body></html>`;
            frame.onload = () => { try { frame.contentWindow.scrollTo(0, lv.sx || 0); } catch (e) { /* ignore */ } };
          } else if (lv.t !== lastT) { try { frame.contentWindow.scrollTo(0, lv.sx || 0); } catch (e) { /* ignore */ } }
          lastT = lv.t;
        } else {
          A.clear(meta).append(h('b', null, '⚪ Her app is not open right now'), h('div', { class: 'small muted' }, 'As soon as she opens it, her screen appears here (within ~20 seconds).'));
        }
      } catch (e) { /* offline */ }
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 50);
    return box;
  }

  // ---------------------------------------------------------------- control room
  function control() {
    const st = stOf(), V = A.voyage, s = V.st(st), T = A.treasure;
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    const ctlBox = h('div', { class: 'stack', style: { gap: '14px' } }, h('div', { class: 'small muted' }, 'Loading…'));
    const R = V.route(), cur = V.curIndex(st), isl = R.main[cur], sea = V.SEAS[isl.sea];
    box.append(h('div', { class: 'card ctl-sum' },
      h('div', { class: 'cs-boat', html: V.boatPic(s.boat) }),
      h('div', { style: { flex: 1 } }, h('b', null, 'Chapter ' + (cur + 1) + ' of ' + R.main.length + ': ' + isl.name), h('div', { class: 'small muted' }, sea.en + ' · boat: ' + V.boat(s.boat).n),
        h('div', { class: 'row wrap small', style: { gap: '10px', marginTop: '6px' } }, h('span', null, V.pearlEl(), ' ' + V.pearlTotal(st) + ' pearls'), h('span', null, '🪙 ' + s.gold + ' gold'), h('span', null, '🔑 ' + s.keys), h('span', null, '🐚 ' + V.shellCount(st)), h('span', null, '💎 ' + V.treCount(st) + '/' + T.ITEMS.length), h('span', null, '🧭 ' + Object.keys(s.side).length + ' side'), h('span', null, '⛵ ' + s.boats.length + ' boats'))),
      h('button', { class: 'btn', style: { minHeight: '42px' }, onclick: () => herMap(st) }, '🗺️ Her map')));
    box.append(ctlBox);
    (async () => {
      let c = {};
      try { c = await A.api.adminCtl(ADM.uid); } catch (e) { /* offline */ }
      A.clear(ctlBox).append(...controlCards(c, st));
    })();
    return box;
  }
  async function setCtl(body, msg) {
    try { await A.api.setCtl(ADM.uid, body); A.toast(msg || 'Sent to her phone'); ADM.tab('control'); }
    catch (e) { A.toast(e.message || 'Could not save'); }
  }
  function controlCards(c, st) {
    const V = A.voyage, T = A.treasure, s = V.st(st), R = V.route();
    const out = [];
    // maintenance screen (closes her app for a while, e.g. while a big update is prepared)
    out.push(h('div', { class: 'card stack maint-card' + (c.maint ? ' on' : '') },
      h('b', null, '🛠️ Maintenance screen: ' + (c.maint ? 'ON' : 'OFF')),
      h('div', { class: 'small' }, c.maint ? 'Her app shows “Upgrading your voyage” and she cannot use it. Turn it off when the update is ready.' : 'She can use the app normally.'),
      h('button', { class: 'btn block ' + (c.maint ? 'mango' : 'ghost'), onclick: () => setCtl({ patch: { maint: !c.maint } }, c.maint ? 'Maintenance off: her app opens again' : 'Maintenance on: her app is closed for now') }, c.maint ? '✅ Turn it off (open her app)' : '🛠️ Turn it on (close her app)')));
    // gifts
    const kind = h('select', { class: 'input' }, [['chest', '🧰 Treasure chest (she answers 3 questions)'], ['golden', '🏆 Golden chest (better treasure)'], ['bottle', '🍾 Message in a bottle'], ['pearls', '⚪ Pearls'], ['gold', '🪙 Gold coins'], ['logs', '🪵 Wood logs (repair her boat)'], ['key', '🔑 Keys (open sealed chests)'], ['sealed', '🔒 Sealed chest (rare treasure, needs a key)'], ['shells', '🐚 Shells'], ['item', '💎 A treasure item'], ['boat', '⛵ A boat']].map(([v, t]) => h('option', { value: v }, t)));
    const n = h('input', { class: 'input', type: 'number', min: 1, max: 5000, value: 10, style: { maxWidth: '110px' } });
    const item = h('select', { class: 'input' }, Object.entries(T.SETS).map(([k, set]) => h('optgroup', { label: set.ic + ' ' + set.n }, T.ITEMS.filter((x) => x[4] === k).map((x) => h('option', { value: x[0] }, x[1] + ' ' + x[2] + ' (' + T.RAR[x[3]].n + ')' + (s.tre[x[0]] ? ' ✓' : ''))))));
    const boat = h('select', { class: 'input' }, V.BOATS.filter((b) => b.id !== 'sloop').map((b) => h('option', { value: b.id }, b.n + (s.boats.includes(b.id) ? ' (she has it)' : ''))));
    const note = h('input', { class: 'input', maxlength: 160, placeholder: 'A note she sees when she picks it up (optional)' });
    const nRow = h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'small' }, 'How many'), n), iRow = h('div', null, item), bRow = h('div', null, boat);
    const sync = () => { nRow.style.display = ['pearls', 'shells', 'gold', 'key', 'logs'].includes(kind.value) ? '' : 'none'; iRow.style.display = kind.value === 'item' ? '' : 'none'; bRow.style.display = kind.value === 'boat' ? '' : 'none'; };
    kind.onchange = sync; sync();
    const gifts = (c.gifts || []).slice().reverse();
    out.push(h('div', { class: 'card stack' }, h('b', null, '🎁 Drop a gift on her sea'), h('div', { class: 'small muted' }, 'It floats next to her boat on the map. She taps it to collect.'),
      kind, nRow, iRow, bRow, note,
      h('button', { class: 'btn mango block', onclick: () => setCtl({ gift: { kind: kind.value, n: +n.value, item: kind.value === 'item' ? item.value : undefined, boat: kind.value === 'boat' ? boat.value : undefined, note: note.value.trim() || undefined } }, 'Gift dropped on her sea') }, 'Drop it'),
      gifts.length ? h('div', { class: 'stack', style: { gap: '6px' } }, h('div', { class: 'small muted' }, 'Gifts you sent'), gifts.slice(0, 12).map((g) => {
        const got = s.got['g' + g.id];
        const what = g.kind === 'item' ? (T.byId[g.item] || [])[2] : g.kind === 'boat' ? V.boat(g.boat).n : (['pearls', 'shells', 'gold', 'key', 'logs'].includes(g.kind) ? g.n + ' ' : '') + g.kind;
        return h('div', { class: 'row between gift-row' }, h('span', { class: 'small' }, (got ? '✅ ' : '⏳ ') + what + (g.note ? ' · “' + g.note + '”' : '')), got ? h('span', { class: 'small muted' }, A.ago(got)) : h('button', { class: 'icon-btn', 'aria-label': 'Remove gift', onclick: () => setCtl({ delGift: g.id }, 'Removed') }, '🗑️'));
      })) : null));
    // events
    const m = c.mult && c.mult.until > Date.now() ? c.mult : null;
    const ev = (p, hrs, label) => h('button', { class: 'btn ghost', style: { minHeight: '42px' }, onclick: () => setCtl({ patch: { mult: { p, until: Date.now() + hrs * 3600e3, label } } }, label + ' started') }, label + ' · ' + hrs + 'h');
    out.push(h('div', { class: 'card stack' }, h('b', null, '✨ Events'), h('div', { class: 'small muted' }, m ? '🟢 Now: ×' + m.p + ' pearls until ' + new Date(m.until).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'No event running.'),
      h('div', { class: 'row wrap', style: { gap: '8px' } }, ev(2, 2, 'Double pearls'), ev(2, 24, 'Double pearls'), ev(3, 3, 'Triple pearls'), m ? h('button', { class: 'btn bad', style: { minHeight: '42px' }, onclick: () => setCtl({ patch: { mult: null } }, 'Event stopped') }, 'Stop') : null)));
    // islands
    const chapOf = (n) => R.main.find((x) => x.nodes.includes(n));
    const opt = (sel) => [h('option', { value: '' }, '— off —'), ...A.nodes.map((n, i) => h('option', { value: i, selected: String(sel) === String(i) ? true : null }, (i + 1) + '. ' + ((chapOf(n) || {}).name || '') + ' · ' + A.nodeTitle(n).en))];
    const unlock = h('select', { class: 'input' }, opt(c.unlockTo));
    const hold = h('select', { class: 'input' }, opt(c.holdAt));
    out.push(h('div', { class: 'card stack' }, h('b', null, '🏝️ Islands'),
      h('div', { class: 'small muted' }, 'Open islands ahead of her (she can jump forward), or keep her at an island until you say so. Islands still open one by one otherwise.'),
      h('label', { class: 'small' }, 'Open every island up to:'), unlock,
      h('label', { class: 'small' }, 'Keep her at (nothing after this opens):'), hold,
      h('button', { class: 'btn block', onclick: () => setCtl({ patch: { unlockTo: unlock.value === '' ? null : +unlock.value, holdAt: hold.value === '' ? null : +hold.value } }, 'Islands updated') }, 'Save islands')));
    // tests + switches
    const sec = h('input', { class: 'input', type: 'range', min: 10, max: 90, step: 5, value: c.testSec || 30 });
    const secL = h('b', null, (c.testSec || 30) + ' s');
    sec.oninput = () => { secL.textContent = sec.value + ' s'; };
    const sw = (k, label) => h('label', { class: 'row between' }, h('span', null, label), h('input', { type: 'checkbox', checked: c[k] ? null : true, onchange: (e) => setCtl({ patch: { [k]: !e.target.checked } }, 'Saved') }));
    out.push(h('div', { class: 'card stack' }, h('b', null, '⏱️ Tests and extras'),
      h('div', { class: 'row between' }, h('span', null, 'Time per test question'), secL), sec,
      h('button', { class: 'btn ghost block', onclick: () => setCtl({ patch: { testSec: +sec.value } }, 'Test time saved') }, 'Save test time'),
      sw('sideOff', 'Side missions on'), sw('questOff', 'Daily quests on'), sw('typingOff', 'Typing questions in hard tests'), sw('krakenOff', 'Kraken attacks on the map'),
      h('button', { class: 'btn bad block', onclick: () => setCtl({ patch: { kraken: 1 } }, 'The Kraken is coming…') }, '🐙 Send the Kraken now (next time she opens the map)')));
    return out;
  }
  function herMap(st) {
    const veil = h('div', { class: 'map-modal' });
    const close = h('button', { class: 'btn map-close', onclick: () => veil.remove() }, '✕ Close');
    veil.append(close, A.voyage.mapView(st, { readOnly: true, name: (L() || {}).name || 'Alvee' }));
    document.body.append(veil);
  }

  // ---------------------------------------------------------------- insights: what to change in the next update
  const TAGL = {
    'drop-be': 'Forgets am / is / are', 'swap-be': 'Mixes up am / is / are', 'add-be': 'Puts am / is / are before a verb (I am like…)',
    'drop-s': 'Forgets -s with he / she / it', 'add-s': 'Adds -s with I / you / we / they', past: 'Past tense form wrong',
    will: 'will + wrong verb form', ing: '-ing mistakes', order: 'Question word order', words: 'Word order / missing words',
    'swap-do': "do / does / don't mixed up", neg: "Negatives (don't / doesn't)", 'swap-have': 'have / has mixed up', 'swap-art': 'a / an mixed up',
    bep: 'was / were mixed up', prep: 'in / on / at', context: 'Reply did not fit the conversation', listen: 'Did not hear the sentence right', vocab: 'Word meaning',
  };
  const skillName = (k) => (A.SKILLS[k] || TOPICS[k] ? (A.SKILLS[k] ? A.SKILLS[k][0] : TOPICS[k]) : k);
  function computeInsights() {
    const st = stOf();
    const ans = ADM.events.filter((e) => e.type === 'answer' && !e.retry);
    const now = Date.now(), wk = 7 * 864e5;
    // skills: lifetime from her saved stats, trend from the activity log
    const skills = {};
    Object.entries(st.sk || {}).forEach(([k, r]) => { skills[k] = { k, n: r.n, w: r.w, recent: A.skillAcc(r, true), all: A.skillAcc(r, false) }; });
    ans.forEach((e) => {
      const k = skillOfEv(e); const x = skills[k] || (skills[k] = { k, n: 0, w: 0, fromLog: 1 });
      if (x.fromLog) { x.n++; if (!e.ok) x.w++; }
      const bucket = now - e.t < wk ? 'w1' : now - e.t < 2 * wk ? 'w0' : null;
      if (bucket) { x[bucket] = x[bucket] || { n: 0, ok: 0 }; x[bucket].n++; if (e.ok) x[bucket].ok++; }
    });
    Object.values(skills).forEach((x) => {
      if (x.fromLog) { x.all = x.n ? (x.n - x.w) / x.n : 1; x.recent = x.all; }
      x.trend = x.w1 && x.w0 && x.w1.n >= 3 && x.w0.n >= 3 ? x.w1.ok / x.w1.n - x.w0.ok / x.w0.n : null;
      x.status = x.n < 5 ? 'new' : x.recent < 0.6 ? 'weak' : x.recent < 0.75 ? 'work' : x.recent < 0.9 ? 'good' : 'strong';
    });
    // repeated mistake patterns
    const pats = {};
    ans.filter((e) => !e.ok).forEach((e) => {
      const key = e.tag || skillOfEv(e);
      const p = pats[key] || (pats[key] = { key, n: 0, items: new Set(), ex: [] , last: 0});
      p.n++; if (e.item) p.items.add(e.item); p.last = e.t;
      if (p.ex.length < 3 && e.c) p.ex.push({ a: e.a, c: e.c });
    });
    const patterns = Object.values(pats).filter((p) => p.n >= 2).sort((a, b) => b.n - a.n);
    // same item wrong again and again
    const again = Object.entries(st.srs).filter(([, r]) => r.w >= 2).sort((a, b) => b[1].w - a[1].w).slice(0, 12);
    // exercise types
    const types = {};
    ans.forEach((e) => { const t = types[e.ex] || (types[e.ex] = { n: 0, ok: 0, ms: 0, msn: 0, th: 0 }); t.n++; if (e.ok) t.ok++; if (e.ms && e.ms < 120000) { t.ms += e.ms; t.msn++; } if (e.th) t.th++; });
    // where she stops / fails
    const stops = {};
    ADM.events.filter((e) => e.type === 'lesson_quit' || (e.type === 'lesson_end' && !e.passed)).forEach((e) => { const k = e.node; stops[k] = stops[k] || { node: k, quit: 0, fail: 0 }; if (e.type === 'lesson_quit') stops[k].quit++; else stops[k].fail++; });
    const hints = {}; ADM.events.filter((e) => e.type === 'hint' || e.type === 'lookup').forEach((e) => { const k = e.w || e.th; if (k) hints[k] = (hints[k] || 0) + 1; });
    // recommendations for the next update
    const rec = [];
    Object.values(skills).filter((x) => x.status === 'weak' || x.status === 'work').sort((a, b) => a.recent - b.recent).forEach((x) => {
      rec.push(`Add more practice and a clearer tip for “${skillName(x.k)}”: ${Math.round(x.recent * 100)}% correct recently over ${x.n} answers` + (x.trend != null ? ` (${x.trend >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(x.trend * 100))} points vs last week).` : '.'));
    });
    patterns.slice(0, 3).forEach((p) => rec.push(`Repeated mistake: ${TAGL[p.key] || skillName(p.key)} — ${p.n} times in ${p.items.size || p.n} different questions.`));
    Object.values(stops).filter((x) => x.quit + x.fail >= 2).forEach((x) => rec.push(`Lesson ${x.node} looks too hard or long: quit ${x.quit}×, not passed ${x.fail}×.`));
    Object.entries(types).forEach(([t, x]) => {
      if (x.n >= 8 && x.ok / x.n < 0.6) rec.push(`Exercise “${EXL[t] || t}” is hard for her: ${Math.round(x.ok / x.n * 100)}% correct.`);
      if (x.n >= 8 && x.th / x.n > 0.5) rec.push(`She opens Thai help in ${Math.round(x.th / x.n * 100)}% of “${EXL[t] || t}” questions — make them easier or add pictures.`);
      if (x.msn >= 8 && x.ms / x.msn > 20000) rec.push(`“${EXL[t] || t}” takes her ${Math.round(x.ms / x.msn / 1000)} s per question on average.`);
    });
    if (!rec.length) rec.push(ans.length < 20 ? 'Not enough answers yet — check again after a few lessons.' : 'No big problems. Keep the current pace.');
    return { st, ans, skills: Object.values(skills).filter((x) => x.n > 0).sort((a, b) => a.recent - b.recent), patterns, again, types, stops: Object.values(stops), hints, rec };
  }
  const STATUS = { weak: ['Weak', 'bad'], work: ['Needs work', 'mango'], good: ['Good', 'sea'], strong: ['Strong', 'good'], new: ['Too few answers', 'grey'] };
  function insights() {
    const I = computeInsights();
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    box.append(h('div', { class: 'card stack insight-head' }, h('div', { class: 'row', style: { gap: '12px' } }, A.art.mascotEl('think', 56),
      h('div', { style: { flex: 1 } }, h('b', null, 'What the app learned about her'), h('div', { class: 'small muted' }, 'Every answer is tagged with the grammar point it tests. The app already gives her extra practice on her weakest point. Use the report to plan the next update.'))),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', style: { flex: 1, minHeight: '44px' }, onclick: () => downloadReport(I) }, '⬇ Download report'),
        h('button', { class: 'btn ghost', style: { flex: 1, minHeight: '44px' }, onclick: async () => { try { await navigator.clipboard.writeText(reportMD(I)); A.toast('Report copied'); } catch (e) { A.toast('Could not copy — use Download'); } } }, '📋 Copy'))));
    box.append(h('div', { class: 'card stack' }, h('b', null, '🛠️ For the next update'), h('ol', { class: 'recs' }, I.rec.map((r) => h('li', null, r)))));
    const sk = h('div', { class: 'card' }, h('b', null, 'Grammar & skills'), h('div', { class: 'small muted', style: { marginBottom: '8px' } }, 'Recent = her last 30 answers on that point. Arrow = this week vs last week.'));
    if (!I.skills.length) sk.append(h('div', { class: 'small muted' }, 'No answers yet.'));
    I.skills.forEach((x) => sk.append(h('div', { class: 'skrow' },
      h('div', { class: 'skn' }, h('div', null, skillName(x.k)), h('span', { class: 'pill ' + STATUS[x.status][1] }, STATUS[x.status][0])),
      h('div', { class: 'track' }, h('i', { class: x.status, style: { width: Math.round(x.recent * 100) + '%' } })),
      h('div', { class: 'small num skv' }, Math.round(x.recent * 100) + '%', x.trend != null ? h('span', { class: x.trend >= 0 ? 'up' : 'down' }, x.trend >= 0 ? ' ▲' : ' ▼') : null, h('div', { class: 'tiny muted' }, x.w + ' wrong / ' + x.n)))));
    box.append(sk);
    box.append(h('div', { class: 'card feed', style: { padding: '8px 12px' } }, h('b', null, 'Repeated mistake patterns'),
      I.patterns.length ? I.patterns.slice(0, 10).map((p) => h('div', { class: 'ev bad' }, h('span', { class: 'i' }, '×' + p.n), h('div', null, h('div', null, TAGL[p.key] || skillName(p.key)), h('div', { class: 'd' }, (p.items.size || p.n) + ' different questions', p.ex.map((x) => h('div', null, h('span', { class: 'yours' }, x.a || '—'), ' → ', h('span', { class: 'right' }, x.c))))), h('span', { class: 'tm' }, A.ago(p.last))))
        : h('div', { class: 'small muted', style: { padding: '8px 0' } }, 'No repeated mistakes yet.')));
    box.append(h('div', { class: 'card feed', style: { padding: '8px 12px' } }, h('b', null, 'Wrong again and again'),
      I.again.length ? I.again.map(([id, r]) => { const w = id.startsWith('w:') ? (D[id.slice(2)] || {}).w : (A.S(id.slice(2)) || {}).en; return h('div', { class: 'ev bad' }, h('span', { class: 'i' }, '×' + r.w), h('div', null, h('div', null, w || id), h('div', { class: 'd' }, 'right ' + r.c + '× · memory box ' + r.b + '/6'))); })
        : h('div', { class: 'small muted', style: { padding: '8px 0' } }, 'Nothing yet.')));
    const tt = h('div', { class: 'card' }, h('b', null, 'Exercise types'), h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Correct · average time · how often she opened Thai help'));
    Object.entries(I.types).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).forEach(([t, x]) => tt.append(h('div', { class: 'barrow' }, h('span', null, EXL[t] || t), h('div', { class: 'track' }, h('i', { style: { width: Math.round(x.ok / x.n * 100) + '%' } })), h('span', { class: 'small num' }, Math.round(x.ok / x.n * 100) + '% · ' + (x.msn ? Math.round(x.ms / x.msn / 1000) + 's' : '–') + ' · 🇹🇭' + Math.round(x.th / x.n * 100) + '%'))));
    box.append(tt);
    if (I.stops.length) box.append(h('div', { class: 'card feed', style: { padding: '8px 12px' } }, h('b', null, 'Where she stops'), I.stops.sort((a, b) => b.quit + b.fail - a.quit - a.fail).slice(0, 8).map((x) => h('div', { class: 'ev' }, h('span', { class: 'i' }, '🚪'), h('div', null, h('div', null, x.node), h('div', { class: 'd' }, 'quit ' + x.quit + '× · not passed ' + x.fail + '×'))))));
    return box;
  }
  function reportMD(I) {
    const l = L() || {};
    const lines = [`# Alvee English — learning report`, `Learner: ${l.name || ''} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, `Lessons done: ${Object.keys(I.st.done).length} · words: ${A.wordCount(I.st)} · XP: ${A.totalXP(I.st)} · answers logged: ${I.ans.length}`, '',
      '## For the next update', ...I.rec.map((r, i) => `${i + 1}. ${r}`), '',
      '## Skills (recent % correct, wrong / total)', ...I.skills.map((x) => `- ${skillName(x.k)} [${x.k}]: ${Math.round(x.recent * 100)}% (${x.w}/${x.n})${x.trend != null ? ', trend ' + Math.round(x.trend * 100) : ''} — ${STATUS[x.status][0]}`), '',
      '## Repeated mistakes', ...I.patterns.map((p) => `- ${TAGL[p.key] || p.key} [${p.key}]: ${p.n}× in ${p.items.size || p.n} questions; e.g. ${p.ex.map((x) => `"${x.a}" → "${x.c}"`).join('; ')}`), '',
      '## Exercise types', ...Object.entries(I.types).map(([t, x]) => `- ${t}: ${Math.round(x.ok / x.n * 100)}% of ${x.n}, avg ${x.msn ? Math.round(x.ms / x.msn / 1000) : '-'}s, Thai help ${Math.round(x.th / x.n * 100)}%`), '',
      '## Wrong again and again', ...I.again.map(([id, r]) => `- ${id}: wrong ${r.w}×, right ${r.c}×`), '',
      '## Where she stops', ...I.stops.map((x) => `- ${x.node}: quit ${x.quit}, failed ${x.fail}`), '',
      '## Thai help / look-ups (top)', ...Object.entries(I.hints).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `- ${k}: ${n}`)];
    return lines.join('\n');
  }
  function downloadReport(I) {
    const md = reportMD(I);
    const json = JSON.stringify({ made: new Date().toISOString(), skills: I.skills, patterns: I.patterns.map((p) => ({ ...p, items: [...p.items] })), types: I.types, stops: I.stops, again: I.again, rec: I.rec, state: I.st }, null, 1);
    const save = (text, name, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
    const day = A.dkey();
    save(md, `alvee-report-${day}.md`, 'text/markdown');
    setTimeout(() => save(json, `alvee-report-${day}.json`, 'application/json'), 400);
  }

  function resetBtn(label, nodes, kind) {
    const st = stOf();
    const n = nodes.filter((x) => st.done[x.id]).length;
    return h('button', { class: 'chip reset-chip', disabled: n ? null : true, onclick: () => resetSheet(nodes, label.replace(/^Reset /, '')) }, '↺ ' + (kind === 'month' ? 'sea' : 'unit'));
  }
  function resetSheet(nodes, label) {
    const st = stOf();
    const done = nodes.filter((x) => st.done[x.id]);
    const sh = A.sheet(h('div', { class: 'stack', style: { gap: '12px' } },
      h('h2', null, '↺ Reset ' + label + '?'),
      h('div', { class: 'small muted' }, done.length + ' finished step(s) will be marked as not done, and their words and sentences start fresh in her practice. Everything else stays. A backup is saved on the server.'),
      h('div', { class: 'small' }, done.map((x) => A.nodeTitle(x).en).join(' · ') || 'Nothing finished here yet.'),
      h('button', { class: 'btn bad block', disabled: done.length ? null : true, onclick: async () => {
        const items = A.uniq(done.flatMap((x) => A.nodeItems(x)));
        try { const r = await A.api.resetPart(ADM.uid, { done: done.map((x) => x.id), items, label }); sh.close(); A.toast('Reset done · ' + ((r && r.removed) || 0) + ' steps'); await ADM.refresh(true); }
        catch (e) { A.toast(e.message || 'Reset failed'); }
      } }, 'Yes, reset'),
      h('button', { class: 'btn ghost block', onclick: () => sh.close() }, 'Cancel')));
  }

  // ---------------------------------------------------------------- mistakes
  const TOPICS = { s3: 'he / she + s', ing: '-ing (now)', have: 'have / has', can: 'can', if: 'if', question: 'Questions', prep: 'in / on / at', art: 'a / an', going: 'going to', be: 'am / is / are', bep: 'was / were', s: 'he / she + s', past: 'Past tense', will: 'will / going to', do: 'do / does / don\'t', order: 'Word order', vocab: 'Vocabulary', listen: 'Listening', meaning: 'Understanding', talk: 'Conversation', other: 'Other' };
  const OLD_TOPIC = { s: 's3', meaning: 'vocab' };
  const skillOfEv = (e) => e.sk || OLD_TOPIC[topicOf(e)] || topicOf(e);
  ADM.skillOfEv = skillOfEv;
  function topicOf(e) {
    if (e.sk) return e.sk;
    if (['w2th', 'th2w', 'pic', 'listenw', 'match', 'wfit'].includes(e.ex)) return 'vocab';
    if (e.ex === 'listen') return 'listen';
    if (e.ex === 'meaning') return 'meaning';
    const a = String(e.a || '').toLowerCase(), c = String(e.c || '').toLowerCase();
    const ta = a.match(/[a-z']+/g) || [], tc = c.match(/[a-z']+/g) || [];
    const diff = [...ta.filter((x) => !tc.includes(x)), ...tc.filter((x) => !ta.includes(x))];
    const has = (re) => diff.some((x) => re.test(x));
    if (has(/^(am|is|are|i'm|you're|he's|she's|it's|we're|they're|isn't|aren't)$/)) return 'be';
    if (has(/^(was|were|wasn't|weren't)$/)) return 'bep';
    if (has(/^(do|does|did|don't|doesn't|didn't)$/)) return 'do';
    if (has(/^(will|won't|going|i'll)$/)) return 'will';
    if (diff.some((x) => { const k = A.keyOf(x); return k && D[k] && (D[k].f === 'past' || (D[k].base && tc.includes(x) === false && D[D[k].base] && D[D[k].base].forms && D[D[k].base].forms[1] === x)); })) return 'past';
    if (diff.some((x) => { const k = A.keyOf(x); return k && D[k] && (D[k].f === '3s' || (D[k].forms && diff.includes(D[k].forms[0]))); })) return 's';
    if (!diff.length && ta.length === tc.length) return 'order';
    if (e.ex === 'talk' || e.ex === 'reply') return 'talk';
    if (e.ex === 'gap') return 'be';
    return 'other';
  }
  function mistakes() {
    const ans = ADM.events.filter((e) => e.type === 'answer');
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    if (!ans.length) { box.append(h('div', { class: 'card muted' }, 'No answers yet.')); return box; }
    const by = {};
    ans.forEach((e) => { const t = topicOf(e); by[t] = by[t] || { n: 0, w: 0 }; by[t].n++; if (!e.ok) by[t].w++; });
    const rows = Object.entries(by).sort((a, b) => b[1].w - a[1].w);
    const maxW = Math.max(1, ...rows.map(([, v]) => v.w));
    box.append(h('div', { class: 'card' }, h('b', null, 'Mistakes by topic'), h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Where she needs help most. % = how often she gets that topic wrong.'),
      rows.map(([k, v]) => h('div', { class: 'barrow' }, h('span', null, TOPICS[k] || k), h('div', { class: 'track' }, h('i', { style: { width: (v.w / maxW) * 100 + '%' } })), h('span', { class: 'small num' }, v.w + ' · ' + Math.round(v.w / v.n * 100) + '%')))));
    const miss = {};
    ans.filter((e) => !e.ok && e.c).forEach((e) => { const k = e.c; miss[k] = miss[k] || { c: e.c, n: 0, last: e }; miss[k].n++; miss[k].last = e; });
    const top = Object.values(miss).sort((a, b) => b.n - a.n).slice(0, 12);
    box.append(h('div', { class: 'card feed', style: { padding: '8px 12px' } }, h('b', null, 'Most missed'),
      top.map((m) => h('div', { class: 'ev bad' }, h('span', { class: 'i' }, '×' + m.n), h('div', null, h('div', { class: 'right' }, m.c), h('div', { class: 'd' }, 'she said: ', h('span', { class: 'yours' }, m.last.a || '—'))), h('span', { class: 'tm' }, A.ago(m.last.t))))));
    const recent = ans.filter((e) => !e.ok).slice(-15).reverse();
    box.append(h('div', { class: 'card feed', style: { padding: '8px 12px' } }, h('b', null, 'Latest mistakes'), recent.map(evRow)));
    return box;
  }

  // ---------------------------------------------------------------- words
  function words() {
    const st = stOf();
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    const ws = Object.entries(st.srs).filter(([k]) => k.startsWith('w:') && D[k.slice(2)]);
    const weak = ws.filter(([, s]) => s.w > 0).sort((a, b) => b[1].w - a[1].w || a[1].b - b[1].b).slice(0, 15);
    const looked = Object.entries(st.look).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const strong = ws.filter(([, s]) => s.b >= 4).length;
    box.append(h('div', { class: 'kpis' }, kpi(ws.length, 'Words met'), kpi(strong, 'Remembered well'), kpi(weak.length, 'Needs practice')));
    const list = (title, sub, items, val) => h('div', { class: 'card', style: { padding: '10px 14px' } }, h('b', null, title), h('div', { class: 'small muted' }, sub),
      items.length ? items.map(([k, v]) => { const key = k.replace(/^w:/, ''); const e = D[key] || { w: key, th: '' }; return h('button', { class: 'witem', onclick: () => A.wordPopup(key) }, h('span', { class: 'pic' }, e.e || '·'), h('span', { class: 'grow' }, h('div', { class: 'w' }, e.w), h('div', { class: 't' }, A.thShort(e.th || ''))), h('span', { class: 'pill bad num' }, val(v))); })
        : h('div', { class: 'small muted', style: { padding: '8px 0' } }, 'Nothing yet.'));
    box.append(list('Hardest words', 'Wrong most often', weak, (s) => s.w + '× wrong'));
    box.append(list('Most looked up', 'She tapped these for the Thai meaning', looked, (n) => n + '×'));
    return box;
  }

  // ---------------------------------------------------------------- messages
  function messages() {
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    const st = stOf();
    const ta = h('textarea', { class: 'input', id: 'msg-text', placeholder: 'Write something kind… (English, Thai or both)' });
    const sel = h('select', { class: 'input', id: 'msg-trig' },
      h('option', { value: 'now' }, 'Show it now'),
      ...C.units.filter((u) => A.nodes.some((n) => n.u === u.id)).map((u) => h('option', { value: 'unit:' + u.id }, 'When she finishes Unit ' + u.id)),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((m) => h('option', { value: 'sea:' + m }, 'When she finishes sea ' + m + ' (' + A.voyage.SEAS[m - 1].en + ')')),
      ...[3, 7, 14, 30, 60, 100].map((n) => h('option', { value: 'streak:' + n }, 'After ' + n + ' learning days')),
      ...[500, 1000, 2500, 5000].map((n) => h('option', { value: 'xp:' + n }, 'At ' + n + ' XP')));
    const out = h('div', { class: 'small muted' });
    box.append(h('div', { class: 'card stack' }, h('b', null, 'Send Alvee a message'),
      h('div', { class: 'small muted' }, 'It pops up on her home screen as a 💌. Lock it to a goal to make it a surprise reward.'),
      h('div', { class: 'field' }, h('label', { for: 'msg-text' }, 'Message'), ta),
      h('div', { class: 'field' }, h('label', { for: 'msg-trig' }, 'When should she see it?'), sel),
      h('button', { class: 'btn block', onclick: async () => {
        if (!ta.value.trim()) { out.textContent = 'Write a message first.'; return; }
        const [type, v] = sel.value.split(':');
        await A.api.sendMsg(ADM.uid, ta.value.trim(), { type, v: v ? +v : undefined });
        ta.value = ''; out.textContent = 'Saved.'; ADM.tab('msgs');
      } }, 'Send 💌'), out));
    A.api.msgs(ADM.uid).then((ms) => {
      const list = h('div', { class: 'card feed', style: { padding: '8px 12px' } }, h('b', null, 'Your messages'));
      if (!ms.length) list.append(h('div', { class: 'small muted', style: { padding: '8px 0' } }, 'None yet.'));
      ms.forEach((m) => {
        const unlocked = A.msgUnlocked(m, st);
        const status = m.readAt ? h('span', { class: 'pill good' }, 'Read ' + A.ago(m.readAt)) : unlocked ? h('span', { class: 'pill mango' }, 'Waiting for her') : h('span', { class: 'pill grey' }, '🔒 ' + A.trigText(m.trig));
        list.append(h('div', { class: 'ev' }, h('span', { class: 'i' }, '💌'), h('div', null, h('div', { style: { whiteSpace: 'pre-line' } }, m.text), h('div', { class: 'd' }, A.trigText(m.trig) + ' · sent ' + A.ago(m.at)), status),
          h('button', { class: 'icon-btn', 'aria-label': 'Delete message', onclick: async () => { await A.api.delMsg(m.id); ADM.tab('msgs'); } }, '🗑️')));
      });
      box.append(list);
    }).catch(() => {});
    return box;
  }

  // ---------------------------------------------------------------- settings
  function settings() {
    const l = L(), cfg = l.cfg || {};
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    const msg = h('div', { class: 'small', role: 'status' });
    const f = (id, label, val, type) => h('div', { class: 'field' }, h('label', { for: id }, label), h('input', { class: 'input', id, value: val || '', type: type || 'text', autocapitalize: 'none' }));
    box.append(h('div', { class: 'card stack' }, h('b', null, 'Her login'),
      f('s-name', 'Her name', l.name), f('s-user', 'Username', l.username), f('s-pass', 'New password (leave empty to keep)', '', 'password'),
      h('button', { class: 'btn block', onclick: async () => {
        try {
          const v = (id) => document.getElementById(id).value.trim();
          await A.api.updateUser(ADM.uid, { name: v('s-name'), username: v('s-user'), password: v('s-pass') || undefined });
          msg.textContent = 'Saved. Give her the new username/password.'; ADM.learners = await A.api.learners();
        } catch (e) { msg.textContent = e.message; }
      } }, 'Save login'), msg));
    // her pictures in the Cat Cabin (kept private on the server)
    if (A.cabin && A.cabin.pickPhoto) box.append(h('div', { class: 'card stack' }, h('b', null, '🐱 Cat Cabin pictures'),
      h('div', { class: 'small muted' }, 'Her round photo at the top of the cabin, and a picture of her with no background (PNG) that sits in the cabin next to the cat. Only you two can see them.'),
      h('button', { class: 'btn ghost block', onclick: () => A.cabin.pickPhoto(null, null, ADM.uid) }, '📷 Upload her photo'),
      h('button', { class: 'btn ghost block', onclick: () => A.cabin.pickPhoto(null, 'figure', ADM.uid) }, '🧍 Upload her cabin picture (PNG)')));
    const sel = (id, label, val, opts) => h('div', { class: 'field' }, h('label', { for: id }, label), h('select', { class: 'input', id }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(val) ? true : null }, t))));
    const msg2 = h('div', { class: 'small', role: 'status' });
    box.append(h('div', { class: 'card stack' }, h('b', null, 'Her plan'),
      sel('s-goal', 'Daily goal', cfg.goal || 30, [[20, '20 XP · easy (about 1 short lesson)'], [30, '30 XP · normal (about 1 lesson)'], [50, '50 XP · serious (2 lessons)'], [80, '80 XP · intense']]),
      sel('s-unlock', 'Lesson order', cfg.unlockAll ? 1 : 0, [[0, 'Step by step (recommended)'], [1, 'Unlock everything']]),
      f('s-start', 'Program start date', cfg.start, 'date'),
      h('button', { class: 'btn block', onclick: async () => {
        const v = (id) => document.getElementById(id).value;
        await A.api.updateUser(ADM.uid, { cfg: { goal: +v('s-goal'), newLimit: 0, unlockAll: v('s-unlock') === '1', start: v('s-start') || cfg.start } });
        ADM.learners = await A.api.learners(); msg2.textContent = 'Saved.';
      } }, 'Save plan'), msg2));
    const msg3 = h('div', { class: 'small', role: 'status' });
    box.append(h('div', { class: 'card stack' }, h('b', null, 'You'),
      f('s-me', 'Your name (shown on your messages and in the love conversations)', A.user.name),
      h('button', { class: 'btn ghost block', onclick: async () => { const n = document.getElementById('s-me').value.trim(); if (!n) return; await A.api.updateUser(A.user.id, { name: n }); A.user.name = n; A.bf.name = n; msg3.textContent = 'Saved.'; } }, 'Save your name'),
      A.api.mode === 'server' ? f('s-mypass', 'Your new password', '', 'password') : null,
      A.api.mode === 'server' ? h('button', { class: 'btn ghost block', onclick: async () => { const p = document.getElementById('s-mypass').value; if (p.length < 4) { msg3.textContent = 'Use at least 4 characters.'; return; } await A.api.updateUser(A.user.id, { password: p }); msg3.textContent = 'Password changed.'; } }, 'Change your password') : null,
      msg3));
    box.append(h('div', { class: 'card stack' }, h('div', { class: 'switch', style: { padding: 0 } }, h('div', null, h('b', null, '🌙 Night mode'), h('div', { class: 'small muted' }, 'On this phone. Auto follows the phone\'s dark mode.')), A.theme.picker(() => {}))));
    if (A.api.mode === 'demo') {
      box.append(h('div', { class: 'card stack' }, h('b', null, 'Preview tools'),
        h('div', { class: 'small muted' }, 'Fill the dashboard with a made-up week of practice so you can see how it looks. This replaces the preview progress.'),
        h('button', { class: 'btn mango block', onclick: async () => { await simulate(); ADM.events = []; ADM.since = 0; ADM.cur = 'live'; await ADM.refresh(true); A.toast('Sample week added'); } }, 'Add a sample week')));
    }
    let armed = false;
    const rb = h('button', { class: 'btn bad block', onclick: async () => {
      if (!armed) { armed = true; rb.textContent = 'Tap again to erase all her progress'; return; }
      await A.api.resetProgress(ADM.uid); ADM.events = []; ADM.since = 0; await ADM.refresh(true); A.toast('Progress erased');
    } }, 'Reset her progress');
    box.append(h('div', { class: 'card stack' }, h('b', null, 'Danger zone'), h('div', { class: 'small muted' }, 'Erases lessons, words, streak and activity log. Cannot be undone.'), rb));
    return box;
  }

  // ---------------------------------------------------------------- sample data (preview only)
  async function simulate() {
    const st = A.newState();
    const evs = [];
    const realSession = A.session;
    const nodes = A.nodes.slice(0, 13);
    let ni = 0;
    for (let d = 8; d >= 0; d--) {
      if (d === 5) continue;
      const base = new Date(); base.setDate(base.getDate() - d); base.setHours(d === 0 ? new Date().getHours() - 1 : 19 + (d % 3), 10 + d * 3, 0, 0);
      let t = base.getTime();
      const push = (e) => { t += 4000 + A.rnd(9000); evs.push({ t, ...e }); };
      push({ type: 'app_open', ua: 'iPhone' });
      const per = d === 0 ? 1 : 1 + (d % 2);
      for (let k = 0; k < per && ni < nodes.length; k++, ni++) {
        const node = nodes[ni];
        const ses = A.buildSession('node', node.id, st);
        const title = A.nodeTitle(node).en;
        push({ type: 'lesson_start', node: node.id, kind: node.kind, title, steps: ses.steps.length });
        let graded = 0, firstOk = 0, looks = 0;
        const t0 = t;
        ses.steps.forEach((s) => {
          if (/intro|tip|talkread/.test(s.type)) { if (s.type === 'tip') push({ type: 'tip_view', tip: C.tips[s.tip].title }); t += 9000; return; }
          if (Math.random() < 0.18) { looks++; push({ type: 'lookup', w: s.key || A.pick(A.words(A.S(s.sid) ? A.S(s.sid).t : ['am'])), s: s.sid ? A.S(s.sid).en : undefined }); }
          const sent = s.sid ? A.S(s.sid) : null;
          const hard = s.type === 'gap' || s.type === 'pick' || s.type === 'build';
          const weakSpot = s.sk === 'be' || s.sk === 's3';
          const ok = Math.random() > (weakSpot ? 0.45 : hard ? 0.25 : 0.12);
          graded++; if (ok) firstOk++;
          let q = '', a = '', c = '';
          let tag;
          if (s.key) { const wo = s.opts || (s.fit && s.fit.opts) || [s.key]; q = D[s.key].w; c = D[s.key].w; const other = wo.find((o) => o !== s.key) || s.key; a = ok ? c : D[other].w; if (!ok) tag = 'vocab'; }
          else if (sent) { q = s.type === 'gap' ? A.join(s.gap.toks.map((x, i) => (i === s.gap.at ? '___' : x))) : sent.th; c = s.type === 'gap' ? s.gap.answer : sent.en; const wrongs = A.corruptions(sent.t); a = ok ? c : (s.type === 'gap' ? s.gap.opts.find((o) => o.toLowerCase() !== c.toLowerCase()) : (wrongs[0] ? wrongs[0].s : c));
            if (!ok) tag = s.type === 'gap' ? A.explainGap(s.gap, a).key : s.type === 'listen' ? 'listen' : wrongs[0] ? A.explainTag(wrongs[0].tag, wrongs[0].s).key : 'words'; }
          const sk = !ok && tag ? A.keySkill(tag) : (s.sk || 'other');
          if (s.type !== 'talkplay') A.skillRecord(st, sk, ok);
          if (s.type === 'talkplay') { const tk = C.talks[s.talk]; tk.lines.filter((ln) => ln.s === 'B').forEach((ln) => { const okk = Math.random() > 0.25; graded++; if (okk) firstOk++; const se = A.S(ln.id); push({ type: 'answer', node: node.id, ex: 'talk', item: 's:' + ln.id, q: se.ctx ? A.S(se.ctx).en : '', a: okk ? se.en : (ln.x[0] || se.en), c: se.en, ok: okk ? 1 : 0, ms: 3000 + A.rnd(6000) }); if (st) A.srsApply(st, 's:' + ln.id, okk); }); graded--; firstOk -= ok ? 1 : 0; return; }
          push({ type: 'answer', node: node.id, ex: s.type, item: s.item, q, a, c, ok: ok ? 1 : 0, ms: 2500 + A.rnd(9000), sk, tag, u: node.u, th: Math.random() < 0.2 ? 1 : undefined });
          if (s.item) A.srsApply(st, s.item, ok);
        });
        const acc = graded ? Math.round(firstOk / graded * 100) : 100;
        const passed = node.kind !== 'check' || acc >= 70;
        const xp = firstOk + (node.kind === 'check' ? (passed ? 20 : 0) : 10);
        const dk = A.dkey(t0);
        const day = st.days[dk] || (st.days[dk] = { xp: 0, sec: 0, n: 0, ok: 0, les: 0 });
        day.xp += xp; day.sec += Math.round((t - t0) / 1000); day.n += graded; day.ok += firstOk; if (node.kind === 'lesson') day.les++;
        if (passed) st.done[node.id] = { s: acc >= 90 ? 3 : acc >= 70 ? 2 : 1, a: acc, t, n: 1 };
        push({ type: 'lesson_end', node: node.id, title, acc, xp, secs: Math.round((t - t0) / 1000), passed: passed ? 1 : 0, wrong: graded - firstOk, graded, looks });
        if (!passed) ni--;
      }
      push({ type: 'app_hide', screen: 'home' });
      Object.keys(st.look).length || (st.look = { am: 3, are: 2, tired: 2, sleepy: 1 });
    }
    A.checkBadges(st);
    A.session = realSession;
    await A.api.resetProgress(ADM.uid);
    await A.api.importDemo(ADM.uid, st, evs);
    A.store.set('ae1.presence.' + ADM.uid, { t: Date.now() - 3 * 60 * 1000, screen: 'home', hidden: 1 });
  }
})();
