"""End-to-end check: play lessons as Alvee on a phone-sized screen, then open the dashboard.
Usage: python3 tools/e2e.py [base_url] [lessons_to_play] [--wrong]
"""
import sys, json, time, os
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 2
WRONG = '--wrong' in sys.argv
OUT = '/home/claude/alvee-english/shots'
os.makedirs(OUT, exist_ok=True)
errors = []

STEP_JS = """() => {
  const s = AE.session; if (!s) return null;
  const st = s.steps[s.i]; if (!st) return {type:'end'};
  const r = {type: st.type, i: s.i, n: s.steps.length};
  if (st.opts) r.opts = st.opts.map(o => typeof o === 'string' ? o : (o.ok ? 'OK' : 'x'));
  if (st.key) r.key = st.key;
  if (st.sid) r.sid = st.sid;
  if (st.gap) r.answer = st.gap.answer, r.gopts = st.gap.opts;
  if (st.tiles) r.answerWords = st.tiles.answer, r.tiles = st.tiles.tiles.map(t => t.w);
  if (st.keys) r.keys = st.keys;
  return r;
}"""

def shot(page, name):
    page.screenshot(path=f'{OUT}/{name}.png', full_page=False)

def click_fb(page):
    try:
        page.wait_for_selector('#fb-next', timeout=2500)
        page.click('#fb-next')
    except Exception:
        pass

def play_session(page, tag, wrong_every=0):
    count = 0
    while True:
        page.wait_for_timeout(250)
        info = page.evaluate(STEP_JS)
        if info is None or info.get('type') == 'end':
            break
        t = info['type']; count += 1
        if count > 80:
            raise RuntimeError('too many steps')
        body = page.locator('.player-body')
        go_wrong = wrong_every and count % wrong_every == 0
        if t in ('tip', 'wintro', 'sintro'):
            if count <= 6: shot(page, f'{tag}-{count:02d}-{t}')
            body.locator('button.btn').last.click()
            continue
        if t in ('w2th', 'th2w', 'pic', 'listenw'):
            idx = info['opts'].index(info['key'])
            if go_wrong: idx = (idx + 1) % len(info['opts'])
            if count <= 14: shot(page, f'{tag}-{count:02d}-{t}')
            body.locator('.opt').nth(idx).click(); click_fb(page); continue
        if t in ('meaning', 'listen'):
            idx = info['opts'].index(info['sid'])
            if go_wrong: idx = (idx + 1) % len(info['opts'])
            if count <= 14: shot(page, f'{tag}-{count:02d}-{t}')
            body.locator('.opt').nth(idx).click(); click_fb(page); continue
        if t in ('pick', 'reply'):
            idx = info['opts'].index('OK')
            if go_wrong: idx = (idx + 1) % len(info['opts'])
            if count <= 16: shot(page, f'{tag}-{count:02d}-{t}')
            body.locator('.opt').nth(idx).click()
            if go_wrong: page.wait_for_timeout(200); shot(page, f'{tag}-{count:02d}-{t}-wrongfb')
            click_fb(page); continue
        if t == 'gap':
            opts = [o.lower() for o in info['gopts']]
            idx = opts.index(info['answer'].lower())
            if go_wrong: idx = (idx + 1) % len(opts)
            if count <= 16: shot(page, f'{tag}-{count:02d}-gap')
            body.locator('.opt').nth(idx).click()
            if go_wrong: page.wait_for_timeout(200); shot(page, f'{tag}-{count:02d}-gap-wrongfb')
            click_fb(page); continue
        if t == 'build':
            words = info['answerWords']
            if go_wrong: words = list(reversed(words))
            bank = body.locator('.bank .wtile')
            used = set()
            for w in words:
                for k in range(bank.count()):
                    if k in used: continue
                    if bank.nth(k).inner_text().strip().lower() == w.lower():
                        bank.nth(k).click(); used.add(k); break
            if count <= 18: shot(page, f'{tag}-{count:02d}-build')
            body.locator('button.btn').last.click(); click_fb(page); continue
        if t == 'match':
            if count <= 18: shot(page, f'{tag}-{count:02d}-match')
            for k in info['keys']:
                body.locator(f'.match .col:nth-child(1) .opt[data-k="{k}"]').click()
                body.locator(f'.match .col:nth-child(2) .opt[data-k="{k}"]').click()
                page.wait_for_timeout(120)
            page.wait_for_timeout(700); click_fb(page); continue
        if t == 'talkread':
            for _ in range(40):
                page.wait_for_timeout(150)
                btn = body.locator('button.btn').last
                txt = btn.inner_text()
                btn.click()
                if 'practice' in txt.lower(): break
            continue
        if t == 'talkplay':
            for _ in range(60):
                page.wait_for_timeout(950)
                fin = body.locator('button.btn.mango')
                if fin.count() and 'Finish' in fin.last.inner_text():
                    shot(page, f'{tag}-{count:02d}-talkplay-end'); fin.last.click(); break
                opts = body.locator('.opt')
                if opts.count():
                    texts = [opts.nth(k).inner_text() for k in range(opts.count())]
                    right = page.evaluate("""(texts) => { const t = AE.C.talks[AE.session.steps[AE.session.i].talk]; const ids = t.lines.filter(l=>l.s==='B').map(l=>AE.fill(AE.S(l.id).en)); return texts.findIndex(x => ids.some(i => x.includes(i))); }""", texts)
                    if right < 0: right = 0
                    opts.nth(right).click(); page.wait_for_timeout(300)
                    bad = body.locator('button.btn.bad')
                    if bad.count(): bad.last.click()
            continue
        raise RuntimeError('unhandled step ' + t)
    return count

