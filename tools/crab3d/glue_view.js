
/* ================================================================ THE VOYAGE SCREEN (3D) ================================================================ */
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function m3Gl(){if(M3.st==='fail'&&Date.now()<M3.failAt)return false;if(m3Gl.v!=null)return m3Gl.v;try{const c=document.createElement('canvas');m3Gl.v=!!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))&&!!(window.CSS&&CSS.supports&&CSS.supports('translate','1px 1px'))}catch(e){m3Gl.v=false}return m3Gl.v}
/* a point beside the sailing line: d > 0 inside the U, d < 0 outside (in frame pixels) */
function rtBeside(p,d){const a=rtP(p-.06),b=rtP(p+.06),c=rtP(p);let tx=(b[0]-a[0])*PXX,ty=(b[1]-a[1])*PXY;const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;return [c[0]+(-ty)*d/PXX,c[1]+tx*d/PXY]}
const chestHtml=(cls,label,cd)=>{trDefsOnce();return `<span class="tch-rays"></span><span class="tch-in">${TR_SVG}<i class="tch-sp a">✦</i><i class="tch-sp b">✧</i><i class="tch-sp c">✦</i></span>${cd?`<span class="tch-cd">${cd}</span>`:''}`};
function spawnHtml(sp,x,y,reach,id){const k=sp.kind,g=sp.gift,gk=g&&g.kind;const pos=`data-x="${x.toFixed(2)}" data-y="${y.toFixed(2)}" data-sp="${id}" style="left:${x}%;top:${y}%"`,far=reach?'':' far';
  if(k==='sealed'||gk==='sealed')return `<button class="tchest sealed${far}" ${pos} aria-label="A sealed chest. It needs a key.">${chestHtml('','','🔒 key')}</button>`;
  if(k==='chest'||k==='golden'||gk==='golden'||(g&&gk!=='pearls'&&gk!=='shells'))return `<button class="tchest${k==='golden'||gk==='golden'?' lk':''}${g?' wel':''}${far}" ${pos} aria-label="${g?'A gift chest':'A treasure chest'}">${chestHtml('',g?'gift':'',g?'a gift':'')}</button>`;
  if(k==='pearl'||k==='pearls'||gk==='pearls')return `<button class="shell eco oy${far}" ${pos} aria-label="Open an oyster">${ECO_OY_SVG}</button>`;
  if(k==='bottle')return `<button class="shell bottle${far}" ${pos} aria-label="A message in a bottle">${AE.voyage.bottleSVG()}</button>`;
  return `<button class="shell${far}" ${pos} aria-label="Collect a shell">🐚</button>`}
