
/* ================================================================ ALVEE'S VOYAGE ON THE OPERATION CRAB MAP ================================================================ */
const ECO_OY_SVG=`<svg viewBox="0 0 44 40" width="42" height="38" aria-hidden="true"><ellipse cx="22" cy="33" rx="18" ry="4.5" fill="rgba(255,255,255,.3)"/><path d="M22 4C11 4 3 14 3 24c0 5 4 9 9 9h20c5 0 9-4 9-9C41 14 33 4 22 4z" fill="#7d8aa6"/><path d="M22 6v26M14 8l-4 24M30 8l4 24M8 14l-1 17M36 14l1 17" stroke="#586685" stroke-width="1.2" opacity=".7" fill="none"/><path d="M10 14c3-5 8-8 12-8" stroke="#d3dcee" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".85"/><ellipse cx="22" cy="31.5" rx="9" ry="2.6" fill="#4b5876"/><path class="spk" d="M34 6l1.2 3 3 1.2-3 1.2L34 14.4l-1.2-3-3-1.2 3-1.2z" fill="#fff"/></svg>`;

/* ---- the route, laid out once in map percent (x 0..100 across; y 0..100 is the Operation Crab frame, and the sea goes on south) ----
   Like the Operation Crab map, the islands swing from one side of the sea to the other. The voyage leaves the Andaman coast
   below Thailand and sails south, island by island, until the Maldives: the last two seas are atolls, and the end is Addu.
   Distances are measured in the frame's own pixels (400 x 960). */
const RT={ok:false};
const PXX=4,PXY=9.6,SUB=10,YSTEP=9.4,Y0=45;
const ZX=[68,26,70,30,72,25,64,33,69,28,73,31];
function rtBuild(){if(RT.ok)return RT;const V=AE.voyage,R=V.route(),N=R.main.length;
  const main=R.main.map((isl,i)=>({isl,gi:i,x:i===N-1?50:ZX[i%ZX.length],y:Y0+i*YSTEP}));
  const side=[];R.all.forEach(isl=>{if(isl.kind!=='side')return;const a=main[isl.anchor.gi],b=main[Math.min(N-1,isl.anchor.gi+1)];side.push({isl,x:a.x>50?13:87,y:(a.y+b.y)/2,anchor:a.gi})});
  const seas=[];V.SEAS.forEach((sea,si)=>{const m=main.find(x=>x.isl.sea===si);if(!m)return;seas.push({si,n:sea.en,x:m.x>50?27:73,y:m.y-1.2})});
  /* the sailing line: a dock on the Andaman coast, then through every island, smoothed */
  const keys=[[60.5,31.5]].concat(main.map(m=>[m.x,m.y])),dense=[];
  for(let i=0;i<keys.length-1;i++){const p0=keys[Math.max(0,i-1)],p1=keys[i],p2=keys[i+1],p3=keys[Math.min(keys.length-1,i+2)];
    for(let k=0;k<SUB;k++){const t=k/SUB,t2=t*t,t3=t2*t;dense.push([0,1].map(j=>.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)))}}
  dense.push(keys[keys.length-1]);
  /* where the Maldives begin: the first island of the atoll seas */
  const mvAt=main.find(m=>V.SEAS[m.isl.sea].flag==='mv');
  Object.assign(RT,{ok:true,N,main,side,seas,dense,dn:dense.length,yEnd:main[N-1].y,ymax:main[N-1].y+18,mvY:mvAt?mvAt.y:main[N-1].y});M3.ymax=RT.ymax;return RT}
/* p = progress in islands: -1 is the dock, 0 the first island, N-1 the last */
const rtP=p=>{const d=RT.dense,f=Math.max(0,Math.min(d.length-1,(p+1)*SUB)),i=Math.floor(f),k=f-i,a=d[i],b=d[Math.min(d.length-1,i+1)];return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]};
const rtBoatP=()=>AE.voyage.boatP(AE.state);

