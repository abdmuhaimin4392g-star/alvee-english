
/* ============ 3D VOYAGE MAP: sky, weather, animation, overlays ============ */
const mx3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const clamp01=x=>Math.max(0,Math.min(1,x));
const m3Calm=()=>!!((typeof PREF!=='undefined'&&PREF.calm)||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches));
const MOONE=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
const moonEmoji=p=>MOONE[Math.round(p*8)%8];
function moonEq(t){const d=toDays(t),L=RAD*(218.316+13.176396*d),M=RAD*(134.963+13.064993*d),F=RAD*(93.272+13.229350*d),l=L+RAD*6.289*Math.sin(M),b=RAD*5.128*Math.sin(F);return {ra:rAsc(l,b),dec:decl(l,b)}}
function bodyAH(ra,dec,pl,t){const d=toDays(t),H=RAD*(280.16+360.9856235*d)+RAD*pl.lon-ra,phi=RAD*pl.lat;return {alt:Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H))/RAD,ha:Math.atan2(Math.sin(H),Math.cos(H))}}
function m3Pal(sk,wx,mo){const d=sk.dayF,n=sk.nightF,du=Math.min(1,sk.duskF),cl=Math.min(1,wx.c*.75+wx.r*.5),mb=.05*mo.frac;
  let tint=mx3([.44+mb,.52+mb,.8+mb],[1,1,1],d);tint=mx3(tint,[1,.76,.58],Math.min(1,du*.7));const dim=1-cl*.16*d-wx.r*.1*d;tint=tint.map(v=>v*dim);
  let sn=mx3([.03,.11,.25],[.07,.72,.8],d),sf=mx3([.02,.07,.18],[.04,.36,.6],d);
  sn=mx3(sn,[.25,.4,.58],du*.32);sf=mx3(sf,[.78,.42,.36],du*.55);const gk=1-cl*.2*d;sn=sn.map(v=>v*gk);sf=sf.map(v=>v*gk);
  let hor=mx3([.08,.15,.32],[.66,.86,.97],d);hor=mx3(hor,[1,.66,.42],du*.8);hor=mx3(hor,[.66,.7,.76],cl*.5*d*(1-du*.6));
  let zen=mx3([.02,.05,.17],[.16,.46,.86],d);zen=mx3(zen,[.3,.3,.58],du*.5);zen=mx3(zen,[.5,.56,.66],cl*.55*d);
  return {tint,sn,sf,hor,zen,sunC:mx3([1,.97,.78],[1,.5,.2],Math.min(1,du*1.1)),stars:n*(1-cl*.75),night:n,cl,rain:wx.r,day:d,cover:Math.min(1,wx.c*1.05+wx.r*.3)}}
