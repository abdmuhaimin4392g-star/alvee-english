"""Server test for the dashboard demo copy of her app: it opens with her progress, and nothing reaches the server."""
import os, json, time, subprocess, shutil, glob, hashlib
from playwright.sync_api import sync_playwright
ROOT='/home/claude/alvee-english'; DATA='/tmp/ae-sbx-test'; PORT=8792; BASE=f'http://127.0.0.1:{PORT}/'
shutil.rmtree(DATA, ignore_errors=True)
srv=subprocess.Popen(['node',f'{ROOT}/server/server.js'],env={**os.environ,'PORT':str(PORT),'DATA_DIR':DATA},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
time.sleep(1.2); code=open(f'{DATA}/SETUP-CODE.txt').read().strip()
res=[]
def ok(n,c,x=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' — '+str(x) if x else ''))
hs=lambda: {f: hashlib.md5(open(f,'rb').read()).hexdigest() for f in glob.glob(f'{DATA}/state/*')+glob.glob(f'{DATA}/events/*')}
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); dev=p.devices['iPhone 13']
    him=b.new_context(**dev).new_page(); her=b.new_context(**dev).new_page()
    errs=[]; [pg.on('pageerror',lambda e: errs.append(str(e))) for pg in (him,her)]
    him.goto(BASE); him.wait_for_selector('#su-code',timeout=10000)
    him.fill('#su-code',code); him.fill('#su-an','M'); him.fill('#su-au','boss'); him.fill('#su-ap','secret1'); him.fill('#su-ln','Alvee'); him.fill('#su-lu','alvee'); him.fill('#su-lp','love123')
    him.click('button[type=submit]'); him.wait_for_selector('.adm',timeout=8000)
    her.goto(BASE); her.wait_for_selector('#lg-user'); her.fill('#lg-user','alvee'); her.fill('#lg-pass','love123'); her.click('button[type=submit]'); her.wait_for_timeout(2500)
    her.evaluate("AE.state.sea=AE.state.sea||{};AE.voyage.st().gold=77;AE.saveSoon()"); her.wait_for_timeout(1500); her.evaluate("AE.flush()"); her.wait_for_timeout(1000)
    her.close()
    him.evaluate("AE.admin.refresh(true)"); him.wait_for_timeout(1000)
    before=hs()
    him.click('.sbx-open'); him.wait_for_timeout(400); him.click('text=Make a copy and play'); him.wait_for_timeout(2500)
    ok('her app opens inside the dashboard', him.query_selector('.main-nav') is not None and him.query_selector('.sbx-bar') is not None)
    ok('it has her progress (gold 77)', him.evaluate("AE.voyage.st().gold")==77)
    him.evaluate("document.querySelectorAll('.pop-note').forEach(x=>x.remove());AE.go('journey')"); him.wait_for_selector('.pt-ov',timeout=8000)
    him.click('.pt-btn.go'); him.wait_for_timeout(400); him.click('.pt-dot[data-v=\"3\"]'); him.wait_for_timeout(600)
    him.evaluate("AE.voyage.addGold(1000);AE.saveSoon();AE.track('answer',{x:1});AE.flush()"); him.wait_for_timeout(2500)
    him.screenshot(path='/tmp/shots/sbx1.png')
    ok('nothing reached the server while playing', hs()==before)
    him.click('.sbx-bar button'); him.wait_for_timeout(1500)
    ok('Exit brings the dashboard back', him.query_selector('.adm') is not None and him.query_selector('.sbx-bar') is None)
    ok('server still unchanged', hs()==before)
    him.click('.sbx-open'); him.wait_for_timeout(400); him.click('text=Go on with my demo copy'); him.wait_for_timeout(2500)
    ok('the demo copy is kept (gold 1077)', him.evaluate("AE.voyage.st().gold")==1077)
    him.evaluate("AE.go('me')"); him.wait_for_timeout(500); him.click('text=Log out'); him.wait_for_timeout(1500)
    ok('Log out inside her app returns to the dashboard', him.query_selector('.adm') is not None)
    ok('dashboard still works (Personality tab)', him.evaluate("AE.admin.tab('ptest'),!!document.querySelector('.pt-adm-q')"))
    ok('no page errors', not errs, errs[:3])
finally: srv.terminate()
print(f'{sum(res)}/{len(res)} passed')
