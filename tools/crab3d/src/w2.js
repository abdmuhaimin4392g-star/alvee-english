
/* ============ 3D WORLD, part 2: the land, the Maldives atolls, Bangkok, the lighthouse, the reef ============ */
const GLSL_LAND_V=`varying vec3 vW;varying vec2 vUv;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const GLSL_LAND_F=GLSL_COMMON+`uniform sampler2D uLand;varying vec3 vW;varying vec2 vUv;
float lcaus(vec2 p){float t=uT*.55;float a=sin(p.x*2.3+t+sin(p.y*1.9-t*.8)*1.4),b=sin(p.y*2.1-t*.9+sin(p.x*1.7+t*.6)*1.3),c=sin((p.x+p.y)*1.6+t*.7);float v=1.-abs(a*b*.8+c*.2);return pow(clamp(v,0.,1.),5.);}
void main(){
  vec4 t=texture2D(uLand,vUv);if(t.a<.004)discard;
  float ny=gl_FragCoord.y/uRes.y;float s=smoothstep(-uK,uK,vW.x);
  vec3 tint=mix(uTL,uTR,s),hor=mix(uHL,uHR,s);float night=mix(uNt.x,uNt.y,s),day=1.-night;
  vec3 c=t.rgb*tint;
  float sh=1.-smoothstep(.5,.96,t.a);
  float ca=lcaus(vW.xz*.62);c+=vec3(.45,.95,.9)*ca*.3*sh*tint*(1.-night*.4);
  float nz=vnz(vW.xz*.55)*.6+vnz(vW.xz*1.7)*.4;c*=.9+.2*nz;
  c+=vec3(.02,.05,.07)*night;
  c=mix(c,hor,smoothstep(.62,.9,ny)*.4);
  float a=t.a*(1.-smoothstep(.84,.9,ny));
  gl_FragColor=vec4(c,a);}