const m3Sx=(half,ha)=>half*.5+.5*(.5+Math.max(-.4,Math.min(.4,ha/Math.PI*.8)));
const m3Sy=alt=>alt>=0?.893+.078*Math.sin(alt*RAD):.893+alt*.004;
/* push the live world into the shaders */
function m3Apply(){if(!M3_OK()||!M3.U)return;const U=M3.U,W=world(),t=W.t,mo=W.moon,P=[m3Pal(W.mv.sk,W.mv.wx,mo),m3Pal(W.th.sk,W.th.wx,mo)];M3.pal=P;M3.world=W;
  const set=(u,a)=>u.value.set(a[0],a[1],a[2]);
  ['L','R'].forEach((s,i)=>{const p=P[i],pl=PLACES[i?'th':'mv'],sk=i?W.th.sk:W.mv.sk;
    set(U['uT'+s],p.tint);set(U['uH'+s],p.hor);set(U['uZ'+s],p.zen);set(U['uSN'+s],p.sn);set(U['uSF'+s],p.sf);set(U['uSuC'+s],p.sunC);
    const b=bodyAH(sunCoords(toDays(t)).ra,sunCoords(toDays(t)).dec,pl,t),me=moonEq(t),m=bodyAH(me.ra,me.dec,pl,t);
    const sv=clamp01((b.alt+1.5)/4.5)*(1-p.cl*.55),realV=clamp01((m.alt+2)/5)*p.day*.5*(1-p.cl*.75),nightV=p.night*(1-p.cl*.6);
    let mxs,mys,mv;if(nightV>=realV){const f=sk.isDay?.5:sk.frac;mxs=i*.5+.5*(.14+.72*f);mys=m3Sy(10+52*Math.sin(Math.PI*f));mv=nightV}else{mxs=m3Sx(i,m.ha);mys=m3Sy(m.alt);mv=realV}
    U['uSu'+s].value.set(m3Sx(i,b.ha),m3Sy(b.alt),sv,13);U['uMo'+s].value.set(mxs,mys,mv,15);
    const k=Math.cos(mo.phase*6.2832),wax=mo.phase<.5?1:-1;U['uMp'+s].value.set(k,wax,wax>0?-.96:.96,p.night);
    const g=sv>.15?[m3Sx(i,b.ha),sv*p.day*.95,0]:(mv>.15&&p.night>.3?[mxs,mv*(.35+.65*mo.frac)*p.night*.9,1]:[.5,0,0]);U['uG'+s].value.set(g[0],g[1],g[2],0);
    M3['sb'+s]={sun:b,moon:m}});
  U.uNt.value.set(P[0].night,P[1].night);U.uStr.value.set(P[0].stars,P[1].stars);
  U.uRn.value.set(smoothstepJ(.3,.8,W.mv.wx.r),smoothstepJ(.3,.8,W.th.wx.r));
  M3.cov=[P[0].cover,P[1].cover];
  const hz=m=>m;M3.lamp=Math.max(P[0].night,P[1].night)}
const smoothstepJ=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t)};
const m3Side=x=>smoothstepJ(-6,6,x);
/* what the app knows: boats, finished islands, the reef */
function m3SyncState(){if(!M3_OK()||!M3.U)return;const P=boatPair(),vg=voyGap(),nextId=MISSIONS.find(id=>!S.done[id]);
  const PR=boatPair(true);[[S.me,P.a,PR.a],[other(),P.b,PR.b]].forEach(([w,p,pr])=>{const b=M3.boats[w];if(!b)return;b.tx=p.x;b.ty=p.y;b.kr=!!p.kr;b.rx=pr.x;b.ry=pr.y;b.ghost=!!p.ghost;try{if(typeof sk3Apply==='function')sk3Apply(w,b)}catch(e){}b.tilt=-Math.max(-8,Math.min(8,(p.b?p.b.lean:0)*14))*Math.PI/180;
    if(!b.init){const f=M3.from&&M3.from[w];b.cx=f?f[0]:p.x;b.cy=f?f[1]:p.y;b.init=true}});
  MISSIONS.forEach(id=>{const o=M3.isl[id];if(!o)return;const dn=!!S.r[id];o.und.visible=!dn;o.don.visible=dn;o.ring.visible=(id===nextId&&!dn)});
  const ok=bossOpen(),h=M3.reefHalo;if(h){const u=h.userData.un;u.uA.value=ok?.9:.28;u.uC0.value.set(...(ok?[1,.37,.49]:[.42,.48,.6]));u.uC1.value.copy(u.uC0.value);u.uPulse.value=ok?.35:0}
  M3.gapOn=gapMap(vg)}
/* ribbons laid on the sea */
const _ra=[];function m3Ribbon(m,fn,wPct){const N=m.userData.N,pos=m.geometry.attributes.position,au=m.geometry.attributes.aU,T=M3.T;
  for(let i=0;i<=N;i++){const q=fn(i/N);(_ra[i]||(_ra[i]=new T.Vector3())).copy(m3G(q[0],q[1],M3.t1));_ra[i].w=wPct*m3W(q[0],q[1])}
  let acc=0;for(let i=0;i<=N;i++){const a=_ra[Math.max(0,i-1)],b=_ra[Math.min(N,i+1)];let dx=b.x-a.x,dz=b.z-a.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const px=-dz*_ra[i].w/2,pz=dx*_ra[i].w/2,c=_ra[i];
    if(i>0)acc+=Math.hypot(c.x-_ra[i-1].x,c.z-_ra[i-1].z);pos.setXYZ(i*2,c.x+px,.09,c.z+pz);pos.setXYZ(i*2+1,c.x-px,.09,c.z-pz);au.setX(i*2,acc);au.setX(i*2+1,acc)}
  pos.needsUpdate=true;au.needsUpdate=true}
