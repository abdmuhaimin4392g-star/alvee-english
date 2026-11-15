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
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  };
  // ------------------------------------------------------------- updates reach the phone even if the app stays open
  A.VERSION = '5.7.2';
  A.checkUpdate = async (force) => {
    if (!document.querySelector('meta[name="ae-mode"][content="server"]')) return;
    try {
      const r = await fetch('version.txt?' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.text()).trim();
      if (!v || v === A.VERSION) return;
      const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if ((A.session || typing) && !force) { A.updateWaiting = true; return; } // never interrupt a lesson or a message
      // reload once for a new version; if the phone still has the old files after that, wait instead of reloading again and again
      let last = null; try { last = JSON.parse(sessionStorage.getItem('ae.upd') || 'null'); } catch (e) { /* private mode */ }
      if (last && last.v === v && Date.now() - last.t < 10 * 60 * 1000) return;
      try { sessionStorage.setItem('ae.upd', JSON.stringify({ v, t: Date.now() })); } catch (e) { /* private mode */ }
      if (A.flush) try { A.flush(); } catch (e) { /* offline */ }
      setTimeout(() => location.reload(), 300);
    } catch (e) { /* offline */ }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') A.checkUpdate(); });
  setInterval(() => A.checkUpdate(), 5 * 60 * 1000);
  setTimeout(() => A.checkUpdate(), 4000);

  // ------------------------------------------------------------- night mode (per phone: auto / dark / light)
  A.theme = {
    get() { try { return localStorage.getItem('ae.theme') || 'auto'; } catch (e) { return 'auto'; } },
    set(v) { try { localStorage.setItem('ae.theme', v); } catch (e) { /* private mode */ } A.theme.apply(); },
    isDark() { const v = A.theme.get(); return v === 'dark' || (v === 'auto' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); },
    apply() {
      const d = A.theme.isDark();
      document.documentElement.classList.toggle('dark', d);
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = d ? '#0A1A1F' : '#0E8A8A';
    },
    picker(onChange) {
      const cur = A.theme.get();
      return A.h('div', { class: 'seg3', role: 'radiogroup', 'aria-label': 'Night mode' },
        [['auto', 'Auto'], ['dark', 'On'], ['light', 'Off']].map(([v, t]) => A.h('button', { class: cur === v ? 'on' : '', role: 'radio', 'aria-checked': cur === v ? 'true' : 'false', onclick: () => { A.theme.set(v); onChange && onChange(v); } }, t)));
    },
  };
  A.theme.apply();
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => A.theme.apply()); } catch (e) { /* old Safari */ } }
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
    async beat(info) {
      const me = await this.me();
      if (me && me.role === 'learner') A.store.set(this.k('presence.' + me.id), { ...info, t: Date.now() });
      const c = me ? A.store.get(this.k('ctl.' + me.id), {}) : {};
      return { w: me && (A.store.get(this.k('watch.' + me.id), 0) > Date.now()) ? 1 : 0, cr: c.rev || 0 };
    }
    // control room (gifts, events, unlocks) and the live view
    async ctl() { const me = await this.me(); return me ? A.store.get(this.k('ctl.' + me.id), {}) : {}; }
    async adminCtl(uid) { return A.store.get(this.k('ctl.' + uid), {}); }
    async setCtl(uid, body) {
      const c = A.store.get(this.k('ctl.' + uid), {});
      if (body.patch) Object.assign(c, body.patch);
      if (body.gift) { c.gifts = (c.gifts || []).concat([{ ...body.gift, id: Math.random().toString(36).slice(2, 9), t: Date.now() }]).slice(-40); }
      if (body.delGift) c.gifts = (c.gifts || []).filter((g) => g.id !== body.delGift);
      c.rev = (c.rev || 0) + 1;
      A.store.set(this.k('ctl.' + uid), c);
      return c;
    }
    async livePush(snap) { const me = await this.me(); if (!me) return { w: 0 }; A.store.set(this.k('live.' + me.id), { ...snap, t: Date.now() }); return { w: A.store.get(this.k('watch.' + me.id), 0) > Date.now() ? 1 : 0 }; }
    async liveGet(uid) { A.store.set(this.k('watch.' + uid), Date.now() + 10000); return A.store.get(this.k('live.' + uid), null); }
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
    async resetPart(uid, part) {
      const st = A.store.get(this.k('state.' + uid), null);
      if (!st) return { removed: 0 };
      let removed = 0;
      (part.done || []).forEach((id) => { if (st.done && st.done[id]) { delete st.done[id]; removed++; } });
      (part.items || []).forEach((id) => { if (st.srs) delete st.srs[id]; });
      if (part.ptest && st.ptest) { removed += Object.keys(st.ptest.a || {}).length; st.ptest = { gen: Date.now(), a: {}, x: {}, prize: st.ptest.prize }; }
      st.rev = (st.rev || 0) + 1000; st.resetAt = Date.now();
      A.store.set(this.k('state.' + uid), st);
      this.append(uid, [{ t: Date.now(), type: 'admin_reset', what: part.label, n: removed }]);
      return { removed };
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
    async setup(d) { const j = await this.call('setup', d); this.token = j.token; A.store.set('ae.token', j.token); A.store.set('ae.user', j.user); return j.user; }
    async login(username, password) { const j = await this.call('login', { username, password }); this.token = j.token; A.store.set('ae.token', j.token); A.store.set('ae.user', j.user); return j.user; }
    // stay signed in: only a real "not signed in" answer from the server logs out.
    // No signal, or the server restarting for an update, keeps her in the app with the last known login.
    async me() {
      if (!this.token) return null;
      try { const u = (await this.call('me')).user; if (u) A.store.set('ae.user', u); return u; }
      catch (e) {
        if (e && e.status === 401) { this.token = null; A.store.del('ae.token'); A.store.del('ae.user'); return null; }
        return A.store.get('ae.user', null);
      }
    }
    async logout() { try { await this.call('logout', {}); } catch (e) { /* offline */ } this.token = null; A.store.del('ae.token'); A.store.del('ae.user'); }
    async loadState() { return (await this.call('state')).state; }
    async saveState(st) { await this.call('state', { state: st }, 'PUT'); }
    async log(evs) { await this.call('events', { events: evs }); }
    async beat(info) { return this.call('beat', info); }
    async ctl() { return (await this.call('ctl')).ctl || {}; }
    async adminCtl(uid) { return (await this.call('admin/ctl?uid=' + encodeURIComponent(uid))).ctl || {}; }
    async setCtl(uid, body) { return (await this.call('admin/ctl', { uid, ...body })).ctl; }
    async livePush(snap) { return this.call('live', snap); }
    async liveGet(uid) { return (await this.call('admin/live?uid=' + encodeURIComponent(uid))).live; }
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
    async resetPart(uid, part) { return this.call('admin/reset-part', { uid, ...part }); }
  }

  // the server rewrites <meta name="ae-mode" content="demo"> to "server"
  A.connect = async () => {
    const m = document.querySelector('meta[name="ae-mode"]');
    return m && m.content === 'server' ? new ServerAPI('api/') : new LocalAPI();
  };

  // ------------------------------------------------------------- learner progress model
  A.newState = () => ({
    v: 1, created: Date.now(), days: {}, done: {}, srs: {}, badges: {}, look: {}, sk: {},
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
  // Booster islands: extra lessons for the grammar points she finds hardest (worked out from her own answers).
  // Each one sits just before the test of the unit that teaches that point, so she practises it when it is fresh.
  A.BOOST_AT = { be: 4, art: 4, s3: 6, have: 6, do: 7, order: 7, ing: 9, can: 11, prep: 12, bep: 13, past: 15, question: 16, will: 17, going: 18, if: 19 };
  A.nodes = [];
  A.buildNodes = (boost) => {
    A.nodes.length = 0;
    const want = (boost || []).filter((k) => A.BOOST_AT[k]);
    C.units.forEach((u) => {
      u.lessons.forEach((id) => A.nodes.push({ id, kind: 'lesson', u: u.id }));
      want.filter((k) => A.BOOST_AT[k] === u.id).forEach((k) => [1, 2].forEach((n) => { const id = 'boost:' + k + ':' + n; if (C.lessons[id]) A.nodes.push({ id, kind: 'lesson', u: u.id, boost: k }); }));
      if (u.talks.length) A.nodes.push({ id: 'talk:' + u.talks[0], kind: 'talk', u: u.id, talk: u.talks[0] });
      if (u.lessons.length) A.nodes.push({ id: 'check:' + u.id, kind: 'check', u: u.id });
    });
  };
  A.buildNodes([]);
  // make the booster lessons from sentences she has already met (they are checked and translated)
  A.applyBoost = (st) => {
    const want = ((st && st.boost) || []).filter((k) => A.BOOST_AT[k]);
    want.forEach((k) => {
      if (C.lessons['boost:' + k + ':1']) return;
      const u = A.BOOST_AT[k], unit = A.unit(u), after = unit.lessons[unit.lessons.length - 1];
      const hsh = (s) => { let x = 7; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };
      const pool = A.uniq(Object.values(C.lessons).filter((l) => !l.boost && l.u <= u).flatMap((l) => l.sents)).filter((sid) => { const s = A.S(sid); if (!s) return false; if (k === 'prep') return /\b(in|on|at)\b/i.test(s.en); if (k === 'art') return /\b(a|an|the)\b/i.test(s.en); return A.sentSkills(sid).includes(k); });
      // the newest sentences for this point first, then older ones
      const near = pool.filter((sid) => { const s = A.S(sid); return s && s.u >= u - 2; }), far = pool.filter((sid) => !near.includes(sid));
      const pick = near.sort((a, b) => hsh(a) - hsh(b)).concat(far.sort((a, b) => hsh(a) - hsh(b))).slice(0, 16);
      if (pick.length < 4) return;
      const half = Math.ceil(pick.length / 2), name = (A.SKILLS[k] || [k])[0];
      [pick.slice(0, half), pick.slice(half)].forEach((sents, j) => {
        if (sents.length < 3) return;
        const id = 'boost:' + k + ':' + (j + 1);
        C.lessons[id] = { id, u, en: 'Booster: ' + name + (j ? ' II' : ''), th: '', words: [], sents, boost: k, after };
      });
    });
    A.buildNodes(want);
    // the voyage route holds the old node list: build it again (logging out and in again on the same phone)
    if (A.voyage && A.voyage.resetRoute) A.voyage.resetRoute();
  };
  A.nodeById = (id) => A.nodes.find((n) => n.id === id);
  // progress that belongs to a node (used by the dashboard's reset)
  A.nodeItems = (n) => {
    if (n.kind === 'lesson') { const l = C.lessons[n.id]; return [...l.words.map((k) => 'w:' + k), ...l.sents.map((x) => 's:' + x)]; }
    if (n.kind === 'talk') return C.talks[n.talk].lines.map((l) => 's:' + l.id);
    return [];
  };
  A.unit = (n) => C.units.find((u) => u.id === n);
  A.nodeTitle = (n) => {
    if (n.kind === 'lesson') { const l = C.lessons[n.id]; return l.boost ? { en: l.en, th: l.th, icon: '💪', k: 'Booster' } : { en: l.en, th: l.th, icon: '📖', k: 'Lesson ' + n.id }; }
    if (n.kind === 'talk') { const t = C.talks[n.talk]; return { en: A.fill(t.en), th: t.th, icon: '💬', k: 'Conversation' }; }
    const big = n.u % 3 === 0;
    return big
      ? { en: 'Big sea test (timed)', th: 'สอบใหญ่ท้ายทะเล (จับเวลา)', icon: '🏆', k: 'Big test' }
      : { en: 'Fortress test (timed)', th: 'สอบป้อมปราการ (จับเวลา)', icon: '⏱️', k: 'Test' };
  };
  // islands open one after another; the dashboard can open islands ahead (unlockTo) or keep her at one (holdAt)
  A.isOpen = (st, idx, cfg) => {
    const c = A.ctl || {};
    if (c.holdAt != null && c.holdAt !== '' && idx > +c.holdAt && !st.done[A.nodes[idx].id]) return false;
    if (c.unlockTo != null && c.unlockTo !== '' && idx <= +c.unlockTo) return true;
    return idx === 0 || !!(cfg && cfg.unlockAll) || !!st.done[A.nodes[idx - 1].id] || !!st.done[A.nodes[idx].id];
  };
  A.ctl = A.ctl || {};
  // seas: three units each, Thailand to the Maldives
  A.seasDone = (st) => { let n = 0; for (let k = 0; k < 8; k++) { const ns = A.nodes.filter((x) => x.u > k * 3 && x.u <= k * 3 + 3); if (ns.length && ns.every((x) => st.done[x.id])) n++; } return n; };
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
  // skills: how often she gets each grammar point right (lifetime + last 30 answers)
  A.SKILLS = {
    be: ['am / is / are', 'am / is / are'], bep: ['was / were', 'was / were (อดีต)'], s3: ['he / she / it + s', 'he / she / it เติม s'],
    past: ['Past tense', 'กริยาอดีต (went, -ed)'], will: ['will (future)', 'will (อนาคต)'], going: ['going to', 'going to (แผนการ)'],
    ing: ['-ing (doing now)', 'กำลังทำ (-ing)'], do: ["do / does / don't", "do / does / don't"], have: ['have / has', 'have / has'],
    can: ['can', 'can (ทำได้)'], if: ['if …', 'ถ้า … (if)'], question: ['Questions & word order', 'คำถามและการเรียงคำ'],
    order: ['Word order', 'การเรียงคำ'], prep: ['in / on / at', 'in / on / at'], art: ['a / an / the', 'a / an / the'],
    vocab: ['Word meaning', 'ความหมายของคำ'], listen: ['Listening', 'การฟัง'], talk: ['Conversation replies', 'การตอบในบทสนทนา'], other: ['Other', 'อื่น ๆ'],
  };
  A.skillRecord = (st, sk, ok) => {
    if (!sk) return;
    const r = st.sk[sk] || (st.sk[sk] = { n: 0, w: 0, h: '' });
    r.n++; if (!ok) r.w++;
    r.h = (r.h + (ok ? '1' : '0')).slice(-30);
    r.t = Date.now();
  };
  A.skillAcc = (r, recent) => { const h = recent && r.h ? r.h : null; return h ? h.split('').filter((x) => x === '1').length / h.length : r.n ? (r.n - r.w) / r.n : 1; };
  // weakest first: needs at least 5 answers and under 75% in the last 30
  A.weakSkills = (st) => Object.entries(st.sk || {}).filter(([, r]) => r.h.length >= 5 && A.skillAcc(r, true) < 0.75)
    .map(([id, r]) => ({ id, acc: A.skillAcc(r, true), n: r.n })).sort((a, b) => a.acc - b.acc || b.n - a.n);
  A.dueItems = (st) => { const t = A.todayNum(); return Object.keys(st.srs).filter((id) => st.srs[id].d <= t); };
  A.wordCount = (st) => Object.keys(st.srs).filter((k) => k.startsWith('w:')).length;

  // medals — a collection with bronze / silver / gold / pearl tiers. ids of medals already earned never change.
  const lessonsDone = (st) => Object.keys(st.done).filter((k) => C.lessons[k]).length;
  const talksDone = (st) => Object.keys(st.done).filter((k) => k.startsWith('talk:')).length;
  const perfects = (st) => Object.values(st.done).filter((d) => d.a === 100).length;
  const lookups = (st) => Object.values(st.look).reduce((a, b) => a + b, 0);
  const hotelTalk = (st) => Object.keys(st.done).filter((k) => k.startsWith('talk:') && C.talks[k.slice(5)] && C.talks[k.slice(5)].cat === 'hotel').length;
  const bestStreak = (st) => Math.max(A.streak(st), st.best || 0);
  const MEDAL_HOW = {"first": "Finish your first lesson", "lessons10": "Finish 10 lessons", "lessons40": "Finish 40 lessons", "perfect": "Get every answer right in one lesson", "perfect10": "Get 100% in 10 lessons", "streak3": "Learn 3 days in a row", "streak7": "Learn 7 days in a row", "streak14": "Learn 14 days in a row", "streak30": "Learn 30 days in a row", "words25": "Know 25 words", "words100": "Know 100 words", "words300": "Know 300 words", "words600": "Know 600 words", "talk1": "Finish your first conversation", "talks10": "Finish 10 conversations", "talks25": "Finish 25 conversations", "hotel": "Practise a hotel conversation", "review10": "Review 10 times", "review50": "Review 50 times", "curious": "Look up 50 words", "early": "Learn before 8 in the morning", "night": "Learn after 10 at night", "xp1000": "Collect 1000 XP", "month1": "Sail through the first sea", "month2": "Sail through the Gulf of Thailand", "month3": "Sail through the Strait of Malacca", "month4": "Sail through the Andaman Sea", "month5": "Reach the coast of Sri Lanka", "grad": "Sail all the way to Addu, Maldives", "tre10": "Find 10 treasures", "tre50": "Find 50 treasures", "shells8": "Collect 8 kinds of shell", "boat3": "Own 3 boats", "side5": "Finish 5 side missions"};
  // [id, icon, tier, category, English name, Thai name, how to get it (Thai), progress(st) -> [now, goal]]
  A.MEDALS = [
    ['first', 'book', 'bronze', 'learn', 'First Step', 'ก้าวแรก', 'เรียนบทแรกให้จบ', (st) => [Math.min(1, lessonsDone(st) + talksDone(st)), 1]],
    ['lessons10', 'book', 'silver', 'learn', 'Bookworm', 'หนอนหนังสือ', 'เรียนจบ 10 บท', (st) => [lessonsDone(st), 10]],
    ['lessons40', 'book', 'gold', 'learn', 'Scholar', 'นักปราชญ์ตัวน้อย', 'เรียนจบ 40 บท', (st) => [lessonsDone(st), 40]],
    ['perfect', 'target', 'bronze', 'star', 'Bullseye', 'เป๊ะทุกข้อ', 'ไม่ผิดเลยสักข้อใน 1 บท', (st) => [Math.min(1, perfects(st)), 1]],
    ['perfect10', 'hundred', 'gold', 'star', 'Perfectionist', 'สมบูรณ์แบบ', 'ได้ 100% ครบ 10 บท', (st) => [perfects(st), 10]],
    ['streak3', 'flame', 'bronze', 'streak', 'Warm Up', 'อุ่นเครื่อง', 'เรียน 3 วันติดกัน', (st) => [bestStreak(st), 3]],
    ['streak7', 'flame', 'silver', 'streak', 'On Fire', 'ไฟลุก', 'เรียน 7 วันติดกัน', (st) => [bestStreak(st), 7]],
    ['streak14', 'bolt', 'gold', 'streak', 'Unstoppable', 'หยุดไม่อยู่', 'เรียน 14 วันติดกัน', (st) => [bestStreak(st), 14]],
    ['streak30', 'crown', 'pearl', 'streak', 'Ocean Queen', 'ราชินีแห่งท้องทะเล', 'เรียน 30 วันติดกัน', (st) => [bestStreak(st), 30]],
    ['words25', 'sprout', 'bronze', 'words', 'Seedling', 'ต้นกล้า', 'รู้ 25 คำ', (st) => [A.wordCount(st), 25]],
    ['words100', 'sprout', 'silver', 'words', 'Word Garden', 'สวนคำศัพท์', 'รู้ 100 คำ', (st) => [A.wordCount(st), 100]],
    ['words300', 'palm', 'gold', 'words', 'Word Forest', 'ป่าคำศัพท์', 'รู้ 300 คำ', (st) => [A.wordCount(st), 300]],
    ['words600', 'gem', 'pearl', 'words', 'Word Treasure', 'ขุมทรัพย์คำศัพท์', 'รู้ 600 คำ', (st) => [A.wordCount(st), 600]],
    ['talk1', 'chat', 'bronze', 'talk', 'Hello!', 'สวัสดี!', 'ฝึกบทสนทนาครั้งแรก', (st) => [Math.min(1, talksDone(st)), 1]],
    ['talks10', 'chat', 'silver', 'talk', 'Chatterbox', 'ช่างคุย', 'ฝึกบทสนทนา 10 เรื่อง', (st) => [talksDone(st), 10]],
    ['talks25', 'music', 'gold', 'talk', 'Smooth Talker', 'พูดคล่อง', 'ฝึกบทสนทนา 25 เรื่อง', (st) => [talksDone(st), 25]],
    ['hotel', 'bell', 'silver', 'talk', 'Front Desk Star', 'ดาวเด่นแผนกต้อนรับ', 'ฝึกบทสนทนาเรื่องโรงแรม', (st) => [Math.min(1, hotelTalk(st)), 1]],
    ['review10', 'repeat', 'bronze', 'learn', 'Never Forget', 'ไม่มีวันลืม', 'ทบทวน 10 ครั้ง', (st) => [st.reviews || 0, 10]],
    ['review50', 'repeat', 'gold', 'learn', 'Memory Master', 'เซียนความจำ', 'ทบทวน 50 ครั้ง', (st) => [st.reviews || 0, 50]],
    ['curious', 'search', 'bronze', 'learn', 'Curious Cat', 'ช่างสงสัย', 'แตะดูความหมายคำ 50 ครั้ง', (st) => [lookups(st), 50]],
    ['early', 'sunrise', 'silver', 'time', 'Early Bird', 'นกตื่นเช้า', 'เรียนก่อน 8 โมงเช้า', (st) => [st.badges.early || (st.tod && st.tod.early) ? 1 : 0, 1]],
    ['night', 'moon', 'silver', 'time', 'Night Owl', 'นกฮูกกลางคืน', 'เรียนหลัง 4 ทุ่ม', (st) => [st.badges.night || (st.tod && st.tod.night) ? 1 : 0, 1]],
    ['xp1000', 'bolt', 'gold', 'star', '1000 XP', 'พลัง 1000 XP', 'สะสม 1000 XP', (st) => [A.totalXP(st), 1000]],
    ['month1', 'shell', 'bronze', 'month', 'River Leaver', 'ลาก่อนเจ้าพระยา', 'ล่องผ่านแม่น้ำเจ้าพระยา (ทะเลที่ 1)', (st) => [Math.min(1, A.seasDone(st)), 1]],
    ['month2', 'wave', 'silver', 'month', 'Gulf Sailor', 'กะลาสีอ่าวไทย', 'ล่องผ่านอ่าวไทย (ทะเลที่ 2)', (st) => [Math.min(2, A.seasDone(st)), 2]],
    ['month3', 'palm', 'silver', 'month', 'Strait Runner', 'นักเดินเรือช่องแคบ', 'ล่องผ่านช่องแคบมะละกา (ทะเลที่ 3)', (st) => [Math.min(3, A.seasDone(st)), 3]],
    ['month4', 'sun', 'gold', 'month', 'Andaman Explorer', 'นักสำรวจอันดามัน', 'ล่องผ่านทะเลอันดามัน (ทะเลที่ 4)', (st) => [Math.min(4, A.seasDone(st)), 4]],
    ['month5', 'hotel', 'gold', 'month', 'Ocean Crosser', 'ข้ามมหาสมุทร', 'ล่องถึงชายฝั่งศรีลังกา (ทะเลที่ 6)', (st) => [Math.min(6, A.seasDone(st)), 6]],
    ['grad', 'heart', 'pearl', 'month', 'Arrived in the Maldives', 'ถึงมัลดีฟส์แล้ว', 'ล่องเรือถึงอัดดู มัลดีฟส์', (st) => [A.seasDone(st), 8]],
    ['tre10', 'gem', 'bronze', 'star', 'Treasure Hunter', 'นักล่าสมบัติ', 'พบสมบัติ 10 ชิ้น', (st) => [Object.keys((st.sea && st.sea.tre) || {}).length, 10]],
    ['tre50', 'gem', 'gold', 'star', 'Treasure Queen', 'ราชินีสมบัติ', 'พบสมบัติ 50 ชิ้น', (st) => [Object.keys((st.sea && st.sea.tre) || {}).length, 50]],
    ['shells8', 'shell', 'silver', 'words', 'Shell Collector', 'นักสะสมเปลือกหอย', 'เก็บเปลือกหอยครบ 8 ชนิด', (st) => [Object.keys((st.sea && st.sea.sh) || {}).length, 8]],
    ['boat3', 'wave', 'silver', 'time', 'Fleet Captain', 'กัปตันกองเรือ', 'มีเรือ 3 ลำ', (st) => [((st.sea && st.sea.boats) || ['sloop']).length, 3]],
    ['side5', 'search', 'gold', 'learn', 'Explorer', 'นักผจญภัย', 'ทำภารกิจเสริม 5 เกาะ', (st) => [Object.keys((st.sea && st.sea.side) || {}).length, 5]],
  ].map(([id, icon, tier, cat, en, th, how, prog]) => ({ id, icon, tier, cat, en, th, how: MEDAL_HOW[id] || how, prog }));
  A.medal = (id) => A.MEDALS.find((m) => m.id === id);
  A.BADGES = A.MEDALS.map((m) => [m.id, '', m.en, m.th]); // older code paths
  A.checkBadges = (st) => {
    const got = [];
    st.best = Math.max(st.best || 0, A.streak(st));
    A.MEDALS.forEach((m) => {
      if (st.badges[m.id]) return;
      const [now, goal] = m.prog(st);
      if (now >= goal) { st.badges[m.id] = Date.now(); got.push(m.id); }
    });
    return got;
  };

  // which coach messages are unlocked by progress
  A.msgUnlocked = (m, st) => {
    const t = m.trig || { type: 'now' };
    if (t.type === 'now') return true;
    if (t.type === 'unit') return A.unitDone(st, +t.v);
    if (t.type === 'month') return A.monthsDone(st) >= +t.v;
    if (t.type === 'sea') return A.seasDone(st) >= +t.v;
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
    if (t.type === 'sea') return 'After sea ' + t.v;
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
    try {
      const r = await A.api.beat({ ...A.presence, hidden: document.visibilityState === 'visible' ? 0 : 1 });
      if (r && r.cr != null && r.cr !== (A.ctl.rev || 0)) A.loadCtl();
      if (r && r.w && A.live) A.live.start();
    } catch (e) { /* offline */ }
  };
  A.setPresence = (p) => { A.presence = { ...p }; A.beat(true); };
  A.loadCtl = async () => {
    try {
      const c = await A.api.ctl();
      const before = A.ctl.rev;
      A.ctl = c || {};
      A.store.set('ae.ctl', A.ctl);
      if (before != null && before !== A.ctl.rev && A.user && A.user.role === 'learner' && !A.session && ['journey', 'home'].includes(A.view)) A.go(A.view);
    } catch (e) { A.ctl = A.store.get('ae.ctl', {}) || {}; }
  };
  // the live view: while the dashboard is watching, her screen is mirrored to it (she is not told)
  A.live = {
    on: false, last: '', timer: null,
    start() { if (this.on || !A.user || A.user.role !== 'learner') return; this.on = true; this.loop(); },
    snap() {
      const app = document.getElementById('app'); if (!app) return '';
      const parts = [app.outerHTML];
      document.querySelectorAll('body > .fb, body > .sheet, body > .veil, body > .toast, body > .pt-ov').forEach((x) => parts.push(x.outerHTML));
      return parts.join('').replace(/<script[\s\S]*?<\/script>/gi, '').slice(0, 400000);
    },
    async loop() {
      if (!this.on) return;
      try {
        const html = this.snap();
        const meta = { view: A.view, title: A.presence.title || '', step: A.presence.step, total: A.presence.total, dark: document.documentElement.classList.contains('dark') ? 1 : 0, sx: Math.round(window.scrollY), timer: (document.querySelector('.q-timer') || {}).textContent || '' };
        const changed = html !== this.last;
        const r = await A.api.livePush(changed ? { html, ...meta } : { same: 1, ...meta });
        this.last = html;
        if (!r || !r.w) { this.on = false; this.last = ''; return; }
      } catch (e) { /* offline */ }
      this.timer = setTimeout(() => this.loop(), 1000);
    },
  };
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
    // a reset from the dashboard always wins over an older copy on this phone
    if (server && (server.resetAt || 0) > ((local && local.resetAt) || 0)) return server;
    if (local && (!server || (local.rev || 0) > (server.rev || 0))) { setTimeout(A.saveSoon, 1000); return local; }
    return server;
  };
})();
