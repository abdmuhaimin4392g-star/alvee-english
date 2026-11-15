"""Server test for the personality test: it opens on the map, every answer survives closing the app at once,
the dashboard shows her answers, and a reset from the dashboard starts a new round."""
import os, sys, json, time, subprocess, shutil, glob
from playwright.sync_api import sync_playwright
ROOT='/home/claude/alvee-english'; DATA='/tmp/ae-pt-test'; PORT=8791; BASE=f'http://127.0.0.1:{PORT}/'
shutil.rmtree(DATA, ignore_errors=True)
srv=subprocess.Popen(['node',f'{ROOT}/server/server.js'],env={**os.environ,'PORT':str(PORT),'DATA_DIR':DATA},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
time.sleep(1.2)
code=open(f'{DATA}/SETUP-CODE.txt').read().strip()
res=[]
def ok(n,c,x=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' — '+str(x) if x else ''))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); dev=p.devices['iPhone 13']
    him=b.new_context(**dev).new_page(); herctx=b.new_context(**dev); her=herctx.new_page()
    errs=[]; [pg.on('pageerror',lambda e: errs.append(str(e))) for pg in (him,her)]
    him.goto(BASE); him.wait_for_selector('#su-code',timeout=10000)
    him.fill('#su-code',code); him.fill('#su-an','Muhaimin'); him.fill('#su-au','boss'); him.fill('#su-ap','secret1'); him.fill('#su-ln','Alvee'); him.fill('#su-lu','alvee'); him.fill('#su-lp','love123')
    him.click('button[type=submit]'); him.wait_for_selector('.adm',timeout=8000)
    her.goto(BASE); her.wait_for_selector('#lg-user'); her.fill('#lg-user','alvee'); her.fill('#lg-pass','love123'); her.click('button[type=submit]'); her.wait_for_timeout(2500)
    her.evaluate("document.querySelectorAll('.pop-note').forEach(x=>x.remove());AE.go('journey')")
    her.wait_for_selector('.pt-ov',timeout=8000); ok('test opens on the map (server)',True)
    her.click('.pt-btn.go'); her.wait_for_timeout(400)
    for i in range(5):
        her.click('.pt-dot[data-v="%d"]'%([3,-1,0,2,-3][i])); her.wait_for_timeout(700 if i<4 else 60)
    # close the app straight away (before the half-second save)
    her.close()
    her=herctx.new_page(); her.on('pageerror',lambda e: errs.append(str(e)))
    her.goto(BASE); her.wait_for_timeout(3000)
    her.evaluate("document.querySelectorAll('.pop-note').forEach(x=>x.remove());AE.go('journey')")
    her.wait_for_selector('.pt-ov',timeout=8000); her.wait_for_timeout(300)
    t=her.inner_text('.pt-ov')
    ok('after closing the app at once, 5 answers are kept', '5 of 60' in t, t[:90].replace('\n',' '))
    her.click('.pt-btn.go'); her.wait_for_timeout(400)
    ok('goes on at question 6', 'Question 6 of 60' in her.inner_text('.pt-qn'), her.inner_text('.pt-qn'))
    vals=her.evaluate("JSON.stringify(Object.values(AE.state.ptest.a).map(x=>x[0]))")
    ok('the five answers are the ones she tapped', vals=='[3,-1,0,2,-3]', vals)
    her.wait_for_timeout(2500)
    st=json.load(open(glob.glob(f'{DATA}/state/*.json')[0]))
    ok('answers reach the server', len((st.get('ptest') or {}).get('a',{}))==5, len((st.get('ptest') or {}).get('a',{})))
    # dashboard: the Personality tab
    him.evaluate("AE.admin.refresh(true)"); him.wait_for_timeout(800); him.evaluate("AE.admin.tab('ptest')"); him.wait_for_timeout(600)
    ok('dashboard shows 5 of 60', '5 / 60' in him.inner_text('#adm-body'))
    ok('dashboard lists all 60 questions', him.evaluate("document.querySelectorAll('.pt-adm-q').length")==60)
    # reset from the dashboard
    him.evaluate("AE.api.resetPart(AE.admin.uid,{ptest:1,label:'the personality test'})"); him.wait_for_timeout(500)
    st=json.load(open(glob.glob(f'{DATA}/state/*.json')[0]))
    ok('server: test cleared with a new round', len(st['ptest']['a'])==0 and st['ptest']['gen']>1)
    her.close(); her=herctx.new_page(); her.on('pageerror',lambda e: errs.append(str(e)))
    her.goto(BASE); her.wait_for_timeout(3000)
    her.evaluate("document.querySelectorAll('.pop-note').forEach(x=>x.remove());AE.go('journey')")
    her.wait_for_selector('.pt-ov',timeout=8000); her.wait_for_timeout(300)
    ok('after the reset she starts again from question 1 (old phone copy not used)', her.query_selector('.pt-tips') is not None and her.evaluate("AE.ptest.count(AE.ptest.st())")==0)
    evs=open(glob.glob(f'{DATA}/events/*.jsonl')[0]).read()
    ok('events logged', 'ptest_answer' in evs and 'ptest_open' in evs)
    ok('no page errors', not errs, errs[:3])
finally:
    srv.terminate()
print(f'{sum(res)}/{len(res)} checks passed')