function crabView(st,arg){const V=AE.voyage,h=AE.h,s=V.st(st);rtBuild();const cur=V.curIndex(st),R=V.route(),N=RT.N;
  const root=h('div',{class:'screen voyage3'});root.append(V.hud(st));
  const ci=RT.main[cur],sea=V.SEAS[ci.isl.sea];
  const mus=h('button',{class:'v3-ib'+(AE.music&&AE.music.allowed()?' on':''),'aria-label':'Music',onclick:()=>{const on=AE.music.toggle();mus.classList.toggle('on',on);mus.textContent=on?'🎵':'🔇'}},AE.music&&AE.music.allowed()?'🎵':'🔇');
  root.append(h('div',{class:'v3-row'},h('button',{class:'v3-chip',onclick:()=>V.islandSheet(ci.isl)},h('span',{class:'flagc sm',html:V.flag(sea.flag)}),h('b',null,ci.isl.name),h('span',{class:'num'},'Island '+(cur+1)+' of '+N+' · '+sea.en)),AE.bellBtn?AE.bellBtn('v3-ib'):null,mus));
  const oc=document.createElement('div');oc.className='oc';oc.id='oc';oc.setAttribute('role','group');oc.setAttribute('aria-label','Voyage map from Thailand to the Maldives. Drag up and down to look along the route.');
  const SP={};let html=geoLabels()+
    `<span class="plab pb" data-k="mv" data-x="14" data-y="31.4" style="left:14%;top:31.4%"></span><span class="plab pb" data-k="th" data-x="86.5" data-y="26.6" style="left:86.5%;top:26.6%"></span>`+
    `<span class="plab hw" data-x="46.5" data-y="37.6" style="left:46.5%;top:37.6%">Lighthouse</span>`+`<span class="plab hw dest" data-x="50" data-y="${(RT.yEnd+8).toFixed(2)}" style="left:50%;top:0">❤️ Addu Atoll · Maldives</span>`+
    RT.seas.map(o=>`<span class="plab gl sea v3sea" data-x="${o.x.toFixed(2)}" data-y="${o.y.toFixed(2)}" style="left:${o.x}%;top:${o.y}%">${escH(o.n)}</span>`).join('');
  const flagOf=si=>`<span class="flags"><span class="pf">${V.flag(V.SEAS[si].flag).replace('<svg ','<svg class="fl" ')}</span></span>`;
  RT.main.forEach(m=>{const n=m.isl.node,d=st.done[n.id],open=V.islandOpen(st,m.isl),nx=m.gi===cur&&!d,ic=m.gi===N-1?'🏝️':n.boost?'💪':n.kind==='lesson'?'📖':n.kind==='talk'?'💬':'🏰';
    html+=`<button class="isl${d?' done':''}${nx?' next':''}${open?'':' lk'}${n.kind==='check'?' test':''}" data-k="m${m.gi}" data-x="${m.x.toFixed(2)}" data-y="${m.y.toFixed(2)}" style="left:${m.x}%;top:${m.y}%" aria-label="${escH(m.isl.name)}${d?', finished':open?'':', locked'}"><span class="ib"><span class="sand"></span><i class="ig">${ic}</i>${d?flagOf(m.isl.sea):''}</span><span class="il">${escH(m.isl.name)}</span></button>`});
  RT.side.forEach((o,i)=>{const d=s.side[o.isl.id],open=V.islandOpen(st,o.isl);
    html+=`<button class="isl side${d?' done':''}${open?'':' lk'}" data-k="s${i}" data-x="${o.x.toFixed(2)}" data-y="${o.y.toFixed(2)}" style="left:${o.x}%;top:${o.y}%" aria-label="${escH(o.isl.name)}, side mission"><span class="ib"><span class="sand"></span><i class="ig">🧭</i></span><span class="il">${escH(o.isl.name)}</span></button>`});
  /* things on the water: between islands, plus today's tide and any gifts near the boat */
  RT.main.forEach(m=>{if(m.gi>=N-1)return;V.spawnsFor(m.gi).forEach(sp=>{if(s.got[sp.id])return;const j=+sp.id.split('.')[1]||0,q=rtBeside(m.gi+(j?.66:.36)+(sp.fy-.5)*.1,(j?-1:1)*(30+sp.fx*14));SP[sp.id]=sp;html+=spawnHtml(sp,q[0],q[1],m.gi<cur,sp.id)})});
  V.dailySpawns().concat(V.gifts()).forEach((sp,j)=>{if(s.got[sp.id])return;const q=rtBeside(Math.min(N-1.2,Math.max(-.6,cur+.22+j*.2)),(j%2?34:-34));SP[sp.id]=sp;html+=spawnHtml(sp,q[0],q[1],true,sp.id)});
  html+=`<button class="boat me skn" id="bt-al" style="--c:#1fe0cf" aria-label="${escH(AE.user.name)}’s boat"><span class="nm">🐢 ${escH(AE.user.name)}<i class="kn"></i></span></button><div class="gaplab" id="gaplab"></div>`+
    `<button class="v3-ctr" id="v3ctr" type="button">⛵ Back to my boat</button>`;
  oc.innerHTML=html;root.append(oc);
  oc.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!oc.contains(t))return;
    if(t.id==='v3ctr'){m3Follow();return}
    if(t.id==='bt-al'){AE.go('treasure','fleet');return}
    if(t.dataset.sp){const sp=SP[t.dataset.sp];if(sp)V.collect(sp,t,!t.classList.contains('far'));return}
    const k=t.dataset.k;if(!k||!t.classList.contains('isl'))return;if(k[0]==='m')V.islandSheet(RT.main[+k.slice(1)].isl);else V.islandSheet(RT.side[+k.slice(1)].isl)});
  M3.follow=true;M3.bp=null;M3.cyT=null;M3.focusY=null;
  if(arg&&(arg.sp||arg.gi!=null)){const el=arg.sp?oc.querySelector('[data-sp="'+arg.sp+'"]'):oc.querySelector('[data-k="m'+arg.gi+'"]');if(el){M3.focusY=+el.dataset.y;el.classList.add('ping');setTimeout(()=>el.classList.remove('ping'),5000)}}
  requestAnimationFrame(()=>{const nav=document.querySelector('.nav');oc.style.bottom=(nav?nav.offsetHeight:64)+'px';m3Mount();mapCreature();hubSky()});
  AE.presence={screen:'voyage',title:'Island '+(cur+1)};
  return root}
AE.crab={ok:()=>m3Gl(),view:crabView,M3,RT,look:m3LookAt,follow:m3Follow};
