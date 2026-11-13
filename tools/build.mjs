// Build: content/*.txt  ->  public/js/content.js
// Also validates that every English word in every sentence has a Thai dictionary
// entry, and that every dictionary word has at least 2 examples.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public/js/content.js');
const STRICT = process.argv.includes('--strict');
const QUIET = process.argv.includes('--quiet');

// ---------------------------------------------------------------- tokenizer
export const TOKEN_RE = /[$฿]?[A-Za-zÀ-ÿ0-9]+(?:'[A-Za-zÀ-ÿ]+)*(?:[-:][A-Za-zÀ-ÿ0-9]+)*%?|[.,!?;"()…]/g;
export const tokenize = (s) => (s.replace(/[’‘]/g, "'").match(TOKEN_RE) || []);
const isPunct = (t) => /^[.,!?;"()…]$/.test(t);
const isNum = (t) => /^[$฿]?\d/.test(t);

// ---------------------------------------------------------------- helpers
const hash = (s) => {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
};
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const sid = (en) => 's' + hash(norm(en).toLowerCase());

const VOW = 'aeiou';
const isCVC = (w) => /^[^aeiou]*[aeiou][bdgklmnprt]$/.test(w) && w.length <= 4;
function form3s(w) {
  if (/(s|sh|ch|x|z|o)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}
function formPast(w) {
  if (/e$/.test(w)) return w + 'd';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
  if (isCVC(w)) return w + w.at(-1) + 'ed';
  return w + 'ed';
}
function formIng(w) {
  if (/ie$/.test(w)) return w.slice(0, -2) + 'ying';
  if (/[^e]e$/.test(w) && w !== 'be') return w.slice(0, -1) + 'ing';
  if (isCVC(w)) return w + w.at(-1) + 'ing';
  return w + 'ing';
}
function plural(w) {
  if (/(s|sh|ch|x|z)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}

// ---------------------------------------------------------------- parse
const dict = {};          // key -> entry
const dictOrder = [];
const months = [];
const units = [];
const lessons = {};
const tips = {};
const sents = {};          // id -> {en, th, note, t, ph, u, l}
const talks = {};
const errors = [];
const warnings = [];
let lastEntry = null;

function addSentence(en, th, note, where) {
  en = norm(en); th = norm(th || '');
  const id = sid(en);
  if (sents[id]) {
    if (sents[id].en !== en) errors.push(`hash collision ${id}: "${en}" vs "${sents[id].en}"`);
    if (!sents[id].th && th) sents[id].th = th;
    if (!sents[id].note && note) sents[id].note = note;
    return id;
  }
  if (!th) errors.push(`missing Thai for "${en}" (${where.file}:${where.line})`);
  sents[id] = { id, en, th, note: note || undefined, u: where.u, l: where.l };
  return id;
}

function parseFile(file) {
  const text = fs.readFileSync(path.join(SRC, file), 'utf8');
  const lines = text.split(/\r?\n/);
  let unit = null, lesson = null, tip = null, talk = null, mode = null, pendingTip = null;
  let lastB = null;
  lines.forEach((raw, i) => {
    const where = { file, line: i + 1, u: unit?.id, l: lesson?.id };
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) return;
    const t = line.trim();

    if (t.startsWith('@')) {
      const [head, ...rest] = t.split('|').map((x) => x.trim());
      const [tag, arg] = head.split(/\s+/, 2);
      tip = null; talk = null; lastB = null;
      if (tag === '@dict') { mode = 'dict'; unit = null; lesson = null; return; }
      if (tag === '@month') {
        mode = 'unit';
        months.push({ n: +arg, en: rest[0], th: rest[1], resort: rest[2], resortTh: rest[3] });
        return;
      }
      if (tag === '@unit') {
        mode = 'unit';
        unit = { id: +arg, m: months.at(-1)?.n, en: rest[0], th: rest[1], deco: rest[2] || '🌺', goal: rest[3] || '', lessons: [], talks: [] };
        units.push(unit); lesson = null; return;
      }
      if (tag === '@lesson') {
        mode = 'lesson';
        lesson = { id: arg, u: unit.id, en: rest[0], th: rest[1], words: [], sents: [], tip: pendingTip };
        pendingTip = null;
        lessons[arg] = lesson; unit.lessons.push(arg); return;
      }
      if (tag === '@tip') {
        mode = 'tip';
        const id = 't' + (Object.keys(tips).length + 1);
        tip = { id, title: rest[0] || arg, u: unit?.id, blocks: [] };
        tips[id] = tip; pendingTip = id; return;
      }
      if (tag === '@talk') {
        mode = 'talk';
        talk = { id: arg, u: unit?.id, en: rest[0], th: rest[1], cat: rest[2] || 'friends', a: rest[3] || 'Friend', ae: rest[4] || '🙂', lines: [] };
        if (talks[arg]) errors.push(`duplicate talk id ${arg}`);
        talks[arg] = talk; unit?.talks.push(arg); return;
      }
      errors.push(`unknown tag ${tag} (${file}:${i + 1})`);
      return;
    }

    if (mode === 'dict') {
      if (t.startsWith('+')) {
        const [en, th] = t.slice(1).split(' = ').map((x) => x && x.trim());
        if (!lastEntry) return errors.push(`example without entry ${file}:${i + 1}`);
        if (!th) errors.push(`example missing Thai: ${t} (${file}:${i + 1})`);
        lastEntry.ex.push([norm(en), norm(th || '')]);
        return;
      }
      const f = t.split('|').map((x) => x.trim());
      const [w, pos = '', th = '', pr = '', e = '', n = ''] = f;
      if (!th) errors.push(`dict entry without Thai: ${w} (${file}:${i + 1})`);
      const key = w.includes(' ') ? w.toLowerCase() : w;
      if (dict[key]) errors.push(`duplicate dict entry "${key}" (${file}:${i + 1})`);
      const entry = { w, p: pos, th, pr, e: e || undefined, n: n || undefined, ex: [] };
      // pos may be "v", "v:goes,went,going", "n", "n:people", "n0", "adj+v", "contr:I am"
      const [pbase, pargs] = pos.split(':');
      const kinds = pbase.split('+');
      entry.p = kinds[0];
      if (kinds.includes('v')) {
        const auto = [form3s(w), formPast(w), formIng(w)];
        const given = (pargs || '').split(',').map((x) => x.trim());
        entry.forms = auto.map((a, k) => (given[k] && given[k] !== '=' ? given[k] : a));
        if (kinds[0] !== 'v') entry.v = 1;
      }
      if (kinds[0] === 'n') entry.pl = pargs ? pargs.trim() : plural(w);
      if (kinds[0] === 'contr') entry.exp = pargs?.trim();
      dict[key] = entry; dictOrder.push(key); lastEntry = entry;
      return;
    }

    if (mode === 'tip' && tip) {
      const m = t.match(/^(p|ok|no|tr|trick|h):\s*(.*)$/);
      if (!m) return errors.push(`bad tip line ${file}:${i + 1}: ${t}`);
      const [, k, v] = m;
      if (k === 'ok' || k === 'no') {
        const [en, th] = v.split('|').map((x) => x.trim());
        tip.blocks.push({ k, en, th });
      } else if (k === 'tr') tip.blocks.push({ k, cells: v.split('|').map((x) => x.trim()) });
      else tip.blocks.push({ k, v });
      return;
    }

    if (mode === 'lesson' && lesson) {
      if (t.startsWith('new:')) {
        lesson.words.push(...t.slice(4).trim().split(/\s+/).filter(Boolean).map((x) => x.replace(/_/g, ' ')));
        return;
      }
      const m = t.match(/^(.*?)\s=\s(.*?)(?:\s\|\s(.*))?$/);
      if (!m) return errors.push(`bad sentence line ${file}:${i + 1}: ${t}`);
      const id = addSentence(m[1], m[2], m[3], where);
      lesson.sents.push(id);
      return;
    }

    if (mode === 'talk' && talk) {
      const x = t.match(/^x:\s*(.*)$/);
      if (x) {
        if (!lastB) return errors.push(`x: without B line ${file}:${i + 1}`);
        lastB.x.push(norm(x[1]));
        return;
      }
      const m = t.match(/^(A|B):\s*(.*?)\s=\s(.*?)(?:\s\|\s(.*))?$/);
      if (!m) return errors.push(`bad talk line ${file}:${i + 1}: ${t}`);
      const id = addSentence(m[2], m[3], m[4], { ...where, l: 'talk:' + talk.id });
      const ln = { s: m[1], id, x: [] };
      if (m[1] === 'B') {
        lastB = ln;
        const prev = talk.lines.at(-1);
        if (prev && prev.s === 'A' && !sents[id].ctx) sents[id].ctx = prev.id;
      } else lastB = null;
      talk.lines.push(ln);
      return;
    }

    errors.push(`line outside a section ${file}:${i + 1}: ${t}`);
  });
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.txt')).sort((a, b) => {
  const r = (f) => (f.startsWith('dict') ? 0 : 1);
  return r(a) - r(b) || a.localeCompare(b, 'en', { numeric: true });
});
files.forEach(parseFile);

// ---------------------------------------------------------------- forms
const FORM_NOTE = {
  '3s': (b) => `"${b}" เติม s — ใช้กับ he / she / it / ชื่อคน 1 คน (ปัจจุบัน)`,
  past: (b) => `อดีตของ "${b}" — ใช้กับเรื่องที่เกิดขึ้นแล้ว เช่น yesterday (เมื่อวาน)`,
  ing: (b) => `"${b}" + ing — ใช้คู่กับ am / is / are = กำลังทำอยู่`,
  pl: (b) => `พหูพจน์ของ "${b}" (มากกว่า 1) — ใช้กับ are`,
};
const formTh = (f, th) => {
  const first = th.split(/[,/(]/)[0].trim();
  if (f === 'ing') return `กำลัง${first}`;
  if (f === 'past') return `${first} (อดีต)`;
  if (f === 'pl') return `${first} (หลายอัน/หลายคน)`;
  return first;
};
for (const key of [...dictOrder]) {
  const e = dict[key];
  const add = (form, f) => {
    if (!form || form === e.w) return;
    const fe = { w: form, p: e.p, th: formTh(f, e.th), pr: '', base: key, f, n: FORM_NOTE[f](e.w), ex: [] };
    if (dict[form]) {
      const cur = dict[form];
      cur.also = cur.also || [];
      if (!cur.also.some((a) => a.base === key && a.f === f)) cur.also.push({ base: key, f, th: fe.th });
    } else dict[form] = fe;
  };
  if (e.forms) { add(e.forms[0], '3s'); add(e.forms[1], 'past'); add(e.forms[2], 'ing'); }
  if (e.pl) add(e.pl, 'pl');
}

// ---------------------------------------------------------------- lookup & coverage
const lookupKey = (tok) => {
  if (isPunct(tok)) return null;
  if (isNum(tok)) return '#';
  if (dict[tok]) return tok;
  const lo = tok.toLowerCase();
  if (dict[lo]) return lo;
  const cap = lo.charAt(0).toUpperCase() + lo.slice(1);
  if (dict[cap]) return cap;
  return undefined;
};
const phraseKeys = Object.keys(dict).filter((k) => k.includes(' '));
const phraseSet = new Set(phraseKeys);
const maxPh = Math.max(1, ...phraseKeys.map((k) => k.split(' ').length));

function analyze(en) {
  const t = tokenize(en);
  const lo = t.map((x) => x.toLowerCase());
  const lem = t.map((x) => { const k = lookupKey(x); return (k && dict[k] && dict[k].base ? dict[k].base : x).toLowerCase(); });
  const ph = [];
  for (let i = 0; i < t.length; i++) {
    for (let n = Math.min(maxPh, t.length - i); n >= 2; n--) {
      const k = lo.slice(i, i + n).join(' ');
      const k2 = lem.slice(i, i + n).join(' ');
      const hit = phraseSet.has(k) ? k : phraseSet.has(k2) ? k2 : null;
      if (hit) { ph.push([i, i + n - 1, hit]); i += n - 1; break; }
    }
  }
  return { t, ph };
}

const missing = new Map();
const noteMissing = (tok, where) => {
  if (!missing.has(tok)) missing.set(tok, []);
  const arr = missing.get(tok);
  if (arr.length < 3) arr.push(where);
};
const usage = new Map(); // lemma key -> [sentence ids]
const lemmaOf = (k) => (k && dict[k]?.base ? dict[k].base : k);

for (const s of Object.values(sents)) {
  const { t, ph } = analyze(s.en);
  s.t = t; if (ph.length) s.ph = ph;
  const seen = new Set();
  t.forEach((tok) => {
    const k = lookupKey(tok);
    if (k === undefined) noteMissing(tok, s.en);
    else if (k && k !== '#') {
      for (const kk of [k, lemmaOf(k)]) {
        if (seen.has(kk)) continue; seen.add(kk);
        if (!usage.has(kk)) usage.set(kk, []);
        usage.get(kk).push(s.id);
      }
    }
  });
  (s.ph || []).forEach(([, , k]) => {
    if (!usage.has(k)) usage.set(k, []);
    usage.get(k).push(s.id);
  });
}
// authored examples + tip examples must also be tappable
for (const key of dictOrder) for (const [en] of dict[key].ex) tokenize(en).forEach((tok) => { if (lookupKey(tok) === undefined) noteMissing(tok, `ex of ${key}: ${en}`); });
for (const tp of Object.values(tips)) for (const b of tp.blocks) if (b.k === 'ok') tokenize(b.en).forEach((tok) => { if (lookupKey(tok) === undefined) noteMissing(tok, `tip ${tp.title}: ${b.en}`); });

// unit order for sorting examples
const unitRank = (u) => (u == null ? 999 : u);
for (const [k, ids] of usage) {
  const e = dict[k];
  if (!e) continue;
  const uniq = [...new Set(ids)].sort((a, b) => unitRank(sents[a].u) - unitRank(sents[b].u));
  e.xs = uniq.slice(0, 8);
  const first = uniq.length ? sents[uniq[0]].u : undefined;
  if (first != null) e.u = first;
}

// lesson new words must exist
for (const l of Object.values(lessons)) {
  l.words = l.words.map((w) => {
    const k = lookupKey(w) ?? (dict[w.toLowerCase()] ? w.toLowerCase() : undefined);
    if (k === undefined) errors.push(`lesson ${l.id} new word not in dict: "${w}"`);
    return k ?? w;
  });
}

// pedagogical order check
const BASIC = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'my', 'your', 'it', 'this', 'that', 'yes', 'no', 'not', 'very', 'too', 'please', 'hello', 'hi', 'okay', 'oh', 'so', 'here', 'there', 'now', 'me', 'thank you', 'thanks', 'sorry', 'wow', 'ok', 'OK', 'bye', 'much', 'her', 'him', 'his', 'us', 'them', 'more', 'about', 'after', 'one', 'their', 'some', 'any', 'also', 'just']);
const introduced = new Set();
const order = units.flatMap((u) => [...u.lessons.map((id) => ({ type: 'l', id })), ...u.talks.map((id) => ({ type: 't', id }))]);
const lateUse = [];
for (const node of order) {
  if (node.type === 'l') {
    const l = lessons[node.id];
    l.words.forEach((w) => { introduced.add(w); introduced.add(lemmaOf(w)); });
    for (const id of l.sents) for (const [ti, tok] of sents[id].t.entries()) {
      if ((sents[id].ph || []).some(([a, b, pk]) => ti >= a && ti <= b && introduced.has(pk))) continue;
      const k = lookupKey(tok);
      if (!k || k === '#') continue;
      const lem = lemmaOf(k);
      if (BASIC.has(k) || BASIC.has(lem) || introduced.has(k) || introduced.has(lem) || dict[k]?.p === 'name' || dict[lem]?.p === 'contr') continue;
      // auto-introduce untaught content words (up to 8 new words per lesson)
      const CONTENT = ['n', 'v', 'adj', 'adv', 'q', 'num'];
      if (dict[lem] && CONTENT.includes(dict[lem].p) && l.words.length < 8) {
        l.words.push(lem); l.auto = (l.auto || 0) + 1; introduced.add(lem); introduced.add(k);
        continue;
      }
      lateUse.push(`${l.id}: "${tok}" in "${sents[id].en}"`);
    }
  }
}

// examples check: every lemma used in the course needs >= 2 examples
const fewExamples = [];
for (const key of dictOrder) {
  const e = dict[key];
  const n = (e.ex?.length || 0) + (e.xs?.length || 0);
  const used = usage.has(key);
  if (n < 2) fewExamples.push(`${key} (${n}${used ? '' : ', unused'})`);
}

// ---------------------------------------------------------------- output
for (const e of Object.values(dict)) {
  if (!e.ex?.length) delete e.ex;
  if (!e.pr) delete e.pr;
  for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
}
for (const s of Object.values(sents)) for (const k of Object.keys(s)) if (s[k] === undefined) delete s[k];

const out = { v: new Date().toISOString().slice(0, 16), months, units, lessons, tips, talks, sents, dict };
fs.writeFileSync(OUT, 'window.CONTENT=' + JSON.stringify(out) + ';\n');

// ---------------------------------------------------------------- report
const p = (...a) => { if (!QUIET) console.log(...a); };
p(`months ${months.length} · units ${units.length} · lessons ${Object.keys(lessons).length} · talks ${Object.keys(talks).length} · sentences ${Object.keys(sents).length} · dict ${dictOrder.length} (+${Object.keys(dict).length - dictOrder.length} forms)`);
p(`content.js ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB · auto-introduced words: ${Object.values(lessons).reduce((a, l) => a + (l.auto || 0), 0)}`);
if (missing.size) {
  console.log(`\nMISSING DICT (${missing.size}):`);
  for (const [tok, w] of missing) console.log(`  ${tok}  ←  ${w[0]}`);
}
if (fewExamples.length) console.log(`\nFEW EXAMPLES (${fewExamples.length}): ${fewExamples.join(', ')}`);
if (lateUse.length && !QUIET) console.log(`\nUSED BEFORE INTRODUCED (${lateUse.length}):\n  ` + lateUse.slice(0, 80).join('\n  '));
if (errors.length) { console.log(`\nERRORS (${errors.length}):\n  ` + errors.join('\n  ')); process.exitCode = 1; }
if (STRICT && (missing.size || fewExamples.length)) process.exitCode = 1;
