#!/usr/bin/env node
/* migrate-v5.js — runs once, from deploy/install.sh, when version 5 is installed.
   For every learner:
     1. reads her real answers (the saved state and the answer log) and works out the grammar points she finds hardest,
     2. keeps a full copy of her progress in archive/ (nothing is ever deleted),
     3. adds Booster islands for her hardest points (st.boost),
     4. starts the voyage again from island 1 (lessons, words and the route), keeping her treasure, shells,
        pearls, boats, medals, streak days and her mistake statistics.
   It prints what it found, so you can see her weak areas in the install output. Running it again does nothing. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const atomicWrite = (file, text) => { const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); };
const safeId = (uid) => String(uid).replace(/[^a-zA-Z0-9_-]/g, '');
const NAMES = {
  be: 'am / is / are', bep: 'was / were', s3: 'he / she / it + s', past: 'Past tense', will: 'will (future)', going: 'going to',
  ing: '-ing (doing now)', do: "do / does / don't", have: 'have / has', can: 'can', if: 'if …', question: 'Questions & word order',
  order: 'Word order', prep: 'in / on / at', art: 'a / an / the', vocab: 'Word meaning', listen: 'Listening', talk: 'Conversation replies', other: 'Other',
};
const GRAMMAR = ['be', 'bep', 's3', 'past', 'will', 'going', 'ing', 'do', 'have', 'can', 'if', 'question', 'order', 'prep', 'art'];
const OLD_TYPES = ['w2th', 'th2w', 'match', 'meaning'];

function weakAreas(st, events) {
  const S = {};
  const get = (k) => S[k] || (S[k] = { n: 0, w: 0, recent: '', evN: 0, evW: 0 });
  for (const [k, r] of Object.entries(st.sk || {})) { const s = get(k); s.n = r.n || 0; s.w = r.w || 0; s.recent = r.h || ''; }
  for (const e of events) {
    if (e.type !== 'answer' || e.retry || OLD_TYPES.includes(e.ex)) continue;
    const k = e.sk || 'other'; const s = get(k); s.evN++; if (!e.ok) s.evW++;
  }
  const rows = Object.entries(S).map(([k, s]) => {
    const n = Math.max(s.n, s.evN), w = Math.max(s.w, s.evW);
    const recentAcc = s.recent.length >= 5 ? s.recent.split('').filter((x) => x === '1').length / s.recent.length : null;
    const acc = n ? (n - w) / n : 1;
    return { k, n, w, acc, recentAcc, score: (recentAcc != null ? (recentAcc + acc) / 2 : acc) };
  });
  const weak = rows.filter((r) => GRAMMAR.includes(r.k) && r.n >= 5 && (r.score < 0.8 || r.w >= 8)).sort((a, b) => a.score - b.score || b.w - a.w);
  let pick = weak.slice(0, 4).map((r) => r.k);
  if (pick.length < 2) pick = pick.concat(rows.filter((r) => GRAMMAR.includes(r.k) && r.w >= 3 && !pick.includes(r.k)).sort((a, b) => b.w - a.w).map((r) => r.k)).slice(0, 2);
  return { rows: rows.sort((a, b) => a.score - b.score), pick };
}

function main() {
  const db = readJSON(path.join(DATA, 'db.json'), null);
  if (!db || !Array.isArray(db.users)) { console.log('• No data yet: nothing to migrate.'); return; }
  fs.mkdirSync(path.join(DATA, 'archive'), { recursive: true });
  // a long voyage: three new lessons a day unless you already chose a limit on the dashboard
  let dbChanged = false;
  for (const u of db.users.filter((x) => x.role === 'learner')) { u.cfg = u.cfg || { goal: 30, newLimit: 0, unlockAll: false, start: new Date().toISOString().slice(0, 10) }; if (!u.cfg.newLimit && !u.cfg.v5limit) { u.cfg.newLimit = 3; u.cfg.v5limit = 1; dbChanged = true; console.log('• ' + (u.name || u.username) + ': new lessons per day set to 3 (change it on your dashboard → Settings).'); } }
  if (dbChanged) atomicWrite(path.join(DATA, 'db.json'), JSON.stringify(db));
  for (const u of db.users.filter((x) => x.role === 'learner')) {
    const file = path.join(DATA, 'state', safeId(u.id) + '.json');
    const st = readJSON(file, null);
    if (!st) { console.log('• ' + (u.name || u.username) + ': no progress saved yet.'); continue; }
    if (st.v5reset) { console.log('• ' + (u.name || u.username) + ': version 5 start already done (' + new Date(st.v5reset).toISOString().slice(0, 10) + '). Boosters: ' + ((st.boost || []).map((k) => NAMES[k]).join(', ') || 'none')); continue; }
    let events = [];
    try { events = fs.readFileSync(path.join(DATA, 'events', safeId(u.id) + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { /* no log */ }
    const { rows, pick } = weakAreas(st, events);
    const doneBefore = Object.keys(st.done || {}).length;
    // 1. a full copy first
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(file, path.join(DATA, 'archive', safeId(u.id) + '-' + stamp + '-before-v5-fresh-start.json'));
    // 2. fresh start on the route; collections, medals, days and mistake statistics stay
    st.done = {};
    st.srs = {};
    const sea = st.sea || (st.sea = {});
    sea.at = -1; sea.side = {}; sea.got = {};
    st.boost = pick;
    st.weakAtReset = rows.filter((r) => r.n >= 5).slice(0, 8).map((r) => ({ k: r.k, n: r.n, w: r.w, acc: Math.round(r.score * 100) }));
    st.v5reset = Date.now();
    st.inbox = [{ id: 'v5', ic: '🧭', t: 'A brand new voyage begins!', s: 'Sail from Thailand to the Maldives. Booster islands were added for the tricky parts.', go: ['journey'], at: Date.now() }];
    st.rev = (st.rev || 0) + 5000; st.resetAt = Date.now();
    atomicWrite(file, JSON.stringify(st));
    fs.appendFileSync(path.join(DATA, 'events', safeId(u.id) + '.jsonl'), JSON.stringify({ t: Date.now(), st: Date.now(), type: 'admin_reset', what: 'version 5 fresh start (boosters: ' + (pick.map((k) => NAMES[k]).join(', ') || 'none') + ')', n: doneBefore }) + '\n');
    console.log('');
    console.log('  ' + (u.name || u.username) + ' — what her answers show (weakest first):');
    rows.filter((r) => r.n >= 3).slice(0, 10).forEach((r) => console.log('    ' + (pick.includes(r.k) ? '💪 ' : '   ') + (NAMES[r.k] || r.k).padEnd(26) + String(Math.round(r.score * 100)).padStart(3) + '% right · ' + r.w + ' wrong of ' + r.n));
    console.log('  Booster islands added for: ' + (pick.map((k) => NAMES[k]).join(', ') || 'nothing yet (not enough answers)'));
    console.log('  Her ' + doneBefore + ' finished islands were saved in archive/, and the voyage starts again from island 1.');
    console.log('  Kept: treasure, shells, pearls, boats, medals, streak and mistake statistics.');
    console.log('');
  }
}