function m3Frame(dt){const U=M3.U,T=M3.T,calm=m3Calm();M3.t+=dt;U.uT.value=M3.t;
  /* camera: spring-loaded drag plus a slow breathing sway */
  const sub=Math.max(1,Math.ceil(dt/.016));for(let i=0;i<sub;i++){const h=dt/sub;M3.vyaw+=(60*(M3.tyaw-M3.yaw)-15.5*M3.vyaw)*h;M3.yaw+=M3.vyaw*h}
  m3Aim(M3.cam,M3.yaw+(calm?0:Math.sin(M3.t*.33)*.011),calm?0:Math.sin(M3.t*.27)*.006);
  /* boats: they sail on their own at random speeds while their player is online */
  sailStep();
  const ek=1-Math.exp(-dt*.75);
  ['maya','mari'].forEach(w=>{const b=M3.boats[w];if(!b)return;const sl=sailO(w),dx=b.tx-b.cx,dy=b.ty-b.cy,rs=typeof krHelperAt==='function'&&krHelperAt()===w,ew=rs?1-Math.exp(-dt*4.4):ek;b.cx+=dx*ew;b.cy+=dy*ew;
    b.px=Math.max(6,Math.min(94,b.cx+sl.ox));b.py=Math.max(8,Math.min(98.5,b.cy+sl.oy));
    const g=m3G(b.px,b.py,M3.t1),u=m3W(b.px,b.py),sc=u*1.4,k=sl.k,bob=Math.sin(M3.t*1.7+b.ph)*(.22+.08*Math.min(1.6,k))*sc;b.mesh.position.set(g.x,bob,g.z);b.mesh.scale.setScalar(sc*(b.ks||1));
    b.mesh.rotation.order='YXZ';b.mesh.rotation.set(Math.sin(M3.t*1.3+b.ph)*.035+k*.014*Math.sin(M3.t*3.1+b.ph),(w==='maya'?-.62:.62)+Math.max(-.3,Math.min(.3,dx*.03))-sl.yaw,(b.tilt||0)+Math.sin(M3.t*1.1+b.ph)*.05-sl.yaw*.22);
    {const kf=typeof krFx==='function'?krFx(w):null;if(kf){b.mesh.rotation.z+=kf.rz;b.mesh.rotation.x+=kf.rx;b.mesh.position.y+=kf.dy*sc}const ef=typeof ecoFx==='function'?ecoFx(w):null;if(ef){b.mesh.rotation.z+=ef.rz;b.mesh.position.y+=ef.dy*sc}}
    const gh=b.un.uGh.value,tg=b.ghost?1:0;b.un.uGh.value=gh+(tg-gh)*Math.min(1,dt*4);
    m3WakeSet(b,sl,m3Lit(g.x));
    b.w3=(b.w3||new T.Vector3()).copy(g)});
  m3FxStep(dt);sailTags();
  /* routes */
  const me=S.me,ot=other();
  [[me,me==='maya'?47:53],[ot,ot==='maya'?47:53]].forEach(([w,sx])=>{const b=M3.boats[w],r=M3.rib[w];if(!b||!r)return;const sy=MAPY(0)+BOATDY,ex=b.kr?b.rx:b.px,ey=b.kr?b.ry:b.py,far=Math.hypot(ex-sx,ey-sy)>1.6&&!b.ghost;r.visible=far;if(!far)return;
    const cx=(sx+ex)/2+(ex<sx?-6:6),cy=(sy+ey)/2;m3Ribbon(r,t=>{const a=1-t;return [a*a*sx+2*a*t*cx+t*t*ex,a*a*sy+2*a*t*cy+t*t*ey]},.75)});
  {const a=M3.boats[me],b=M3.boats[ot],r=M3.rib.gap;r.visible=!!(M3.gapOn&&a&&b&&!a.ghost&&!b.ghost);if(r.visible)m3Ribbon(r,t=>[a.px+(b.px-a.px)*t,a.py+(b.py-a.py)*t],.55)}
  /* clouds drift, shadows follow */
  const P=M3.pal||[];const cov=M3.cov||[0,0];
  M3.cl.forEach(c=>{if(!calm)c.X+=c.spd*dt*.55;if(c.X>112)c.X=-14;const s=m3Side((m3G(c.X,c.Y,M3.t1).x)),k=cov[0]+(cov[1]-cov[0])*s,amt=clamp01((k*1.15+.04-c.th)*5);
    c.u=c.u||m3W(c.X,c.Y);const g=m3G(c.X,c.Y,M3.t1),w=c.size*c.u;c.sp.position.set(g.x,c.alt+Math.sin(M3.t*.4+c.ph)*.5,g.z);c.sp.scale.set(w,w*.5,1);
    const tl=P[0]?P[0].tint:[1,1,1],tr=P[1]?P[1].tint:[1,1,1],ti=mx3(tl,tr,s),rain=P[0]?(P[0].rain+(P[1].rain-P[0].rain)*s):0,dk=1-rain*.35;
    c.sp.material.color.setRGB(Math.min(1,ti[0]*dk),Math.min(1,ti[1]*dk),Math.min(1,ti[2]*dk));const dayk=P[0]?(P[0].day+(P[1].day-P[0].day)*s):1;c.sp.material.opacity=amt*(.5+.3*dayk);c.sp.visible=amt>.01;
    c.sh.position.set(g.x+c.alt*.35,.05,g.z+c.alt*.5);c.sh.scale.set(w*.5,w*.3,1);c.sh.userData.un.uA.value=amt*.2*dayk;c.sh.visible=amt>.01&&dayk>.2});
  /* lamps, beam, lightning */
  const nl=M3.lamp||0;M3.glows.forEach(gl=>{const s=m3Side(gl.sp.position.x),n=(P[0]?P[0].night+(P[1].night-P[0].night)*s:0);gl.sp.material.opacity=Math.min(1,n*gl.k*(.85+.15*Math.sin(M3.t*5+gl.sp.position.x)))});
  M3.beam.rotation.y+=dt*.9;
  if((M3.world&&(M3.world.mv.wx.r>.7||M3.world.th.wx.r>.7))&&!calm){if(Math.random()<dt*.35)M3.flash=1}M3.flash=Math.max(0,(M3.flash||0)-dt*4);U.uFl.value=M3.flash;
  M3.R.render(M3.sc,M3.cam);m3Sync()}