/* ---- the islands themselves: built only when they are needed, so a long route stays light ---- */
function m3AlIslands(E){const T=E.T;M3.alE=E;M3.isl={};
  const put=(key,X,Y,k,seed,kind)=>{const g=m3G(X,Y),u=m3W(X,Y),r=4.6*u*k;E.addIsl(g.x,g.z,r*1.05,r*.97);
    const hl=E.halo(g.x,g.z,r*2.6,{a:.8,c0:'#8ff7e8',c1:'#23b9c3',r0:.42,zs:1.75});
    const ring=E.halo(g.x,g.z,r*2.5,{ring:1,r0:.72,w:.1,a:.95,c0:'#ffb62e',c1:'#ffb62e',tn:0,pulse:.3,y:.14,zs:1.7,ro:-3});ring.visible=false;
    M3.isl[key]={g,u,r,seed,kind,hl,ring,m:{}}};
  RT.main.forEach(m=>put('m'+m.gi,m.x,m.y,m.isl.u%3===0?1.22:1.08,m.gi*2.1+.4,m.isl.u%3===0?'fort':'chap'));
  RT.side.forEach((s,i)=>put('s'+i,s.x,s.y,.82,i*3.7+1.9,'side'));
  m3AlAtolls(E)}
/* the last two seas are the Maldives: atolls along both edges, and Addu's lagoon around the very last island */
function m3AlAtolls(E){const T=E.T,b=GB(),rn=m3Rnd(41),sandW=E.sandW,sandD=E.sandD,grass=rgb('#3fae6a'),grassC=E.grassC;
  const atoll=(X,Y,rxp,ryp,i,gap)=>{const e=m3Ell(X,Y,rxp,ryp),g=e.g,u=m3W(X,Y),rx=Math.max(e.rx,.9*u),rz=Math.max(e.rz,.9*u);E.addIsl(g.x,g.z,rx*.8,rz*.8,.9);
    const n=Math.max(5,Math.round(rxp*2.6));for(let k=0;k<n;k++){const t=(k+rn()*.6)/n*6.2832;if(gap&&Math.sin(t*2.3+i)>.6)continue;if(!gap&&Math.sin(t-1.57)>.82)continue;const x=g.x+Math.cos(t)*rx*.98,z=g.z+Math.sin(t)*rz*.98,ri=(.34+rn()*.22)*u*(rxp>4?1.4:1.15);
      islandGeo(b,x,z,ri,i*3.1+k,[{k:1,y0:-.7,y1:.6,top:sandW,wall:sandD},{k:.62,y0:.6,y1:.95,top:grass,ctop:grassC,wall:rgb('#2a8a52')}],1.1,.95);
      if(rn()<.55)palmGeo(b,x,.9,z,(1.7+rn()*1.0)*u,(rn()-.5)*.9,50+i*7+k)}
    return {g,u,rx,rz}};
  const busy=(X,Y)=>RT.side.some(s=>Math.abs(s.y-Y)<6&&Math.abs(s.x-X)<14)||RT.seas.some(s=>Math.abs(s.y-Y)<4&&Math.abs(s.x-X)<20);
  let side=0;for(let y=RT.mvY-2;y<RT.yEnd-8;y+=9.5){const X=side?93:7,Y=y+rn()*3;side^=1;if(busy(X,Y))continue;atoll(X,Y,2.4+rn()*1.2,1+rn()*.5,Math.round(y),1)}
  /* Addu: a ring of islets around the last island, a jetty and huts over the water */
  const f=RT.main[RT.N-1],a=atoll(f.x,f.y+.6,13,4.4,7,0),u=a.u;
  const j0=[a.g.x+a.rx*.18,a.g.z+a.rz*.42],jl=a.rx*.5;b.box(j0[0]+jl*.5,.35,j0[1],jl,.25,.5*u,rgb('#a97545'),{});
  for(let k=0;k<5;k++){const hx=j0[0]+jl*(.18+k*.19),sd=k%2?.8:-.8;b.box(hx,.4,j0[1]+sd*u,.7*u,.5*u,.65*u,rgb('#f2e8cf'),{});b.cyl(hx,.4+.5*u,j0[1]+sd*u,.62*u,0,.5*u,4,rgb('#c9a05a'),{})}
  const m=new T.Mesh(b.done(T),E.mWorld);m.frustumCulled=false;E.sc.add(m)}