// ------------------------------------------------------------------ version 5.3: count only what happened after the map update
// XP, study days, time, streak, rest days and medals start from the moment of the version 5 fresh start.
// Pearls, shells, treasure, postcards and boats she had before it are taken away too, so every number she sees is from the new voyage.
// A full copy is kept in archive/ first. Running it again does nothing.
const dayIn = (t, tz) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(0, 10); } };
function countFromMapUpdate(u, file) {
  const st = readJSON(file, null);
  if (!st || !st.v5reset || st.v53stats) return;
  const cut = st.v5reset, id = safeId(u.id), who = u.name || u.username;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(file, path.join(DATA, 'archive', id + '-' + stamp + '-before-v5.3-count-from-today.json'));
  const xpBefore = Object.values(st.days || {}).reduce((a, d) => a + ((d && d.xp) || 0), 0);
  // 1. study days: rebuild them from the answer log after the map update
  let events = [];
  try { events = fs.readFileSync(path.join(DATA, 'events', id + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { /* no log */ }
  const days = {};
  const dayKey = (t) => dayIn(t, 'Asia/Bangkok');
  for (const e of events) {
    if (e.type !== 'lesson_end' || !(e.t >= cut)) continue;
    const k = dayKey(e.t), d = days[k] || (days[k] = { xp: 0, sec: 0, n: 0, ok: 0, les: 0 });
    d.xp += +e.xp || 0; d.sec += +e.secs || 0; d.n += +e.graded || 0; d.ok += Math.max(0, (+e.graded || 0) - (+e.wrong || 0));
  }
  for (const [k, r] of Object.entries(st.done || {})) {
    if (/^(talk|check):/.test(k) || !r || !(r.t >= cut)) continue;
    const d = days[dayKey(r.t)] || (days[dayKey(r.t)] = { xp: 0, sec: 0, n: 0, ok: 0, les: 0 }); d.les += 1;
  }
  // if the log is missing, keep the phone's own numbers for the days from the update on
  const first = dayKey(cut);
  if (!events.some((e) => e.type === 'lesson_end' && e.t >= cut)) for (const [k, d] of Object.entries(st.days || {})) if (k >= first && !days[k]) days[k] = d;
  st.days = days;
  st.frozen = []; st.freezes = 0; st.reviews = 0; st.best = 0; st.tod = {};
  // 2. medals: only the ones won after the update stay (the others can be won again)
  const keep = {}; let medalsGone = 0;
  for (const [k, t] of Object.entries(st.badges || {})) { if (typeof t === 'number' && t >= cut) keep[k] = t; else medalsGone++; }
  st.badges = keep;
  // 3. collections from before the update
  const arch = fs.readdirSync(path.join(DATA, 'archive')).filter((f) => f.startsWith(id + '-') && f.endsWith('-before-v5-fresh-start.json')).sort()[0];
  const old = arch ? ((readJSON(path.join(DATA, 'archive', arch), {}) || {}).sea || {}) : null;
  const s = st.sea || (st.sea = {});
  if (old) {
    const minus = (a, b) => Math.max(0, (a || 0) - (b || 0));
    s.p = minus(s.p, old.p); s.pt = minus(s.pt, old.pt);
    if (s.rp && old.rp) for (const k of ['p', 'b', 'g']) s.rp[k] = minus(s.rp[k], old.rp[k]);
    for (const k of Object.keys(s.sh || {})) { const n = minus(s.sh[k], (old.sh || {})[k]); if (n) s.sh[k] = n; else delete s.sh[k]; }
    for (const k of Object.keys(s.tre || {})) { const c = s.tre[k] || {}, o = (old.tre || {})[k]; const n = minus(c.n || 1, o ? (o.n || 1) : 0); if (n) s.tre[k] = { n, t: Math.max(c.t || 0, cut) }; else delete s.tre[k]; }
    for (const k of Object.keys(s.pc || {})) if ((old.pc || {})[k]) delete s.pc[k];
    const oldBoats = (old.boats || []).filter((b) => b !== 'sloop');
    s.boats = (s.boats || ['sloop']).filter((b) => !oldBoats.includes(b));
    if (!s.boats.includes('sloop')) s.boats.unshift('sloop');
    if (!s.boats.includes(s.boat)) s.boat = 'sloop';
  }
  st.v53stats = Date.now();
  st.rev = (st.rev || 0) + 5000; st.resetAt = Date.now();
  atomicWrite(file, JSON.stringify(st));
  const xpNow = Object.values(days).reduce((a, d) => a + d.xp, 0);
  fs.appendFileSync(path.join(DATA, 'events', id + '.jsonl'), JSON.stringify({ t: Date.now(), st: Date.now(), type: 'admin_reset', what: 'count only from the map update (XP ' + xpBefore + ' → ' + xpNow + ')', n: medalsGone }) + '\n');
  console.log('• ' + who + ': now counting only from the map update (' + new Date(cut).toISOString().slice(0, 16).replace('T', ' ') + ' UTC).');
  console.log('    XP ' + xpBefore + ' → ' + xpNow + ' · study days ' + Object.keys(days).length + ' · medals kept ' + Object.keys(keep).length + ' (' + medalsGone + ' from before removed)' + (old ? ' · old pearls, shells, treasure, postcards and boats removed' : ''));
  console.log('    A copy of everything before is in archive/.');
}
function main53() {
  const db = readJSON(path.join(DATA, 'db.json'), null);
  if (!db || !Array.isArray(db.users)) return;
  for (const u of db.users.filter((x) => x.role === 'learner')) countFromMapUpdate(u, path.join(DATA, 'state', safeId(u.id) + '.json'));
}
try { main(); } catch (e) { console.error('migration problem (the app still runs):', e.message); }
try { main53(); } catch (e) { console.error('migration problem (the app still runs):', e.message); }
