/* admin.js — your private dashboard: presence, every step, mistakes, progress, messages */
(function () {
  'use strict';
  const A = window.AE, C = A.C, h = A.h, D = C.dict;
  const app = () => document.getElementById('app');
  const ADM = (A.admin = { cur: 'live', uid: null, learners: [], events: [], since: 0, data: null, timer: null, filter: 'all', showAudio: false });

  const EXL = { w2th: 'Word → Thai', th2w: 'Thai → word', pic: 'Picture → word', listenw: 'Listen → word', match: 'Match pairs', gap: 'Fill the gap', build: 'Build sentence', pick: 'Correct sentence', meaning: 'Meaning', listen: 'Listening', reply: 'Reply', talk: 'Role-play' };

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
    s.append(h('div', { class: 'topbar' },
      h('div', { class: 'hello' }, h('h1', null, 'Dashboard'), h('p', null, 'Only you can see this page' + (A.api.mode === 'demo' ? ' · preview mode' : ''))),
      h('button', { class: 'btn ghost', style: { minHeight: '40px', padding: '8px 12px' }, onclick: async () => { clearInterval(ADM.timer); await A.api.logout(); A.user = null; A.go('login'); } }, 'Log out')));
    if (!ADM.uid) { s.append(h('div', { class: 'card' }, 'No learner account yet. Create one in Settings.')); root.append(s); return; }
    s.append(h('div', { id: 'adm-status' }, statusCard()));
    const tabs = [['live', '⚡ Live'], ['progress', '📈 Progress'], ['mistakes', '❌ Mistakes'], ['words', '📚 Words'], ['msgs', '💌 Messages'], ['settings', '⚙️ Settings']];
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
    // journey grid
    const grid = h('div', { class: 'card stack' }, h('b', null, 'Lessons'));
    C.units.forEach((u) => {
      const ns = A.nodes.filter((x) => x.u === u.id);
      if (!ns.length) return;
      grid.append(h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('span', { class: 'small', style: { width: '58px', flex: 'none' } }, u.deco + ' U' + u.id),
        ns.map((x) => { const d = st.done[x.id]; return h('span', { class: 'pill ' + (d ? (d.a >= 90 ? 'good' : d.a >= 70 ? 'sea' : 'mango') : 'grey'), title: A.nodeTitle(x).en }, d ? d.a + '%' : A.nodeTitle(x).icon); })));
    });
    box.append(grid);
    return box;
  }

  // ---------------------------------------------------------------- mistakes
  const TOPICS = { be: 'am / is / are', bep: 'was / were', s: 'he / she + s', past: 'Past tense', will: 'will / going to', do: 'do / does / don\'t', order: 'Word order', vocab: 'Vocabulary', listen: 'Listening', meaning: 'Understanding', talk: 'Conversation', other: 'Other' };
  function topicOf(e) {
    if (['w2th', 'th2w', 'pic', 'listenw', 'match'].includes(e.ex)) return 'vocab';
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
          const ok = Math.random() > (hard ? 0.3 : 0.12);
          graded++; if (ok) firstOk++;
          let q = '', a = '', c = '';
          if (s.key) { q = D[s.key].w; c = s.type === 'w2th' ? A.thShort(D[s.key].th) : D[s.key].w; a = ok ? c : (s.type === 'w2th' ? A.thShort(D[s.opts.find((o) => o !== s.key)].th) : D[s.opts.find((o) => o !== s.key)].w); }
          else if (sent) { q = s.type === 'gap' ? A.join(s.gap.toks.map((x, i) => (i === s.gap.at ? '___' : x))) : sent.th; c = s.type === 'gap' ? s.gap.answer : sent.en; const wrongs = A.corruptions(sent.t); a = ok ? c : (s.type === 'gap' ? s.gap.opts.find((o) => o.toLowerCase() !== c.toLowerCase()) : (wrongs[0] ? wrongs[0].s : c)); }
          if (s.type === 'talkplay') { const tk = C.talks[s.talk]; tk.lines.filter((ln) => ln.s === 'B').forEach((ln) => { const okk = Math.random() > 0.25; graded++; if (okk) firstOk++; const se = A.S(ln.id); push({ type: 'answer', node: node.id, ex: 'talk', item: 's:' + ln.id, q: se.ctx ? A.S(se.ctx).en : '', a: okk ? se.en : (ln.x[0] || se.en), c: se.en, ok: okk ? 1 : 0, ms: 3000 + A.rnd(6000) }); if (st) A.srsApply(st, 's:' + ln.id, okk); }); graded--; firstOk -= ok ? 1 : 0; return; }
          push({ type: 'answer', node: node.id, ex: s.type, item: s.item, q, a, c, ok: ok ? 1 : 0, ms: 2500 + A.rnd(9000) });
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