`;
/* the continents: one painted texture on a grid that follows the camera's own view of the sea, so the 3D map and the flat map always agree */
function m3LandBuild(T,U,sc){
  const W=1024,H=2048,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  geoPaint(cv.getContext('2d'),{s:W/400,sy:H/960,mv:true});
  const tex=new T.CanvasTexture(cv);tex.flipY=false;tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;
  try{tex.anisotropy=Math.min(4,M3.R.capabilities.getMaxAnisotropy())}catch(e){}
  const NX=30,NY=44,X0=-26,X1=126,Y0=-9,Y1=72,pos=[],uv=[],idx=[],v=new T.Vector3();
  for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const X=X0+(X1-X0)*i/NX,Y=Y0+(Y1-Y0)*j/NY;m3G(X,Y,v);pos.push(v.x,.42,v.z);uv.push(Math.max(0,Math.min(1,X/100)),Math.max(0,Math.min(1,Y/100)))}
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+NX+1;idx.push(a,b,a+1,a+1,b,b+1)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const un=Object.assign({},U,{uLand:{value:tex}});
  const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:un,vertexShader:GLSL_LAND_V,fragmentShader:GLSL_LAND_F,transparent:true,depthWrite:false,side:T.DoubleSide}));
  m.frustumCulled=false;m.renderOrder=-4.6;sc.add(m);M3.land=m;return m}
/* world-space size of an ellipse that is rx wide and ry tall in map percent */
function m3Ell(X,Y,rx,ry){const g=m3G(X,Y),a=m3G(X+rx,Y),b=m3G(X,Y+ry);return {g,rx:Math.abs(a.x-g.x),rz:Math.abs(b.z-g.z)}}
function m3World16(E){const T=E.T,S=E.S,U=E.U,halo=E.halo,addIsl=E.addIsl,addGlow=E.addGlow,gable=E.gable,sandW=E.sandW,sandD=E.sandD,grass=E.grass,grassC=E.grassC;
  /* -- the Maldives: eleven atolls from north to south. Each is a lagoon the sea shader paints, a few sand islets and palms -- */
  {const rn=m3Rnd(31);let n3=0;
    WMAP.mv.forEach((a,i)=>{const X=a[0],Y=a[1],e=m3Ell(X,Y,a[2],a[3]),g=e.g,u=m3W(X,Y),rx=Math.max(e.rx,.9*u),rz=Math.max(e.rz,.9*u);
      addIsl(g.x,g.z,rx*.78,rz*.78,.9);
      const n=Math.max(3,Math.round(a[2]*2.4));
      for(let k=0;k<n;k++){const t=(k+rn()*.7)/n*6.2832;if(Math.sin(t*2.3+i)>.55)continue;const x=g.x+Math.cos(t)*rx*.98,z=g.z+Math.sin(t)*rz*.98,ri=(.34+rn()*.22)*u*(a[2]>1.8?1.25:1);
        islandGeo(S,x,z,ri,i*3.1+k,[{k:1,y0:-.7,y1:.6,top:sandW,wall:sandD},{k:.62,y0:.6,y1:.95,top:grass,ctop:grassC,wall:rgb('#2a8a52')}],1.1,.95);
        if(rn()<.5)palmGeo(S,x,.9,z,(1.7+rn()*1.0)*u,(rn()-.5)*.9,50+i*7+k)}
      n3++});
    /* Male and a resort: a small white town on the north rim of the Kaafu atoll, and a jetty with huts over the water */
    {const e=m3Ell(30.3,28.7,2.3,1.1),g=e.g,u=m3W(30.3,28.7),R=1.05*u;M3.mv={x:g.x,z:g.z,u,R:e.rx};
      const tx=g.x,tz=g.z-e.rz*1.12;islandGeo(S,tx,tz,R*1.05,9.3,[{k:1,y0:-.7,y1:.6,top:rgb('#d9d6c4'),wall:rgb('#a9a791')}],1.4,.9);
      for(let k=0;k<9;k++){const q=m3Rnd(70+k);const bx=tx+(q()-.5)*R*2.2,bz=tz+(q()-.5)*R*1.1,w=(.35+q()*.35)*u;S.box(bx,.6,bz,w,(.5+q()*1.3)*u,w,rgb(['#f2efe6','#c9d3d8','#e8c9a8','#b7c4cc'][k%4]),{win:true,cw:.5*u,ch:.7*u,or:[k,5]})}
      const j0=[g.x+e.rx*1.0,g.z+e.rz*.25],jl=e.rx*1.2;S.box(j0[0]+jl*.5,.35,j0[1],jl,.25,.5*u,rgb('#a97545'),{});
      for(let k=0;k<4;k++){const hx=j0[0]+jl*(.22+k*.22),side=k%2?.8:-.8;S.box(hx,.4,j0[1]+side*u,.7*u,.5*u,.65*u,rgb('#f2e8cf'),{});S.cyl(hx,.4+.5*u,j0[1]+side*u,.62*u,0,.5*u,4,rgb('#c9a05a'),{})}}}
  /* -- Bangkok on the Gulf: the Grand Palace, Wat Arun, and a ring of towers around one tall red-lit tower -- */
  {const g=m3G(74.7,20.3),u=m3W(74.7,20.3),q=u*.4,Rt=3.9*u,ax=1.3,az=.92;M3.th={x:g.x,z:g.z,u,R:Rt};
    islandGeo(S,g.x,g.z,Rt,2.2,[{k:1,y0:.25,y1:.62,top:rgb('#b9bcae'),wall:rgb('#8e9486')},{k:.8,y0:.62,y1:.78,top:rgb('#a7ab9c'),ctop:rgb('#9ea293'),wall:rgb('#7c8274')}],ax,az);
    const rn=m3Rnd(77),pal=['#d5dde2','#b7c4cc','#e6dccb','#9db4c2','#d9cfc9','#a9cbe0','#f1f5f6','#8fb0c4','#c8d0b8','#e8c9a8'].map(rgb),B0=.78;
    const spots=[];for(let i=0;i<200&&spots.length<46;i++){const a=rn()*6.2832,r=Math.sqrt(rn())*.8,x=g.x+Math.cos(a)*r*Rt*ax,z=g.z+Math.sin(a)*r*Rt*az;if(spots.every(s=>Math.hypot((s[0]-x)/(s[2]+.1),(s[1]-z)/(s[2]+.1))>1.3))spots.push([x,z,0,r])}
    spots.forEach(([x,z,_,r],i)=>{const w=(1.7+rn()*1.5)*q,d=(1.7+rn()*1.4)*q,core=1-r/.8,h=(5+rn()*7+core*core*(18+rn()*12))*q*.7;spots[i][2]=Math.max(w,d)/2;
      const c=pal[Math.floor(rn()*pal.length)];S.box(x,B0,z,w,h,d,c,{win:true,rot:(rn()-.5)*.3,or:[rn()*50,rn()*50],top:mul3(c,.78),cw:.78*q,ch:1.15*q});
      if(h>14*q*.7&&rn()<.55)S.box(x,B0+h,z,w*.55,2.2*q*.6,d*.55,mul3(c,.7),{})});
    {const x=g.x-Rt*.1,z=g.z+Rt*.04,h1=30*q*.7;S.box(x,B0,z,3.4*q,h1,3.4*q,rgb('#cfd6da'),{win:true,or:[3.3,4.4],top:rgb('#8d969b'),cw:.8*q,ch:1.2*q});S.box(x,B0+h1,z,2.4*q,5*q*.7,2.4*q,rgb('#e8edf0'),{win:true,or:[1.3,2.4],cw:.8*q,ch:1.2*q});S.cyl(x,B0+h1+5*q*.7,z,.55*q,0,9*q*.7,6,rgb('#f2f2f0'),{});S.box(x-.2*q,B0+h1+14.4*q*.7,z-.2*q,.4*q,.4*q,.4*q,rgb('#ff4b4b'),{glow:1});M3.th.tower=[x,B0+h1+14.8*q*.7,z]}
    const wat=(x,z,s)=>{S.box(x,B0,z,5*s*q,1.3*s*q,4.4*s*q,rgb('#f6efe0'),{});S.cyl(x,B0+1.3*s*q,z,1.7*s*q,1.3*s*q,2.0*s*q,8,rgb('#f6efe0'),{});S.cyl(x,B0+3.3*s*q,z,1.2*s*q,.8*s*q,1.6*s*q,8,rgb('#f2c14e'),{});S.cyl(x,B0+4.9*s*q,z,.8*s*q,0,5*s*q,8,rgb('#f2c14e'),{});S.cyl(x,B0+9.9*s*q,z,.06*s*q,0,1.4*s*q,4,rgb('#ffe9a0'),{glow:.6})};
    wat(g.x+Rt*.62,g.z+Rt*.42,1.2);wat(g.x-Rt*.78,g.z-Rt*.2,1);
    gable(S,g.x+Rt*.12,B0,g.z+Rt*.62,4.2*q,1.5*q,2.6*q,1.4*q,rgb('#f1e6cf'),rgb('#c9402f'),0);gable(S,g.x-Rt*.4,B0,g.z+Rt*.52,3.6*q,1.3*q,2.2*q,1.2*q,rgb('#f1e6cf'),rgb('#c9402f'),.15);
    for(let i=0;i<7;i++){const a=3.5+i*.5,x=g.x+Math.cos(a)*Rt*ax*.95,z=g.z+Math.sin(a)*Rt*az*.95;palmGeo(S,x,.7,z,4.4*q,.3,50+i)}
    M3.th.glow=addGlow(new T.Vector3(...M3.th.tower),8*u,0xff5a5a,.9)}
  /* -- limestone towers in Phang Nga Bay, off Thailand's west coast -- */
  [[69.4,25.7,1.05],[68.3,26.9,.85],[70.3,27.9,.95],[68.9,28.6,.7],[67.6,25.5,.65]].forEach(([X,Y,s],i)=>{const g=m3G(X,Y),u=m3W(X,Y),h=(9+s*5)*u*.9,r=2.1*s*u;
    S.cyl(g.x,-.6,g.z,r*1.35,r*.95,h,7,rgb('#d4cab4'),{cap:1,top:rgb('#3d8f62')});S.cyl(g.x,h-1.6,g.z,r*1.04,r*1.0,1.6,7,rgb('#3d8f62'),{});S.cyl(g.x+r*.3,h-1.7,g.z-r*.2,r*.55,0,2.2*s*u,6,rgb('#2f7f5f'),{});
    addIsl(g.x,g.z,r*1.4,r*1.4,.8);halo(g.x,g.z,r*3.4,{a:.6,c0:'#7cf0df',c1:'#1ca6b4',r0:.5})});
  /* -- the Halfway Isle and its lighthouse -- */
  {const g=m3G(46,33.8),u=m3W(46,33.8),Rl=5.4*u;M3.lh={x:g.x,z:g.z,u};
    islandGeo(S,g.x,g.z,Rl,3.3,[{k:1,y0:-.7,y1:.55,top:sandW,wall:sandD},{k:.7,y0:.55,y1:1.1,top:grass,ctop:grassC,wall:rgb('#2a8a52')}],1.1,.95);
    palmGeo(S,g.x-Rl*.7,1,g.z+Rl*.35,5.6*u,-.5,61);palmGeo(S,g.x+Rl*.72,1,g.z+Rl*.3,5.1*u,.5,62);
    const k=u*.9;S.cyl(g.x,1.1,g.z,1.9*k,1.55*k,5*k,10,rgb('#f8f8f4'),{});S.cyl(g.x,1.1+5*k,g.z,1.55*k,1.42*k,3*k,10,rgb('#e8433b'),{});S.cyl(g.x,1.1+8*k,g.z,1.42*k,1.2*k,4.2*k,10,rgb('#f8f8f4'),{});
    S.cyl(g.x,1.1+12.2*k,g.z,1.9*k,1.9*k,.5*k,10,rgb('#3b4650'),{cap:1,top:rgb('#4a5662')});S.cyl(g.x,1.1+12.7*k,g.z,1.05*k,1.05*k,1.7*k,8,rgb('#ffe27a'),{glow:1});S.cyl(g.x,1.1+14.4*k,g.z,1.5*k,0,2*k,10,rgb('#e8433b'),{});
    M3.lh.lamp=new T.Vector3(g.x,1.1+13.5*k,g.z);
    halo(g.x,g.z,Rl*3.2,{a:.88,c0:'#9ffbea',c1:'#2fcfc7',r0:.45,zs:1.7});addIsl(g.x,g.z,Rl*1.1,Rl*.95)}
  /* -- the Hydra's reef: jagged rocks around the whirlpool, in the Bay of Bengal -- */
  {const g=m3G(56,19.8),u=m3W(56,19.8),rr=6.4*u,rn=m3Rnd(5);M3.reef={x:g.x,z:g.z,u};
    for(let i=0;i<11;i++){const a=i/11*6.2832+rn()*.3,x=g.x+Math.cos(a)*rr*(.9+rn()*.25),z=g.z+Math.sin(a)*rr*(.62+rn()*.15),h=(3+rn()*5.5)*u,r=(1+rn()*.9)*u;
      S.cyl(x,-.7,z,r,r*.15,h,5,rgb(i%3?'#463d63':'#574b7a'),{});if(i%4===0)S.cyl(x,h*.55,z,r*.5,0,h*.4,5,rgb('#ff5f7e'),{glow:.5})}
    M3.reefHalo=halo(g.x,g.z,rr*2.2,{ring:1,r0:.62,w:.14,a:.85,c0:'#ff5f7e',c1:'#ff5f7e',tn:0,pulse:.3,y:.12,zs:1.55,ro:-3});
    M3.reefHalo2=halo(g.x,g.z,rr*1.5,{a:.55,c0:'#2a1030',c1:'#08121e',r0:.2,tn:0,zs:1.5,y:.05})}
}