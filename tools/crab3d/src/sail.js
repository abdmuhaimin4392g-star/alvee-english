
/* ============ SAILING ============
   A boat sails while its player is online: it gets under way with a splash, drifts around its patch of sea
   at its own random speed (it speeds up and slows down by itself), and leaves a V wake, ripples and bubbles.
   An offline boat sits still with no wake. Progress positions are never touched: sailing is only an offset. */
const SAIL={last:0,tagAt:0,t2:0,pair:null,pairAt:0};
const sailO=w=>SAIL[w]||(SAIL[w]={k:0,kt:0,nx:0,amp:0,ph:w==='maya'?.7:3.1,ox:0,oy:0,bx:0,vx:0,vy:0,yaw:0,on:false,was:false,burst:0,acc:0,racc:0});
const sailOn=w=>!!(S.me&&(w===S.me||(typeof onlineNow==='function'&&onlineNow())));
function sailStep(){const now=performance.now();let dt=(now-SAIL.last)/1000;if(dt<.004)return;SAIL.last=now;dt=Math.min(.1,dt);
  const calm=m3Calm(),t=now/1000;
  ['maya','mari'].forEach(w=>{const s=sailO(w),on=sailOn(w);
    if(on&&!s.was){s.kt=.9;s.nx=t+1.4;s.burst=t;try{if(S.me&&VIEW_NOW==='hub')sfx(w===S.me?'sail':'bell')}catch(e){}}
    s.was=on;
    if(on&&typeof krHelperAt==='function'&&krHelperAt()===w){s.kt=2.3;s.nx=t+1}
    else if(on){if(t>=s.nx){const r=Math.random();s.kt=r<.14?.3+Math.random()*.25:r<.28?1.45+Math.random()*.5:.55+Math.random()*.9;s.nx=t+2.2+Math.random()*4.8}}else s.kt=0;
    s.k+=(s.kt-s.k)*(1-Math.exp(-dt*(on?(s.kt>s.k?1.1:.8):1.7)));if(!on&&s.k<.01)s.k=0;s.on=on;
    if(calm){s.ox=s.oy=s.vx=s.vy=s.yaw=0;return}
    if(on)s.amp+=(1-s.amp)*(1-Math.exp(-dt*.5));
    s.ph+=dt*s.k*.275*(typeof ecoSpd==='function'?ecoSpd(w):1);
    const bias=w==='maya'?-2.6:2.6,sd=w==='maya'?0:1.7,
      ox=s.amp*(bias+1.8*Math.sin(s.ph*.9+sd)+.6*Math.sin(s.ph*2.3+.6)),oy=s.amp*(.9*Math.sin(s.ph*.7+1.1)+.45*Math.sin(s.ph*1.9+2.2)),
      kv=1-Math.exp(-dt*6);
    s.bx=s.amp*bias;s.vx+=((ox-s.ox)/dt-s.vx)*kv;s.vy+=((oy-s.oy)/dt-s.vy)*kv;s.ox=ox;s.oy=oy;
    s.yaw+=(Math.max(-.5,Math.min(.5,s.vx*.56))-s.yaw)*(1-Math.exp(-dt*1.5))})}
/* where the two boats are right now, and how far apart that is in nautical miles */
function sailPair(){const n=performance.now();if(!SAIL.pair||n-SAIL.pairAt>300){SAIL.pair=boatPair();SAIL.pairAt=n}return SAIL.pair}
function liveNm(vg){vg=vg||voyGap();if(!vg)return null;const P=sailPair(),a=sailO(S.me),b=sailO(other());
  const d0=Math.hypot(P.b.x-P.a.x,(P.b.y-P.a.y)*1.4),d1=Math.hypot(P.b.x+(b.ox-b.bx)-P.a.x-(a.ox-a.bx),(P.b.y+b.oy-P.a.y-a.oy)*1.4);
  const moved=Math.abs(a.ox)+Math.abs(a.oy)+Math.abs(b.ox)+Math.abs(b.oy)>.01;
  return {moved,nm:Math.max(.2,vg.nmi+(d1-d0)*3.2)}}
