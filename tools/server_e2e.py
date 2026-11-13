"""Server test: first-time setup, Alvee plays on her phone, you watch from yours.
Checks: setup code, logins, live online status, every step in the feed, mistakes,
messages, progress saved on the server, admin presence never recorded."""
import os, sys, json, time, subprocess, signal, shutil
from playwright.sync_api import sync_playwright

ROOT = '/home/claude/alvee-english'
DATA = '/tmp/ae-server-test'
PORT = 8790
BASE = f'http://127.0.0.1:{PORT}/'
shutil.rmtree(DATA, ignore_errors=True)
srv = subprocess.Popen(['node', f'{ROOT}/server/server.js'], env={**os.environ, 'PORT': str(PORT), 'DATA_DIR': DATA}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
time.sleep(1.2)
code = open(f'{DATA}/SETUP-CODE.txt').read().strip()
results = []
def ok(name, cond, extra=''):
    results.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra else ''))

sys.argv = [sys.argv[0]]
exec(open(f'{ROOT}/tools/e2e.py').read().split('with sync_playwright() as p:')[0])  # reuse play_session + helpers
BASE = f'http://127.0.0.1:{PORT}/'

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        dev = p.devices['iPhone 13']
        him = b.new_context(**dev).new_page()
        her = b.new_context(**dev).new_page()
        errs = []
        for pg in (him, her):
            pg.on('pageerror', lambda e: errs.append(str(e)))
        # --- first-time setup (on his phone)
        him.goto(BASE); him.wait_for_selector('#su-code', timeout=10000)
        ok('setup screen shows on first start', True)
        him.fill('#su-code', '000000'); him.fill('#su-an', 'Muhaimin'); him.fill('#su-au', 'boss'); him.fill('#su-ap', 'secret1'); him.fill('#su-ln', 'Alvee'); him.fill('#su-lu', 'alvee'); him.fill('#su-lp', 'love123')
        him.click('button[type=submit]'); him.wait_for_timeout(600)
        ok('wrong setup code is refused', 'Wrong setup code' in him.inner_text('body'))
        him.fill('#su-code', code); him.click('button[type=submit]')
        him.wait_for_selector('.adm', timeout=8000)
        ok('setup creates both logins and opens the dashboard', True)
        ok('no demo hint in server mode', 'Preview mode' not in him.inner_text('body'))
        # --- Alvee logs in on her phone
        her.goto(BASE); her.wait_for_selector('#lg-user')
        her.fill('#lg-user', 'alvee'); her.fill('#lg-pass', 'wrong'); her.click('button[type=submit]'); her.wait_for_timeout(500)
        ok('wrong password refused', 'Wrong username or password' in her.inner_text('body'))
        her.fill('#lg-pass', 'love123'); her.click('button[type=submit]')
        her.wait_for_selector('.today', timeout=8000)
        ok('welcome message waiting for her', 'New message from Muhaimin' in her.inner_text('body'))
        her.locator('.today button.btn.mango').click(); her.wait_for_selector('.player')
        # answer a few steps, then check his dashboard while she is mid-lesson
        for _ in range(6):
            info = her.evaluate(STEP_JS)
            if info['type'] in ('tip', 'wintro', 'sintro'):
                her.locator('.player-body button.btn').last.click()
            elif info['type'] in ('w2th', 'th2w', 'pic', 'listenw'):
                wrong = (info['opts'].index(info['key']) + 1) % len(info['opts'])
                her.locator('.player-body .opt').nth(wrong).click(); click_fb(her)
            else:
                break
            her.wait_for_timeout(250)
        her.evaluate('AE.flush(); AE.beat(true)'); her.wait_for_timeout(1500)
        him.reload(); him.wait_for_selector('.adm'); him.wait_for_timeout(1500)
        body = him.inner_text('body')
        ok('he sees her online', 'Alvee is online now' in body, body[:200].replace('\n', ' | '))
        ok('he sees which lesson and step she is on', 'step' in body and 'I am hungry' in body)
        ok('her wrong answer appears in the live feed', '❌' in body or 'Word → Thai' in body)
        him.screenshot(path=f'{ROOT}/shots/server-admin-live.png')
        # finish the lesson
        play_session(her, 'S1')
        her.wait_for_selector('.result', timeout=8000)
        her.evaluate('AE.flush()'); her.wait_for_timeout(1200)
        her.locator('.result button.btn.ghost').last.click(); her.wait_for_selector('.today')
        # progress is stored on the server
        st = json.load(open([f'{DATA}/state/{f}' for f in os.listdir(f'{DATA}/state')][0]))
        ok('lesson 1.1 saved on the server', '1.1' in st.get('done', {}), list(st.get('done', {}).keys()))
        evs = [json.loads(l) for f in os.listdir(f'{DATA}/events') for l in open(f'{DATA}/events/{f}') if l.strip()]
        types = {e['type'] for e in evs}
        ok('every step logged (start, answers, end)', {'lesson_start', 'answer', 'lesson_end'} <= types, sorted(types))
        # he sends a surprise message locked to a goal and one for now
        him.locator('.tabs .chip', has_text='Messages').click(); him.wait_for_timeout(400)
        him.fill('#msg-text', 'Great job today, Alvee! 💛'); him.click('text=Send 💌'); him.wait_for_timeout(800)
        her.reload(); her.wait_for_selector('.today'); her.wait_for_timeout(500)
        ok('his new message shows on her home screen', 'New message from Muhaimin' in her.inner_text('body'))
        # she must never see his presence; the server must never store it
        db = json.load(open(f'{DATA}/db.json'))
        admin_id = [u['id'] for u in db['users'] if u['role'] == 'admin'][0]
        ok('his online status is never recorded', admin_id not in db['presence'])
        her_text = her.inner_text('body')
        ok('her screens never mention online status', 'online' not in her_text.lower())
        # she closes the app -> he sees offline soon after
        her.evaluate("AE.api.logout()"); her.wait_for_timeout(800)
        him.locator('.tabs .chip', has_text='Live').click(); him.wait_for_timeout(4500)
        ok('he sees her go offline after she leaves', 'Alvee is offline' in him.inner_text('body'))
        him.locator('.tabs .chip', has_text='Progress').click(); him.wait_for_timeout(500)
        him.screenshot(path=f'{ROOT}/shots/server-admin-progress.png')
        ok('no page errors', not errs, errs[:3])
        b.close()
finally:
    srv.send_signal(signal.SIGTERM); srv.wait(timeout=5)
print('\nSERVER LOG:', srv.stdout.read()[-600:])
print(f"\n{sum(1 for _, c in results if c)}/{len(results)} checks passed")