/* HTML buttons ride on the 3D world */
function m3Reg(el,X,Y,o){if(!el)return;const T=M3.T,w=o&&o.fn?null:m3G(X,Y).clone();M3.ov.push(Object.assign({el,X,Y,w},o||{}))}
function m3Collect(oc){M3.ov=[];
  $$('.isl',oc).forEach(el=>{const id=el.dataset.id,i=MISSIONS.indexOf(id);m3Reg(el,ISL_X[id],MAPY((i+1)/MISSIONS.length))});
  m3Reg($('.reef',oc),56,19.8);
  $$('.shell',oc).forEach(el=>m3Reg(el,parseFloat(el.style.left),parseFloat(el.style.top)));
  $$('.tchest:not(.gone)',oc).forEach(el=>m3Reg(el,parseFloat(el.style.left),parseFloat(el.style.top)));
  $$('.plab',oc).forEach(el=>m3Reg(el,+el.dataset.x,+el.dataset.y,{noscale:1}));
  ['maya','mari'].forEach(w=>{const el=$('#bt-'+w,oc);if(el)m3Reg(el,0,0,{boat:1,fn:()=>{const b=M3.boats[w];return b&&b.w3}})});
  const gl=$('#gaplab',oc);if(gl)m3Reg(gl,0,0,{fn:()=>{const a=M3.boats[S.me],b=M3.boats[other()];if(!a||!b||!a.w3||!b.w3)return null;M3.t2.copy(a.w3).add(b.w3).multiplyScalar(.5);return M3.t2},dx:34,noscale:1})}
