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

// ------------------------------------------------------------------ version 5.4: XP and medals back to zero
// XP, study days, time, streak, rest days and medals go back to zero.
// Collections: only what she had BEFORE the map update is taken away (pearls, shells, treasure, postcards, boats).
// Everything she collected after the update (including the last few hours) stays, and so do gold, keys and logs.
// Her finished lessons stay. A full copy is kept in archive/ first. Running it again does nothing.
function zeroAll(u, file) {
  const st = readJSON(file, null);
  if (!st || st.v54zero) return;
  const id = safeId(u.id), who = u.name || u.username;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(file, path.join(DATA, 'archive', id + '-' + stamp + '-before-v5.4-zero.json'));
  const xpBefore = Object.values(st.days || {}).reduce((a, d) => a + ((d && d.xp) || 0), 0);
  const medals = Object.keys(st.badges || {}).length;
  st.days = {}; st.badges = {}; st.frozen = []; st.freezes = 0; st.reviews = 0; st.best = 0; st.tod = {};
  // the copy made just before the map update tells us what she already had then
  const arch = fs.readdirSync(path.join(DATA, 'archive')).filter((f) => f.startsWith(id + '-') && f.endsWith('-before-v5-fresh-start.json')).sort()[0];
  const old = arch ? ((readJSON(path.join(DATA, 'archive', arch), {}) || {}).sea || {}) : null;
  const s = st.sea || (st.sea = {});
  let kept = 'no copy from before the update was found, so her collections were left as they are';
  if (old && !st.v53stats) {   // (5.3 already did this part if it ran)
    const minus = (x, y) => Math.max(0, (x || 0) - (y || 0));
    s.p = minus(s.p, old.p); s.pt = minus(s.pt, old.pt);
    if (s.rp && old.rp) for (const k of ['p', 'b', 'g']) s.rp[k] = minus(s.rp[k], old.rp[k]);
    for (const k of Object.keys(s.sh || {})) { const n = minus(s.sh[k], (old.sh || {})[k]); if (n) s.sh[k] = n; else delete s.sh[k]; }
    for (const k of Object.keys(s.tre || {})) { const c = s.tre[k] || {}, o = (old.tre || {})[k]; const n = minus(c.n || 1, o ? (o.n || 1) : 0); if (n) s.tre[k] = { n, t: Math.max(c.t || 0, st.v5reset || 0) }; else delete s.tre[k]; }
    for (const k of Object.keys(s.pc || {})) if ((old.pc || {})[k]) delete s.pc[k];
    const oldBoats = (old.boats || []).filter((b) => b !== 'sloop');
    s.boats = (s.boats || ['sloop']).filter((b) => !oldBoats.includes(b));
    if (!s.boats.includes('sloop')) s.boats.unshift('sloop');
    if (!s.boats.includes(s.boat)) s.boat = 'sloop';
    kept = 'kept what she collected after the map update: ' + (s.p || 0) + ' pearls, ' + Object.keys(s.sh || {}).length + ' kinds of shell, ' + Object.keys(s.tre || {}).length + ' treasures, ' + (s.gold || 0) + ' gold, ' + (s.keys || 0) + ' keys';
  } else if (st.v53stats) kept = 'collections from before the update were already removed by 5.3; the rest stays';
  st.v54zero = Date.now();
  st.rev = (st.rev || 0) + 5000; st.resetAt = Date.now();
  atomicWrite(file, JSON.stringify(st));
  fs.appendFileSync(path.join(DATA, 'events', id + '.jsonl'), JSON.stringify({ t: Date.now(), st: Date.now(), type: 'admin_reset', what: 'XP and medals back to zero (XP ' + xpBefore + ' → 0, ' + medals + ' medals); collections from before the map update removed', n: 0 }) + '\n');
  console.log('• ' + who + ': XP ' + xpBefore + ' → 0 and ' + medals + ' medals removed.');
  console.log('    ' + kept + '. Finished lessons stay. A copy of everything before is in archive/.');
}
function main54() {
  const db = readJSON(path.join(DATA, 'db.json'), null);
  if (!db || !Array.isArray(db.users)) return;
  fs.mkdirSync(path.join(DATA, 'archive'), { recursive: true });
  for (const u of db.users.filter((x) => x.role === 'learner')) zeroAll(u, path.join(DATA, 'state', safeId(u.id) + '.json'));
}
try { main(); } catch (e) { console.error('migration problem (the app still runs):', e.message); }
try { main54(); } catch (e) { console.error('migration problem (the app still runs):', e.message); }