function m3IslMesh(o,done){const k=done?'d':'u';if(o.m[k])return o.m[k];const E=M3.alE,T=M3.T,b=GB(),{g,u,r,seed}=o,sandW=E.sandW,sandD=E.sandD,grassC=E.grassC,i=Math.round(seed*10);
  islandGeo(b,g.x,g.z,r,seed,done?[{k:1,y0:-.7,y1:.5,top:sandW,wall:sandD},{k:.76,y0:.5,y1:1.1,top:rgb('#58c97c'),ctop:grassC,wall:rgb('#2f9459')}]:[{k:1,y0:-.7,y1:.5,top:sandW,wall:sandD},{k:.66,y0:.5,y1:.75,top:rgb('#fbf0cf'),wall:sandW}],1.05,.95);
  palmGeo(b,g.x-r*.28,done?1:.7,g.z+r*.05,(done?7.4:5.4)*u,i%2?.45:-.45,80+i);
  if(done)palmGeo(b,g.x+r*.38,1,g.z-r*.1,5.6*u,.35,90+i);else b.box(g.x+r*.3,.7,g.z+r*.15,.9*u,.55*u,.9*u,rgb('#b98d57'),{});
  if(o.kind==='fort'){const q=u*.7;b.box(g.x+r*.05,.9,g.z-r*.25,2.2*q,2.6*q,2.2*q,rgb('#d9c7a0'),{top:rgb('#b9a77f')});b.cyl(g.x+r*.05,.9+2.6*q,g.z-r*.25,1.3*q,0,1.6*q,6,rgb('#c9402f'),{});b.box(g.x+r*.05,.9+4.2*q,g.z-r*.25,.12*q,1.4*q,.12*q,rgb('#3a2210'),{})}
  const m=new T.Mesh(b.done(T),E.mWorld);m.visible=false;E.sc.add(m);return o.m[k]=m}

/* ---- what the app knows: which islands are finished, which one is next, which boat she sails ---- */
function m3SyncState(){if(!M3_OK()||!M3.U||!RT.ok)return;const st=AE.state,V=AE.voyage,s=V.st(st),cur=V.curIndex(st);
  RT.main.forEach(m=>{const o=M3.isl['m'+m.gi];if(!o)return;const dn=V.chap(st,m.isl).all,mesh=m3IslMesh(o,dn),other=o.m[dn?'u':'d'];mesh.visible=true;if(other)other.visible=false;o.ring.visible=(m.gi===cur&&!dn)});
  RT.side.forEach((sd,i)=>{const o=M3.isl['s'+i];if(!o)return;const dn=!!s.side[sd.isl.id],mesh=m3IslMesh(o,dn),other=o.m[dn?'u':'d'];mesh.visible=true;if(other)other.visible=false});
  const b=M3.boats.al;if(b){b.ghost=false;b.tilt=0;try{sk3Apply('al',b)}catch(e){}}
  M3.goal=rtBoatP();if(M3.bp==null){M3.bp=typeof s.bp==='number'&&s.bp<=M3.goal&&s.bp>=-1?s.bp:M3.goal;M3.cy=rtP(M3.bp)[1]}
  if(M3.focusY!=null){M3.cy=M3.focusY;M3.follow=false;M3.focusY=null;m3CtrBtn()}
  M3.cur=cur;M3.ribKey=''}