function m3Sync(){const cam=M3.cam,W=M3.cw,H=M3.ch,v=M3.t3,fw=M3.t4,bt=[];cam.getWorldDirection(fw);
  for(let i=M3.ov.length-1;i>=0;i--){const o=M3.ov[i];if(!o.el.isConnected){if(o.el.dataset&&(o.el.dataset.act==='shell'||o.el.dataset.act==='tchest'||o.el.dataset.act==='ecoit'))M3.ov.splice(i,1);continue}
    const p=o.fn?o.fn():o.w;if(!p){o.el.style.visibility='hidden';o.px=null;continue}
    v.copy(p);const dd=(v.x-cam.position.x)*fw.x+(v.y-cam.position.y)*fw.y+(v.z-cam.position.z)*fw.z;v.project(cam);
    o.px=(v.x+1)/2*W+(o.dx||0);o.py=(1-v.y)/2*H+(o.dy||0);o.s=o.noscale?1:Math.max(.8,Math.min(1.1,Math.pow(M3.r/dd,.55)));if(o.boat)bt.push(o)}
  if(bt.length===2){const a=bt[0],b=bt[1],gap=Math.abs(a.px-b.px),need=70;if(gap<need&&Math.abs(a.py-b.py)<34){const d=(need-gap)/2,sg=a.px<=b.px?1:-1;a.px-=d*sg;b.px+=d*sg}}
  for(const o of M3.ov){if(o.px==null||!o.el.isConnected)continue;o.el.style.visibility='';o.el.style.translate=o.px.toFixed(1)+'px '+o.py.toFixed(1)+'px';o.el.style.scale=o.s.toFixed(3)}}
function m3Resize(o){if(!M3.R)return;const r=o.getBoundingClientRect(),w=Math.max(50,Math.round(o.clientWidth||r.width)),h=Math.max(100,Math.round(o.clientHeight||r.height));M3.cw=w;M3.ch=h;
  M3.R.setPixelRatio(Math.min(window.devicePixelRatio||1,M3.dprCap||(PERF.lite?1.15:(w<500?2:1.5))));M3.R.setSize(w,h,false);M3.U.uRes.value.set(M3.R.domElement.width,M3.R.domElement.height);M3.U.uDpr.value=M3.R.getPixelRatio()}
function m3Orbit(o){let sx=0,sy=0,act=false,pid=null,down=false;
  o.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;down=true;act=false;sx=e.clientX;sy=e.clientY;pid=e.pointerId});
  o.addEventListener('pointermove',e=>{if(!down||e.pointerId!==pid)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(!act&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)*1.4){act=true;try{o.setPointerCapture(pid)}catch(_){}}if(act)M3.tyaw=Math.max(-.26,Math.min(.26,dx/Math.max(200,M3.cw)*.9))});
  const end=()=>{if(!down)return;down=false;if(act){M3.dragged=Date.now();try{o.releasePointerCapture(pid)}catch(_){}}act=false;M3.tyaw=0};
  o.addEventListener('pointerup',end);o.addEventListener('pointercancel',end);
  o.addEventListener('click',e=>{if(Date.now()-M3.dragged<350){e.stopPropagation();e.preventDefault()}},true)}
