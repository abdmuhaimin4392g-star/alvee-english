#!/usr/bin/env node
/* Alvee English — server. No dependencies (Node 18+).
 * Serves the app from ../public and stores data as JSON files in DATA_DIR.
 *   PORT=8080 DATA_DIR=./data node server/server.js
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const PORT = +process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');
const PUB = path.resolve(process.env.PUBLIC_DIR || path.join(ROOT, 'public'));
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const ONLINE_MS = 50000;

// ------------------------------------------------------------------ storage
fs.mkdirSync(path.join(DATA, 'state'), { recursive: true });
fs.mkdirSync(path.join(DATA, 'events'), { recursive: true });
fs.mkdirSync(path.join(DATA, 'archive'), { recursive: true });
const DB_FILE = path.join(DATA, 'db.json');
const atomicWrite = (file, text) => { const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); };
const readJSON = (file, d) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return d; } };

const db = readJSON(DB_FILE, { users: [], sessions: {}, msgs: [], presence: {}, setupCode: null });
db.users = db.users || []; db.sessions = db.sessions || {}; db.msgs = db.msgs || []; db.presence = db.presence || {};
let dbTimer = null;
const saveDB = (now) => {
  clearTimeout(dbTimer);
  if (now) return atomicWrite(DB_FILE, JSON.stringify(db));
  dbTimer = setTimeout(() => atomicWrite(DB_FILE, JSON.stringify(db)), 800);
};
const safeId = (uid) => String(uid).replace(/[^a-zA-Z0-9_-]/g, '');
const stateFile = (uid) => path.join(DATA, 'state', safeId(uid) + '.json');
const eventsFile = (uid) => path.join(DATA, 'events', safeId(uid) + '.jsonl');

// events are kept in memory for the dashboard (last 30 000 per learner) and appended to disk
const EV = {};
const loadEvents = (uid) => {
  if (EV[uid]) return EV[uid];
  let list = [];
  try { list = fs.readFileSync(eventsFile(uid), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { /* none yet */ }
  EV[uid] = list.slice(-30000);
  return EV[uid];
};

// first start: one-time setup code so nobody else can claim the admin account
const hasAdmin = () => db.users.some((u) => u.role === 'admin');
if (!hasAdmin()) {
  if (!db.setupCode) db.setupCode = String(crypto.randomInt(100000, 999999));
  saveDB(true);
  fs.writeFileSync(path.join(DATA, 'SETUP-CODE.txt'), db.setupCode + '\n');
  console.log('\n  First-time setup code: ' + db.setupCode + '  (open the app and create both logins)\n');
}

// ------------------------------------------------------------------ auth
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const checkPw = (u, pw) => {
  const a = Buffer.from(hashPw(pw, u.salt), 'hex'), b = Buffer.from(u.pass, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const DEF_CFG = () => ({ goal: 30, newLimit: 0, unlockAll: false, start: new Date().toISOString().slice(0, 10) });
const pub = (u) => u && { id: u.id, username: u.username, name: u.name, role: u.role, cfg: u.cfg || DEF_CFG() };
const newUser = (role, name, username, password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return { id: (role === 'admin' ? 'a_' : 'u_') + crypto.randomBytes(6).toString('hex'), role, name, username, salt, pass: hashPw(password, salt), cfg: DEF_CFG(), created: Date.now() };
};
const newSession = (uid) => { const token = crypto.randomBytes(24).toString('hex'); db.sessions[token] = { uid, t: Date.now() }; saveDB(); return token; };
const SESSION_DAYS = 365;
function authUser(req) {
  const m = /^Bearer\s+([a-f0-9]{48})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const s = db.sessions[m[1]];
  if (!s || Date.now() - s.t > SESSION_DAYS * 864e5) return null;
  return db.users.find((u) => u.id === s.uid) || null;
}
const fails = new Map();
const tooMany = (key) => { const f = fails.get(key); return f && f.n >= 10 && Date.now() - f.t < 15 * 60e3; };
const failed = (key) => { const f = fails.get(key) || { n: 0, t: Date.now() }; if (Date.now() - f.t > 15 * 60e3) { f.n = 0; f.t = Date.now(); } f.n++; fails.set(key, f); };

// ------------------------------------------------------------------ helpers
const send = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
};
const readBody = (req, limit) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(Object.assign(new Error('Bad JSON'), { code: 400 })); } });
  req.on('error', reject);
});
const str = (v, n) => (v == null ? undefined : String(v).slice(0, n));
const cleanEvent = (e) => {
  if (!e || typeof e !== 'object') return null;
  const out = { t: Math.min(+e.t || Date.now(), Date.now() + 60000), type: str(e.type, 30) };
  for (const [k, v] of Object.entries(e)) {
    if (k === 't' || k === 'type') continue;
    if (typeof v === 'number' || typeof v === 'boolean') out[str(k, 20)] = v;
    else if (typeof v === 'string') out[str(k, 20)] = v.slice(0, 300);
  }
  return out.type ? out : null;
};
const presenceOf = (uid) => {
  const p = db.presence[uid] || null;
  return { presence: p, online: !!(p && !p.hidden && Date.now() - p.t < ONLINE_MS), lastSeen: p ? p.t : 0 };
};