/* while she scrolls the map, islands far from where she started are built as they come into view */
function m3LazyIsl(){return;if(!RT.ok||!M3.isl)return;const st=AE.state,s=AE.voyage.st(st);let n=0;
  if(!M3.todo)M3.todo=RT.main.map(m=>'m'+m.gi);if(!M3.todo.length)return;
  M3.todo.sort((a,b)=>Math.abs(RT.main[+a.slice(1)].y-M3.cy)-Math.abs(RT.main[+b.slice(1)].y-M3.cy));
  while(M3.todo.length&&n<3){const k=M3.todo[0],m=RT.main[+k.slice(1)],o=M3.isl[k];if(n&&Math.abs(m.y-M3.cy)>70)break;M3.todo.shift();if(!o||o.m.d||o.m.u)continue;m3IslMesh(o,!!st.done[m.isl.node.id]).visible=true;n++}}

function skinOf(w){try{const id=AE.voyage.st().boat;return id&&id!=='sloop'&&SK3.mk[id]?{id}:null}catch(e){return null}}

/* ---- the boat glides along the sailing line, island by island ---- */
function m3AlBoat(dt){const b=M3.boats.al;if(!b||M3.bp==null)return;const g=M3.goal==null?M3.bp:M3.goal,d=g-M3.bp;
  if(Math.abs(d)>.001){const sp=Math.min(1.5,.35+Math.abs(d)*.6);M3.bp+=Math.sign(d)*Math.min(Math.abs(d),sp*dt);M3.moving=true}
  else if(M3.moving){M3.moving=false;m3Landed()}
  const p=rtP(M3.bp);b.cx=b.tx=p[0];b.cy=b.ty=p[1];
  const a=rtP(M3.bp-.08),c=rtP(M3.bp+.08),ga=m3G(a[0],a[1],M3.t2),gx=ga.x,gz=ga.z,gc=m3G(c[0],c[1],M3.t2),dir=Math.sign(d)||1;
  let hd=Math.atan2(-(gc.x-gx)*dir,-(gc.z-gz)*dir);const cur=b.hd==null?hd:b.hd;let df=hd-cur;while(df>Math.PI)df-=2*Math.PI;while(df<-Math.PI)df+=2*Math.PI;b.hd=cur+df*Math.min(1,dt*2.2);
  if(M3.follow&&!M3.drag)M3.cyT=p[1]+4}
function m3Landed(){try{const s=AE.voyage.st();const cur=AE.voyage.curIndex(AE.state);if(s.bp!==M3.bp){s.bp=M3.bp;AE.saveSoon()}sfx('done');const n=RT.main[cur];if(n&&Math.abs(M3.bp-cur)<.05){const el=document.querySelector('.isl[data-k="m'+cur+'"]');if(el){el.classList.add('land');setTimeout(()=>el.classList.remove('land'),2400)}}}catch(e){}}

/* ---- the route ribbons: teal behind her, gold to the next island, pink for the sea still ahead ---- */
const _rb=[];function m3RibPts(m,pts,wPct){const N=m.userData.N,pos=m.geometry.attributes.position,au=m.geometry.attributes.aU,T=M3.T,n=Math.min(N+1,pts.length);if(n<2){m.visible=false;return}m.visible=true;
  for(let i=0;i<n;i++){(_rb[i]||(_rb[i]=new T.Vector3())).copy(m3G(pts[i][0],pts[i][1],M3.t1));_rb[i].w=wPct*m3W(pts[i][0],pts[i][1])}
  let acc=0;for(let i=0;i<=N;i++){const j=Math.min(i,n-1),a=_rb[Math.max(0,j-1)],b=_rb[Math.min(n-1,j+1)];let dx=b.x-a.x,dz=b.z-a.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const c=_rb[j],px=-dz*c.w/2,pz=dx*c.w/2;
    if(i>0&&i<n)acc+=Math.hypot(c.x-_rb[j-1].x,c.z-_rb[j-1].z);pos.setXYZ(i*2,c.x+px,.09,c.z+pz);pos.setXYZ(i*2+1,c.x-px,.09,c.z-pz);au.setX(i*2,acc);au.setX(i*2+1,acc)}
  pos.needsUpdate=true;au.needsUpdate=true}
