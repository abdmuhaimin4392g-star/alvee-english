"""Build every lesson/talk/test session and render every step; report problems."""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
JS = r"""async () => {
  const A = window.AE; const out = {nodes: 0, steps: 0, problems: [], types: {}};
  const st = A.newState();
  const ctl = { next(){}, answer(){}, plain(){} };
  A.user = A.user || {name: 'Alvee', role: 'learner', cfg: {}};
  A.state = A.state || st;
  for (let rep = 0; rep < 3; rep++) for (const n of A.nodes) {
    let ses;
    try { ses = A.buildSession('node', n.id, st); } catch (e) { out.problems.push(n.id + ' build: ' + e.message); continue; }
    if (rep === 0) out.nodes++;
    if (!ses.steps.length) out.problems.push(n.id + ': no steps');
    A.session = ses;
    for (const s of ses.steps) {
      out.steps++; out.types[s.type] = (out.types[s.type] || 0) + 1;
      try {
        if (s.type === 'gap') { if (!s.gap.opts.some(o => o.toLowerCase() === s.gap.answer.toLowerCase())) out.problems.push(n.id + ' gap answer missing: ' + A.S(s.sid).en); if (A.uniq(s.gap.opts.map(o=>o.toLowerCase())).length < 2) out.problems.push(n.id + ' gap <2 opts ' + A.S(s.sid).en); }
        if (s.type === 'pick' || s.type === 'reply') { const k = s.opts.filter(o => o.ok).length; if (k !== 1) out.problems.push(n.id + ' pick ok count ' + k); if (s.opts.length < 2) out.problems.push(n.id + ' pick <2 opts: ' + A.S(s.sid).en); const texts = s.opts.map(o => o.s.toLowerCase()); if (A.uniq(texts).length !== texts.length) out.problems.push(n.id + ' dup opts: ' + texts.join(' | ')); }
        if (s.type === 'build') { const a = s.tiles.answer.map(x=>x.toLowerCase()); const t = s.tiles.tiles.map(x=>x.w.toLowerCase()); for (const w of a) { const i = t.indexOf(w); if (i < 0) out.problems.push(n.id + ' build missing tile ' + w); else t.splice(i,1); } }
        if (['w2th','th2w','pic','listenw'].includes(s.type)) { if (!s.opts.includes(s.key)) out.problems.push(n.id + ' word opts missing key ' + s.key); if (s.opts.length < 3) out.problems.push(n.id + ' word opts < 3 ' + s.key); }
        if (s.type === 'match' && s.keys.length < 3) out.problems.push(n.id + ' match < 3');
        const el = A.RENDER[s.type](s, ctl);
        if (!el || !(el instanceof Node)) out.problems.push(n.id + ' render none ' + s.type);
      } catch (e) { out.problems.push(n.id + ' ' + s.type + ': ' + e.message); }
    }
  }
  // reviews with a full state
  for (const n of A.nodes) st.done[n.id] = {s:2,a:80,t:Date.now(),n:1};
  Object.values(A.C.lessons).forEach(l => { l.words.forEach(k => A.srsApply(st, 'w:'+k, Math.random()>.3)); l.sents.forEach(s => A.srsApply(st, 's:'+s, Math.random()>.3)); });
  for (const kind of ['review','mistakes']) { const ses = A.buildSession(kind, null, st); if (!ses.steps.length) out.problems.push(kind + ' empty'); for (const s of ses.steps) { try { A.RENDER[s.type](s, ctl); } catch (e) { out.problems.push(kind + ' ' + s.type + ': ' + e.message); } } }
  for (const t of Object.keys(A.C.talks)) { const ses = A.buildSession('talk', t, st); for (const s of ses.steps) { try { A.RENDER[s.type](s, ctl); } catch (e) { out.problems.push('talk ' + t + ' ' + s.type + ': ' + e.message); } } }
  A.session = null;
  return out;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_selector('#lg-user')
    r = pg.evaluate(JS)
    pg.wait_for_timeout(1500)
    print(json.dumps({k: v for k, v in r.items() if k != 'problems'}, ensure_ascii=False))
    print('PROBLEMS', len(r['problems'])); [print(' ', x) for x in r['problems'][:60]]
    print('PAGE ERRORS', errs[:10])
    b.close()