const nmTxt=vg=>{const l=vg?liveNm(vg):null;return l&&l.moved?l.nm.toFixed(1):String(vg?vg.nmi:0)};
/* the little speed tags and the miles label, a couple of times a second */
function sailTags(){const now=performance.now();if(now-SAIL.tagAt<420)return;SAIL.tagAt=now;
  ['maya','mari'].forEach(w=>{const s=sailO(w),el=document.querySelector('#bt-'+w+' .kn');if(el){const tx=s.k>.05?(s.k*6).toFixed(1)+' kn':'';if(el.textContent!==tx)el.textContent=tx}});
  const vg=voyGap();if(vg&&typeof gapShow==='function'&&gapShow(vg)){const t=nmTxt(vg),gl=document.getElementById('gaplab');if(gl&&gl.textContent!==t+' nm')gl.textContent=t+' nm';const hb=document.querySelector('#hubhud .vgap b');if(hb&&hb.textContent!==t)hb.textContent=t}}

/* ---- the plain (non 3D) map ---- */
let s2on=false;
function sail2dKick(){if(s2on)return;s2on=true;SAIL.last=performance.now();SAIL.t2=0;requestAnimationFrame(sail2dTick)}
function sail2dTick(){const oc=document.getElementById('oc');if(!oc||VIEW_NOW!=='hub'){s2on=false;return}
  requestAnimationFrame(sail2dTick);if(document.hidden)return;
  if(oc.classList.contains('m3'))return;
  const now=performance.now();if(now-SAIL.t2<33)return;const dt=Math.min(.12,(now-(SAIL.t2||now-33))/1000);SAIL.t2=now;
  sailStep();sail2dApply(oc);sail2dFx(oc,dt);sailTags()}
function sail2dApply(oc){const W=oc.clientWidth,H=oc.clientHeight;
  [S.me,other()].forEach(w=>{const el=document.getElementById('bt-'+w),s=sailO(w);if(!el)return;
    el.style.translate=(s.ox/100*W).toFixed(1)+'px '+(s.oy/100*H).toFixed(1)+'px';el.classList.toggle('sail',s.k>.04);el.style.setProperty('--sk',s.k.toFixed(2));
    const h=el.querySelector('.hull');if(h){if(h.classList.contains('sk')){if(s.vx>.3&&el.dataset.fr!=='1'){el.dataset.fr='1';h.style.scale='-1 1'}else if(s.vx<-.3&&el.dataset.fr!=='0'){el.dataset.fr='0';h.style.scale='1 1'}}else h.style.rotate=(s.yaw*34).toFixed(1)+'deg'}});
  const gl=document.getElementById('gapln');if(gl){gl.style.display=(typeof krBusy==='function'&&krBusy())?'none':'';const P=sailPair(),a=sailO(S.me),b=sailO(other());gl.setAttribute('x1',P.a.x+a.ox);gl.setAttribute('y1',(P.a.y+a.oy)*2);gl.setAttribute('x2',P.b.x+b.ox);gl.setAttribute('y2',(P.b.y+b.oy)*2);
    const lb=document.getElementById('gaplab');if(lb){lb.style.left=Math.min(88,(P.a.x+a.ox+P.b.x+b.ox)/2+9)+'%';lb.style.top=(P.a.y+a.oy+P.b.y+b.oy)/2+'%'}}}
function sail2dFx(oc,dt){if(m3Calm())return;let box=document.getElementById('sfx2');if(!box){box=document.createElement('div');box.id='sfx2';box.setAttribute('aria-hidden','true');oc.appendChild(box)}
  const W=oc.clientWidth,H=oc.clientHeight,now=performance.now()/1000;
  const mk=(cls,css,frames,dur)=>{if(box.childElementCount>46)return;const e=document.createElement('i');e.className=cls;Object.assign(e.style,css);box.appendChild(e);const a=e.animate(frames,{duration:dur,easing:'ease-out',fill:'forwards'});a.onfinish=()=>e.remove()};
  const bub=(x,y,big)=>{const sz=(big?2.6:1.8)+Math.random()*(big?3.2:2.2),dx=(Math.random()-.5)*(big?26:16),dy=9+Math.random()*(big?26:17);
    mk('bb',{left:(x-sz/2)+'px',top:(y-sz/2)+'px',width:sz+'px',height:sz+'px'},[{transform:'translate(0,0) scale(.6)',opacity:0},{opacity:.95,offset:.14},{transform:`translate(${dx}px,${dy}px) scale(1.15)`,opacity:0}],1000+Math.random()*900)};
  const rip=(x,y,sc)=>mk('rp',{left:(x-9)+'px',top:(y-3)+'px',width:'18px',height:'6px'},[{transform:'scale(.3)',opacity:.8},{transform:`scale(${(2.3*sc).toFixed(2)})`,opacity:0}],1400+Math.random()*500);
  [S.me,other()].forEach(w=>{const el=document.getElementById('bt-'+w),s=sailO(w);if(!el)return;
    let ax=el.offsetLeft+s.ox/100*W,ay=el.offsetTop+s.oy/100*H-3;
    {const hs=el.querySelector('.hull.sk');if(hs){const hr=hs.getBoundingClientRect(),orc=oc.getBoundingClientRect(),fr=el.dataset.fr!==undefined?el.dataset.fr==='1':(hs.style.scale||'').charAt(0)==='-';ax=hr.left-orc.left+hr.width*(fr?.18:.82);ay=hr.bottom-orc.top-hr.height*.08}}
    if(s.burst&&now-s.burst<3){s.burst=0;for(let i=0;i<16;i++)bub(ax+(Math.random()-.5)*20,ay,true);rip(ax,ay,1.3);setTimeout(()=>rip(ax,ay,1.8),260)}
    if(s.k<.05)return;
    s.acc+=dt*(5+16*Math.min(1.6,s.k));while(s.acc>=1){s.acc--;bub(ax+(Math.random()-.5)*12,ay+Math.random()*3,s.k>1.2&&Math.random()<.3)}
    s.racc+=dt*(.5+1.3*s.k);if(s.racc>=1){s.racc=0;rip(ax,ay,.8+Math.min(1.2,s.k)*.6)}})}