function m3AlRoutes(){if(!RT.ok||M3.bp==null)return;const key=M3.bp.toFixed(3)+'|'+M3.cur;if(key===M3.ribKey)return;M3.ribKey=key;const d=RT.dense,bi=Math.max(0,Math.min(d.length-1,(M3.bp+1)*SUB)),bp=rtP(M3.bp),fl=Math.floor(bi),ce=Math.ceil(bi);
  const done=d.slice(0,fl+1);done.push(bp);m3RibPts(M3.rib.done,done,.75);
  const nx=Math.min(d.length-1,(Math.min(RT.N-1,M3.cur)+1)*SUB),gap=[bp].concat(d.slice(ce,nx+1));
  if(gap.length>1&&nx>bi+.5){const g2=gap.length>41?gap.filter((_,i)=>i%Math.ceil(gap.length/40)===0||i===gap.length-1):gap;m3RibPts(M3.rib.gap,g2,.55)}else M3.rib.gap.visible=false;
  const ah=d.slice(Math.max(ce,nx));if(ah.length>1)m3RibPts(M3.rib.ahead,ah,.6);else M3.rib.ahead.visible=false}

/* ---- the camera: drag the sea up and down to look along the route; it follows the boat until she drags ---- */
function m3Pan(dt){if(M3.cy==null)M3.cy=50;const lo=24,hi=RT.ok?RT.yEnd+4:80;
  if(!M3.drag){if(M3.follow&&M3.cyT!=null){M3.cy+=(M3.cyT-M3.cy)*(1-Math.exp(-dt*2.4));M3.vy=0}else if(Math.abs(M3.vy||0)>.5){M3.cy+=M3.vy*dt;M3.vy*=Math.exp(-dt*2.8)}}
  M3.cy=Math.max(lo,Math.min(hi,M3.cy));if(M3.w50==null)M3.w50=m3W(50,50);
  M3.ctg=m3G(50,M3.cy,M3.ctg||new M3.T.Vector3());M3.ck=m3W(50,M3.cy)/M3.w50;m3LazyIsl()}
function m3PxPerPct(){const c=M3.cam,a=m3G(50,M3.cy).clone().project(c),b=m3G(50,M3.cy+1).clone().project(c);return Math.max(2,Math.abs(a.y-b.y)/2*M3.ch)}
function m3Orbit(o){let sx=0,sy=0,mode='',pid=null,down=false,cy0=0,ppp=10,lt=0,ly=0;
  o.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;down=true;mode='';sx=e.clientX;sy=e.clientY;pid=e.pointerId;cy0=M3.cy;ppp=m3PxPerPct();lt=performance.now();ly=e.clientY;M3.vy=0});
  o.addEventListener('pointermove',e=>{if(!down||e.pointerId!==pid)return;const dx=e.clientX-sx,dy=e.clientY-sy;
    if(!mode){if(Math.abs(dy)>8&&Math.abs(dy)>=Math.abs(dx)*.8)mode='pan';else if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.4)mode='yaw';if(mode){try{o.setPointerCapture(pid)}catch(_){}if(mode==='pan'){M3.drag=true;M3.follow=false;m3CtrBtn()}}}
    if(mode==='pan'){M3.cy=cy0-dy/ppp;const now=performance.now(),dtt=Math.max(8,now-lt);M3.vy=-(e.clientY-ly)/ppp/(dtt/1000);lt=now;ly=e.clientY}
    else if(mode==='yaw')M3.tyaw=Math.max(-.26,Math.min(.26,dx/Math.max(200,M3.cw)*.9))});
  const end=()=>{if(!down)return;down=false;if(mode){M3.dragged=Date.now();try{o.releasePointerCapture(pid)}catch(_){}}if(performance.now()-lt>120)M3.vy=0;M3.vy=Math.max(-160,Math.min(160,M3.vy||0));mode='';M3.drag=false;M3.tyaw=0};
  o.addEventListener('pointerup',end);o.addEventListener('pointercancel',end);
  o.addEventListener('wheel',e=>{e.preventDefault();M3.follow=false;m3CtrBtn();M3.cy+=e.deltaY/m3PxPerPct()},{passive:false});
  o.addEventListener('click',e=>{if(Date.now()-M3.dragged<350){e.stopPropagation();e.preventDefault()}},true)}