// ------------------------------------------------------------------ API
async function api(req, res, route, query) {
  const method = req.method;
  if (route === 'ping') return send(res, 200, { app: 'alvee-english', ok: 1 });
  if (route === 'setup' && method === 'GET') return send(res, 200, { needed: !hasAdmin() });
  if (route === 'setup' && method === 'POST') {
    if (hasAdmin()) return send(res, 400, { error: 'Setup is already done. Please log in.' });
    const b = await readBody(req, 10000);
    if (String(b.code || '').trim() !== db.setupCode) return send(res, 403, { error: 'Wrong setup code. It is in the server log and in SETUP-CODE.txt.' });
    const need = ['adminUser', 'adminPass', 'learnerUser', 'learnerPass'];
    if (need.some((k) => !String(b[k] || '').trim())) return send(res, 400, { error: 'Please fill in both usernames and passwords.' });
    if (String(b.adminPass).length < 4 || String(b.learnerPass).length < 4) return send(res, 400, { error: 'Passwords need at least 4 characters.' });
    if (b.adminUser.trim().toLowerCase() === b.learnerUser.trim().toLowerCase()) return send(res, 400, { error: 'Use two different usernames.' });
    const admin = newUser('admin', str(b.adminName, 40) || 'Boyfriend', b.adminUser.trim().slice(0, 40), b.adminPass);
    const learner = newUser('learner', str(b.learnerName, 40) || 'Alvee', b.learnerUser.trim().slice(0, 40), b.learnerPass);
    db.users.push(admin, learner);
    db.msgs.push({ id: 'm_' + crypto.randomBytes(5).toString('hex'), to: learner.id, from: admin.id, at: Date.now(), trig: { type: 'now' }, text: 'Welcome, ' + learner.name + '! A little English every day. You can do it! 💪\nยินดีต้อนรับนะ เรียนวันละนิด เดี๋ยวก็เก่ง สู้ ๆ นะ' });
    db.setupCode = null;
    try { fs.unlinkSync(path.join(DATA, 'SETUP-CODE.txt')); } catch (e) { /* gone */ }
    saveDB(true);
    return send(res, 200, { token: newSession(admin.id), user: pub(admin) });
  }
  if (route === 'login' && method === 'POST') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (tooMany(ip)) return send(res, 429, { error: 'Too many tries. Wait 15 minutes and try again.' });
    const b = await readBody(req, 4000);
    const u = db.users.find((x) => x.username.toLowerCase() === String(b.username || '').trim().toLowerCase());
    if (!u || !checkPw(u, b.password || '')) { failed(ip); return send(res, 401, { error: 'Wrong username or password' }); }
    fails.delete(ip);
    if (u.role === 'learner') appendEvents(u.id, [{ t: Date.now(), type: 'login', dev: str(req.headers['user-agent'], 120) }]);
    return send(res, 200, { token: newSession(u.id), user: pub(u) });
  }

  const me = authUser(req);
  if (!me) return send(res, 401, { error: 'Please log in again' });
  if (route === 'me') return send(res, 200, { user: pub(me) });
  if (route === 'logout' && method === 'POST') {
    const tok = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    delete db.sessions[tok];
    if (me.role === 'learner') { appendEvents(me.id, [{ t: Date.now(), type: 'logout' }]); db.presence[me.id] = { t: Date.now() - 120000, hidden: 1, screen: 'logged out' }; }
    saveDB();
    return send(res, 200, { ok: 1 });
  }
  if (route === 'coach') { const a = db.users.find((u) => u.role === 'admin'); return send(res, 200, { name: a ? a.name : 'Boyfriend' }); }

  // ---- learner
  if (me.role === 'learner') {
    if (route === 'state' && method === 'GET') return send(res, 200, { state: readJSON(stateFile(me.id), null) });
    if (route === 'state' && method === 'PUT') {
      const b = await readBody(req, 3e6);
      if (!b.state || typeof b.state !== 'object') return send(res, 400, { error: 'No state' });
      const cur = readJSON(stateFile(me.id), null);
      if (cur && (cur.rev || 0) > (b.state.rev || 0) + 50) return send(res, 409, { error: 'Older copy', state: cur });
      atomicWrite(stateFile(me.id), JSON.stringify(b.state));
      return send(res, 200, { ok: 1 });
    }
    if (route === 'events' && method === 'POST') {
      const b = await readBody(req, 5e5);
      const list = (Array.isArray(b.events) ? b.events : []).slice(0, 300).map(cleanEvent).filter(Boolean);
      appendEvents(me.id, list);
      return send(res, 200, { ok: 1, n: list.length });
    }
    if (route === 'beat' && method === 'POST') {
      const b = await readBody(req, 4000);
      db.presence[me.id] = { t: Date.now(), screen: str(b.screen, 30), node: str(b.node, 40), title: str(b.title, 80), step: +b.step || undefined, total: +b.total || undefined, hidden: b.hidden ? 1 : 0 };
      saveDB();
      return send(res, 200, { ok: 1 });
    }
    if (route === 'inbox' && method === 'GET') return send(res, 200, { msgs: db.msgs.filter((m) => m.to === me.id) });
    if (route === 'inbox/read' && method === 'POST') {
      const b = await readBody(req, 2000);
      const m = db.msgs.find((x) => x.id === b.id && x.to === me.id);
      if (m && !m.readAt) { m.readAt = Date.now(); saveDB(); }
      return send(res, 200, { ok: 1 });
    }
    return send(res, 404, { error: 'Not found' });
  }

  // ---- admin only (presence of the admin is never recorded)
  if (me.role !== 'admin') return send(res, 403, { error: 'Not allowed' });
  const learner = (uid) => db.users.find((u) => u.id === uid && u.role === 'learner');
  if (route === 'state') return send(res, 200, { state: null });
  if (route === 'beat' || route === 'events') return send(res, 200, { ok: 1 });
  if (route === 'admin/learners') return send(res, 200, { learners: db.users.filter((u) => u.role === 'learner').map((u) => ({ ...pub(u), ...presenceOf(u.id) })) });
  if (route === 'admin/learner') {
    const u = learner(query.get('uid'));
    if (!u) return send(res, 404, { error: 'No such learner' });
    return send(res, 200, { user: pub(u), state: readJSON(stateFile(u.id), null) });
  }
  if (route === 'admin/events') {
    const u = learner(query.get('uid'));
    if (!u) return send(res, 404, { error: 'No such learner' });
    const since = +query.get('since') || 0;
    const evs = loadEvents(u.id).filter((e) => e.t > since);
    return send(res, 200, { events: evs.slice(-5000) });
  }
  if (route === 'admin/msgs' && method === 'GET') return send(res, 200, { msgs: db.msgs.filter((m) => m.to === query.get('uid')).sort((a, b) => b.at - a.at) });
  if (route === 'admin/msgs' && method === 'POST') {
    const b = await readBody(req, 20000);
    if (!learner(b.uid) || !String(b.text || '').trim()) return send(res, 400, { error: 'Missing message' });
    const t = b.trig || {};
    db.msgs.push({ id: 'm_' + crypto.randomBytes(5).toString('hex'), to: b.uid, from: me.id, at: Date.now(), text: String(b.text).slice(0, 2000), trig: { type: str(t.type, 10) || 'now', v: t.v != null ? +t.v : undefined } });
    saveDB();
    return send(res, 200, { ok: 1 });
  }
  if (route === 'admin/msgs/delete' && method === 'POST') {
    const b = await readBody(req, 2000);
    db.msgs = db.msgs.filter((m) => m.id !== b.id); saveDB();
    return send(res, 200, { ok: 1 });
  }
  if (route === 'admin/user' && method === 'POST') {
    const b = await readBody(req, 10000);
    const u = db.users.find((x) => x.id === b.uid);
    if (!u || (u.role === 'admin' && u.id !== me.id)) return send(res, 404, { error: 'User not found' });
    if (b.username) {
      const name = String(b.username).trim().slice(0, 40);
      if (db.users.some((x) => x.id !== u.id && x.username.toLowerCase() === name.toLowerCase())) return send(res, 400, { error: 'That username is already used' });
      u.username = name;
    }
    if (b.name) u.name = String(b.name).trim().slice(0, 40);
    if (b.password) {
      if (String(b.password).length < 4) return send(res, 400, { error: 'Passwords need at least 4 characters' });
      u.salt = crypto.randomBytes(16).toString('hex'); u.pass = hashPw(b.password, u.salt);
      for (const [tok, s] of Object.entries(db.sessions)) if (s.uid === u.id) delete db.sessions[tok];
      if (u.id === me.id) { saveDB(true); return send(res, 200, { user: pub(u), token: newSession(u.id) }); }
    }
    if (b.cfg && typeof b.cfg === 'object') {
      const c = { ...(u.cfg || DEF_CFG()) };
      if (b.cfg.goal != null) c.goal = Math.max(10, Math.min(200, +b.cfg.goal || 30));
      if (b.cfg.newLimit != null) c.newLimit = Math.max(0, Math.min(10, +b.cfg.newLimit || 0));
      if (b.cfg.unlockAll != null) c.unlockAll = !!b.cfg.unlockAll;
      if (b.cfg.start) c.start = String(b.cfg.start).slice(0, 10);
      u.cfg = c;
    }
    saveDB();
    return send(res, 200, { user: pub(u) });
  }
  if (route === 'admin/user/create' && method === 'POST') {
    const b = await readBody(req, 10000);
    const name = String(b.username || '').trim();
    if (!name || String(b.password || '').length < 4) return send(res, 400, { error: 'Username and a password of 4+ characters are needed' });
    if (db.users.some((x) => x.username.toLowerCase() === name.toLowerCase())) return send(res, 400, { error: 'That username is already used' });
    const u = newUser('learner', str(b.name, 40) || name, name.slice(0, 40), b.password);
    db.users.push(u); saveDB();
    return send(res, 200, { user: pub(u) });
  }
  if (route === 'admin/reset' && method === 'POST') {
    const b = await readBody(req, 2000);
    const u = learner(b.uid);
    if (!u) return send(res, 404, { error: 'No such learner' });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const [f, ext] of [[stateFile(u.id), '.json'], [eventsFile(u.id), '.jsonl']]) {
      try { fs.renameSync(f, path.join(DATA, 'archive', safeId(u.id) + '-' + stamp + ext)); } catch (e) { /* nothing to archive */ }
    }
    EV[u.id] = [];
    delete db.presence[u.id]; saveDB();
    return send(res, 200, { ok: 1 });
  }
  return send(res, 404, { error: 'Not found' });
}