/* ---- the 3D map: V wake, ripples and bubbles ---- */
const WAKE_H=`uniform float uT,uS,uKind;
float wkh(float u,float v){float e=smoothstep(0.,.3,v)*smoothstep(1.,.7,v);float c=.5+.5*sin(u*(uKind<.5?34.:20.)-uT*(2.8+uS*3.4));return e*(.3+.7*c)*(1.-u*.82)*smoothstep(0.,.05,u);}`;
const WAKE_V=`varying vec2 vUv;varying float vH;`+WAKE_H+`void main(){vUv=uv;float h=wkh(uv.x,uv.y);vH=h;vec3 p=position;p.y+=h*.2;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const WAKE_F=`varying vec2 vUv;varying float vH;uniform float uA;`+WAKE_H+`
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
void main(){float u=vUv.x,v=vUv.y;float edge=smoothstep(0.,.22,v)*smoothstep(1.,.78,v);float fade=smoothstep(0.,.04,u)*(1.-u*u*.9);
 float sp=1.6+uS*2.4;float foam=vn(vec2(u*17.-uT*sp,v*5.+uKind*3.));
 float e=.012;float hu=wkh(u+e,v)-wkh(u-e,v),hv=wkh(u,v+e)-wkh(u,v-e);
 vec3 n=normalize(vec3(-hv*5.,1.,-hu*2.5));float lit=clamp(dot(n,normalize(vec3(-.5,.8,.35))),0.,1.);
 float a=edge*fade*(.22+.95*vH)*(.7+.45*foam);
 if(a<.004)discard;
 vec3 col=mix(vec3(.5,.72,.82),vec3(1.),.3+.7*lit)+vec3(.12)*vH*vH;
 gl_FragColor=vec4(col,min(1.,a*uA));}`;
const BUB_V=`attribute float aS;attribute float aA;uniform vec2 uRes;varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;vA=aA;gl_PointSize=aS>0.?max(2.4,aS*projectionMatrix[1][1]*uRes.y*.5/-mv.z):0.;}`;
const BUB_F=`varying float vA;
void main(){vec2 p=gl_PointCoord*2.-1.;float r2=dot(p,p);if(r2>1.||vA<.01)discard;
 float z=sqrt(1.-r2);vec3 n=vec3(p.x,-p.y,z);vec3 L=normalize(vec3(-.45,.7,.55));
 float fr=pow(1.-z,2.2);float dif=max(dot(n,L),0.);
 float s1=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),40.);
 float s2=pow(max(dot(reflect(-normalize(vec3(.55,-.6,.6)),n),vec3(0.,0.,1.)),0.),12.)*.32;
 float ed=1.-smoothstep(.86,1.,sqrt(r2));
 vec3 col=mix(vec3(.46,.72,.86),vec3(.9,.985,1.),dif*.8+fr*.3)+s1+s2*vec3(.8,.95,1.);
 float a=(.1+.3*fr+.16*dif*fr+s1*.95+s2)*ed*vA;
 gl_FragColor=vec4(col,clamp(a,0.,1.));}`;
const RIP_V=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`;
const RIP_F=`varying vec2 vUv;uniform float uAge,uA;
void main(){vec2 p=vUv*2.-1.;float r=length(p);float R=.24+uAge*.72;float w=.06+.07*uAge;float ring=smoothstep(R-w,R,r)*(1.-smoothstep(R,R+w*.7,r));
 float a=ring*uA*(1.-uAge)*(1.-uAge);if(a<.004)discard;gl_FragColor=vec4(.93,.99,1.,a);}`;