function m3Loop(ts){if(!M3.run)return;requestAnimationFrame(m3Loop);const oc=$('#oc');if(!oc||!oc.contains(M3.cv)||VIEW_NOW!=='hub'){M3.run=false;return}
  if(document.hidden||!M3.vis)return;const calm=m3Calm(),gap=calm?900:(PERF.lite?38:26);if(ts-M3.last<gap)return;const raw=ts-M3.last,dt=Math.min(.1,raw/1000);M3.last=ts;
  if(!calm&&!M3.q){const q=M3.q0||(M3.q0={n:0,sum:0});if(raw<400){q.n++;q.sum+=raw}if(q.n>=100){M3.q={avg:q.sum/q.n};if(q.sum/q.n>62){M3.dprCap=1;const o=$('#oc');if(o)m3Resize(o)}}}
  try{m3Frame(calm?.016:dt)}catch(e){M3.run=false;try{console.warn('3D frame failed',e)}catch(_){}m3Fail()}}
function m3Fail(){const oc=$('#oc');if(oc){oc.classList.remove('m3','m3on');delete oc.dataset.m3;$$('.isl,.boat,.shell,.reef,.gaplab,.plab,.tchest',oc).forEach(e=>{e.style.translate='';e.style.scale='';e.style.visibility=''})}if(M3.cv&&M3.cv.parentNode)M3.cv.remove();M3.st='fail';M3.failAt=Date.now()}
function m3Mount(){const oc0=$('#oc');if(!oc0||oc0.dataset.m3)return;
  m3Load().then(ok=>{const oc=$('#oc');if(!ok||!oc||oc.dataset.m3||VIEW_NOW!=='hub')return;
    oc.dataset.m3='1';oc.insertBefore(M3.cv,oc.firstChild);
    if(!M3.t1){const T=M3.T;M3.t1=new T.Vector3();M3.t2=new T.Vector3();M3.t3=new T.Vector3();M3.t4=new T.Vector3()}
    m3Resize(oc);m3Collect(oc);m3SyncState();m3Apply();
    try{M3.last=performance.now();m3Frame(.016)}catch(e){try{console.warn('3D first frame failed',e)}catch(_){}m3Fail();return}
    m3Orbit(oc);if(M3.ro)M3.ro.disconnect();if(M3.io)M3.io.disconnect();
    if(window.ResizeObserver){M3.ro=new ResizeObserver(()=>{const o=$('#oc');if(o&&o.contains(M3.cv)){m3Resize(o);if(!M3.run)m3Frame(.016)}});M3.ro.observe(oc)}
    if(window.IntersectionObserver){M3.vis=true;M3.io=new IntersectionObserver(es=>{M3.vis=es.some(e=>e.isIntersecting)});M3.io.observe(oc)}
    requestAnimationFrame(()=>{oc.classList.add('m3');setTimeout(()=>oc.classList.add('m3on'),760)});
    if(!M3.run){M3.run=true;requestAnimationFrame(m3Loop)}})}
/* the sky as the plain map shows it, and the labels for both modes */
function hubSky(){if(VIEW_NOW!=='hub')return;const oc=$('#oc');if(!oc)return;const W=world();
  [['mv','l'],['th','r']].forEach(([k,sd],i)=>{const r=W[k],pl=PLACES[k],el=$('.plab[data-k='+k+']',oc);
    if(el){const h='<small>'+r.clock+' · '+r.icon+' '+Math.round(r.wx.t)+'°</small>',t=pl.n;const html=t+h;if(el.dataset.h!==html){el.dataset.h=html;el.innerHTML=html}}
    const hs=$('.hs.'+sd,oc);if(hs){const sk=r.sk;$('.nt',hs).style.opacity=(sk.nightF*.62).toFixed(2);$('.dk',hs).style.opacity=(sk.duskF*(1-sk.nightF*.5)).toFixed(2);$('.stars',hs).style.opacity=sk.nightF.toFixed(2);
      const cb=$('.cb',hs);cb.textContent=sk.nightF>.4?moonEmoji(W.moon.phase):(sk.dayF>.4?'☀️':'');cb.style.opacity=sk.nightF>.4||sk.dayF>.4?'1':'0'}});
  if(oc.dataset.m3&&M3_OK())m3Apply()}