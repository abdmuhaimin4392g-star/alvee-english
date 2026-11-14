/* admin.js — your private dashboard: presence, every step, mistakes, progress, messages */
(function () {
  'use strict';
  const A = window.AE, C = A.C, h = A.h, D = C.dict;
  const app = () => document.getElementById('app');
  const ADM = (A.admin = { cur: 'live', uid: null, learners: [], events: [], since: 0, data: null, timer: null, filter: 'all', showAudio: false });

  const EXL = { wfit: 'Word fits sentence', focus: 'Extra practice', w2th: 'Word → Thai', th2w: 'Thai → word', pic: 'Picture → word', listenw: 'Listen → word', match: 'Match pairs', gap: 'Fill the gap', build: 'Build sentence', pick: 'Correct sentence', meaning: 'Meaning', listen: 'Listening', reply: 'Reply', talk: 'Role-play' };

  ADM.start = async () => {
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
      if (evs.length) { ADM.events = ADM.events.concat(evs); ADM.since = evs[evs.length - 1].t; }
      if (full || evs.length || !ADM.data) ADM.data = await A.api.learner(ADM.uid);
    } catch (e) { /* keep last data */ }
    if (full) ADM.render(); else ADM.update();
  };

  const L = () => ADM.learners.find((l) => l.id === ADM.uid);
  const stOf = () => A.fixState(ADM.data && ADM.data.state);

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
    const tabs = [['live', '⚡ Live'], ['insights', '🧠 Insights'], ['progress', '📈 Progress'], ['mistakes', '❌ Mistakes'], ['words', '📚 Words'], ['msgs', '💌 Messages'], ['settings', '⚙️ Settings']];
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
    if (ADM.cur === 'live') return live();
    if (ADM.cur === 'progress') return progress();
    if (ADM.cur === 'insights') return insights();
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
    return { min: Math.round((d.sec || 0) / 60), xp: d.xp || 0, les: evs.filter((e) => e.type === 'lesson_end').length, ans: ans.length, wrong: ans.filter((e) => !e.ok).length, looks: evs.filter((e) => e.type === 'lookup').length };
  }
  function live() {
    const t = todayStats();
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    box.append(h('div', { class: 'kpis' },
      kpi(t.min + 'm', 'Time today'), kpi(t.xp, 'XP today'), kpi(t.les, 'Lessons done'),
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

  // ---------------------------------------------------------------- progress
  function progress() {
    const st = stOf(), l = L(), cfg = l.cfg || {};
    const xp = A.totalXP(st), lvl = A.level(xp);
    const startNum = A.dnum(cfg.start || A.dkey());
    const week = Math.max(1, Math.floor((A.todayNum() - startNum) / 7) + 1);
    const nextN = A.nextNode(st);
    const unitNow = nextN ? nextN.u : 24;
    const diff = unitNow - week;
    const pace = diff >= 1 ? ['Ahead of plan', 'good'] : diff <= -2 ? ['Behind plan', 'bad'] : ['On track', 'sea'];
    const totalNodes = A.nodes.length, doneNodes = A.nodes.filter((n) => st.done[n.id]).length;
    const days = Object.entries(st.days);
    const box = h('div', { class: 'stack', style: { gap: '14px' } });
    box.append(h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('b', null, 'Week ' + Math.min(24, week) + ' of 24 · now in Unit ' + unitNow), h('span', { class: 'pill ' + pace[1] }, pace[0])),
      h('div', { class: 'progress' }, h('i', { style: { width: Math.round((unitNow - 1) / 24 * 100) + '%' } })),
      h('div', { class: 'small muted' }, `Plan: one unit a week (4 lessons, 1 conversation, 1 test) for 24 weeks. Started ${cfg.start || '—'}. She has finished ${doneNodes} of ${totalNodes} steps.`)));
    const secs = days.reduce((a, [, d]) => a + (d.sec || 0), 0);
    const n = days.reduce((a, [, d]) => a + (d.n || 0), 0), ok = days.reduce((a, [, d]) => a + (d.ok || 0), 0);
    box.append(h('div', { class: 'kpis' },
      kpi(xp, 'Total XP'), kpi(lvl, 'Level · ' + A.title(lvl)[1]), kpi(A.streak(st) + '🔥', 'Streak'),
      kpi(A.wordCount(st), 'Words learned'), kpi(days.filter(([, d]) => d.xp > 0).length, 'Days studied'), kpi(Math.round(secs / 60) + 'm', 'Total time'),
      kpi(n ? Math.round(ok / n * 100) + '%' : '–', 'First-try correct'), kpi(A.dueItems(st).length, 'Due for review'), kpi(st.freezes, 'Rest days saved')));
    // 21-day chart
    const bars = h('div', { class: 'bars', role: 'img', 'aria-label': 'Minutes studied per day, last 21 days' });
    const vals = [];
    for (let i = 20; i >= 0; i--) { const k = A.dkey(Date.now() - i * 864e5); vals.push([k, Math.round(((st.days[k] && st.days[k].sec) || 0) / 60)]); }
    const max = Math.max(5, ...vals.map((v) => v[1]));
    vals.forEach(([k, v], i) => bars.append(h('div', { class: 'b' + (i === 20 ? ' today' : '') }, h('i', { style: { height: Math.round((v / max) * 100) + '%' }, title: k + ': ' + v + ' min' }), h('span', null, i % 3 === 2 || i === 20 ? (i === 20 ? 'today' : k.slice(8)) : ''))));
    box.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, 'Minutes per day'), h('span', { class: 'small muted' }, 'last 3 weeks · max ' + max + 'm')), bars));
    // journey grid with reset: tap a lesson to reset it, or reset a whole unit / month
    const grid = h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, 'Lessons'), h('span', { class: 'small muted' }, 'Tap ↺ to reset')),
      h('div', { class: 'small muted' }, 'Reset makes her do it again. Other lessons, her streak, medals and history stay.'));
    C.months.forEach((m) => {
      const units = C.units.filter((u) => u.m === m.n && A.nodes.some((x) => x.u === u.id));
      const mNodes = A.nodes.filter((x) => units.some((u) => u.id === x.u));
      grid.append(h('div', { class: 'row between month-reset' }, h('b', { class: 'small' }, 'Month ' + m.n + ' · ' + m.en), resetBtn('Reset month ' + m.n, mNodes, 'month')));
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
    return h('button', { class: 'chip reset-chip', disabled: n ? null : true, onclick: () => resetSheet(nodes, label.replace(/^Reset /, '')) }, '↺ ' + (kind === 'month' ? 'month' : 'unit'));
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
      ...[1, 2, 3, 4, 5, 6].map((m) => h('option', { value: 'month:' + m }, 'When she finishes Month ' + m)),
      ...[3, 7, 14, 30, 60, 100].map((n) => h('option', { value: 'streak:' + n }, 'At a ' + n + '-day streak')),
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
    const sel = (id, label, val, opts) => h('div', { class: 'field' }, h('label', { for: id }, label), h('select', { class: 'input', id }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(val) ? true : null }, t))));
    const msg2 = h('div', { class: 'small', role: 'status' });
    box.append(h('div', { class: 'card stack' }, h('b', null, 'Her plan'),
      sel('s-goal', 'Daily goal', cfg.goal || 30, [[20, '20 XP · easy (about 1 short lesson)'], [30, '30 XP · normal (about 1 lesson)'], [50, '50 XP · serious (2 lessons)'], [80, '80 XP · intense']]),
      sel('s-limit', 'New lessons per day', cfg.newLimit || 0, [[0, 'No limit'], [1, '1 new lesson a day'], [2, '2 a day'], [3, '3 a day']]),
      sel('s-unlock', 'Lesson order', cfg.unlockAll ? 1 : 0, [[0, 'Step by step (recommended)'], [1, 'Unlock everything']]),
      f('s-start', 'Program start date', cfg.start, 'date'),
      h('button', { class: 'btn block', onclick: async () => {
        const v = (id) => document.getElementById(id).value;
        await A.api.updateUser(ADM.uid, { cfg: { goal: +v('s-goal'), newLimit: +v('s-limit'), unlockAll: v('s-unlock') === '1', start: v('s-start') || cfg.start } });
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