function appendEvents(uid, list) {
  if (!list.length) return;
  const mem = loadEvents(uid);
  const now = Date.now();
  list.forEach((e) => { e.st = now; mem.push(e); });
  if (mem.length > 32000) mem.splice(0, mem.length - 30000);
  fs.appendFileSync(eventsFile(uid), list.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

// ------------------------------------------------------------------ static files
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const cache = new Map();
function loadStatic(file) {
  const st = fs.statSync(file);
  const hit = cache.get(file);
  if (hit && hit.mtime === st.mtimeMs) return hit;
  let buf = fs.readFileSync(file);
  if (file.endsWith('index.html')) buf = Buffer.from(buf.toString('utf8').replace('<meta name="ae-mode" content="demo">', '<meta name="ae-mode" content="server">'));
  const item = { buf, gz: /\.(js|css|html|json|webmanifest|svg|txt)$/.test(file) ? zlib.gzipSync(buf, { level: 9 }) : null, etag: '"' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '"', mtime: st.mtimeMs };
  cache.set(file, item);
  return item;
}
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(PUB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found');
  }
  const item = loadStatic(file);
  const ext = path.extname(file);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300',
    ETag: item.etag,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  };
  if (ext === '.html') headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; script-src 'self'";
  if (req.headers['if-none-match'] === item.etag) { res.writeHead(304, headers); return res.end(); }
  if (item.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; res.writeHead(200, headers); return res.end(item.gz); }
  res.writeHead(200, headers); res.end(item.buf);
}

// ------------------------------------------------------------------ server
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/healthz') return send(res, 200, { ok: 1 });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url.pathname.slice(5).replace(/\/+$/, ''), url.searchParams);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!res.headersSent) send(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, { error: e.code ? e.message : 'Server error' });
    if (!e.code) console.error(e);
  }
});
server.listen(PORT, HOST, () => console.log(`Alvee English is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (data: ${DATA})`));
const shutdown = () => { saveDB(true); process.exit(0); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
