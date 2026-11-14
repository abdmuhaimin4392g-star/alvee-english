#!/usr/bin/env python3
"""Builds public/js/crab3d.js from the Operation Crab 3D map blocks (in src/) plus pre.js and glue.js."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'public', 'js', 'crab3d.js')

def rd(n): return open(os.path.join(SRC, n)).read()
def rep(t, a, b, n=1):
    c = t.count(a)
    if c != n: raise SystemExit(f'patch failed ({c}x, wanted {n}): {a[:90]!r}')
    return t.replace(a, b)
def cut(t, a, b, new=''):
    i = t.find(a); j = t.find(b, i + 1)
    if i < 0 or j < 0: raise SystemExit(f'cut failed: {a[:60]!r} .. {b[:60]!r}')
    return t[:i] + new + t[j:]

eng = rd('eng.js'); beam = rd('beam.js'); world = rd('world.js'); sky = rd('sky.js'); sail = rd('sail.js')
wmart = rd('wmart.js'); w2 = rd('w2.js'); skins = rd('skins.js'); fleet = rd('fleet.js'); live = rd('live.js')

# ---- engine
eng = rep(eng, "const M3_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';", "const M3_URL='vendor/three.min.js';")

# ---- the world: camera that pans, the map that continues south, Alvee's islands
world = rep(world, "function m3Aim(c,yaw,pit){const r=M3.r,th=M3.pitch+pit,cp=Math.cos(th),sp=Math.sin(th);c.position.set(r*cp*Math.sin(yaw),r*sp,r*cp*Math.cos(yaw));c.up.set(0,1,0);c.lookAt(0,0,0);",
  "function m3Aim(c,yaw,pit,tg,k){const r=M3.r*(k||1),th=M3.pitch+pit,cp=Math.cos(th),sp=Math.sin(th),tx=tg?tg.x:0,tz=tg?tg.z:0;c.position.set(tx+r*cp*Math.sin(yaw),r*sp,tz+r*cp*Math.cos(yaw));c.up.set(0,1,0);c.lookAt(tx,0,tz);")
world = rep(world, "function m3G(X,Y,o){", "function m3G0(X,Y,o){")
world = rep(world, "const m3W=(X,Y)=>",
  "/* below the bottom edge the map keeps going south at the bottom edge's scale */\n"
  "function m3G(X,Y,o){if(Y<=100)return m3G0(X,Y,o);const v=m3G0(X,100,o);if(M3.dzB==null){const a=m3G0(50,100).z,b=m3G0(50,99).z;M3.dzB=a-b}return v.set(v.x,0,v.z+M3.dzB*(Y-100))}\n"
  "const m3W=(X,Y)=>")
world = rep(world, "Object.assign(M3,{R,sc,cam,hc,cv});", "Object.assign(M3,{R,sc,cam,hc,cv});rtBuild();M3.maxTex=Math.min(8192,(R.capabilities&&R.capabilities.maxTextureSize)||4096);")
world = rep(world, "new T.PlaneGeometry(1600,1600)", "new T.PlaneGeometry(4200,6400)")
world = rep(world, "sea.rotation.x=-Math.PI/2;", "sea.rotation.x=-Math.PI/2;sea.position.z=2400;")
world = cut(world, "  /* -- the harbor pier", "  mesh(S.done(T));")
world = cut(world, "  /* ===== the nine mission islets", "  /* ===== clouds and their shadows", "  m3AlIslands({T,halo,addIsl,sandW,sandD,grassC,mWorld,sc});\n")
world = rep(world, "for(let i=0;i<18;i++){const left=i%2===0,X=(left?4:52)+rn()*44,Y=26+rn()*40,", "for(let i=0,NC=Math.min(PERF.lite?22:34,Math.round(18*(M3.ymax||100)/70));i<NC;i++){const left=i%2===0,X=(left?4:52)+rn()*44,Y=22+rn()*((M3.ymax||100)-14),")
world = rep(world, "th=Math.floor(i/2)/9;", "th=((i%18)>>1)/9;")
world = rep(world, "const ribbon=(col,freq,alpha)=>{const N=26,", "const ribbon=(col,freq,alpha,NN)=>{const N=NN||26,")
world = rep(world, "M3.rib={maya:ribbon('#1fe0cf',.9,.8),mari:ribbon('#ff5f7e',.9,.8),gap:ribbon('#ffbf47',1.3,.85)};",
  "M3.rib={done:ribbon('#1fe0cf',.9,.8,RT.dn+2),ahead:ribbon('#ff5f7e',.9,.42,RT.dn+2),gap:ribbon('#ffbf47',1.3,.85,40)};")
world = rep(world, "cw=768,chh=Math.max(256,Math.min(2048,Math.round(cw*Hh/W)))", "cw=512,chh=Math.max(256,Math.min(M3.maxTex,Math.round(cw*Hh/W)))")

# ---- sky, animation and overlays
sky = rep(sky, "m3Aim(M3.cam,M3.yaw+(calm?0:Math.sin(M3.t*.33)*.011),calm?0:Math.sin(M3.t*.27)*.006);",
  "m3Pan(dt);m3Aim(M3.cam,M3.yaw+(calm?0:Math.sin(M3.t*.33)*.011),calm?0:Math.sin(M3.t*.27)*.006,M3.ctg,M3.ck);")
sky = rep(sky, "  sailStep();\n", "  sailStep();m3AlBoat(dt);\n")
sky = rep(sky, "u=m3W(b.px,b.py),sc=u*1.4,", "u=m3W(b.px,b.py),sc=u*2.8,")
sky = rep(sky, "b.px=Math.max(6,Math.min(94,b.cx+sl.ox));b.py=Math.max(8,Math.min(98.5,b.cy+sl.oy));", "b.px=b.cx+sl.ox*.45;b.py=b.cy+sl.oy*.45;")
sky = rep(sky, "(w==='maya'?-.62:.62)+Math.max(-.3,Math.min(.3,dx*.03))-sl.yaw", "(b.hd||0)-sl.yaw*.6")
sky = cut(sky, "  /* routes */", "  /* clouds drift", "  m3AlRoutes();\n")
sky = rep(sky, "M3.beam.rotation.y+=dt*.9;", "M3.beam.rotation.y+=dt*.9;if(M3.rain&&M3.ctg)M3.rain.position.set(M3.ctg.x,0,M3.ctg.z);")
sky = rep(sky, "o.px=(v.x+1)/2*W+(o.dx||0);", "o.behind=dd<=1;o.px=(v.x+1)/2*W+(o.dx||0);")
sky = rep(sky, "Math.pow(M3.r/dd,.55)", "Math.pow(M3.r*(M3.ck||1)/dd,.55)")
sky = rep(sky, "for(const o of M3.ov){if(o.px==null||!o.el.isConnected)continue;o.el.style.visibility='';",
  "for(const o of M3.ov){if(o.px==null||!o.el.isConnected)continue;if(o.behind||o.px<-140||o.px>W+140||o.py<-140||o.py>H+140){if(!o.hid){o.hid=1;o.el.style.visibility='hidden'}continue}o.hid=0;o.el.style.visibility='';")
sky = rep(sky, "M3.cw=w;M3.ch=h;", "M3.cw=w;M3.ch=h;{const a=w/h,hf=Math.tan(19*Math.PI/180)*(400/960);M3.cam.aspect=a;M3.cam.fov=Math.min(70,2*Math.atan(hf/a)*180/Math.PI);M3.cam.updateProjectionMatrix()}")
sky = rep(sky, "if(!ok||!oc||oc.dataset.m3||VIEW_NOW!=='hub')return;", "if(!ok){if(oc&&m3Here())m3NoGl();return}if(!oc||oc.dataset.m3||!m3Here())return;")
sky = sky.replace("VIEW_NOW!=='hub'", "!m3Here()").replace("VIEW_NOW==='hub'", "m3Here()")

sky = cut(sky, "function m3SyncState", "/* ribbons laid on the sea */")
sky = cut(sky, "function m3Collect", "function m3Sync(")
sky = cut(sky, "function m3Orbit", "function m3Loop")
sky = cut(sky, "function m3Fail", "function m3Mount")
wmart = rep(wmart, "ACT.goctry=el=>{try{closeSheet()}catch(e){}sfx('tap');go(el.dataset.v)};", "")

sky = rep(sky, "gap=calm?900:(PERF.lite?38:26)", "gap=calm?900:(PERF.lite?48:33)")
sky = rep(sky, "M3.dprCap||(PERF.lite?1.15:(w<500?2:1.5))", "M3.dprCap||(PERF.lite?1:(w<500?1.6:1.3))")
sky = rep(sky, "if(q.sum/q.n>62){M3.dprCap=1;", "if(q.sum/q.n>55){M3.dprCap=1;PERF.lite=true;PERF.pk=.6;")

# ---- sailing: the drift and the 3D wake only
i = sail.find('/* where the two boats'); j = sail.find('/* ---- the 3D map: V wake')
sail = sail[:i] + sail[j:]
sail = sail.replace("VIEW_NOW==='hub'", "m3Here()")

# ---- no reef: the Hydra stays in Operation Crab
w2 = cut(w2, "  /* -- the Hydra's reef", "\n}", "")

# ---- one boat
glue = ''.join(open(os.path.join(HERE, f)).read() for f in ['glue_main.js', 'trsvg.js', 'krart.js', 'glue_view.js', 'glue_trv.js', 'glue_kraken.js'])
parts = [open(os.path.join(HERE, 'pre.js')).read(), eng, beam, world, sky, sail, wmart, w2, skins, fleet, live, glue, '\n})();\n']
out = '\n'.join(parts)
out = out.replace("['maya','mari']", "['al']")
for bad in ['VIEW_NOW', 'MISSIONS', 'ISL_X', 'MAPY(', 'Hydra', 'hydra']:
    if bad in out: print('warning: still has', bad, out.count(bad))
open(OUT, 'w').write(out)
print('wrote', OUT, len(out))

CSS = os.path.join(HERE, '..', '..', 'public', 'crab.css')
open(CSS, 'w').write(''.join(open(os.path.join(HERE, f)).read() + '\n' for f in ['crab_base.css', 'crab_extra.css', 'kraken.css', 'kraken_extra.css']))
print('wrote', CSS)
