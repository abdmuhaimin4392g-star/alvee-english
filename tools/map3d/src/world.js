
/* ============ 3D VOYAGE MAP: the world ============ */
function m3Aim(c,yaw,pit){const r=M3.r,th=M3.pitch+pit,cp=Math.cos(th),sp=Math.sin(th);c.position.set(r*cp*Math.sin(yaw),r*sp,r*cp*Math.cos(yaw));c.up.set(0,1,0);c.lookAt(0,0,0);c.updateProjectionMatrix();c.updateMatrixWorld(true)}
/* map percent (x,y) to a point on the sea, using the home camera so layout never moves */
function m3G(X,Y,o){const T=M3.T,h=M3.hc,v=(o||new T.Vector3()).set(X/50-1,1-Y/50,.5).unproject(h),p=h.position;v.sub(p);const t=-p.y/v.y;return v.set(p.x+v.x*t,0,p.z+v.z*t)}
const m3W=(X,Y)=>Math.abs(m3G(X+.5,Y).x-m3G(X-.5,Y).x);
const m3Rnd=s=>{let a=(s*2654435761)>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};

function m3Uniforms(T){const V3=(a,b,c)=>new T.Vector3(a,b,c),V4=(a,b,c,d)=>new T.Vector4(a,b,c,d),V2=(a,b)=>new T.Vector2(a,b);
  return {uT:{value:0},uRes:{value:V2(390,936)},uDpr:{value:1},uK:{value:9},uWind:{value:1},uGh:{value:0},uFl:{value:0},
    uTL:{value:V3(1,1,1)},uTR:{value:V3(1,1,1)},uNt:{value:V2(0,0)},uHL:{value:V3(.66,.86,.97)},uHR:{value:V3(.66,.86,.97)},uZL:{value:V3(.16,.46,.86)},uZR:{value:V3(.16,.46,.86)},
    uSNL:{value:V3(.07,.72,.8)},uSNR:{value:V3(.07,.72,.8)},uSFL:{value:V3(.04,.36,.6)},uSFR:{value:V3(.04,.36,.6)},
    uGL:{value:V4(.5,0,0,0)},uGR:{value:V4(.5,0,0,0)},uStr:{value:V2(0,0)},uRn:{value:V2(0,0)},uRc:{value:V3(.75,.85,.95)},
    uSuL:{value:V4(.3,.95,0,13)},uSuR:{value:V4(.7,.95,0,13)},uSuCL:{value:V3(1,.95,.7)},uSuCR:{value:V3(1,.95,.7)},
    uMoL:{value:V4(.3,.95,0,15)},uMoR:{value:V4(.7,.95,0,15)},uMpL:{value:V4(.5,1,0,0)},uMpR:{value:V4(.5,1,0,0)}}}