function m3CtrBtn(){const b=document.getElementById('v3ctr');if(b)b.classList.toggle('show',!M3.follow)}
function m3Follow(){M3.follow=true;M3.vy=0;m3CtrBtn()}
function m3LookAt(y){M3.follow=false;M3.cyT=null;M3.vy=0;M3.cy=y;m3CtrBtn()}

/* ---- the buttons that ride on the 3D sea ---- */
function m3Collect(oc){M3.ov=[];
  $$('[data-x]',oc).forEach(el=>{if(el.classList.contains('boat'))return;m3Reg(el,+el.dataset.x,+el.dataset.y,el.classList.contains('plab')?{noscale:1}:null)});
  const bt=$('#bt-al',oc);if(bt)m3Reg(bt,0,0,{boat:1,fn:()=>{const b=M3.boats.al;return b&&b.w3}});
  const gl=$('#gaplab',oc);if(gl)m3Reg(gl,0,0,{noscale:1,dx:0,dy:22,fn:()=>{const b=M3.boats.al,n=RT.main[M3.cur];if(!b||!b.w3||!n||!M3.rib.gap.visible)return null;const g=m3G(n.x,n.y,M3.t2);return M3.t2.set(b.w3.x*.3+g.x*.7,0,b.w3.z*.3+g.z*.7)}})}
function m3Fail(){const oc=$('#oc');if(M3.cv&&M3.cv.parentNode)M3.cv.remove();M3.st='fail';M3.failAt=Date.now()+36e5;M3.run=false;if(oc&&m3Here())m3NoGl()}
function m3NoGl(){M3.st='fail';M3.failAt=Date.now()+36e5;setTimeout(()=>{if(m3Here())AE.go('journey')},30)}
setInterval(()=>{if(document.hidden)return;if(m3Here()){hubSky();m3Tags()}},5000);
function m3Tags(){const s=sailO('al'),el=document.querySelector('#bt-al .kn');if(el){const tx=s.k>.05?(s.k*6).toFixed(1)+' kn':'';if(el.textContent!==tx)el.textContent=tx}
  const gl=document.getElementById('gaplab');if(gl&&RT.ok&&M3.bp!=null){const n=RT.main[M3.cur],p=rtP(M3.bp);if(n){const nm=Math.hypot((n.x-p[0])*PXX,(n.y-p[1])*PXY)/9;const t=nm<.6?'⚓ arriving':nm.toFixed(1)+' nm';if(gl.textContent!==t)gl.textContent=t}}}
function sailTags(){const now=performance.now();if(now-SAIL.tagAt<420)return;SAIL.tagAt=now;m3Tags()}

/* ---- dolphins, whales and flying fish surface now and then ---- */
let mapT=0;function mapCreature(){clearTimeout(mapT);if(!m3Here()||m3Calm())return;
  mapT=setTimeout(()=>{if(!m3Here())return;const oc=$('#oc'),x=12+Math.random()*76,y=30+Math.random()*55,d=document.createElement('button');
    d.className='dolph';d.type='button';d.setAttribute('aria-label','A dolphin jumps. Tap to wave.');d.textContent=Math.random()<.22?'🐋':Math.random()<.5?'🐬':'🐟';d.style.left=x+'%';d.style.top=y+'%';
    d.onclick=e=>{e.stopPropagation();const sp=document.createElement('div');sp.className='splash';sp.style.left=d.style.left;sp.style.top=d.style.top;oc.appendChild(sp);setTimeout(()=>sp.remove(),1000);const em=d.textContent;d.remove();buzz(15);
      AE.toast(({'🐬':'🐬 The dolphin does a flip for you.','🐋':'🐋 A whale rises for a breath, then dives.','🐟':'🐟 A flying fish skips past.'})[em]||'Splash!')};
    oc.appendChild(d);setTimeout(()=>d.remove(),1900);mapCreature()},6000+Math.random()*9000)}