function m3WakeMake(T,U){const COLS=6,strip=(pts,kind)=>{const n=pts.length,pos=new Float32Array(n*COLS*3),uv=new Float32Array(n*COLS*2),idx=[];
    pts.forEach((p,i)=>{for(let j=0;j<COLS;j++){const f=j/(COLS-1),o=(i*COLS+j);pos.set([p[0]+(f*2-1)*p[2],0,p[1]],o*3);uv.set([p[3],f],o*2);
      if(i<n-1&&j<COLS-1){const a=o,b=o+1,c=o+COLS,d=o+COLS+1;idx.push(a,b,c,b,d,c)}}});
    const g=new T.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));
    const mat=new T.ShaderMaterial({uniforms:{uT:U.uT,uA:{value:0},uS:{value:0},uKind:{value:kind}},vertexShader:WAKE_V,fragmentShader:WAKE_F,transparent:true,depthWrite:false,side:T.DoubleSide});
    const m=new T.Mesh(g,mat);m.frustumCulled=false;m.renderOrder=-1;m.position.y=.1;return {m,mat}};
  const NR=34,arm=sg=>{const pts=[];for(let i=0;i<=NR;i++){const u=i/NR;pts.push([sg*(.45+u*2.3),3+u*8,.2+u*.5,u])}return strip(pts,0)};
  const tr=(()=>{const pts=[];for(let i=0;i<=NR;i++){const u=i/NR;pts.push([0,3+u*7,.3+u*.85,u])}return strip(pts,1)})();
  const L=arm(-1),R=arm(1),arms=new T.Group();arms.add(L.m);arms.add(R.m);arms.visible=false;tr.m.visible=false;
  return {arms,trail:tr.m,mats:[L.mat,R.mat,tr.mat]}}
const m3Lit=x=>{const P=M3.pal;if(!P||!P[0]||!P[1])return 1;const s=m3Side(x);return P[0].day+(P[1].day-P[0].day)*s};
function m3WakeSet(b,sl,lit){const k=sl.k,on=k>.02;b.wake.visible=on;b.trail.visible=on;if(!on)return;
  const wl=.4+.6*clamp01(k/1.5);b.wake.scale.z=wl;b.trail.scale.z=wl;b.wake.position.z=3-3*wl;b.trail.position.z=3-3*wl;
  const a=Math.min(1,.7+k*.4)*(b.ghost?.5:1)*(.55+.45*lit);b.wm.forEach(m=>{m.uniforms.uA.value=a;m.uniforms.uS.value=k})}
function m3FxBuild(){const T=M3.T,sc=M3.sc,U=M3.U,N=190,g=new T.BufferGeometry(),pos=new Float32Array(N*3),aS=new Float32Array(N),aA=new Float32Array(N);
  for(let i=0;i<N;i++)pos[i*3+1]=-9;
  g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aS',new T.BufferAttribute(aS,1));g.setAttribute('aA',new T.BufferAttribute(aA,1));
  const pts=new T.Points(g,new T.ShaderMaterial({uniforms:{uRes:U.uRes},vertexShader:BUB_V,fragmentShader:BUB_F,transparent:true,depthWrite:false}));
  pts.frustumCulled=false;pts.renderOrder=4;sc.add(pts);
  const rg=new T.PlaneGeometry(1,1);rg.rotateX(-Math.PI/2);const rip=[];
  for(let i=0;i<24;i++){const m=new T.Mesh(rg,new T.ShaderMaterial({uniforms:{uAge:{value:1},uA:{value:0}},vertexShader:RIP_V,fragmentShader:RIP_F,transparent:true,depthWrite:false,side:T.DoubleSide}));
    m.visible=false;m.frustumCulled=false;m.renderOrder=-1;m.position.y=.14;sc.add(m);rip.push({m,age:1,life:1,size:1,a:1})}
  M3.fx={pts,g,pos,aS,aA,N,i:0,life:new Float32Array(N),max:new Float32Array(N),vel:new Float32Array(N*3),s0:new Float32Array(N),a0:new Float32Array(N),rip,ri:0,live:0};}
