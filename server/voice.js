/* voice.js — a real American voice for the app (Google Cloud Text-to-Speech, Chirp 3 HD voices).
   Every English line of the course is recorded once as an MP3 and kept in DATA/voice/<voice>/<id>.mp3.
   The Google key stays on the server (DATA/voice/config.json) and is never sent to a phone.
   The phone finds a recording by the same id (cyrb53 hash of the normalised text); anything without one uses the phone voice. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VOICES = [
  ['en-US-Chirp3-HD-Aoede', 'Aoede', 'woman · warm and clear'], ['en-US-Chirp3-HD-Kore', 'Kore', 'woman · bright and friendly'],
  ['en-US-Chirp3-HD-Leda', 'Leda', 'woman · young and soft'], ['en-US-Chirp3-HD-Zephyr', 'Zephyr', 'woman · light and cheerful'],
  ['en-US-Chirp3-HD-Charon', 'Charon', 'man · calm and deep'], ['en-US-Chirp3-HD-Puck', 'Puck', 'man · upbeat'],
];
const SAMPLE = 'Hello Alvee! Welcome to your English voyage. How are you today?';

const norm = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\{bf\}/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const idOf = (t) => cyrb53(norm(t));

module.exports = function voice({ DATA, PUB, readJSON, atomicWrite }) {
  const DIR = path.join(DATA, 'voice');
  const CFG = path.join(DIR, 'config.json');
  fs.mkdirSync(DIR, { recursive: true });
  const cfg = () => readJSON(CFG, {});
  const saveCfg = (c) => atomicWrite(CFG, JSON.stringify(c, null, 1));
  const short = (v) => String(v || '').split('-').pop().replace(/[^A-Za-z0-9]/g, '');
  const vdir = (v) => path.join(DIR, short(v));

  // every English line the app can say, read from the course files
  let TEXTS = null, TEXTS_AT = 0;
  function texts() {
    const files = ['content.js', 'idioms.js', 'vocab.js', 'defs.js'].map((f) => path.join(PUB, 'js', f));
    const at = Math.max(...files.map((f) => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } }));
    if (TEXTS && at === TEXTS_AT) return TEXTS;
    const win = {};
    files.forEach((f) => { try { vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: win }, { timeout: 5000 }); } catch (e) { /* skip */ } });
    const out = new Map(), add = (t) => { t = String(t || '').replace(/\{bf\}/g, '').trim(); if (!t || t.length > 280 || /[฀-๿]/.test(t) || !/[a-z]/i.test(t)) return; const id = idOf(t); if (!out.has(id)) out.set(id, t); };
    const C = win.CONTENT || {};
    Object.values(C.sents || {}).forEach((s) => add(s.en));
    Object.values(C.dict || {}).forEach((d) => { add(d.w); (d.ex || []).forEach((e) => add(e[0])); });
    const walk = (o, depth) => { if (!o || depth > 6) return; if (Array.isArray(o)) return o.forEach((x) => walk(x, depth + 1)); if (typeof o !== 'object') return; Object.entries(o).forEach(([k, v]) => { if ((k === 'en' || k === 'a' || k === 'q') && typeof v === 'string') add(v); else if (typeof v === 'object') walk(v, depth + 1); }); };
    walk(C.talks, 0); walk(C.tips, 0);
    Object.values(win.IDIOMS || {}).flat().forEach((i) => { add(i[0]); add(i[3]); });
    Object.values(win.VOCAB || {}).flat().forEach((v) => { add(v[0]); add(v[4]); });
    (win.WOTD || []).forEach((w) => { add(w[0]); add(w[5]); });
    add(SAMPLE); add('Hello! This is my English voice. Is it clear?');
    TEXTS = out; TEXTS_AT = at;
    return out;
  }

  async function synth(text, name, key) {
    const body = { input: { text }, voice: { languageCode: 'en-US', name }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92 } };
    const call = async (b) => {
      const r = await fetch((process.env.TTS_URL || 'https://texttospeech.googleapis.com/v1/text:synthesize') + '?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Google said ' + r.status)); e.status = r.status; throw e; }
      return Buffer.from(j.audioContent || '', 'base64');
    };
    try { return await call(body); } catch (e) {
      if (e.status === 400 && /rate|pitch/i.test(e.message)) { delete body.audioConfig.speakingRate; return call(body); }
      throw e;
    }
  }

  // ---- the recording job (one at a time, 3 requests in parallel, polite pace)
  const JOB = { on: false, done: 0, fail: 0, total: 0, err: '', voice: '', started: 0, stop: false };
  function have(v) { try { return new Set(fs.readdirSync(vdir(v)).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4))); } catch (e) { return new Set(); } }
  async function run() {
    const c = cfg(); if (!c.key || !c.voice || JOB.on) return;
    const v = c.voice, dir = vdir(v); fs.mkdirSync(dir, { recursive: true });
    const got = have(v), todo = [...texts()].filter(([id]) => !got.has(id));
    Object.assign(JOB, { on: true, done: 0, fail: 0, total: todo.length, err: '', voice: v, started: Date.now(), stop: false });
    let i = 0;
    const worker = async () => {
      while (i < todo.length && !JOB.stop) {
        const [id, t] = todo[i++];
        try { const buf = await synth(t, v, c.key); if (buf.length) fs.writeFileSync(path.join(dir, id + '.mp3'), buf); JOB.done++; }
        catch (e) { JOB.fail++; JOB.err = e.message; if (e.status === 403 || e.status === 401 || (e.status === 400 && /key|api/i.test(e.message))) JOB.stop = true; if (e.status === 429) await new Promise((r) => setTimeout(r, 4000)); }
        await new Promise((r) => setTimeout(r, 60));
      }
    };
    try { await Promise.all([worker(), worker(), worker()]); } finally { JOB.on = false; MAN = null; }
  }
  let MAN = null;
  const manifest = () => {
    const c = cfg();
    if (!c.voice || c.off) return { v: '', ids: [] };
    if (!MAN || MAN.v !== c.voice || Date.now() - MAN.t > 15000) MAN = { v: c.voice, t: Date.now(), ids: [...have(c.voice)] };
    return { v: short(c.voice), ids: MAN.ids };
  };

  return {
    // GET /voice/manifest.json and /voice/<Voice>/<id>.mp3 (no login needed: it is only the course audio)
    serve(req, res, p) {
      if (p === '/voice/manifest.json') {
        const m = manifest(), body = JSON.stringify(m);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }); return res.end(body);
      }
      const m = /^\/voice\/([A-Za-z0-9]+)\/([a-z0-9]+)\.mp3$/.exec(p);
      if (!m) { res.writeHead(404); return res.end(); }
      const f = path.join(DIR, m[1], m[2] + '.mp3');
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      const st = fs.statSync(f), range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      const H = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Accept-Ranges': 'bytes' };
      if (range) {
        const a = range[1] ? +range[1] : 0, b = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
        res.writeHead(206, { ...H, 'Content-Range': 'bytes ' + a + '-' + b + '/' + st.size, 'Content-Length': b - a + 1 });
        return fs.createReadStream(f, { start: a, end: b }).pipe(res);
      }
      res.writeHead(200, { ...H, 'Content-Length': st.size });
      fs.createReadStream(f).pipe(res);
    },
    // admin/voice routes
    async admin(route, method, body, send, res) {
      const c = cfg();
      if (route === 'admin/voice' && method === 'GET') {
        const all = texts(), got = c.voice ? have(c.voice) : new Set();
        return send(res, 200, { hasKey: !!c.key, keyEnd: c.key ? c.key.slice(-4) : '', voice: c.voice || '', off: !!c.off, voices: VOICES, total: all.size, have: [...all.keys()].filter((id) => got.has(id)).length, job: { ...JOB }, chars: [...all.values()].reduce((a, t) => a + t.length, 0) });
      }
      if (route === 'admin/voice/key' && method === 'POST') {
        const k = String(body.key || '').trim();
        if (!/^[A-Za-z0-9_-]{20,80}$/.test(k)) return send(res, 400, { error: 'That does not look like a Google API key.' });
        try { await synth('Hello!', (VOICES[0])[0], k); } catch (e) { return send(res, 400, { error: 'Google did not accept the key: ' + e.message }); }
        saveCfg({ ...c, key: k }); return send(res, 200, { ok: 1 });
      }
      if (route === 'admin/voice/sample' && method === 'POST') {
        if (!c.key) return send(res, 400, { error: 'Add the Google key first.' });
        const v = VOICES.find((x) => x[0] === body.voice); if (!v) return send(res, 400, { error: 'Unknown voice' });
        const f = path.join(DIR, 'sample-' + short(v[0]) + '.mp3');
        try { if (!fs.existsSync(f)) fs.writeFileSync(f, await synth(SAMPLE, v[0], c.key)); } catch (e) { return send(res, 400, { error: e.message }); }
        return send(res, 200, { audio: 'data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') });
      }
      if (route === 'admin/voice/start' && method === 'POST') {
        if (!c.key) return send(res, 400, { error: 'Add the Google key first.' });
        const v = VOICES.find((x) => x[0] === body.voice) ? body.voice : c.voice || VOICES[0][0];
        if (JOB.on && v !== JOB.voice) return send(res, 409, { error: 'Already recording another voice. Stop it first.' });
        saveCfg({ ...cfg(), voice: v, off: false }); MAN = null;
        run().catch((e) => { JOB.err = e.message; JOB.on = false; });
        return send(res, 200, { ok: 1 });
      }
      if (route === 'admin/voice/stop' && method === 'POST') { JOB.stop = true; return send(res, 200, { ok: 1 }); }
      if (route === 'admin/voice/off' && method === 'POST') { saveCfg({ ...cfg(), off: !!body.off }); MAN = null; return send(res, 200, { ok: 1 }); }
      return null;
    },
  };
};
module.exports.idOf = idOf;
module.exports.norm = norm;