function m3Build(){
  const T=THREE;M3.T=T;
  const cv=document.createElement('canvas');cv.id='m3cv';cv.setAttribute('aria-hidden','true');
  const R=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:false,powerPreference:'high-performance'});
  R.setClearColor(0x0b3550,1);
  const sc=new T.Scene(),cam=new T.PerspectiveCamera(38,400/960,20,1600),hc=new T.PerspectiveCamera(38,400/960,20,1600);
  Object.assign(M3,{R,sc,cam,hc,cv});
  m3Aim(hc,0,0);{const w=Math.abs(m3G(100,50).x-m3G(0,50).x);M3.r*=100/w}m3Aim(hc,0,0);m3Aim(cam,0,0);
  const U=m3Uniforms(T);M3.U=U;
  const DV=!!((R.capabilities&&R.capabilities.isWebGL2)||(R.extensions&&R.extensions.has&&R.extensions.has('OES_standard_derivatives')));M3.dv=DV;
  const worldMat=un=>new T.ShaderMaterial({uniforms:un,vertexShader:GLSL_WORLD_V,fragmentShader:GLSL_WORLD_F,side:T.DoubleSide,extensions:{derivatives:DV},defines:DV?{USE_DERIV:1}:{}});
  const mWorld=worldMat(U);
  M3.mWorld=mWorld;
  /* sea and sky */
  const sea=new T.Mesh(new T.PlaneGeometry(1600,1600),new T.ShaderMaterial({uniforms:U,vertexShader:GLSL_SEA_V,fragmentShader:GLSL_SEA_F,transparent:true,depthWrite:false}));
  sea.rotation.x=-Math.PI/2;sea.renderOrder=-5;sc.add(sea);
  const sky=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:U,vertexShader:GLSL_SKY_V,fragmentShader:GLSL_SKY_F,depthTest:false,depthWrite:false}));
  sky.frustumCulled=false;sky.renderOrder=-10;sc.add(sky);
  /* helpers */
  const V3=(h)=>{const c=rgb(h);return new T.Vector3(c[0],c[1],c[2])};
  const halo=(x,z,r,o)=>{o=o||{};const un=Object.assign({},U,{uC0:{value:V3(o.c0||'#7ff5e6')},uC1:{value:V3(o.c1||'#17a8b8')},uA:{value:(o.a==null?.85:o.a)*((o.ring||o.tn===0)?1:.3)},uR0:{value:o.r0==null?.5:o.r0},uW:{value:o.w||.2},uRing:{value:o.ring?1:0},uTn:{value:o.tn==null?1:o.tn},uPulse:{value:o.pulse||0}});
    const m=new T.Mesh(new T.PlaneGeometry(r*2,r*(o.zs||2)),new T.ShaderMaterial({uniforms:un,vertexShader:`varying vec3 vW;varying vec2 vUv;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,fragmentShader:GLSL_HALO_F,transparent:true,depthWrite:false,blending:o.add?T.AdditiveBlending:T.NormalBlending}));
    m.rotation.x=-Math.PI/2;m.position.set(x,o.y==null?.06:o.y,z);m.renderOrder=o.ro||-4;m.userData.un=un;sc.add(m);return m};
  M3.halo=halo;
  const mesh=(g,vis)=>{const m=new T.Mesh(g,mWorld);m.frustumCulled=false;if(vis===false)m.visible=false;sc.add(m);return m};
  const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();
  const glows=[];M3.glows=glows;
  const addGlow=(p,sz,col,k)=>{const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));sp.position.copy(p);sp.scale.set(sz,sz,1);sp.renderOrder=7;sc.add(sp);glows.push({sp,k:k||1});return sp};
  const ISL=[];const addIsl=(x,z,rx,rz,k)=>ISL.push([x,z,rx,rz||rx,k||1]);
  const palms=(b,cx,cz,R,n,hh,seed,k0,leanOut)=>{const rn=m3Rnd(seed);for(let i=0;i<n;i++){const a=(i/n+rn()*.08)*6.2832,rr=R*(k0+rn()*.12),x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr;palmGeo(b,x,.9,z,hh*(.8+rn()*.35),(leanOut?Math.cos(a):1)*(.3+rn()*.4)*(rn()<.5?-1:1),seed+i)}};
  const gable=(b,cx,by,cz,w,h,d,rh,col,roof,rot)=>{rot=rot||0;const cs=Math.cos(rot),sn=Math.sin(rot),pt=(x,y,z)=>[cx+x*cs+z*sn,by+y,cz-x*sn+z*cs];
    b.box(cx,by,cz,w,h,d,col,{rot,win:true,cw:.9,ch:1.2,or:[cx,cz]});
    const a=pt(-w/2-.2,h,d/2+.2),bb=pt(w/2+.2,h,d/2+.2),c=pt(w/2+.2,h,-d/2-.2),dd=pt(-w/2-.2,h,-d/2-.2),r1=pt(0,h+rh,d/2+.2),r2=pt(0,h+rh,-d/2-.2);
    b.quad(a,r1,r2,dd,roof,{});b.quad(r1,bb,c,r2,roof,{});b.tri(a,bb,r1,roof,{});b.tri(dd,r2,c,roof,{})};

  /* ===== static scenery (one batch) ===== */
  const S=GB();
  const sandW=rgb('#f4e7bd'),sandD=rgb('#dcc283'),grass=rgb('#3fae6a'),grassC=rgb('#2f9459');
  /* the continents, the Maldives atolls, Bangkok, the lighthouse and the reef live in p16b */
  m3LandBuild(T,U,sc);
  m3World16({T,S,U,halo,addIsl,addGlow,gable,sandW,sandD,grass,grassC});
  /* -- the harbor pier -- */
  {const g=m3G(50,98.2),u=m3W(50,98.2),w=62*u;
    S.box(g.x,.1,g.z,w,.55,3.4*u,rgb('#a06b3a'),{});
    for(let i=0;i<=12;i++){const x=g.x-w/2+i*w/12;S.box(x,-1.6,g.z+1.5*u,.55*u,1.9,.55*u,rgb('#6e4527'),{});S.box(x,-1.6,g.z-1.5*u,.55*u,1.9,.55*u,rgb('#6e4527'),{})}
    [-.5,-.17,.17,.5].forEach(t=>{const x=g.x+w*t;S.cyl(x,.6,g.z-1.2*u,.16*u,.16*u,3*u,5,rgb('#3b2a1a'),{});S.box(x-.35*u,.6+3*u,g.z-1.55*u,.7*u,.7*u,.7*u,rgb('#ffd88a'),{glow:1});});
    M3.pier=g;
    [-.5,.5].forEach(t=>addGlow(new T.Vector3(g.x+w*t,.6+3.3*u,g.z-1.2*u),6*u,0xffc766,.9))}
  mesh(S.done(T));
  /* lighthouse lamp glow and rotating beam */
  {const lp=M3.lh.lamp;addGlow(lp,10*M3.lh.u,0xffe9a0,1.1);
    const bg=new T.BufferGeometry(),pos=[],col=[];const L=26*M3.lh.u;[0,Math.PI].forEach(a0=>{[[-.1,0],[.1,0]].forEach(()=>{});const a1=a0-.11,a2=a0+.11;pos.push(0,0,0,Math.cos(a1)*L,0,Math.sin(a1)*L,Math.cos(a2)*L,0,Math.sin(a2)*L);col.push(1,.95,.7,0,0,0,0,0,0)});
    bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('aCol',new T.Float32BufferAttribute(col,3));
    const bm=new T.Mesh(bg,new T.ShaderMaterial({uniforms:{uNt:U.uNt,uK:U.uK},vertexShader:GLSL_BEAM_V,fragmentShader:GLSL_BEAM_F,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
    bm.position.copy(lp);bm.renderOrder=6;sc.add(bm);M3.beam=bm}
  /* ===== the nine mission islets ===== */
  MISSIONS.forEach((id,i)=>{const X=ISL_X[id],Y=MAPY((i+1)/MISSIONS.length),g=m3G(X,Y),u=m3W(X,Y),r=5.6*u,mk=done=>{const b=GB();
      islandGeo(b,g.x,g.z,r,i*2.1+.4,done?[{k:1,y0:-.7,y1:.5,top:sandW,wall:sandD},{k:.76,y0:.5,y1:1.1,top:rgb('#58c97c'),ctop:grassC,wall:rgb('#2f9459')}]:[{k:1,y0:-.7,y1:.5,top:sandW,wall:sandD},{k:.66,y0:.5,y1:.75,top:rgb('#fbf0cf'),wall:sandW}],1.05,.95);
      palmGeo(b,g.x-r*.28,done?1:.7,g.z+r*.05,(done?7.4:5.4)*u,i%2?.45:-.45,80+i);if(done)palmGeo(b,g.x+r*.38,1,g.z-r*.1,5.6*u,.35,90+i);else b.box(g.x+r*.3,.7,g.z+r*.15,.9*u,.55*u,.9*u,rgb('#b98d57'),{});
      return b.done(T)};
    const und=mesh(mk(false)),don=mesh(mk(true),false);
    addIsl(g.x,g.z,r*1.05,r*.97);const hl=halo(g.x,g.z,r*3.1,{a:.85,c0:'#8ff7e8',c1:'#23b9c3',r0:.42,zs:1.75});
    const ring=halo(g.x,g.z,r*2.6,{ring:1,r0:.72,w:.1,a:.95,c0:'#ffb62e',c1:'#ffb62e',tn:0,pulse:.3,y:.14,zs:1.7,ro:-3});ring.visible=false;
    M3.isl[id]={und,don,ring,hl,g,u,r}});
  /* ===== clouds and their shadows ===== */
  {const tex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
      [[60,80,34],[100,64,42],[152,58,46],[198,72,36],[130,86,40],[84,90,30],[178,90,30]].forEach(([px,py,r])=>{const g=x.createRadialGradient(px,py-r*.25,r*.1,px,py,r);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.62,'rgba(244,248,252,.88)');g.addColorStop(1,'rgba(228,238,248,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,6.283);x.fill()});
      const g2=x.createLinearGradient(0,62,0,120);g2.addColorStop(0,'rgba(110,130,165,0)');g2.addColorStop(1,'rgba(110,130,165,.6)');x.globalCompositeOperation='source-atop';x.fillStyle=g2;x.fillRect(0,0,256,128);return new T.CanvasTexture(c)})();
    const rn=m3Rnd(9);
    for(let i=0;i<18;i++){const left=i%2===0,X=(left?4:52)+rn()*44,Y=26+rn()*40,size=(20+rn()*20),alt=10+rn()*7,th=Math.floor(i/2)/9;
      const sp=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:0,color:0xffffff}));sp.renderOrder=5;sc.add(sp);
      const sh=halo(0,0,1,{a:0,c0:'#000000',c1:'#000000',tn:0,r0:.1,ro:-3,zs:1.4});
      M3.cl.push({sp,sh,X,Y,size,alt,th,spd:.35+rn()*.5,ph:rn()*6.28})}}
  /* ===== rain ===== */
  {const N=420,pos=new Float32Array(N*2*3),aR=new Float32Array(N*2*3),rn=m3Rnd(21);
    for(let i=0;i<N;i++){const x=(rn()-.5)*320,z=-150+rn()*300,y=rn()*60,a=rn(),c=rn();for(let k=0;k<2;k++){const j=(i*2+k)*3;pos[j]=x;pos[j+1]=y;pos[j+2]=z;aR[j]=a;aR[j+1]=k;aR[j+2]=c}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aR',new T.BufferAttribute(aR,3));
    const m=new T.LineSegments(g,new T.ShaderMaterial({uniforms:{uT:U.uT,uH:{value:60},uRn:U.uRn,uRc:U.uRc,uK:U.uK},vertexShader:GLSL_RAIN_V,fragmentShader:GLSL_RAIN_F,transparent:true,depthWrite:false}));
    m.frustumCulled=false;m.renderOrder=6;sc.add(m);M3.rain=m}
  /* ===== route ribbons ===== */
  const ribbon=(col,freq,alpha)=>{const N=26,g=new T.BufferGeometry(),idx=[],uv=new Float32Array((N+1)*4);for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
    for(let i=0;i<=N;i++){uv[i*4]=i/N;uv[i*4+1]=0;uv[i*4+2]=i/N;uv[i*4+3]=1}
    g.setIndex(idx);g.setAttribute('position',new T.BufferAttribute(new Float32Array((N+1)*6),3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('aU',new T.BufferAttribute(new Float32Array((N+1)*2),1));
    const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{uT:U.uT,uC:{value:V3(col)},uF:{value:freq},uA:{value:alpha}},vertexShader:GLSL_RIB_V,fragmentShader:GLSL_RIB_F,transparent:true,depthWrite:false,side:T.DoubleSide}));
    m.frustumCulled=false;m.renderOrder=-2;m.visible=false;m.userData.N=N;sc.add(m);return m};
  M3.rib={maya:ribbon('#1fe0cf',.9,.8),mari:ribbon('#ff5f7e',.9,.8),gap:ribbon('#ffbf47',1.3,.85)};
  /* ===== boats ===== */
  const boat=(w)=>{const b=GB(),cs=BOATCOL[w],c1=rgb(cs[0]),parch=rgb('#f6e8c0'),parch2=rgb('#e3cc94'),wood=rgb('#6a3f1e'),woodD=rgb('#4a2a12'),woodDD=rgb('#2e1a0c'),woodL=rgb('#a9723a'),pl=rgb('#7a4a24'),dark=rgb('#3a2210'),gold=rgb('#e0b04a'),glow=[1,.84,.48],sg=w==='maya'?-1:1;
    /* hull: stacked planked layers, narrow keel up to a wide gold-railed deck */
    const F=[[0,-4.2],[.8,-3.3],[1.25,-2],[1.45,-.4],[1.5,1],[1.45,2.4],[1.2,3],[-1.2,3],[-1.45,2.4],[-1.5,1],[-1.45,-.4],[-1.25,-2],[-.8,-3.3]],cen=[0,-.4];
    const R=(kx,kz)=>F.map(p=>[p[0]*kx,-.4+(p[1]+.4)*kz]);
    b.wall(R(.6,.8),-.95,-.35,cen,woodDD,{});b.ring2(R(.84,.92),R(.6,.8),-.35,woodDD,{});
    b.wall(R(.84,.92),-.35,.3,cen,woodD,{});b.ring2(R(1,1),R(.84,.92),.3,woodD,{});
    b.wall(R(1,1),.3,1.2,cen,wood,{});
    b.wall(R(1.022,1.008),.6,.88,cen,c1,{});
    b.wall(R(1.04,1.014),1.2,1.42,cen,gold,{});b.ring2(R(1.04,1.014),R(.94,.97),1.42,gold,{});
    b.fan(cen,R(.94,.97),1.2,woodL,{});
    [-1,1].forEach(s=>[-.5,.45,1.4].forEach(z=>b.box(s*1.49,.34,z,.1,.3,.44,rgb('#1b0e05'),{})));
    /* raised stern with a lit cabin window and a lantern; small forecastle and bowsprit */
    b.box(0,1.2,2.0,2.3,1.25,1.9,pl,{top:woodD});b.box(0,2.38,2.0,2.52,.13,2.12,gold,{});
    b.box(0,1.55,2.97,1.4,.55,.09,glow,{glow:1});b.box(0,2.45,2.78,.12,1.05,.12,dark,{});b.box(-.18,3.45,2.6,.36,.42,.36,glow,{glow:1});
    b.box(0,1.2,-2.55,1.5,.55,1.1,pl,{top:woodD});b.box(0,1.72,-2.55,1.66,.1,1.26,gold,{});
    for(let i=0;i<4;i++)b.box(0,1.5+.2*i,-3.55-.48*i,.24,.24,.62,dark,{});
    /* mast, crow's nest, yard */
    b.box(0,1.2,-.5,.32,7.0,.32,dark,{});b.box(0,5.95,-.5,1.0,.5,1.0,pl,{top:woodD});b.box(0,6.42,-.5,1.18,.1,1.18,gold,{});b.box(0,8.2,-.5,.3,.3,.3,gold,{glow:1});
    b.box(0,5.1,-.5,3.9,.2,.2,dark,{});
    /* square sail, billowing forward, with panels and a band in the sailor's colour */
    {const NU=6,NV=4,pt=(u,v)=>{const x=u*(1.55+.15*v),y=2.3+2.8*v,z=-.55-.55*(1-u*u)*(.4+.6*Math.sin(Math.PI*v));return [x,y,z]};
     for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const u0=-1+2*i/NU,u1=-1+2*(i+1)/NU,v0=j/NV,v1=(j+1)/NV;const band=j===1;
       b.quad(pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1),band?c1:(i%2?parch2:parch),{flat:1})}}
    /* jib */
    b.tri([0,2.15,-5.05],[0,6.6,-.62],[0,2,-1.9],parch2,{flat:1});b.tri([0,2.15,-5.05],[0,3.3,-3.9],[0,2.6,-3.0],c1,{flat:1});
    /* the sailor's country flag, high on the mast, flying out to the side so it faces the camera */
    flagGeo(b,w,[0,7.05,-.5],[sg*.5,0,.87],1.62,1.08,.34,w==='maya'?0:1.7);
    return b.done(T)};
  ['maya','mari'].forEach(w=>{const un=Object.assign({},U,{uGh:{value:0}}),m=new T.Mesh(boat(w),worldMat(un));
    m.frustumCulled=false;const wk=m3WakeMake(T,U);m.add(wk.arms);m.add(wk.trail);
    sc.add(m);M3.boats[w]={mesh:m,wake:wk.arms,trail:wk.trail,wm:wk.mats,un,cx:50,cy:95,tx:50,ty:95,px:50,py:95,lean:0,ghost:true,ph:w==='maya'?0:2.1,init:false}});
  /* ===== the shore map: shallows and foam lines around every island, drawn once and read by the sea shader ===== */
  {const xs=[],zs=[];ISL.forEach(a=>{xs.push(a[0]-a[2]*3,a[0]+a[2]*3);zs.push(a[1]-a[3]*3,a[1]+a[3]*3)});
    const x0=Math.min(...xs)-4,x1=Math.max(...xs)+4,z0=Math.min(...zs)-4,z1=Math.max(...zs)+4,W=x1-x0,Hh=z1-z0,cw=768,chh=Math.max(256,Math.min(2048,Math.round(cw*Hh/W)));
    const cv2=document.createElement('canvas');cv2.width=cw;cv2.height=chh;const x=cv2.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,cw,chh);x.globalCompositeOperation='lighten';
    ISL.forEach(([X,Z,rx,rz,k])=>{const cx=(X-x0)/W*cw,cy=(Z-z0)/Hh*chh,rp=Math.max(2,rx/W*cw),rq=Math.max(2,rz/Hh*chh);
      x.save();x.translate(cx,cy);x.scale(1,rq/rp);
      let g=x.createRadialGradient(0,0,rp*.5,0,0,rp*2.7);g.addColorStop(0,'rgba(255,0,0,1)');g.addColorStop(.4,'rgba(255,0,0,.92)');g.addColorStop(.7,'rgba(255,0,0,.34)');g.addColorStop(1,'rgba(255,0,0,0)');
      x.fillStyle=g;x.beginPath();x.arc(0,0,rp*2.8,0,6.2832);x.fill();
      g=x.createRadialGradient(0,0,0,0,0,rp*1.5);g.addColorStop(0,'rgba(0,255,0,0)');g.addColorStop(.62,'rgba(0,255,0,0)');g.addColorStop(.76,'rgba(0,255,0,'+(.9*k)+')');g.addColorStop(.92,'rgba(0,255,0,0)');g.addColorStop(1,'rgba(0,255,0,0)');
      x.fillStyle=g;x.beginPath();x.arc(0,0,rp*1.6,0,6.2832);x.fill();x.restore()});
    const tex=new T.CanvasTexture(cv2);tex.flipY=false;tex.generateMipmaps=false;tex.minFilter=T.LinearFilter;tex.magFilter=T.LinearFilter;tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;
    U.uShore={value:tex};U.uShoreR={value:new T.Vector4(x0,z0,W,Hh)};M3.shore={x0,z0,W,Hh,n:ISL.length}}
  m3FxBuild();
  R.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
}