function m3FxStep(dt){const fx=M3.fx;if(!fx)return;const calm=m3Calm(),now=performance.now()/1000;
  const bub=(x,y,z,vx,vy,vz,size,alpha,life)=>{const i=fx.i;fx.i=(i+1)%fx.N;fx.life[i]=fx.max[i]=life;fx.pos[i*3]=x;fx.pos[i*3+1]=y;fx.pos[i*3+2]=z;fx.vel[i*3]=vx;fx.vel[i*3+1]=vy;fx.vel[i*3+2]=vz;fx.s0[i]=size;fx.a0[i]=alpha};
  const rip=(x,z,size,a,life)=>{const r=fx.rip[fx.ri++%fx.rip.length];r.age=0;r.life=life;r.size=size;r.a=a;r.m.position.x=x;r.m.position.z=z;r.m.visible=true};
  if(!calm)['maya','mari'].forEach(w=>{const b=M3.boats[w],s=sailO(w);if(!b||!b.mesh)return;
    const m=b.mesh,sc=m.scale.x,yaw=m.rotation.y,sn=Math.sin(yaw),cs=Math.cos(yaw),px=m.position.x,pz=m.position.z,lit=.4+.6*m3Lit(px),k=s.k,v0=sc*.5;
    const loc=(lx,lz)=>[px+(lx*cs+lz*sn)*sc,pz+(-lx*sn+lz*cs)*sc];
    const spawn=(lx,lz,big,bow)=>{const p=loc(lx,lz),sz=(big?.4:.22)+Math.random()*(big?.34:.24),sp=bow?-.5:1;
      bub(p[0],.1*sc,p[1],((Math.random()-.5)*1.1+sn*sp*(.3+.4*k)+(bow?lx*.9:0))*v0,(.5+Math.random()*.9)*sc*.55,((Math.random()-.5)*1.1+cs*sp*(.3+.4*k))*v0,sz*sc,(.7+Math.random()*.3)*(.6+.4*lit),1.2+Math.random()*1.4)};
    if(s.burst&&now-s.burst<3){s.burst=0;for(let i=0;i<26;i++)spawn((Math.random()-.5)*2.2,2.4+Math.random()*2.6,Math.random()<.4,false);const p=loc(0,3);rip(p[0],p[1],sc*5,.9,2.2);setTimeout(()=>{const q=loc(0,3.4);rip(q[0],q[1],sc*6.5,.75,2.4)},260)}
    if(k<.05)return;
    s.acc+=dt*(14+34*Math.min(1.6,k))*PERF.pk;while(s.acc>=1){s.acc--;if(k>1.05&&Math.random()<.28)spawn((Math.random()<.5?-1:1)*(.7+Math.random()*.5),(b.skb||-3.1)-Math.random()*.7,false,true);else spawn((Math.random()-.5)*2.4,(b.sks||3.1)+Math.random()*1.3,Math.random()<.22,false)}
    s.racc+=dt*(.6+1.5*k);if(s.racc>=1){s.racc=0;const p=loc((Math.random()-.5)*1.2,2.6);rip(p[0],p[1],sc*(4.2+2.2*Math.min(1.5,k)),.75,2+Math.random()*.7)}});
  /* move the bubbles */
  let any=false;const N=fx.N,pos=fx.pos,vel=fx.vel,aS=fx.aS,aA=fx.aA;
  for(let i=0;i<N;i++){if(fx.life[i]<=0){if(aA[i]!==0){aA[i]=0;aS[i]=0;pos[i*3+1]=-9;any=true}continue}
    any=true;fx.life[i]-=dt;const t=1-Math.max(0,fx.life[i])/fx.max[i],d=1-Math.min(1,dt*1.3);
    vel[i*3+1]*=d;vel[i*3]*=1-Math.min(1,dt*.8);vel[i*3+2]*=1-Math.min(1,dt*.8);pos[i*3]+=vel[i*3]*dt;pos[i*3+1]+=vel[i*3+1]*dt;pos[i*3+2]+=vel[i*3+2]*dt;
    aS[i]=fx.s0[i]*(.6+.7*t);aA[i]=fx.a0[i]*Math.min(1,t*7)*Math.pow(1-t,.9)}
  if(any){fx.g.attributes.position.needsUpdate=true;fx.g.attributes.aS.needsUpdate=true;fx.g.attributes.aA.needsUpdate=true}
  fx.rip.forEach(r=>{if(!r.m.visible)return;r.age+=dt/r.life;if(r.age>=1){r.m.visible=false;return}const u=r.m.material.uniforms;u.uAge.value=r.age;u.uA.value=r.a;r.m.scale.set(r.size,1,r.size)})}