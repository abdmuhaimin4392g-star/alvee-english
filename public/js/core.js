/* core.js — helpers, data layer (demo or server), speech, sounds, progress rules */
(function () {
  'use strict';
  const C = window.CONTENT;
  const A = (window.AE = window.AE || {});
  A.C = C;

  // ------------------------------------------------------------- DOM helpers
  A.h = function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  };
  A.$ = (s, el = document) => el.querySelector(s);
  A.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  A.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  A.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  A.rnd = (n) => Math.floor(Math.random() * n);
  A.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = A.rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  A.pick = (a) => a[A.rnd(a.length)];
  A.uniq = (a) => [...new Set(a)];

  // ------------------------------------------------------------- safe storage
  const mem = {};
  A.store = {
    get(k, d) {
      if (k in mem) return mem[k];
      try { const v = localStorage.getItem(k); if (v != null) return (mem[k] = JSON.parse(v)); } catch (e) { /* storage blocked */ }
      return d;
    },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memory only */ } },
    del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  // ------------------------------------------------------------- dates
  A.dkey = (t = Date.now()) => {
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  A.dnum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  A.todayNum = () => A.dnum(A.dkey());
  A.ago = (t) => {
    if (!t) return 'never';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 50) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  };
  A.clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  A.greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return ['Good morning', 'สวัสดีตอนเช้า'];
    if (h < 17) return ['Good afternoon', 'สวัสดีตอนบ่าย'];
    return ['Good evening', 'สวัสดีตอนเย็น'];
  };

  // ------------------------------------------------------------- dictionary
  const fixApos = (t) => t.replace(/[’‘]/g, "'");
  A.keyOf = (tok) => {
    if (!tok) return null;
    const t = fixApos(tok);
    if (/^[$฿]?\d/.test(t)) return '#';
    const D = C.dict;
    if (D[t]) return t;
    const lo = t.toLowerCase();
    if (D[lo]) return lo;
    const cap = lo.charAt(0).toUpperCase() + lo.slice(1);
    if (D[cap]) return cap;
    return null;
  };
  A.entry = (tok) => {
    const k = A.keyOf(tok);
    if (k === '#') return { w: tok, th: 'ตัวเลข ' + tok, p: 'num' };
    return k ? C.dict[k] : null;
  };
  A.lemma = (k) => (k && C.dict[k] && C.dict[k].base) || k;
  A.POS = {
    n: 'คำนาม (คน สิ่งของ สถานที่)', v: 'คำกริยา (การกระทำ)', adj: 'คำคุณศัพท์ (ลักษณะ ความรู้สึก)', adv: 'คำวิเศษณ์',
    pron: 'คำสรรพนาม (ใช้แทนคน/สิ่งของ)', prep: 'คำบุพบท (ตำแหน่ง ทิศทาง เวลา)', conj: 'คำเชื่อม', det: 'คำนำหน้านาม',
    poss: 'คำแสดงความเป็นเจ้าของ', aux: 'กริยาช่วย (verb to be / ช่วยกริยา)', q: 'คำถาม', int: 'คำอุทาน / คำทักทาย',
    phr: 'วลี (กลุ่มคำที่ใช้ด้วยกัน)', name: 'ชื่อเฉพาะ', num: 'ตัวเลข / ลำดับ', contr: 'คำย่อ',
  };
  A.FORM = { '3s': 'he / she / it + s', past: 'อดีต (past)', ing: 'กำลัง… (-ing)', pl: 'หลายอัน (plural)' };
  A.S = (id) => C.sents[id];
  A.isPunct = (t) => /^[.,!?;"()…]$/.test(t);
  A.join = (toks) => {
    let s = '';
    toks.forEach((t, i) => { if (i > 0 && !A.isPunct(t)) s += ' '; s += t; });
    return s;
  };
  A.capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  A.words = (toks) => toks.filter((t) => !A.isPunct(t));
  A.bf = { name: 'Boyfriend' };
  A.fill = (s) => String(s || '').replace(/\{bf\}/g, A.bf.name || 'Boyfriend');

  // ------------------------------------------------------------- speech
  const Speech = (A.speech = {
    ok: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',
    voice: null,
    rate: 0.85,
    pick() {
      try {
        const vs = window.speechSynthesis.getVoices() || [];
        const pref = ['Samantha', 'Google US English', 'Ava', 'Allison', 'Karen', 'Microsoft Aria', 'Microsoft Jenny', 'Daniel'];
        this.voice = vs.find((v) => /^en/i.test(v.lang) && pref.some((p) => v.name.includes(p)))
          || vs.find((v) => /^en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
      } catch (e) { this.voice = null; }
    },
    say(text, slow) {
      if (!this.ok || !text) return false;
      try {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(String(text).replace(/\{bf\}/g, ''));
        u.lang = (this.voice && this.voice.lang) || 'en-US';
        if (this.voice) u.voice = this.voice;
        u.rate = slow ? 0.55 : this.rate;
        window.speechSynthesis.speak(u);
        if (A.track) A.track('audio', { text: String(text).slice(0, 90), slow: slow ? 1 : 0 });
        return true;
      } catch (e) { return false; }
    },
  });
  // iPhone only speaks after a first speech started by a tap: start a silent one on the first touch
  if (Speech.ok) {
    const unlock = () => {
      try { const u = new window.SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* ignore */ }
      document.removeEventListener('pointerdown', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
  }
  if (Speech.ok) {
    Speech.pick();
    try { window.speechSynthesis.addEventListener('voiceschanged', () => Speech.pick()); } catch (e) { /* old Safari */ }
  }

  // ------------------------------------------------------------- sound effects (no files)
  const Sfx = (A.sfx = {
    ctx: null,
    on: true,
    init() {
      if (this.ctx) return;
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { this.ctx = null; }
    },
    tone(f, at, dur, type, vol) {
      const c = this.ctx; if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, c.currentTime + at);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, c.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
      o.connect(g).connect(c.destination); o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.05);
    },
    play(kind) {
      if (!this.on) return;
      this.init(); if (!this.ctx) return;
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (kind === 'good') { this.tone(740, 0, 0.12); this.tone(1110, 0.1, 0.22); }
        else if (kind === 'bad') { this.tone(260, 0, 0.18, 'triangle', 0.14); this.tone(200, 0.14, 0.26, 'triangle', 0.12); }
        else if (kind === 'done') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.11, 0.3, 'sine', 0.14));
        else if (kind === 'tap') this.tone(900, 0, 0.05, 'sine', 0.05);
      } catch (e) { /* audio refused */ }
    },
  });
  document.addEventListener('pointerdown', () => { Sfx.init(); try { if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); } catch (e) { /* ignore */ } }, { passive: true });

  // ------------------------------------------------------------- hashing
  A.sha = async (s) => {
    try {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let h1 = 0x811c9dc5; for (const ch of s) { h1 ^= ch.charCodeAt(0); h1 = Math.imul(h1, 16777619) >>> 0; }
      return 'f' + h1.toString(16);
    }
  };
  A.uid = (p) => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ------------------------------------------------------------- data layer: demo (this browser)
  const DEF_CFG = () => ({ goal: 30, newLimit: 0, unlockAll: false, start: A.dkey() });
  class LocalAPI {
    constructor() { this.mode = 'demo'; this.P = 'ae1.'; }
    k(x) { return this.P + x; }
    users() { return A.store.get(this.k('users'), []); }
    saveUsers(u) { A.store.set(this.k('users'), u); }
    pub(u) { return u && { id: u.id, username: u.username, name: u.name, role: u.role, cfg: u.cfg || DEF_CFG() }; }
    async init() {
      if (this.users().length) return;
      const mk = async (id, username, name, role) => {
        const salt = Math.random().toString(36).slice(2);
        return { id, username, name, role, salt, pass: await A.sha(salt + '1234'), cfg: DEF_CFG(), created: Date.now() };
      };
      this.saveUsers([await mk('u_admin', 'admin', 'Boyfriend', 'admin'), await mk('u_alvee', 'alvee', 'Alvee', 'learner')]);
      A.store.set(this.k('msgs'), [{
        id: 'm_welcome', to: 'u_alvee', from: 'u_admin', at: Date.now(), trig: { type: 'now' },
        text: 'Welcome, Alvee! A little English every day. You can do it! 💪\nยินดีต้อนรับนะ เรียนวันละนิด เดี๋ยวก็เก่ง สู้ ๆ นะ',
      }, {
        id: 'm_unit1', to: 'u_alvee', from: 'u_admin', at: Date.now(), trig: { type: 'unit', v: 1 },
        text: 'You finished Unit 1! I am so proud of you. ⭐\nจบบทที่ 1 แล้ว เก่งมาก ภูมิใจในตัวเธอนะ',
      }]);
    }
    async setupNeeded() { return false; }
    async login(username, password) {
      const u = this.users().find((x) => x.username.toLowerCase() === String(username).trim().toLowerCase());
      if (!u || u.pass !== await A.sha(u.salt + password)) throw new Error('Wrong username or password');
      A.store.set(this.k('session'), { uid: u.id, t: Date.now() });
      if (u.role === 'learner') this.append(u.id, [{ t: Date.now(), type: 'login', dev: navigator.userAgent.slice(0, 120) }]);
      return this.pub(u);
    }
    async me() {
      const s = A.store.get(this.k('session'));
      return s ? this.pub(this.users().find((u) => u.id === s.uid)) : null;
    }
    async logout() {
      const me = await this.me();
      if (me && me.role === 'learner') {
        this.append(me.id, [{ t: Date.now(), type: 'logout' }]);
        A.store.set(this.k('presence.' + me.id), { t: Date.now() - 120000, hidden: 1, screen: 'logged out' });
      }
      A.store.del(this.k('session'));
    }
    async loadState(uid) { return A.store.get(this.k('state.' + (uid || (await this.me()).id)), null); }
    async saveState(st) { const me = await this.me(); if (me && me.role === 'learner') A.store.set(this.k('state.' + me.id), st); }
    append(uid, evs) {
      const key = this.k('events.' + uid);
      const all = A.store.get(key, []).concat(evs);
      A.store.set(key, all.length > 6000 ? all.slice(-6000) : all);
    }
    async log(evs) { const me = await this.me(); if (me && me.role === 'learner') this.append(me.id, evs); }
    async beat(info) { const me = await this.me(); if (me && me.role === 'learner') A.store.set(this.k('presence.' + me.id), { ...info, t: Date.now() }); }
    async inbox() {
      const me = await this.me();
      return A.store.get(this.k('msgs'), []).filter((m) => m.to === me.id);
    }
    async readMsg(id) {
      const all = A.store.get(this.k('msgs'), []);
      const m = all.find((x) => x.id === id);
      if (m && !m.readAt) { m.readAt = Date.now(); A.store.set(this.k('msgs'), all); }
    }
    async coachName() { const a = this.users().find((u) => u.role === 'admin'); return a ? a.name : 'Boyfriend'; }
    // ---- admin
    async learners() {
      return this.users().filter((u) => u.role === 'learner').map((u) => {
        const p = A.store.get(this.k('presence.' + u.id), null);
        return { ...this.pub(u), presence: p, online: !!(p && !p.hidden && Date.now() - p.t < 50000), lastSeen: p ? p.t : 0 };
      });
    }
    async learner(uid) {
      const u = this.users().find((x) => x.id === uid);
      return { user: this.pub(u), state: A.store.get(this.k('state.' + uid), null) };
    }
    async events(uid, since) { return A.store.get(this.k('events.' + uid), []).filter((e) => e.t > (since || 0)); }
    async msgs(uid) { return A.store.get(this.k('msgs'), []).filter((m) => m.to === uid).sort((a, b) => b.at - a.at); }
    async sendMsg(uid, text, trig) {
      const all = A.store.get(this.k('msgs'), []);
      const me = await this.me();
      all.push({ id: A.uid('m'), to: uid, from: me.id, at: Date.now(), text, trig: trig || { type: 'now' } });
      A.store.set(this.k('msgs'), all);
    }
    async delMsg(id) { A.store.set(this.k('msgs'), A.store.get(this.k('msgs'), []).filter((m) => m.id !== id)); }
    async updateUser(uid, patch) {
      const users = this.users();
      const u = users.find((x) => x.id === uid);
      if (!u) throw new Error('User not found');
      if (patch.username) {
        const taken = users.some((x) => x.id !== uid && x.username.toLowerCase() === patch.username.toLowerCase());
        if (taken) throw new Error('That username is already used');
        u.username = patch.username.trim();
      }
      if (patch.name) u.name = patch.name.trim();
      if (patch.password) { u.salt = Math.random().toString(36).slice(2); u.pass = await A.sha(u.salt + patch.password); }
      if (patch.cfg) u.cfg = { ...(u.cfg || DEF_CFG()), ...patch.cfg };
      this.saveUsers(users);
      return this.pub(u);
    }
    async resetProgress(uid) {
      A.store.del(this.k('state.' + uid)); A.store.del(this.k('events.' + uid));
      A.store.del(this.k('presence.' + uid));
    }
    async importDemo(uid, state, events) {
      A.store.set(this.k('state.' + uid), state);
      this.append(uid, events);
    }
  }

  // ------------------------------------------------------------- data layer: server (used when hosted)
  class ServerAPI {
    constructor(base) { this.mode = 'server'; this.base = base; this.token = A.store.get('ae.token', null); }
    async call(path, body, method) {
      const r = await fetch(this.base + path, {
        method: method || (body ? 'POST' : 'GET'),
        headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const err = new Error(j.error || 'Server error ' + r.status); err.status = r.status; err.data = j; throw err; }
      return j;
    }
    async init() { /* nothing */ }
    async setupNeeded() { return (await this.call('setup')).needed; }
    async setup(d) { const j = await this.call('setup', d); this.token = j.token; A.store.set('ae.token', j.token); return j.user; }
    async login(username, password) { const j = await this.call('login', { username, password }); this.token = j.token; A.store.set('ae.token', j.token); return j.user; }
    async me() { if (!this.token) return null; try { return (await this.call('me')).user; } catch (e) { return null; } }
    async logout() { try { await this.call('logout', {}); } catch (e) { /* offline */ } this.token = null; A.store.del('ae.token'); }
    async loadState() { return (await this.call('state')).state; }
    async saveState(st) { await this.call('state', { state: st }, 'PUT'); }
    async log(evs) { await this.call('events', { events: evs }); }
    async beat(info) { await this.call('beat', info); }
    async inbox() { return (await this.call('inbox')).msgs; }
    async readMsg(id) { await this.call('inbox/read', { id }); }
    async coachName() { return (await this.call('coach')).name; }
    async learners() { return (await this.call('admin/learners')).learners; }
    async learner(uid) { return this.call('admin/learner?uid=' + encodeURIComponent(uid)); }
    async events(uid, since) { return (await this.call('admin/events?uid=' + encodeURIComponent(uid) + '&since=' + (since || 0))).events; }
    async msgs(uid) { return (await this.call('admin/msgs?uid=' + encodeURIComponent(uid))).msgs; }
    async sendMsg(uid, text, trig) { await this.call('admin/msgs', { uid, text, trig }); }
    async delMsg(id) { await this.call('admin/msgs/delete', { id }); }
    async updateUser(uid, patch) {
      const j = await this.call('admin/user', { uid, ...patch });
      if (j.token) { this.token = j.token; A.store.set('ae.token', j.token); }
      return j.user;
    }
    async createLearner(d) { return (await this.call('admin/user/create', d)).user; }
    async resetProgress(uid) { await this.call('admin/reset', { uid }); }
  }

  // the server rewrites <meta name="ae-mode" content="demo"> to "server"
  A.connect = async () => {
    const m = document.querySelector('meta[name="ae-mode"]');
    return m && m.content === 'server' ? new ServerAPI('api/') : new LocalAPI();
  };

  // ------------------------------------------------------------- learner progress model
  A.newState = () => ({
    v: 1, created: Date.now(), days: {}, done: {}, srs: {}, badges: {}, look: {},
    freezes: 0, frozen: [], reviews: 0, set: { slow: false, sfx: true, big: false, thai: false }, rev: 0,
  });
  A.fixState = (s) => {
    const n = A.newState();
    if (!s || typeof s !== 'object') return n;
    for (const k in n) if (s[k] == null) s[k] = n[k];
    s.set = { ...n.set, ...s.set };
    return s;
  };

  // ordered path of nodes: lessons, then the unit conversation, then the unit test
  A.nodes = [];
  C.units.forEach((u) => {
    u.lessons.forEach((id) => A.nodes.push({ id, kind: 'lesson', u: u.id }));
    if (u.talks.length) A.nodes.push({ id: 'talk:' + u.talks[0], kind: 'talk', u: u.id, talk: u.talks[0] });
    if (u.lessons.length) A.nodes.push({ id: 'check:' + u.id, kind: 'check', u: u.id });
  });
  A.nodeById = (id) => A.nodes.find((n) => n.id === id);
  A.unit = (n) => C.units.find((u) => u.id === n);
  A.nodeTitle = (n) => {
    if (n.kind === 'lesson') { const l = C.lessons[n.id]; return { en: l.en, th: l.th, icon: '📖', k: 'Lesson ' + n.id }; }
    if (n.kind === 'talk') { const t = C.talks[n.talk]; return { en: A.fill(t.en), th: t.th, icon: '💬', k: 'Conversation' }; }
    const month = n.u % 4 === 0;
    return month
      ? { en: 'Month ' + Math.ceil(n.u / 4) + ' test', th: 'สอบประจำเดือน', icon: '🏆', k: 'Big test' }
      : { en: 'Unit ' + n.u + ' test', th: 'ทดสอบท้ายบท', icon: '🎯', k: 'Test' };
  };
  A.isOpen = (st, idx, cfg) => idx === 0 || !!(cfg && cfg.unlockAll) || !!st.done[A.nodes[idx - 1].id] || !!st.done[A.nodes[idx].id];
  A.nextNode = (st) => A.nodes.find((n) => !st.done[n.id]) || null;
  A.unitDone = (st, u) => { const ns = A.nodes.filter((n) => n.u === u); return ns.length > 0 && ns.every((n) => st.done[n.id]); };
  A.unitsDone = (st) => C.units.filter((u) => A.unitDone(st, u.id)).length;
  A.monthsDone = (st) => C.months.filter((m) => C.units.filter((u) => u.m === m.n).every((u) => A.unitDone(st, u.id))).length;
  A.currentUnit = (st) => { const n = A.nextNode(st); return n ? n.u : C.units.at(-1).id; };
  A.reachedUnit = (st, cfg) => (cfg && cfg.unlockAll ? 99 : A.currentUnit(st));

  // XP, levels, streak
  A.totalXP = (st) => Object.values(st.days).reduce((a, d) => a + (d.xp || 0), 0);
  A.level = (xp) => 1 + Math.floor(Math.sqrt(xp / 30));
  A.levelXP = (lvl) => 30 * (lvl - 1) * (lvl - 1);
  A.TITLES = [[1, 'New learner', 'มือใหม่', '🌱'], [3, 'Hard worker', 'นักเรียนขยัน', '📗'], [5, 'Little talker', 'เริ่มพูดได้', '🗣️'],
    [7, 'Chatter', 'นักสนทนา', '💬'], [9, 'Front desk pro', 'พนักงานต้อนรับมือโปร', '🛎️'], [11, 'Rising star', 'ดาวรุ่ง', '⭐'],
    [13, 'Superstar', 'ซูเปอร์สตาร์', '🌟'], [15, 'English queen', 'ราชินีภาษาอังกฤษ', '👑']];
  A.title = (lvl) => A.TITLES.filter((t) => lvl >= t[0]).at(-1);
  A.day = (st, key) => st.days[key || A.dkey()] || (st.days[key || A.dkey()] = { xp: 0, sec: 0, n: 0, ok: 0, les: 0 });
  A.active = (st, key) => (st.days[key] && st.days[key].xp > 0) || st.frozen.includes(key);
  A.streak = (st) => {
    const d = new Date();
    if (!A.active(st, A.dkey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (A.active(st, A.dkey(d)) && n < 2000) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  // use saved rest days to protect the streak after missed days
  A.applyFreezes = (st) => {
    if (!st.freezes) return 0;
    const d = new Date(); d.setDate(d.getDate() - 1);
    const gap = [];
    while (!A.active(st, A.dkey(d)) && gap.length < 3) { gap.push(A.dkey(d)); d.setDate(d.getDate() - 1); }
    if (!gap.length || gap.length > st.freezes || !A.active(st, A.dkey(d))) return 0;
    st.frozen.push(...gap); st.freezes -= gap.length;
    return gap.length;
  };

  // spaced repetition (gentle intervals for a slow, forgetful learner)
  A.INTERVALS = [0, 1, 2, 4, 7, 14, 30];
  A.srsApply = (st, id, ok) => {
    const today = A.todayNum();
    let s = st.srs[id];
    if (!s) {
      s = st.srs[id] = { b: ok ? 1 : 0, d: today + (ok ? 1 : 0), n: 1, c: ok ? 1 : 0, w: ok ? 0 : 1, t: Date.now() };
      return s;
    }
    s.n++; s.t = Date.now();
    if (ok) { s.c++; s.b = Math.min(6, s.b + 1); s.d = today + A.INTERVALS[s.b]; }
    else { s.w++; s.b = Math.max(0, Math.min(s.b - 1, 1)); s.d = today + (s.b === 0 ? 0 : 1); }
    return s;
  };
  A.dueItems = (st) => { const t = A.todayNum(); return Object.keys(st.srs).filter((id) => st.srs[id].d <= t); };
  A.wordCount = (st) => Object.keys(st.srs).filter((k) => k.startsWith('w:')).length;

  // badges
  A.BADGES = [
    ['first', '🎉', 'First lesson', 'บทเรียนแรก'], ['streak3', '🔥', '3-day streak', 'เรียน 3 วันติด'],
    ['streak7', '⚡', '7-day streak', 'เรียน 7 วันติด'], ['streak30', '🏅', '30-day streak', 'เรียน 30 วันติด'],
    ['perfect', '💯', 'Perfect lesson', 'ไม่ผิดเลยสักข้อ'], ['talk1', '💬', 'First talk', 'บทสนทนาแรก'],
    ['hotel', '🛎️', 'Hotel English', 'ภาษาอังกฤษโรงแรม'], ['words25', '📗', '25 words', 'รู้ 25 คำ'],
    ['words100', '📚', '100 words', 'รู้ 100 คำ'], ['words300', '🧠', '300 words', 'รู้ 300 คำ'],
    ['review10', '🔁', '10 reviews', 'ทบทวน 10 ครั้ง'], ['curious', '🔎', 'Curious', 'เปิดดูคำแปล 50 ครั้ง'],
    ['early', '🌅', 'Early bird', 'เรียนก่อน 8 โมงเช้า'], ['night', '🦉', 'Night owl', 'เรียนหลัง 4 ทุ่ม'],
    ['month1', '⭐', 'Month 1', 'จบเดือนที่ 1'], ['month2', '🌟', 'Month 2', 'จบเดือนที่ 2'],
    ['month3', '✨', 'Month 3', 'จบเดือนที่ 3'], ['month4', '🏖️', 'Month 4', 'จบเดือนที่ 4'],
    ['month5', '🏨', 'Month 5', 'จบเดือนที่ 5'], ['grad', '🎓', 'Graduate', 'จบหลักสูตร 6 เดือน'],
  ];
  A.checkBadges = (st) => {
    const got = [];
    const give = (id) => { if (!st.badges[id]) { st.badges[id] = Date.now(); got.push(id); } };
    const doneN = Object.keys(st.done).length;
    if (doneN >= 1) give('first');
    const sk = A.streak(st);
    if (sk >= 3) give('streak3'); if (sk >= 7) give('streak7'); if (sk >= 30) give('streak30');
    const wc = A.wordCount(st);
    if (wc >= 25) give('words25'); if (wc >= 100) give('words100'); if (wc >= 300) give('words300');
    if (st.reviews >= 10) give('review10');
    if (Object.values(st.look).reduce((a, b) => a + b, 0) >= 50) give('curious');
    if (Object.keys(st.done).some((k) => k.startsWith('talk:'))) give('talk1');
    if (Object.keys(st.done).some((k) => k.startsWith('talk:') && C.talks[k.slice(5)] && C.talks[k.slice(5)].cat === 'hotel')) give('hotel');
    if (Object.values(st.done).some((d) => d.a === 100)) give('perfect');
    const md = A.monthsDone(st);
    for (let m = 1; m <= Math.min(5, md); m++) give('month' + m);
    if (md >= 6) give('grad');
    return got;
  };

  // which coach messages are unlocked by progress
  A.msgUnlocked = (m, st) => {
    const t = m.trig || { type: 'now' };
    if (t.type === 'now') return true;
    if (t.type === 'unit') return A.unitDone(st, +t.v);
    if (t.type === 'month') return A.monthsDone(st) >= +t.v;
    if (t.type === 'streak') return A.streak(st) >= +t.v;
    if (t.type === 'xp') return A.totalXP(st) >= +t.v;
    if (t.type === 'node') return !!st.done[t.v];
    return false;
  };
  A.trigText = (t) => {
    t = t || { type: 'now' };
    if (t.type === 'now') return 'Right away';
    if (t.type === 'unit') return 'After Unit ' + t.v;
    if (t.type === 'month') return 'After Month ' + t.v;
    if (t.type === 'streak') return 'At a ' + t.v + '-day streak';
    if (t.type === 'xp') return 'At ' + t.v + ' XP';
    if (t.type === 'node') return 'After lesson ' + t.v;
    return '';
  };

  // ------------------------------------------------------------- activity log + presence
  // events wait in a queue (kept on the phone in server mode, so nothing is lost offline)
  A.queue = [];
  const keepQueue = () => { if (A.api && A.api.mode === 'server') A.store.set('ae.q', A.queue.slice(-3000)); };
  A.loadQueue = () => { if (A.api && A.api.mode === 'server') A.queue = A.store.get('ae.q', []) || []; };
  A.track = (type, data) => {
    if (!A.user || A.user.role !== 'learner' || !A.api) return;
    A.queue.push({ t: Date.now(), type, ...(data || {}) });
    keepQueue();
    if (A.queue.length >= 25) A.flush();
  };
  let flushing = false;
  A.flush = async () => {
    if (flushing || !A.queue.length || !A.api) return;
    flushing = true;
    const evs = A.queue.slice(0, 300);
    try { await A.api.log(evs); A.queue.splice(0, evs.length); keepQueue(); } catch (e) { /* retry later */ }
    flushing = false;
  };
  A.presence = { screen: 'home' };
  let lastBeat = 0;
  A.beat = async (force) => {
    if (!A.user || A.user.role !== 'learner' || !A.api) return;
    if (!force && Date.now() - lastBeat < 4000) return;
    lastBeat = Date.now();
    try { await A.api.beat({ ...A.presence, hidden: document.visibilityState === 'visible' ? 0 : 1 }); } catch (e) { /* offline */ }
  };
  A.setPresence = (p) => { A.presence = { ...p }; A.beat(true); };
  setInterval(() => { A.flush(); }, 4000);
  setInterval(() => { if (document.visibilityState === 'visible') A.beat(true); }, 20000);
  document.addEventListener('visibilitychange', () => {
    if (!A.user || A.user.role !== 'learner') return;
    A.track(document.visibilityState === 'visible' ? 'app_show' : 'app_hide', { screen: A.presence.screen });
    A.flush(); A.beat(true);
  });
  window.addEventListener('pagehide', () => { A.flush(); });

  A.saveSoon = A.debounce(() => {
    if (!A.state || !A.api || !A.user || A.user.role !== 'learner') return;
    A.state.rev = (A.state.rev || 0) + 1;
    if (A.api.mode === 'server') A.store.set('ae.st.' + A.user.id, A.state);
    A.api.saveState(A.state).catch((e) => {
      // another phone saved much newer progress: use that one
      if (e && e.status === 409 && e.data && e.data.state) { A.state = A.fixState(e.data.state); A.store.set('ae.st.' + A.user.id, A.state); }
    });
  }, 500);
  // pick the newer of the server copy and this phone's copy (for offline use)
  A.newerState = (server) => {
    if (!A.api || A.api.mode !== 'server') return server;
    const local = A.store.get('ae.st.' + A.user.id, null);
    if (local && (!server || (local.rev || 0) > (server.rev || 0))) { setTimeout(A.saveSoon, 1000); return local; }
    return server;
  };
})();