with sync_playwright() as p:
    b = p.chromium.launch()
    dev = p.devices['iPhone 13']
    ctx = b.new_context(**dev, locale='th-TH')
    page = ctx.new_page()
    page.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.goto(BASE); page.wait_for_selector('#lg-user', timeout=15000)
    shot(page, '00-login')
    page.fill('#lg-user', 'alvee'); page.fill('#lg-pass', '1234'); page.click('button[type=submit]')
    page.wait_for_selector('.today', timeout=10000); page.wait_for_timeout(400)
    shot(page, '01-home')
    for k in range(N):
        page.locator('.today button.btn.mango').click()
        page.wait_for_selector('.player', timeout=5000)
        steps = play_session(page, f'L{k+1}', wrong_every=(4 if WRONG and k == 0 else 0))
        page.wait_for_selector('.result', timeout=8000); page.wait_for_timeout(500)
        shot(page, f'L{k+1}-result')
        print('session', k + 1, 'steps', steps, page.locator('.result h1').inner_text())
        page.locator('.result button.btn.ghost').last.click(); page.wait_for_selector('.today', timeout=5000)
    page.wait_for_timeout(300); shot(page, '02-home-after')
    # word popup
    page.locator('.nav button', has_text='Words').click(); page.wait_for_timeout(300); shot(page, '03-words')
    if page.locator('.witem').count():
        page.locator('.witem').first.click(); page.wait_for_timeout(300); shot(page, '04-word-popup')
        page.locator('.veil').click(position={'x': 10, 'y': 10})
    page.locator('.nav button', has_text='Journey').click(); page.wait_for_timeout(500); shot(page, '05-journey')
    page.locator('.nav button', has_text='Talk').click(); page.wait_for_timeout(300); shot(page, '06-talks')
    page.locator('.nav button').nth(4).click(); page.wait_for_timeout(300); shot(page, '07-me')
    page.locator('button', has_text='Log out').last.click(); page.wait_for_selector('#lg-user')
    page.fill('#lg-user', 'admin'); page.fill('#lg-pass', '1234'); page.click('button[type=submit]')
    page.wait_for_selector('.adm', timeout=8000); page.wait_for_timeout(600)
    shot(page, '10-admin-live')
    for tab in ['Progress', 'Mistakes', 'Words', 'Messages', 'Settings']:
        page.locator('.tabs .chip', has_text=tab).click(); page.wait_for_timeout(400); shot(page, '11-admin-' + tab.lower())
    print('ERRORS:', json.dumps(errors, ensure_ascii=False, indent=1) if errors else 'none')
    b.close()
