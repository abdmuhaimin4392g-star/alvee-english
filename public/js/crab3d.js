/* crab3d.js — the 3D voyage map from Operation Crab, carried over to Alvee English.
   The sea, sky, weather, land, islands, palms, lighthouse, clouds, rain, boats, wakes and route ribbons are the
   Operation Crab engine (three.js r128, self-hosted in vendor/). The route is Alvee's: from Thailand, south down
   the eastern sea, across the far south, and north again to the Maldives. Built by tools/crab3d (see README). */
(function () {
const AE = window.AE;
/* ---- small stand-ins for the Operation Crab globals this engine expects ---- */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const PERF = (() => { const lite = (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4); return { lite: !!lite, pk: lite ? 0.6 : 1 }; })();
const PREF = { calm: false };
const CLOUD = { wx: null };
const S = { me: 'al' };
const other = () => 'al';
const m3Here = () => AE.view === 'journey' && !!document.getElementById('oc');
const sfx = (k) => { try { const m = { sail: 'tap', bell: 'tap', ok: 'good', splash: 'tap', dolphin: 'tap', flip: 'tap' }; AE.sfx.play(m[k] || k); } catch (e) {} };
const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
const BOATCOL = { al: ['#1fe0cf', '#e8f4f1'] };


/* ============ 3D VOYAGE MAP: engine, shaders, geometry builder ============ */
const M3={st:'idle',p:null,failAt:0,T:null,R:null,sc:null,cam:null,hc:null,cv:null,cw:390,ch:936,t:0,last:0,yaw:0,pit:0,tyaw:0,vyaw:0,run:false,vis:true,boats:{},isl:{},cl:[],ov:[],U:null,dragged:0,pitch:50*Math.PI/180,r:348,ro:null,io:null};
const M3_URL='vendor/three.min.js';
const M3_OK=()=>M3.st==='ready';
function m3Load(){
  if(M3.st==='fail'&&Date.now()-M3.failAt>60000){M3.p=null;M3.st='idle'}
  if(M3.p)return M3.p;
  if(!(window.CSS&&CSS.supports&&CSS.supports('translate','1px 1px'))){M3.st='fail';M3.failAt=Date.now()+36e5;return M3.p=Promise.resolve(false)}
  M3.st='loading';
  M3.p=new Promise(res=>{
    if(window.THREE){res(true);return}
    let done=false;const fin=ok=>{if(done)return;done=true;res(ok)};
    const s=document.createElement('script');s.src=M3_URL;s.async=true;
    s.onload=()=>fin(!!window.THREE);s.onerror=()=>fin(false);
    setTimeout(()=>fin(!!window.THREE),15000);document.head.appendChild(s)
  }).then(ok=>{
    if(!ok){M3.st='fail';M3.failAt=Date.now();return false}
    try{m3Build();M3.st='ready';return true}catch(e){try{console.warn('3D map unavailable',e)}catch(_){}M3.st='fail';M3.failAt=Date.now();return false}
  });
  return M3.p}

/* ---- GLSL ---- */
const GLSL_COMMON=`
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
uniform float uT;uniform vec2 uRes;uniform float uDpr;uniform float uK;
uniform vec3 uTL,uTR,uHL,uHR;uniform vec2 uNt;
`;
const GLSL_WORLD_V=`
attribute vec3 aCol;attribute vec3 aFx;attribute vec2 aOr;
uniform float uWind;uniform float uT;
varying vec3 vC;varying vec3 vFx;varying vec3 vW;varying vec2 vUv;varying vec2 vOr;
void main(){vec3 p=position;float sw=aFx.z;float ph=aOr.x*.7+aOr.y*.5;
  p.x+=sin(uT*1.5+ph)*.55*sw*uWind;p.z+=cos(uT*1.2+ph*1.3)*.32*sw*uWind;
  vec4 wp=modelMatrix*vec4(p,1.);vW=wp.xyz;vC=aCol;vFx=aFx;vUv=uv;vOr=aOr;
  gl_Position=projectionMatrix*viewMatrix*wp;}
`;
const GLSL_WORLD_F=GLSL_COMMON+`
uniform float uGh;uniform vec4 uSuL,uSuR,uMoL,uMoR;
varying vec3 vC;varying vec3 vFx;varying vec3 vW;varying vec2 vUv;varying vec2 vOr;
void main(){
  float s=smoothstep(-uK,uK,vW.x);vec3 tint=mix(uTL,uTR,s);float night=mix(uNt.x,uNt.y,s);
  vec3 c=vC*tint;
  /* live light: the face normal comes from screen derivatives, the sun or moon decides where light falls */
  float lk=1.-clamp(vFx.y,0.,1.);
  vec3 N=vec3(0.,1.,0.);float lit=1.,ao=1.,spc=0.,rim=0.;
#ifdef USE_DERIV
  N=normalize(cross(dFdx(vW),dFdy(vW)));
  vec3 V=normalize(cameraPosition-vW);
  float Lx=mix(mix(uSuL.x,uSuR.x,s),mix(uMoL.x,uMoR.x,s),night);
  vec3 Ls=normalize(vec3((Lx-.5)*2.6,.62,-.5));
  float nd=max(dot(N,Ls),0.);
  lit=.68+.5*nd+.16*(.5+.5*N.y);
  float aoh=mix(.66,1.,smoothstep(.45,5.5,vW.y));
  ao=mix(1.,aoh,1.-smoothstep(.25,.7,N.y));
  vec3 Hh=normalize(Ls+V);
  spc=pow(max(dot(N,Hh),0.),42.)*.2*(1.-night*.75);
  rim=pow(1.-max(dot(N,V),0.),3.)*.15;
#endif
  /* a little grain so surfaces are not flat colour */
  float nz=vnz(vW.xz*.85+vW.y*.4)*.6+vnz(vW.xz*2.7+vW.y)*.4;
  c*=.9+.2*nz;
  c=mix(c,c*lit*ao,lk);
  c+=mix(vec3(1.,.96,.84),tint,.45)*spc*lk;
  c+=tint*rim*lk*(.5+.5*(1.-night));
  if(vFx.x>.5){vec2 id=floor(vUv);vec2 f=fract(vUv);
    float m=step(.2,f.x)*step(f.x,.8)*step(.22,f.y)*step(f.y,.78)*step(.5,id.y);
    float h=hash(id+vOr*13.7);float lit2=step(.42,h);
    vec3 glass=mix(vec3(.25,.36,.5),vec3(.62,.82,.95),h)*mix(vec3(.55),tint,.9);
    c=mix(c,glass,m*.85);c+=vec3(1.,.8,.42)*m*lit2*night*1.25;}
  c+=vC*vFx.y*night*2.4+vC*vFx.y*.25;
  float ny=gl_FragCoord.y/uRes.y;vec3 hor=mix(uHL,uHR,s);
  c=mix(c,hor,smoothstep(.6,.9,ny)*.5);
  float g=dot(c,vec3(.33));c=mix(c,vec3(g),uGh*.65)*(1.-uGh*.2);
  gl_FragColor=vec4(c,1.);}
`;
const GLSL_SEA_V=`varying vec3 vW;void main(){vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const GLSL_SEA_F=GLSL_COMMON+`
uniform vec3 uSNL,uSNR,uSFL,uSFR,uZL,uZR;uniform vec4 uGL,uGR;uniform vec2 uStr;uniform float uFl;
uniform sampler2D uShore;uniform vec4 uShoreR;
varying vec3 vW;
float caus(vec2 p){float t=uT*.55;
  float a=sin(p.x*2.3+t+sin(p.y*1.9-t*.8)*1.4),b=sin(p.y*2.1-t*.9+sin(p.x*1.7+t*.6)*1.3),c=sin((p.x+p.y)*1.6+t*.7);
  float v=1.-abs(a*b*.8+c*.2);return pow(clamp(v,0.,1.),5.);}
void main(){
  vec2 fc=gl_FragCoord.xy;float ny=fc.y/uRes.y,nx=fc.x/uRes.x;
  float s=smoothstep(-uK,uK,vW.x);
  vec3 tint=mix(uTL,uTR,s),hor=mix(uHL,uHR,s),zen=mix(uZL,uZR,s);
  float night=mix(uNt.x,uNt.y,s),day=1.-night;
  vec3 near=mix(uSNL,uSNR,s),far=mix(uSFL,uSFR,s);
  float d=smoothstep(0.,.88,ny);
  vec3 c=mix(near,far,d);
  vec2 p=vW.xz;float t=uT;
  /* waves: five crossing swells give a height and a slope */
  vec2 g=vec2(0.);float ht=0.;float ph;
  ph=dot(p,vec2(.50,.24))+t*.9;   ht+=sin(ph);          g+=vec2(.50,.24)*cos(ph);
  ph=dot(p,vec2(-.33,.75))-t*.8;  ht+=.8*sin(ph);       g+=.8*vec2(-.33,.75)*cos(ph);
  ph=dot(p,vec2(.27,-1.32))+t*1.5;ht+=.45*sin(ph);      g+=.45*vec2(.27,-1.32)*cos(ph);
  ph=dot(p,vec2(-2.0,-.63))+t*2.;  ht+=.28*sin(ph);      g+=.28*vec2(-2.0,-.63)*cos(ph);
  ph=dot(p,vec2(2.26,-2.26))-t*2.6;ht+=.16*sin(ph);     g+=.16*vec2(2.26,-2.26)*cos(ph);
  float hn=ht*.37;
  vec3 N=normalize(vec3(-g.x*.2,1.,-g.y*.2));
  vec3 V=normalize(cameraPosition-vW);
  c+=hn*.07*tint;
  c*=1.+.16*(N.x-N.z);
  float pat=vnz(p*.045+vec2(3.1,1.7))*.65+vnz(p*.11+vec2(8.,2.))*.35;
  c=mix(c,c*vec3(.8,.92,1.14),pat*.7);c+=vec3(.015,.09,.09)*smoothstep(.55,.85,pat)*day*(1.-d*.5);
  /* the sky in the water */
  float fr=pow(1.-clamp(dot(N,V),0.,1.),3.);
  c=mix(c,mix(hor,zen,.4)*(.8+.2*tint),clamp(fr*.7+.05,0.,1.)*(.55+.25*d));
  /* shallows, sandy bottoms and caustics around the islands */
  vec2 su=clamp((p-uShoreR.xy)/uShoreR.zw,0.,1.);
  vec4 sh=texture2D(uShore,su);
  float sw=sh.r;float ca=caus(p*.62);
  vec3 turq=mix(vec3(.08,.66,.74),vec3(.5,.95,.86),smoothstep(.4,1.,sw))*tint;
  turq=mix(turq,vec3(.96,.88,.66)*tint,smoothstep(.8,1.,sw)*.55);
  turq+=vec3(.7,1.,.95)*ca*.26*(.35+.65*sw)*tint*(1.-night*.4);
  c=mix(c,turq,smoothstep(.015,.5,sw)*.92);
  c+=vec3(.04,.5,.58)*sw*night*(.45+.55*ca)*.75;
  /* foam: a lace line along every coast and white caps on the biggest waves */
  float fn=vnz(p*1.1+vec2(t*.22,t*.16))*.6+vnz(p*2.4-vec2(t*.3,0.))*.4;
  float foam=sh.g*smoothstep(.26,.74,fn+sh.g*.4);
  foam+=smoothstep(.6,1.,sh.g)*(.35+.25*sin(t*1.5+p.x*.35+p.y*.25));
  float caps=smoothstep(.5,.92,hn+.28*(vnz(p*.85+vec2(t*.26,-t*.18))-.5))*(1.-d*.55)*(.35+.4*day);
  vec3 fcol=mix(vec3(1.),tint*1.25,.4);
  c=mix(c,fcol,clamp(foam*.85+caps*.55,0.,1.));
  /* the sun or moon path */
  vec4 G=mix(uGL,uGR,step(.5,nx));
  vec3 gcol=mix(vec3(1.,.93,.7),vec3(.82,.9,1.),G.z);
  float colw=.07+.2*(1.-ny);float col=exp(-pow((nx-G.x)/colw,2.));
  vec3 Lw=normalize(vec3((G.x-.5)*2.4,.36,-1.));
  vec3 Rv=reflect(-Lw,N);float rv=max(dot(Rv,V),0.);
  c+=gcol*(pow(rv,70.)*3.+pow(rv,10.)*.22)*G.y*(.35+.65*col);
  vec2 cell=floor(p*1.5);float h1=hash(cell);vec2 f=fract(p*1.5)-.5;
  float tw=smoothstep(.15,1.,sin(t*(1.4+h1*3.)+h1*60.));
  float dot_=(1.-smoothstep(.18,.5,length(f)))*step(.8,h1)*tw;
  c+=gcol*dot_*col*G.y*1.1;
  c+=gcol*col*G.y*.08*(.6+.4*hn);
  /* night star glints on the water */
  float st=mix(uStr.x,uStr.y,s);float h2=hash(floor(p*.8)+7.7);vec2 f2=fract(p*.8)-.5;
  float tw2=.5+.5*sin(t*2.+h2*90.);
  c+=vec3(.7,.82,1.)*(1.-smoothstep(.1,.35,length(f2)))*step(.93,h2)*tw2*st*.55*(1.-d*.6);
  c+=vec3(.9,.95,1.)*uFl*.35;
  float fog=smoothstep(.5,.885,ny);c=mix(c,hor,fog*.92);
  float a=1.-smoothstep(.84,.9,ny);
  gl_FragColor=vec4(c,a);}
`;
const GLSL_SKY_V=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}`;
const GLSL_SKY_F=GLSL_COMMON+`
uniform vec3 uZL,uZR;uniform vec2 uStr;uniform float uFl;
uniform vec4 uSuL,uSuR,uMoL,uMoR,uMpL,uMpR;uniform vec3 uSuCL,uSuCR;
varying vec2 vUv;
float vn(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(hash(vec2(i,3.1)),hash(vec2(i+1.,3.1)),f);}
vec3 body(vec2 px,vec4 B,vec3 col,vec3 base){float R=B.w;vec2 cpx=vec2(B.x*uRes.x,B.y*uRes.y);float d=length(px-cpx)/uDpr;
  float disc=smoothstep(R,R-1.6,d);float glow=exp(-max(d-R,0.)/(R*1.6))*.55;
  return mix(base+col*glow*.6*B.z,col*1.15,disc*B.z);}
void main(){
  vec2 uv=vUv;vec2 px=gl_FragCoord.xy;float s=smoothstep(.47,.53,uv.x);
  vec3 zen=mix(uZL,uZR,s),hor=mix(uHL,uHR,s);vec3 tint=mix(uTL,uTR,s);
  float ny=uv.y;float g=smoothstep(.89,1.,ny);
  vec3 c=mix(hor,zen,pow(g,.7));
  float stars=mix(uStr.x,uStr.y,s);
  /* stars */
  float cs=7.*uDpr;vec2 cell=floor(px/cs);float h=hash(cell);
  if(h>.8&&ny>.885){vec2 sp=(cell+.2+.6*vec2(hash(cell+7.),hash(cell+13.)))*cs;float dd=length(px-sp)/uDpr;float r=.55+hash(cell+3.)*.9;
    float tw=.55+.45*sin(uT*(1.5+h*3.)+h*90.);c+=vec3(.85,.9,1.)*smoothstep(r,0.,dd)*tw*stars*(h>.95?1.9:1.3);}
  /* distant coast: low islets on the Maldives side, hills on the Thailand side */
  float x=uv.x;float hL=.004+.007*smoothstep(.45,.9,vn(x*38.));
  float hR=.006+.03*pow(vn(x*9.+4.)*.65+vn(x*23.)*.35,1.7);
  float hz=.893+mix(hL,hR,smoothstep(.4,.6,x));
  vec3 land=mix(vec3(.12,.34,.34),vec3(.1,.3,.3),s)*tint;
  c=mix(c,mix(land,hor,.28),smoothstep(hz+.002,hz-.002,ny)*step(.886,ny));
  /* sun and moon */
  float hf=step(.5,uv.x);vec4 Su=mix(uSuL,uSuR,hf);vec3 SuC=mix(uSuCL,uSuCR,hf);
  c=body(px,Su,SuC,c);
  vec4 Mo=mix(uMoL,uMoR,hf),Mp=mix(uMpL,uMpR,hf);
  {float R=Mo.w;vec2 cpx=vec2(Mo.x*uRes.x,Mo.y*uRes.y);vec2 q=(px-cpx)/uDpr/R;float len=length(q);
   float cr=cos(Mp.z),sr=sin(Mp.z);vec2 qq=vec2(cr*q.x+sr*q.y,-sr*q.x+cr*q.y);
   float t=sqrt(max(0.,1.-qq.y*qq.y));
   float lit=Mp.y>0.?smoothstep(-.07,.07,qq.x-Mp.x*t):smoothstep(-.07,.07,-qq.x-Mp.x*t);
   float disc=smoothstep(1.,.9,len);float halo=exp(-max(len-1.,0.)*2.2)*.5;
   vec3 lc=vec3(1.,.96,.82),dc=vec3(.2,.25,.4);
   c+=vec3(.75,.85,1.)*halo*Mo.z*.5*lit;
   c=mix(c,mix(dc,lc,lit),disc*Mo.z*mix(Mp.w,1.,lit));}
  c+=vec3(.9,.95,1.)*uFl*.5;
  gl_FragColor=vec4(c,1.);}
`;
const GLSL_HALO_F=GLSL_COMMON+`
uniform vec3 uC0,uC1;uniform float uA,uR0,uW,uRing,uTn,uPulse;
varying vec3 vW;varying vec2 vUv;
void main(){float r=length(vUv-.5)*2.;
  float disc=1.-smoothstep(uR0,1.,r);
  float ring=smoothstep(uR0-uW,uR0,r)*(1.-smoothstep(uR0,min(uR0+uW,1.),r));
  float a=mix(disc,ring,uRing)*uA*(1.+uPulse*sin(uT*3.));if(a<.003)discard;
  float s=smoothstep(-uK,uK,vW.x);vec3 tint=mix(uTL,uTR,s);
  vec3 c=mix(uC0,uC1,smoothstep(0.,1.,r));c*=mix(vec3(1.),tint,uTn);
  gl_FragColor=vec4(c,a);}
`;
const GLSL_RIB_V=`attribute float aU;varying float vU;varying vec2 vUv;void main(){vU=aU;vUv=uv;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`;
const GLSL_RIB_F=`uniform float uT;uniform vec3 uC;uniform float uF,uA;varying float vU;varying vec2 vUv;
void main(){float e=1.-abs(vUv.y*2.-1.);float a=smoothstep(0.,.5,e)*step(.42,fract(vU*uF-uT*.5))*uA;if(a<.01)discard;gl_FragColor=vec4(uC,a);}`;
const GLSL_RAIN_V=`attribute vec3 aR;uniform float uT;uniform float uH;varying float vA;varying float vX;
void main(){vec3 p=position;float sp=14.+aR.z*10.;float y=mod(p.y-uT*sp-aR.x*50.,uH);
  p.y=y+aR.y*1.8;p.x+=y*.18;vA=smoothstep(0.,6.,y)*smoothstep(uH,uH-8.,y);vX=p.x;
  gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(p,1.);}`;
const GLSL_RAIN_F=`uniform vec2 uRn;uniform vec3 uRc;uniform float uK;varying float vA;varying float vX;
void main(){float s=smoothstep(-uK,uK,vX);float r=mix(uRn.x,uRn.y,s);float a=vA*r*.55;if(a<.01)discard;gl_FragColor=vec4(uRc,a);}`;

/* ---- geometry builder: flat-shaded, vertex-coloured, one draw call per batch ---- */
function GB(){
  const P=[],C=[],F=[],O=[],UV=[];
  const Ld=(()=>{const l=[-.45,.8,.4],m=Math.hypot(l[0],l[1],l[2]);return l.map(v=>v/m)})();
  const shade=n=>{const d=n[0]*Ld[0]+n[1]*Ld[1]+n[2]*Ld[2];return .5+.5*Math.max(0,Math.min(1,d*.5+.5))+.04};
  const nrm=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx,l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l]};
  const V=(p,c,fx,or,uv)=>{P.push(p[0],p[1],p[2]);C.push(c[0],c[1],c[2]);F.push(fx[0],fx[1],fx[2]);O.push(or[0],or[1]);UV.push(uv[0],uv[1])};
  const A={
    tri(a,b,c,col,o){o=o||{};let n=o.n||nrm(a,b,c);if(o.up&&n[1]<0)n=[-n[0],-n[1],-n[2]];if(o.face&&n[0]*o.face[0]+n[1]*o.face[1]+n[2]*o.face[2]<0)n=[-n[0],-n[1],-n[2]];const k=o.flat?1:shade(n);
      const cols=o.cols||[col,col,col],or=o.or||[0,0],uv=o.uv||[[0,0],[1,0],[0,1]],w=o.sws||[o.sw||0,o.sw||0,o.sw||0],pts=[a,b,c];
      for(let i=0;i<3;i++){const cc=cols[i];V(pts[i],[cc[0]*k,cc[1]*k,cc[2]*k],[o.win||0,o.glow||0,w[i]],or,uv[i])}},
    quad(a,b,c,d,col,o){o=o||{};const uv=o.uv||[[0,0],[1,0],[1,1],[0,1]],cols=o.cols,sw=o.sws;
      const sub=(i,j,k)=>Object.assign({},o,{uv:[uv[i],uv[j],uv[k]],cols:cols&&[cols[i],cols[j],cols[k]],sws:sw&&[sw[i],sw[j],sw[k]]});
      A.tri(a,b,c,col,sub(0,1,2));A.tri(a,c,d,col,sub(0,2,3))},
    box(cx,by,cz,w,h,d,col,o){o=o||{};const rot=o.rot||0,cs=Math.cos(rot),sn=Math.sin(rot),hx=w/2,hz=d/2,cw=o.cw||.75,ch=o.ch||1.1;
      const pt=(x,y,z)=>[cx+x*cs+z*sn,by+y,cz-x*sn+z*cs];const win=o.win?1:0;
      const side=(p0,p1,p2,p3,n,len)=>A.quad(p0,p1,p2,p3,col,Object.assign({},o,{n,win,uv:[[0,0],[len/cw,0],[len/cw,h/ch],[0,h/ch]]}));
      side(pt(-hx,0,hz),pt(hx,0,hz),pt(hx,h,hz),pt(-hx,h,hz),[sn,0,cs],w);
      side(pt(hx,0,hz),pt(hx,0,-hz),pt(hx,h,-hz),pt(hx,h,hz),[cs,0,-sn],d);
      side(pt(hx,0,-hz),pt(-hx,0,-hz),pt(-hx,h,-hz),pt(hx,h,-hz),[-sn,0,-cs],w);
      side(pt(-hx,0,-hz),pt(-hx,0,hz),pt(-hx,h,hz),pt(-hx,h,-hz),[-cs,0,sn],d);
      A.quad(pt(-hx,h,hz),pt(hx,h,hz),pt(hx,h,-hz),pt(-hx,h,-hz),o.top||col,Object.assign({},o,{n:[0,1,0],win:0}))},
    cyl(cx,by,cz,r0,r1,h,seg,col,o){o=o||{};seg=seg||8;const top=o.top||col;
      for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832,am=(a0+a1)/2;
        const p0=[cx+Math.cos(a0)*r0,by,cz+Math.sin(a0)*r0],p1=[cx+Math.cos(a1)*r0,by,cz+Math.sin(a1)*r0],p2=[cx+Math.cos(a1)*r1,by+h,cz+Math.sin(a1)*r1],p3=[cx+Math.cos(a0)*r1,by+h,cz+Math.sin(a0)*r1];
        const slope=(r0-r1)/Math.max(h,.001),n=[Math.cos(am),slope,Math.sin(am)],l=Math.hypot(n[0],n[1],n[2]);
        A.quad(p0,p1,p2,p3,col,Object.assign({},o,{n:[n[0]/l,n[1]/l,n[2]/l],sws:o.swc?[o.swc[0],o.swc[0],o.swc[1],o.swc[1]]:undefined}));
        if(o.cap&&r1>0)A.tri([cx,by+h,cz],p3,p2,top,Object.assign({},o,{n:[0,1,0],sws:undefined,sw:0}))}},
    fan(c,ring,y,col,o){o=o||{};for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];A.tri([c[0],y,c[1]],[b[0],y,b[1]],[a[0],y,a[1]],col,Object.assign({},o,{n:[0,1,0],cols:o.ccol?[o.ccol,col,col]:undefined}))}},
    wall(ring,y0,y1,cen,col,o){o=o||{};for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1];let n=[dz,0,-dx];const l=Math.hypot(n[0],n[2])||1;n=[n[0]/l,0,n[2]/l];
      const mx=(a[0]+b[0])/2-cen[0],mz=(a[1]+b[1])/2-cen[1];if(n[0]*mx+n[2]*mz<0)n=[-n[0],0,-n[2]];
      A.quad([a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]],col,Object.assign({},o,{n}))}},
    ring2(outer,inner,y,col,o){o=o||{};for(let i=0;i<outer.length;i++){const j=(i+1)%outer.length;A.quad([outer[i][0],y,outer[i][1]],[outer[j][0],y,outer[j][1]],[inner[j][0],y,inner[j][1]],[inner[i][0],y,inner[i][1]],col,Object.assign({},o,{n:[0,1,0]}))}},
    done(T){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('aCol',new T.Float32BufferAttribute(C,3));g.setAttribute('aFx',new T.Float32BufferAttribute(F,3));g.setAttribute('aOr',new T.Float32BufferAttribute(O,2));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.computeBoundingSphere();return g},
    count(){return P.length/3}
  };
  return A}
const rgb=h=>{h=h.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]};
const lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const mul3=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
/* a wobbly outline, centre cx,cz, radius R */
function blobPoly(cx,cz,R,seed,n,ax,az,k){n=n||30;ax=ax||1;az=az||1;k=k||1;const out=[];for(let i=0;i<n;i++){const a=i/n*6.2832,r=R*k*(1+.09*Math.sin(3*a+seed)+.06*Math.sin(5*a+seed*2.3)+.035*Math.sin(2*a+seed*.7));out.push([cx+Math.cos(a)*r*ax,cz+Math.sin(a)*r*az])}return out}
/* island made of stacked slabs, outside in */
function islandGeo(b,cx,cz,R,seed,layers,ax,az){let prev=null;layers.forEach(L=>{const ring=blobPoly(cx,cz,R,seed,30,ax,az,L.k);b.wall(ring,L.y0,L.y1,[cx,cz],L.wall||L.top,{});b.fan([cx,cz],ring,L.y1,L.top,{ccol:L.ctop});prev=ring});return prev}
/* a palm: bent trunk plus fronds, all swaying */
function palmGeo(b,x,y,z,h,lean,seed,col){const rnd=(i)=>{const s=Math.sin(seed*91.7+i*17.3)*43758.5;return s-Math.floor(s)};
  const segs=6,pts=[];for(let i=0;i<=segs;i++){const t=i/segs;pts.push([x+lean*t*t*h*.55,y+h*t,z+lean*.25*t*t*h*.5])}
  const tr=rgb('#8a5a33'),tr2=rgb('#6e4527');
  for(let i=0;i<segs;i++){const r0=h*.034*(1-i/segs*.55)+.12,r1=h*.034*(1-(i+1)/segs*.55)+.12;
    for(let k=0;k<5;k++){const a0=k/5*6.2832,a1=(k+1)/5*6.2832,am=(a0+a1)/2;
      const p0=[pts[i][0]+Math.cos(a0)*r0,pts[i][1],pts[i][2]+Math.sin(a0)*r0],p1=[pts[i][0]+Math.cos(a1)*r0,pts[i][1],pts[i][2]+Math.sin(a1)*r0],p2=[pts[i+1][0]+Math.cos(a1)*r1,pts[i+1][1],pts[i+1][2]+Math.sin(a1)*r1],p3=[pts[i+1][0]+Math.cos(a0)*r1,pts[i+1][1],pts[i+1][2]+Math.sin(a0)*r1];
      b.quad(p0,p1,p2,p3,(i%2?tr:tr2),{n:[Math.cos(am),.1,Math.sin(am)],or:[x,z],sws:[i/segs,i/segs,(i+1)/segs,(i+1)/segs]})}}
  const top=pts[segs],gA=rgb('#1f8f55'),gB=rgb('#46c777'),nf=7;
  for(let f=0;f<nf;f++){const phi=f/nf*6.2832+rnd(f)*.5,len=h*(.58+rnd(f+9)*.18),dx=Math.cos(phi),dz=Math.sin(phi),px=-dz,pz=dx,n=5;
    const line=[];for(let i=0;i<=n;i++){const t=i/n;line.push([top[0]+dx*len*t,top[1]+len*(.42*Math.sin(Math.PI*Math.min(1,t*.95))-.45*t*t)+.1*h*.2,top[2]+dz*len*t])}
    for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,w0=len*.17*Math.sin(Math.PI*Math.pow(Math.max(.02,t0),.55)),w1=len*.17*Math.sin(Math.PI*Math.pow(Math.max(.02,t1),.55)),c0=lerp3(gA,gB,t0),c1=lerp3(gA,gB,t1);
      b.quad([line[i][0]+px*w0,line[i][1],line[i][2]+pz*w0],[line[i+1][0]+px*w1,line[i+1][1],line[i+1][2]+pz*w1],[line[i+1][0]-px*w1,line[i+1][1],line[i+1][2]-pz*w1],[line[i][0]-px*w0,line[i][1],line[i][2]-pz*w0],c0,{n:[0,1,0],up:1,cols:[c0,c1,c1,c0],or:[x,z],sws:[1,1,1,1]})}}
  b.box(top[0]-.18,top[1]-.5,top[2],.36,.36,.36,rgb('#5b3a1f'),{or:[x,z],sw:.9})}
/* a country flag as a small grid of coloured cells: Maldives for Maya, Thailand for Mari.
   o = where it is hoisted, dir = which way it flies, swk = how much the wind moves the free end */
function flagGeo(b,w,o,dir,len,hgt,swk,ph){
  const mal=w==='maya',NC=12,NR=mal?8:6,cl=len/NC,ch=hgt/NR,red=rgb(mal?'#d21034':'#a51931'),grn=rgb('#007e3a'),wht=rgb('#f4f5f8'),blu=rgb('#2c3590');
  const cres={'2,4':1,'2,5':1,'2,6':1,'3,3':1,'3,4':1,'4,3':1,'4,4':1,'5,4':1,'5,5':1,'5,6':1};
  const colAt=(r,c)=>mal?((r>=2&&r<=5&&c>=2&&c<=9)?(cres[r+','+c]?wht:grn):red):[red,wht,blu,blu,wht,red][r];
  const dl=Math.hypot(dir[0],dir[2])||1,dx=dir[0]/dl,dz=dir[2]/dl,nx=dz,nz=-dx;
  const pt=(c,rr)=>{const rip=.05*len*Math.sin(c*.95+(ph||0))*(c/NC);return [o[0]+dx*c*cl+nx*rip,o[1]+hgt-rr*ch,o[2]+dz*c*cl+nz*rip]};
  for(let r=0;r<NR;r++)for(let c=0;c<NC;c++){const w0=c/NC*swk,w1=(c+1)/NC*swk;
    b.quad(pt(c,r+1),pt(c+1,r+1),pt(c+1,r),pt(c,r),colAt(r,c),{flat:1,or:[ph||0,0],sws:[w0,w1,w1,w0]})}}

const GLSL_BEAM_V=`attribute vec3 aCol;varying vec3 vC;varying vec3 vW;void main(){vC=aCol;vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const GLSL_BEAM_F=`uniform vec2 uNt;uniform float uK;varying vec3 vC;varying vec3 vW;void main(){float s=smoothstep(-uK,uK,vW.x);float n=mix(uNt.x,uNt.y,s);gl_FragColor=vec4(vC*n*.85,1.);}`;

/* ============ 3D VOYAGE MAP: the world ============ */
function m3Aim(c,yaw,pit,tg,k){const r=M3.r*(k||1),th=M3.pitch+pit,cp=Math.cos(th),sp=Math.sin(th),tx=tg?tg.x:0,tz=tg?tg.z:0;c.position.set(tx+r*cp*Math.sin(yaw),r*sp,tz+r*cp*Math.cos(yaw));c.up.set(0,1,0);c.lookAt(tx,0,tz);c.updateProjectionMatrix();c.updateMatrixWorld(true)}
/* map percent (x,y) to a point on the sea, using the home camera so layout never moves */
function m3G0(X,Y,o){const T=M3.T,h=M3.hc,v=(o||new T.Vector3()).set(X/50-1,1-Y/50,.5).unproject(h),p=h.position;v.sub(p);const t=-p.y/v.y;return v.set(p.x+v.x*t,0,p.z+v.z*t)}
/* below the bottom edge the map keeps going south at the bottom edge's scale */
function m3G(X,Y,o){if(Y<=100)return m3G0(X,Y,o);const v=m3G0(X,100,o);if(M3.dzB==null){const a=m3G0(50,100).z,b=m3G0(50,99).z;M3.dzB=a-b}return v.set(v.x,0,v.z+M3.dzB*(Y-100))}
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
  Object.assign(M3,{R,sc,cam,hc,cv});rtBuild();M3.maxTex=Math.min(8192,(R.capabilities&&R.capabilities.maxTextureSize)||4096);
  m3Aim(hc,0,0);{const w=Math.abs(m3G(100,50).x-m3G(0,50).x);M3.r*=100/w}m3Aim(hc,0,0);m3Aim(cam,0,0);
  const U=m3Uniforms(T);M3.U=U;
  const DV=!!((R.capabilities&&R.capabilities.isWebGL2)||(R.extensions&&R.extensions.has&&R.extensions.has('OES_standard_derivatives')));M3.dv=DV;
  const worldMat=un=>new T.ShaderMaterial({uniforms:un,vertexShader:GLSL_WORLD_V,fragmentShader:GLSL_WORLD_F,side:T.DoubleSide,extensions:{derivatives:DV},defines:DV?{USE_DERIV:1}:{}});
  const mWorld=worldMat(U);
  M3.mWorld=mWorld;
  /* sea and sky */
  const sea=new T.Mesh(new T.PlaneGeometry(4200,6400),new T.ShaderMaterial({uniforms:U,vertexShader:GLSL_SEA_V,fragmentShader:GLSL_SEA_F,transparent:true,depthWrite:false}));
  sea.rotation.x=-Math.PI/2;sea.position.z=2400;sea.renderOrder=-5;sc.add(sea);
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
  mesh(S.done(T));
  /* lighthouse lamp glow and rotating beam */
  {const lp=M3.lh.lamp;addGlow(lp,10*M3.lh.u,0xffe9a0,1.1);
    const bg=new T.BufferGeometry(),pos=[],col=[];const L=26*M3.lh.u;[0,Math.PI].forEach(a0=>{[[-.1,0],[.1,0]].forEach(()=>{});const a1=a0-.11,a2=a0+.11;pos.push(0,0,0,Math.cos(a1)*L,0,Math.sin(a1)*L,Math.cos(a2)*L,0,Math.sin(a2)*L);col.push(1,.95,.7,0,0,0,0,0,0)});
    bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('aCol',new T.Float32BufferAttribute(col,3));
    const bm=new T.Mesh(bg,new T.ShaderMaterial({uniforms:{uNt:U.uNt,uK:U.uK},vertexShader:GLSL_BEAM_V,fragmentShader:GLSL_BEAM_F,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
    bm.position.copy(lp);bm.renderOrder=6;sc.add(bm);M3.beam=bm}
  m3AlIslands({T,halo,addIsl,sandW,sandD,grassC,mWorld,sc});
  /* ===== clouds and their shadows ===== */
  {const tex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
      [[60,80,34],[100,64,42],[152,58,46],[198,72,36],[130,86,40],[84,90,30],[178,90,30]].forEach(([px,py,r])=>{const g=x.createRadialGradient(px,py-r*.25,r*.1,px,py,r);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.62,'rgba(244,248,252,.88)');g.addColorStop(1,'rgba(228,238,248,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,6.283);x.fill()});
      const g2=x.createLinearGradient(0,62,0,120);g2.addColorStop(0,'rgba(110,130,165,0)');g2.addColorStop(1,'rgba(110,130,165,.6)');x.globalCompositeOperation='source-atop';x.fillStyle=g2;x.fillRect(0,0,256,128);return new T.CanvasTexture(c)})();
    const rn=m3Rnd(9);
    for(let i=0,NC=Math.min(PERF.lite?22:34,Math.round(18*(M3.ymax||100)/70));i<NC;i++){const left=i%2===0,X=(left?4:52)+rn()*44,Y=22+rn()*((M3.ymax||100)-14),size=(20+rn()*20),alt=10+rn()*7,th=((i%18)>>1)/9;
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
  const ribbon=(col,freq,alpha,NN)=>{const N=NN||26,g=new T.BufferGeometry(),idx=[],uv=new Float32Array((N+1)*4);for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
    for(let i=0;i<=N;i++){uv[i*4]=i/N;uv[i*4+1]=0;uv[i*4+2]=i/N;uv[i*4+3]=1}
    g.setIndex(idx);g.setAttribute('position',new T.BufferAttribute(new Float32Array((N+1)*6),3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('aU',new T.BufferAttribute(new Float32Array((N+1)*2),1));
    const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{uT:U.uT,uC:{value:V3(col)},uF:{value:freq},uA:{value:alpha}},vertexShader:GLSL_RIB_V,fragmentShader:GLSL_RIB_F,transparent:true,depthWrite:false,side:T.DoubleSide}));
    m.frustumCulled=false;m.renderOrder=-2;m.visible=false;m.userData.N=N;sc.add(m);return m};
  M3.rib={done:ribbon('#1fe0cf',.9,.8,RT.dn+2),ahead:ribbon('#ff5f7e',.9,.42,RT.dn+2),gap:ribbon('#ffbf47',1.3,.85,40)};
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
  ['al'].forEach(w=>{const un=Object.assign({},U,{uGh:{value:0}}),m=new T.Mesh(boat(w),worldMat(un));
    m.frustumCulled=false;const wk=m3WakeMake(T,U);m.add(wk.arms);m.add(wk.trail);
    sc.add(m);M3.boats[w]={mesh:m,wake:wk.arms,trail:wk.trail,wm:wk.mats,un,cx:50,cy:95,tx:50,ty:95,px:50,py:95,lean:0,ghost:true,ph:w==='maya'?0:2.1,init:false}});
  /* ===== the shore map: shallows and foam lines around every island, drawn once and read by the sea shader ===== */
  {const xs=[],zs=[];ISL.forEach(a=>{xs.push(a[0]-a[2]*3,a[0]+a[2]*3);zs.push(a[1]-a[3]*3,a[1]+a[3]*3)});
    const x0=Math.min(...xs)-4,x1=Math.max(...xs)+4,z0=Math.min(...zs)-4,z1=Math.max(...zs)+4,W=x1-x0,Hh=z1-z0,cw=512,chh=Math.max(256,Math.min(M3.maxTex,Math.round(cw*Hh/W)));
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
/* ribbons laid on the sea */
const _ra=[];function m3Ribbon(m,fn,wPct){const N=m.userData.N,pos=m.geometry.attributes.position,au=m.geometry.attributes.aU,T=M3.T;
  for(let i=0;i<=N;i++){const q=fn(i/N);(_ra[i]||(_ra[i]=new T.Vector3())).copy(m3G(q[0],q[1],M3.t1));_ra[i].w=wPct*m3W(q[0],q[1])}
  let acc=0;for(let i=0;i<=N;i++){const a=_ra[Math.max(0,i-1)],b=_ra[Math.min(N,i+1)];let dx=b.x-a.x,dz=b.z-a.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const px=-dz*_ra[i].w/2,pz=dx*_ra[i].w/2,c=_ra[i];
    if(i>0)acc+=Math.hypot(c.x-_ra[i-1].x,c.z-_ra[i-1].z);pos.setXYZ(i*2,c.x+px,.09,c.z+pz);pos.setXYZ(i*2+1,c.x-px,.09,c.z-pz);au.setX(i*2,acc);au.setX(i*2+1,acc)}
  pos.needsUpdate=true;au.needsUpdate=true}
function m3Frame(dt){const U=M3.U,T=M3.T,calm=m3Calm();M3.t+=dt;U.uT.value=M3.t;
  /* camera: spring-loaded drag plus a slow breathing sway */
  const sub=Math.max(1,Math.ceil(dt/.016));for(let i=0;i<sub;i++){const h=dt/sub;M3.vyaw+=(60*(M3.tyaw-M3.yaw)-15.5*M3.vyaw)*h;M3.yaw+=M3.vyaw*h}
  m3Pan(dt);m3Aim(M3.cam,M3.yaw+(calm?0:Math.sin(M3.t*.33)*.011),calm?0:Math.sin(M3.t*.27)*.006,M3.ctg,M3.ck);
  /* boats: they sail on their own at random speeds while their player is online */
  sailStep();m3AlBoat(dt);
  const ek=1-Math.exp(-dt*.75);
  ['al'].forEach(w=>{const b=M3.boats[w];if(!b)return;const sl=sailO(w),dx=b.tx-b.cx,dy=b.ty-b.cy,rs=typeof krHelperAt==='function'&&krHelperAt()===w,ew=rs?1-Math.exp(-dt*4.4):ek;b.cx+=dx*ew;b.cy+=dy*ew;
    b.px=b.cx+sl.ox*.45;b.py=b.cy+sl.oy*.45;
    const g=m3G(b.px,b.py,M3.t1),u=m3W(b.px,b.py),sc=u*1.4,k=sl.k,bob=Math.sin(M3.t*1.7+b.ph)*(.22+.08*Math.min(1.6,k))*sc;b.mesh.position.set(g.x,bob,g.z);b.mesh.scale.setScalar(sc*(b.ks||1));
    b.mesh.rotation.order='YXZ';b.mesh.rotation.set(Math.sin(M3.t*1.3+b.ph)*.035+k*.014*Math.sin(M3.t*3.1+b.ph),(b.hd||0)-sl.yaw*.6,(b.tilt||0)+Math.sin(M3.t*1.1+b.ph)*.05-sl.yaw*.22);
    {const kf=typeof krFx==='function'?krFx(w):null;if(kf){b.mesh.rotation.z+=kf.rz;b.mesh.rotation.x+=kf.rx;b.mesh.position.y+=kf.dy*sc}const ef=typeof ecoFx==='function'?ecoFx(w):null;if(ef){b.mesh.rotation.z+=ef.rz;b.mesh.position.y+=ef.dy*sc}}
    const gh=b.un.uGh.value,tg=b.ghost?1:0;b.un.uGh.value=gh+(tg-gh)*Math.min(1,dt*4);
    m3WakeSet(b,sl,m3Lit(g.x));
    b.w3=(b.w3||new T.Vector3()).copy(g)});
  m3FxStep(dt);sailTags();
  m3AlRoutes();
  /* clouds drift, shadows follow */
  const P=M3.pal||[];const cov=M3.cov||[0,0];
  M3.cl.forEach(c=>{if(!calm)c.X+=c.spd*dt*.55;if(c.X>112)c.X=-14;const s=m3Side((m3G(c.X,c.Y,M3.t1).x)),k=cov[0]+(cov[1]-cov[0])*s,amt=clamp01((k*1.15+.04-c.th)*5);
    c.u=c.u||m3W(c.X,c.Y);const g=m3G(c.X,c.Y,M3.t1),w=c.size*c.u;c.sp.position.set(g.x,c.alt+Math.sin(M3.t*.4+c.ph)*.5,g.z);c.sp.scale.set(w,w*.5,1);
    const tl=P[0]?P[0].tint:[1,1,1],tr=P[1]?P[1].tint:[1,1,1],ti=mx3(tl,tr,s),rain=P[0]?(P[0].rain+(P[1].rain-P[0].rain)*s):0,dk=1-rain*.35;
    c.sp.material.color.setRGB(Math.min(1,ti[0]*dk),Math.min(1,ti[1]*dk),Math.min(1,ti[2]*dk));const dayk=P[0]?(P[0].day+(P[1].day-P[0].day)*s):1;c.sp.material.opacity=amt*(.5+.3*dayk);c.sp.visible=amt>.01;
    c.sh.position.set(g.x+c.alt*.35,.05,g.z+c.alt*.5);c.sh.scale.set(w*.5,w*.3,1);c.sh.userData.un.uA.value=amt*.2*dayk;c.sh.visible=amt>.01&&dayk>.2});
  /* lamps, beam, lightning */
  const nl=M3.lamp||0;M3.glows.forEach(gl=>{const s=m3Side(gl.sp.position.x),n=(P[0]?P[0].night+(P[1].night-P[0].night)*s:0);gl.sp.material.opacity=Math.min(1,n*gl.k*(.85+.15*Math.sin(M3.t*5+gl.sp.position.x)))});
  M3.beam.rotation.y+=dt*.9;if(M3.rain&&M3.ctg)M3.rain.position.set(M3.ctg.x,0,M3.ctg.z);
  if((M3.world&&(M3.world.mv.wx.r>.7||M3.world.th.wx.r>.7))&&!calm){if(Math.random()<dt*.35)M3.flash=1}M3.flash=Math.max(0,(M3.flash||0)-dt*4);U.uFl.value=M3.flash;
  M3.R.render(M3.sc,M3.cam);m3Sync()}
/* HTML buttons ride on the 3D world */
function m3Reg(el,X,Y,o){if(!el)return;const T=M3.T,w=o&&o.fn?null:m3G(X,Y).clone();M3.ov.push(Object.assign({el,X,Y,w},o||{}))}
function m3Sync(){const cam=M3.cam,W=M3.cw,H=M3.ch,v=M3.t3,fw=M3.t4,bt=[];cam.getWorldDirection(fw);
  for(let i=M3.ov.length-1;i>=0;i--){const o=M3.ov[i];if(!o.el.isConnected){if(o.el.dataset&&(o.el.dataset.act==='shell'||o.el.dataset.act==='tchest'||o.el.dataset.act==='ecoit'))M3.ov.splice(i,1);continue}
    const p=o.fn?o.fn():o.w;if(!p){o.el.style.visibility='hidden';o.px=null;continue}
    v.copy(p);const dd=(v.x-cam.position.x)*fw.x+(v.y-cam.position.y)*fw.y+(v.z-cam.position.z)*fw.z;v.project(cam);
    o.behind=dd<=1;o.px=(v.x+1)/2*W+(o.dx||0);o.py=(1-v.y)/2*H+(o.dy||0);o.s=o.noscale?1:Math.max(.8,Math.min(1.1,Math.pow(M3.r*(M3.ck||1)/dd,.55)));if(o.boat)bt.push(o)}
  if(bt.length===2){const a=bt[0],b=bt[1],gap=Math.abs(a.px-b.px),need=70;if(gap<need&&Math.abs(a.py-b.py)<34){const d=(need-gap)/2,sg=a.px<=b.px?1:-1;a.px-=d*sg;b.px+=d*sg}}
  for(const o of M3.ov){if(o.px==null||!o.el.isConnected)continue;if(o.behind||o.px<-140||o.px>W+140||o.py<-140||o.py>H+140){if(!o.hid){o.hid=1;o.el.style.visibility='hidden'}continue}o.hid=0;o.el.style.visibility='';o.el.style.translate=o.px.toFixed(1)+'px '+o.py.toFixed(1)+'px';o.el.style.scale=o.s.toFixed(3)}}
function m3Resize(o){if(!M3.R)return;const r=o.getBoundingClientRect(),w=Math.max(50,Math.round(o.clientWidth||r.width)),h=Math.max(100,Math.round(o.clientHeight||r.height));M3.cw=w;M3.ch=h;{const a=w/h,hf=Math.tan(19*Math.PI/180)*(400/960);M3.cam.aspect=a;M3.cam.fov=Math.min(70,2*Math.atan(hf/a)*180/Math.PI);M3.cam.updateProjectionMatrix()}
  M3.R.setPixelRatio(Math.min(window.devicePixelRatio||1,M3.dprCap||(PERF.lite?1:(w<500?1.6:1.3))));M3.R.setSize(w,h,false);M3.U.uRes.value.set(M3.R.domElement.width,M3.R.domElement.height);M3.U.uDpr.value=M3.R.getPixelRatio()}
function m3Loop(ts){if(!M3.run)return;requestAnimationFrame(m3Loop);const oc=$('#oc');if(!oc||!oc.contains(M3.cv)||!m3Here()){M3.run=false;return}
  if(document.hidden||!M3.vis)return;const calm=m3Calm(),gap=calm?900:(PERF.lite?48:33);if(ts-M3.last<gap)return;const raw=ts-M3.last,dt=Math.min(.1,raw/1000);M3.last=ts;
  if(!calm&&!M3.q){const q=M3.q0||(M3.q0={n:0,sum:0});if(raw<400){q.n++;q.sum+=raw}if(q.n>=100){M3.q={avg:q.sum/q.n};if(q.sum/q.n>55){M3.dprCap=1;PERF.lite=true;PERF.pk=.6;const o=$('#oc');if(o)m3Resize(o)}}}
  try{m3Frame(calm?.016:dt)}catch(e){M3.run=false;try{console.warn('3D frame failed',e)}catch(_){}m3Fail()}}
function m3Mount(){const oc0=$('#oc');if(!oc0||oc0.dataset.m3)return;
  m3Load().then(ok=>{const oc=$('#oc');if(!ok){if(oc&&m3Here())m3NoGl();return}if(!oc||oc.dataset.m3||!m3Here())return;
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
function hubSky(){if(!m3Here())return;const oc=$('#oc');if(!oc)return;const W=world();
  [['mv','l'],['th','r']].forEach(([k,sd],i)=>{const r=W[k],pl=PLACES[k],el=$('.plab[data-k='+k+']',oc);
    if(el){const h='<small>'+r.clock+' · '+r.icon+' '+Math.round(r.wx.t)+'°</small>',t=pl.n;const html=t+h;if(el.dataset.h!==html){el.dataset.h=html;el.innerHTML=html}}
    const hs=$('.hs.'+sd,oc);if(hs){const sk=r.sk;$('.nt',hs).style.opacity=(sk.nightF*.62).toFixed(2);$('.dk',hs).style.opacity=(sk.duskF*(1-sk.nightF*.5)).toFixed(2);$('.stars',hs).style.opacity=sk.nightF.toFixed(2);
      const cb=$('.cb',hs);cb.textContent=sk.nightF>.4?moonEmoji(W.moon.phase):(sk.dayF>.4?'☀️':'');cb.style.opacity=sk.nightF>.4||sk.dayF>.4?'1':'0'}});
  if(oc.dataset.m3&&M3_OK())m3Apply()}

/* ============ SAILING ============
   A boat sails while its player is online: it gets under way with a splash, drifts around its patch of sea
   at its own random speed (it speeds up and slows down by itself), and leaves a V wake, ripples and bubbles.
   An offline boat sits still with no wake. Progress positions are never touched: sailing is only an offset. */
const SAIL={last:0,tagAt:0,t2:0,pair:null,pairAt:0};
const sailO=w=>SAIL[w]||(SAIL[w]={k:0,kt:0,nx:0,amp:0,ph:w==='maya'?.7:3.1,ox:0,oy:0,bx:0,vx:0,vy:0,yaw:0,on:false,was:false,burst:0,acc:0,racc:0});
const sailOn=w=>!!(S.me&&(w===S.me||(typeof onlineNow==='function'&&onlineNow())));
function sailStep(){const now=performance.now();let dt=(now-SAIL.last)/1000;if(dt<.004)return;SAIL.last=now;dt=Math.min(.1,dt);
  const calm=m3Calm(),t=now/1000;
  ['al'].forEach(w=>{const s=sailO(w),on=sailOn(w);
    if(on&&!s.was){s.kt=.9;s.nx=t+1.4;s.burst=t;try{if(S.me&&m3Here())sfx(w===S.me?'sail':'bell')}catch(e){}}
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
  if(!calm)['al'].forEach(w=>{const b=M3.boats[w],s=sailO(w);if(!b||!b.mesh)return;
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

/* ============ WORLD MAP ART: Africa and Asia, drawn once and shared by the flat map and the 3D map ============ */
/* Every point is in map percent (x 0..100 across, y 0..100 down). The sea is not drawn here: only land and shallow water. */
const WMAP={
 /* Arabia, Iran, India, Myanmar, Thailand, Indochina and south China: one mass, with the Persian Gulf cut into it */
 asia:{coast:[[-12,19.7],[-4,19.7],[2,19.5],[7,19.9],[11.5,19.5],[14.8,18.9],[17.6,18.2],[19.6,17],[19.9,16.2],[18.6,15.3],[17.4,14.4],[16.9,13.6],
  [15.2,12.6],[12.8,11.5],[10.2,10.3],[7.8,9],[5.4,7.4],[7,6.8],[9.6,8.3],[12.4,9.8],[14.8,11],[16.8,12.2],
  [18.6,12.9],[20.6,13.6],[22.8,14.1],[24.6,14.6],[26,15],[26.6,15.5],[25.7,16],[26.3,16.9],[27.6,17.3],[28.8,16.7],[29.2,17.6],[29.7,18.5],[30.6,19.5],[31.4,20.4],[32.8,21.5],[34.4,22.6],[36,23.8],[37.2,24.5],
  [38.8,23.8],[40.3,22.8],[41.8,21.6],[43.5,20.7],[45.5,19.8],[47.5,18.8],[49.8,18],[52.2,17.3],[54.2,16.6],[56.2,16.9],[58.2,16.7],[59.8,16.3],[61.2,17.2],[62.2,18.6],[63.6,19.8],[65.4,20.4],[67.4,19.8],[69.4,19.7],[70.4,20.9],[70.9,22.3],[71.3,23.5],
  [71.5,25],[72.3,26.6],[73.6,28.2],[75.4,29.9],[77.6,31.5],[79.8,32.8],[81.4,33.5],[82.4,33.3],[81.8,32.3],[80.4,31],[79,29.6],[77.6,28],[76,26.6],[74.7,25],[73.5,23.8],[72.9,22.6],[73.4,21.6],[74.4,20.9],
  [75.6,21.6],[76.7,22.2],[77.8,22.9],[79,23.4],[80.2,23.9],[81.4,24.4],[82.6,24],[83.8,23.2],[85.2,22.4],[86.8,21.7],[87.9,21.1],[88,20],[86.8,19.2],[85.4,18.4],[84.4,17.4],[85.6,16.6],[88,16],[91,15.3],[94.4,14.9],[98,14.5],[104,14],[112,13.6]],
  close:[[112,-12],[-12,-12]]},
 africa:{coast:[[-12,24.3],[-4,24.4],[2,24.4],[7,23.8],[10.4,23.1],[12.6,22.9],[13.4,23.6],[12.6,24.8],[11,26.4],[9.2,28.4],[7.8,30.6],[6.6,33],[5.8,35.6],[5.3,38.4],[5.2,41.4],[5.8,44.4],[6.6,47.4],[7.2,50.6],[7,53.8],[6,57],[4.8,60.2],[3.8,63.4],[3.2,67],[-12,67]],close:[]},
 sri:{ring:[[42,22.6],[43.6,23.1],[44.6,24.2],[45.2,25.6],[44.6,26.9],[43.2,27.6],[41.8,27.1],[41,25.8],[40.8,24.2],[41.2,23.2]]},
 soc:{ring:[[13.4,21.4],[15,20.9],[17,21],[17.4,21.8],[15.4,22.2],[13.6,22]]},
 sum:{ring:[[65.4,26.8],[67,26.9],[69,28],[71,29.6],[73,31.3],[75,33],[77,34.8],[79.2,36.5],[80.6,37.6],[79.4,38.6],[77.4,37.7],[75,36.2],[72.6,34.4],[70.2,32.6],[68,30.6],[66.2,28.8],[64.8,27.4]]},
 and1:{ring:[[61.3,20.4],[62,20.8],[62.2,22.2],[61.8,22.8],[61.2,21.6]]},
 and2:{ring:[[62.7,23.6],[63.4,23.9],[63.5,25],[62.9,24.8]]},
 and3:{ring:[[61.9,23.4],[62.3,23.6],[62.2,24.1],[61.8,23.9]]},
 lak1:{ring:[[29.1,21.8],[29.9,21.9],[29.8,22.5],[29.1,22.4]]},
 lak2:{ring:[[28.2,22.9],[28.9,22.8],[28.9,23.4],[28.2,23.4]]},
 lak3:{ring:[[30.2,23.2],[30.9,23.2],[31,23.8],[30.3,23.8]]},
 lak4:{ring:[[27.4,21.4],[28,21.3],[28.1,21.9],[27.5,21.9]]},
 sey1:{ring:[[13.2,37.2],[14.1,37.1],[14.3,37.8],[13.4,37.9]]},
 sey2:{ring:[[14.9,38.4],[15.5,38.3],[15.6,38.9],[15,38.9]]},
 /* Thailand on its own, for the coral border */
 th:{ring:[[73.2,16.9],[75.6,17.4],[77.6,17.9],[79.6,18.4],[81.4,19.3],[82,20.2],[81.2,21],[79.6,21.3],[77.8,21.5],[76.7,22.2],[75.6,21.6],[74.4,20.9],[73.4,21.6],[72.9,22.6],[73.5,23.8],[74.7,25],[76,26.6],[76.2,26.9],[72.4,26.8],[71.5,25],[71.3,23.5],[71.4,21.8],[70.4,20.3],[69.3,18.8],[69.4,17.6],[70.6,17],[72,16.8]]},
 /* the Maldives, 26 atolls shown as 11 rings, north to south: x, y, half-width, half-height */
 mv:[[30.6,25.3,1.5,.7],[30.3,26.4,1.7,.8],[29.9,27.5,1.6,.75],[30.3,28.7,2.3,1.1],[28.7,29.5,2,1],[30.3,30.3,1.3,.65],[30.1,31.2,1.4,.7],[29.9,32.1,1.4,.7],[30.1,33.1,2.4,1.1],[30,34.1,1,.5],[30.6,35,1.4,.6]]
};
const WM_ISL=['sri','soc','sum','and1','and2','and3','lak1','lak2','lak3','lak4','sey1','sey2'];
function geoSm(P,closed,k){k=k==null?1:k;const n=P.length,Q=P.map(p=>[p[0]*4,p[1]*9.6]),f=v=>Math.round(v*10)/10,at=i=>closed?Q[(i+n)%n]:Q[Math.max(0,Math.min(n-1,i))],m=closed?n:n-1;
 let d='M'+f(Q[0][0])+' '+f(Q[0][1]);
 for(let i=0;i<m;i++){const a=at(i-1),b=at(i),c=at(i+1),e=at(i+2);d+='C'+f(b[0]+(c[0]-a[0])/6*k)+' '+f(b[1]+(c[1]-a[1])/6*k)+' '+f(c[0]-(e[0]-b[0])/6*k)+' '+f(c[1]-(e[1]-b[1])/6*k)+' '+f(c[0])+' '+f(c[1])}
 return d+(closed?'Z':'')}
function geoPathD(g){if(g.ring)return geoSm(g.ring,true,.92);let d=geoSm(g.coast,false,.92);(g.close||[]).forEach(p=>{d+='L'+p[0]*4+' '+p[1]*9.6});return d+'Z'}
let WMP=null;
function geoPaths(){if(WMP)return WMP;const o={};['asia','africa','th'].concat(WM_ISL).forEach(k=>{o[k]=new Path2D(geoPathD(WMAP[k]))});return WMP=o}
const geoU=(x,y)=>[x*4,y*9.6];
/* a soft coloured blob, clipped by whatever land is active */
function geoBlob(c,x,y,rx,ry,col,a){const [X,Y]=geoU(x,y);c.save();c.translate(X,Y);c.scale(rx*4,ry*9.6);const g=c.createRadialGradient(0,0,0,0,0,1),h=col.replace('#',''),r=parseInt(h.slice(0,2),16),gg=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
 g.addColorStop(0,`rgba(${r},${gg},${b},${a})`);g.addColorStop(.62,`rgba(${r},${gg},${b},${a*.72})`);g.addColorStop(1,`rgba(${r},${gg},${b},0)`);c.fillStyle=g;c.beginPath();c.arc(0,0,1,0,6.2832);c.fill();c.restore()}
function geoPeak(c,x,y,s,snow){const [X,Y]=geoU(x,y);c.save();c.translate(X,Y);c.scale(s,s);
 c.fillStyle='rgba(30,50,40,.22)';c.beginPath();c.moveTo(-6,2);c.lineTo(2,-11);c.lineTo(8,2);c.closePath();c.fill();
 c.fillStyle=snow?'#eef4f5':'#9aa08a';c.beginPath();c.moveTo(-6,1);c.lineTo(-1,-10);c.lineTo(5,1);c.closePath();c.fill();
 c.fillStyle=snow?'#ffffff':'#c7c9ab';c.beginPath();c.moveTo(-1,-10);c.lineTo(-3.4,-4.5);c.lineTo(-1.2,-5.6);c.lineTo(.6,-4.2);c.closePath();c.fill();
 c.fillStyle='rgba(20,40,60,.28)';c.beginPath();c.moveTo(-1,-10);c.lineTo(5,1);c.lineTo(1.6,1);c.closePath();c.fill();c.restore()}
function geoRiver(c,pts,w){c.save();c.strokeStyle='#72dcee';c.lineWidth=w||1.3;c.lineCap='round';c.globalAlpha=.9;c.stroke(new Path2D(geoSm(pts,false,1)));c.restore()}
function geoTree(c,x,y,s,col){const [X,Y]=geoU(x,y);c.save();c.translate(X,Y);c.scale(s,s);c.fillStyle='rgba(20,50,30,.25)';c.beginPath();c.ellipse(0,1,4,1.6,0,0,6.3);c.fill();c.fillStyle='#6b4a2b';c.fillRect(-.6,-3,1.2,4);c.fillStyle=col||'#2f9459';c.beginPath();c.arc(0,-5,3.6,0,6.3);c.fill();c.fillStyle='rgba(255,255,255,.18)';c.beginPath();c.arc(-1,-6,1.6,0,6.3);c.fill();c.restore()}
/* the whole drawing. o.s = pixels per svg unit, o.mv = also paint the Maldives rings (the flat map does; the 3D map builds them in 3D) */
function geoPaint(c,o){o=o||{};const S=o.s||2,P=geoPaths(),all=Object.keys(P).filter(k=>k!=='th').map(k=>P[k]);
 c.save();c.scale(S,o.sy||S);c.lineJoin='round';c.lineCap='round';
 /* shallow water around every coast */
 [[46,.05],[32,.07],[21,.1],[12,.15],[6,.22]].forEach(([w,a])=>{c.lineWidth=w;c.strokeStyle=`rgba(112,240,224,${a})`;all.forEach(p=>c.stroke(p))});
 /* the cliff under the land, a beach rim, then the green */
 c.save();c.translate(0,4.5);c.fillStyle='#265a44';all.forEach(p=>c.fill(p));c.restore();
 c.lineWidth=5.4;c.strokeStyle='#f6e6b2';all.forEach(p=>c.stroke(p));
 c.fillStyle='#86c46f';all.forEach(p=>c.fill(p));
 const clip=(p,fn)=>{c.save();c.clip(p);fn();c.restore()};
 clip(P.asia,()=>{
  const B=(...a)=>geoBlob(c,...a);
  B(52,3,34,9,'#e4ecee',.96);B(44,7,24,3.5,'#cfd8d2',.7);B(86,6,14,6,'#6dba6c',.7);B(96,10,12,5,'#7fc476',.7);
  B(7,8,14,8,'#e7c98a',.96);B(13,14,9,4.2,'#ebd193',.9);B(18,8,8,5,'#d8b87a',.65);B(24,12.2,6,3.2,'#e8c98a',.9);
  B(46,12.5,14,3,'#8fcb72',.8);B(36,17.6,6,3.6,'#bccb6e',.55);B(41,18.6,3,2,'#aac56a',.5);B(30.6,19.6,1.3,5,'#2f8a5a',.8);B(52,16.2,4,1,'#4fb066',.7);
  B(63,12,4,7,'#3f9d62',.8);B(61,17,2.6,2.4,'#2f8a5a',.7);B(67,18.6,3,1.5,'#58b86d',.7);
  B(75,18.2,8,3.2,'#58b86d',.6);B(71.2,18.2,2.6,2.6,'#2f8a5a',.75);B(79.4,19.4,3.4,1.5,'#b4c86a',.55);B(84,18.8,3,3,'#3b9560',.65);B(75.5,26,2.6,3,'#2f8a5a',.7);B(79,30,3,2,'#2f8a5a',.6);B(82.5,23,2,1.2,'#58b86d',.6);
  /* mountains */
  for(let i=0;i<13;i++){const x=33+i*3.2+(i%2)*.8,y=4.6+((i*7)%5)*.7;geoPeak(c,x,y,1.05+(i%3)*.16,true)}
  [[28,7.8],[20,6.4],[9,4.6],[16,5.6]].forEach(([x,y],i)=>geoPeak(c,x,y,.9,false));
  [[31,19.2],[31.7,21],[32.7,22.4],[30.4,18]].forEach(([x,y])=>geoPeak(c,x,y,.55,false));
  [[70.2,17.2],[71,18.4],[69.8,19.6],[72.5,16.9],[62.6,15],[63.2,13.2],[85,17.6],[86,19.2]].forEach(([x,y],i)=>geoPeak(c,x,y,.7+(i%2)*.1,false));
  /* rivers */
  geoRiver(c,[[26,7],[25.4,11],[26.4,14.6]],1.2);geoRiver(c,[[42,8.5],[47,12],[51.5,14.8],[55,16.7]],1.5);geoRiver(c,[[66.2,9.5],[66.6,14],[66.4,19.9]],1.3);
  geoRiver(c,[[73.2,13],[73.6,16.6],[74.2,20.6]],1.2);geoRiver(c,[[80,8],[79.4,13.5],[80.4,18.5],[80.6,23.8]],1.4);
  /* a few trees */
  [[34.6,20.6],[39,20.4],[44.2,17.6],[48,15.4],[67.5,16.4],[73.3,18.6],[77.4,19.6],[63.4,17.8],[33.6,18.8]].forEach(([x,y],i)=>geoTree(c,x,y,.8,i%2?'#2f9459':'#3aa766'));
  /* borders */
  c.save();c.setLineDash([3,4]);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1;
  [[[24.8,14.7],[26.6,12.4],[28.6,9.8],[30,7]],[[59.6,16.3],[60.8,13.2],[61.6,10.2]],[[69,17.6],[67.8,14],[68.6,10.6]]].forEach(l=>c.stroke(new Path2D(geoSm(l,false,1))));c.restore()});
 clip(P.africa,()=>{const B=(...a)=>geoBlob(c,...a);
  B(8.5,25.5,6,2.4,'#e3c783',.95);B(6.5,29,6,5,'#cdc56c',.8);B(4,42,5,8,'#9fc063',.75);B(5,56,5,8,'#72b25c',.8);B(0,34,6,8,'#5eaa5c',.55);
  geoPeak(c,3.2,38,1.15,true);geoPeak(c,2.6,40.2,.7,false);geoPeak(c,6,48,.6,false);
  [[4,45],[3,50],[4.5,53],[2.4,56],[5.6,32],[3.8,33.5]].forEach(([x,y],i)=>geoTree(c,x,y,.85,i%2?'#4f9c4a':'#6aa84f'));
  geoRiver(c,[[-2,48],[2,50.6],[5.4,51.4]],1.1)});
 [['sum','#2f8a5a',.7],['sri','#58b86d',.6]].forEach(([k,col,a])=>clip(P[k],()=>{const r=WMAP[k].ring;let sx=0,sy=0;r.forEach(p=>{sx+=p[0];sy+=p[1]});geoBlob(c,sx/r.length,sy/r.length,k==='sum'?9:3.4,k==='sum'?3.2:3.6,col,a)}));
 clip(P.sri,()=>{geoPeak(c,42.8,25.3,.6,false);geoTree(c,42.6,24,.7);geoTree(c,43.8,25.8,.7)});
 clip(P.sum,()=>{geoPeak(c,70,31,.6,false);geoPeak(c,73.4,33.2,.6,false);geoTree(c,68,29,.7);geoTree(c,76,35.2,.7)});
 [['soc'],['and1'],['and2'],['and3'],['lak1'],['lak2'],['lak3'],['lak4'],['sey1'],['sey2']].forEach(([k])=>clip(P[k],()=>{const r=WMAP[k].ring;let sx=0,sy=0;r.forEach(p=>{sx+=p[0];sy+=p[1]});geoBlob(c,sx/r.length,sy/r.length,2.6,1.4,k.slice(0,3)==='soc'?'#d8c27c':'#3f9d62',.8)}));
 /* Thailand wears a coral border so you can find it */
 c.save();c.fillStyle='rgba(255,95,126,.15)';c.fill(P.th);c.lineWidth=5;c.strokeStyle='rgba(255,95,126,.22)';c.stroke(P.th);c.lineWidth=1.8;c.strokeStyle='#ff5f7e';c.stroke(P.th);c.restore();
 /* coast outline last, so every shore has a clean edge */
 c.lineWidth=1.5;c.strokeStyle='rgba(28,78,56,.9)';all.forEach(p=>c.stroke(p));
 if(o.mv)geoMaldives(c);
 c.restore()}
/* the Maldives: rings of sand with a turquoise lagoon inside, and green islets on the rim */
function geoMaldives(c){WMAP.mv.forEach((a,i)=>{const [X,Y]=geoU(a[0],a[1]),rx=a[2]*4,ry=a[3]*9.6;c.save();c.translate(X,Y);
  let g=c.createRadialGradient(0,0,rx*.5,0,0,rx*2.8);g.addColorStop(0,'rgba(110,244,228,.5)');g.addColorStop(.5,'rgba(70,214,214,.24)');g.addColorStop(1,'rgba(40,190,210,0)');c.fillStyle=g;c.beginPath();c.ellipse(0,0,rx*2.8,ry*2.8,0,0,6.2832);c.fill();
  c.fillStyle='#f7e4a6';c.beginPath();c.ellipse(0,0,rx*1.08,ry*1.08,0,0,6.2832);c.fill();
  g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'#7ff7ea');g.addColorStop(1,'#1aa7b5');c.fillStyle=g;c.beginPath();c.ellipse(0,0,rx*.8,ry*.74,0,0,6.2832);c.fill();
  c.fillStyle='#2fae6c';const n=Math.max(4,Math.round(rx/2.2));for(let k=0;k<n;k++){const t=k/n*6.2832+i*1.7;if(Math.sin(t*2.3+i)>.45)continue;c.beginPath();c.ellipse(Math.cos(t)*rx*.98,Math.sin(t)*ry*.98,rx*.2,ry*.22,0,0,6.2832);c.fill()}
  c.restore()})}
/* names and little pictures for the flat map. The 3D map places them the same way. */
const WM_L=[
 ['AFRICA',8.8,51,'ct'],['ARABIA',10,12.6,'ct'],['INDIA',40,14.8,'ct'],['MYANMAR',64,11.4,'ct'],['THAILAND',77,15.6,'ct'],['SRI LANKA',49.5,25.2,'sm'],['SUMATRA',73,32.8,'sm'],['MALAYSIA',87,32.5,'sm'],['CHINA',92,9,'ct'],
 ['INDIAN OCEAN',50,64,'sea'],['ARABIAN SEA',17.5,24.4,'sea'],['BAY OF<br>BENGAL',58,28.6,'sea']];
const WM_I=[['🦁',3.6,38],['🐘',3.2,55],['🐪',4.6,15.4],['🕌',15.6,16.4],['🛕',35.8,17.6],['🐅',45.3,16.1],['🛕',66.6,16.4],['🦧',69.6,31.2]];
function geoLabels(){return WM_L.map(l=>`<span class="plab gl ${l[3]}" data-x="${l[1]}" data-y="${l[2]}" style="left:${l[1]}%;top:${l[2]}%" aria-hidden="true">${l[0]}</span>`).join('')+WM_I.map(i=>`<span class="plab gic" data-x="${i[1]}" data-y="${i[2]}" style="left:${i[1]}%;top:${i[2]}%" aria-hidden="true">${i[0]}</span>`).join('')}
/* the flat map's canvas, built once and cached */
let WMCV=null;
function geoCanvas2d(){if(WMCV)return WMCV;const s=(typeof PERF!=='undefined'&&PERF.lite)?1.5:2,cv=document.createElement('canvas');cv.width=Math.round(400*s);cv.height=Math.round(960*s);geoPaint(cv.getContext('2d'),{s:s,mv:true});return WMCV=cv}
/* Bangkok in the flat map: the Grand Palace, Wat Arun's prang and a few towers */
const BKK_SVG=`<g transform="translate(298 196) scale(1.3)"><ellipse cx="0" cy="3" rx="22" ry="6" fill="#8d9a82" opacity=".85"/><ellipse cx="0" cy="2" rx="19" ry="4.6" fill="#b5bfa7"/>
 <rect x="-17" y="-20" width="4.4" height="22" fill="#cfd6da"/><rect x="-17" y="-20" width="4.4" height="3" fill="#8d969b"/><circle cx="-14.8" cy="-23" r="1.4" fill="#ff4b4b" class="gl"/>
 <rect x="-11.5" y="-13" width="4" height="15" fill="#b7c4cc"/><rect x="12" y="-11" width="4.2" height="13" fill="#d9cfc9"/><rect x="16.5" y="-7" width="3.4" height="9" fill="#a9cbe0"/>
 <g><path d="M-4.6 2L-3.2 -12 0 -24 3.2 -12 4.6 2Z" fill="#f4efe2"/><path d="M-3.2 -12L3.2 -12M-3.8 -6L3.8 -6" stroke="#d1b86a" stroke-width=".9"/><path d="M0 -24v-5" stroke="#f2c14e" stroke-width="1.1"/><path d="M-9.6 2L-8.6 -6 -6.6 -12 -4.6 -6 -3.6 2Z" fill="#f4efe2"/><path d="M3.6 2L4.6 -6 6.6 -12 8.6 -6 9.6 2Z" fill="#f4efe2"/></g>
 <path d="M7.4 2V-4L10.6 -9 13.8 -4V2Z" fill="#f2c14e"/><path d="M7 -4H14.2" stroke="#c94b2f" stroke-width="1.6"/></g>`;


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

}

/* ============ BOAT SKINS: real 3D models for the 3D map ============
   Each boat you buy is built from the same flat-shaded blocks as the starting sloop, so it really turns, rocks on the waves,
   lights its windows at night and leaves its wake and bubbles behind the stern. The pictures stay in the shop and on the flat map. */
const SK3={geo:{},mk:{},meta:{
  hb:{ks:1.0,bow:-3.4,stern:3.3},toy:{ks:1.02,bow:-4.4,stern:3.2},gal:{ks:1.08,bow:-4.4,stern:3.4},ym:{ks:1.08,bow:-4.4,stern:3.3},sy:{ks:.86,bow:-5.2,stern:3.9}}};
const sk3Ring=H=>H.concat(H.slice(1).reverse().map(p=>[-p[0],p[1]]));
/* half width of the hull outline at depth z (H runs bow to stern) */
function sk3Hw(H,z){for(let i=0;i<H.length-1;i++){const a=H[i],b=H[i+1];if(z>=a[1]&&z<=b[1]){const t=(z-a[1])/((b[1]-a[1])||1);return a[0]+(b[0]-a[0])*t}}return H[H.length-1][0]}
/* hull: rings of the same outline, scaled in width and length, one colour band between each pair, a deck on top */
function sk3Loft(b,F,cen,L,cols,deck){const R=l=>F.map(p=>[p[0]*l.kx,cen[1]+(p[1]-cen[1])*l.kz]);
  for(let i=0;i<L.length-1;i++){const A=R(L[i]),B=R(L[i+1]);
    for(let j=0;j<F.length;j++){const k=(j+1)%F.length,mx=(A[j][0]+A[k][0])/2-cen[0],mz=(A[j][1]+A[k][1])/2-cen[1];
      b.quad([A[j][0],L[i].y,A[j][1]],[A[k][0],L[i].y,A[k][1]],[B[k][0],L[i+1].y,B[k][1]],[B[j][0],L[i+1].y,B[j][1]],cols[i],{face:[mx,0,mz]})}}
  const top=L[L.length-1];if(deck)b.fan(cen,R(top),top.y,deck,{});return R(top)}
/* a square sail that billows toward the bow */
function sk3Sail(b,cx,y0,cz,w0,w1,h,bill,NU,colFn){const NV=4,pt=(u,v)=>[cx+u*(w0+(w1-w0)*v)/2,y0+h*v,cz-bill*(1-u*u)*(.35+.65*Math.sin(Math.PI*Math.min(1,v+.06)))];
  for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const u0=-1+2*i/NU,u1=-1+2*(i+1)/NU,v0=j/NV,v1=(j+1)/NV;b.quad(pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1),colFn(i,j),{flat:1,face:[0,0,-1]})}}
/* a mast with a yard across it */
function sk3Mast(b,x,y,z,h,col,yardY,yardW){b.box(x,y,z,.3,h,.3,col,{});if(yardY!=null)b.box(x,yardY,z,yardW,.15,.15,col,{})}
/* a string of lit portholes or window slabs along both sides, following the curve of the hull */
function sk3Side(b,H,kx,y,h,z0,z1,step,col,o){for(let z=z0;z<=z1-step*.5;z+=step){const zc=z+step/2,x=sk3Hw(H,zc)*kx;[-1,1].forEach(s=>b.box(s*x,y,zc,.08,h,step*.96,col,o))}}

/* ---- 1. Harbour Houseboat: a blunt teal barge with a two-storey wooden cabin, a red roof and a chimney ---- */
SK3.mk.hb=(b,w)=>{const sg=w==='maya'?-1:1,tealD=rgb('#1b6479'),teal=rgb('#2e9bb0'),teal2=rgb('#46b6c6'),or=rgb('#eca43b'),deck=rgb('#d8b47e'),cream=rgb('#f3ddb0'),cream2=rgb('#e9ce98'),roof=rgb('#d9622f'),roofD=rgb('#a8421e'),wood=rgb('#8a5530'),green=rgb('#3f9a52'),dark=rgb('#3a2210'),glow=[1,.84,.48],brick=rgb('#9a5a30');
  const H=[[0,-3.5],[.9,-3.4],[1.4,-2.7],[1.62,-1.2],[1.68,1],[1.62,2.7],[1.38,3.3]],F=sk3Ring(H),cen=[0,-.1];
  sk3Loft(b,F,cen,[{y:-.9,kx:.62,kz:.82},{y:-.3,kx:.9,kz:.94},{y:.45,kx:1,kz:1},{y:.82,kx:1.03,kz:1.015},{y:.98,kx:1.03,kz:1.015}],[tealD,teal,teal2,or],deck);
  [-1,1].forEach(s=>[-1.6,.3,2.2].forEach(z=>b.box(s*1.72,.2,z,.14,.34,.4,rgb('#2a1a0c'),{})));
  b.box(0,.98,.95,2.7,1.5,4.0,cream,{win:1,cw:.7,ch:1,top:cream2});b.box(0,2.4,.95,2.9,.14,4.2,or,{});
  b.box(0,2.52,1.15,2.2,1.2,2.8,cream,{win:1,cw:.7,ch:.9,top:cream2});
  b.box(0,3.72,1.15,2.9,.2,3.5,roof,{top:roofD});b.box(0,3.92,1.15,1.7,.18,3.1,roofD,{});
  b.cyl(.75,3.9,1.9,.26,.2,1.0,8,brick,{cap:1,top:dark});
  b.box(.8,.98,-1.9,.55,.5,.55,green,{});b.box(-.75,.98,-2.45,.46,.44,.46,green,{});b.cyl(-.85,.98,-1.55,.3,.3,.5,8,wood,{cap:1,top:rgb('#5a3a22')});
  [-1,1].forEach(s=>{for(let z=-3;z<=-.7;z+=.77)b.box(s*1.55,.98,z,.07,.46,.07,or,{});b.box(s*1.55,1.42,-1.85,.07,.07,2.4,or,{})});
  b.box(0,.98,-3.05,.1,1.2,.1,dark,{});b.box(0,2.1,-3.05,.3,.3,.3,glow,{glow:1});
  b.box(0,3.92,2.4,.1,1.8,.1,dark,{});flagGeo(b,w,[0,4.85,2.4],[sg*.5,0,.87],1.25,.84,.34,w==='maya'?0:1.7)};

/* ---- 2. Toy Corsair: a chubby cartoon pirate ship, two masts, striped sails, black flag ---- */
SK3.mk.toy=(b,w)=>{const sg=w==='maya'?-1:1,brown=rgb('#8b3d1f'),blk=rgb('#2a1d16'),cream=rgb('#f2dfb8'),rim=rgb('#c4552a'),deck=rgb('#cb9156'),dark=rgb('#3a2210'),gold=rgb('#f4c23d'),glow=[1,.84,.48],red=rgb('#e8573a'),yel=rgb('#f6c242');
  const H=[[0,-3.9],[.9,-3.5],[1.45,-2.3],[1.72,-.6],[1.75,1.4],[1.55,2.7],[1.05,3.2]],F=sk3Ring(H),cen=[0,-.3];
  sk3Loft(b,F,cen,[{y:-.95,kx:.55,kz:.8},{y:-.3,kx:.88,kz:.94},{y:.2,kx:1,kz:1},{y:.85,kx:1.03,kz:1.012},{y:1.08,kx:1.05,kz:1.02}],[brown,blk,cream,rim],deck);
  [-1,1].forEach(s=>[-1.8,-.7,.4,1.5].forEach(z=>b.box(s*1.77,.35,z,.1,.4,.4,gold,{glow:1})));
  b.box(0,1.08,2.0,2.9,1.1,1.9,cream,{top:rim});b.box(0,2.18,2.0,3.1,.14,2.1,rim,{});b.box(0,1.45,2.98,1.5,.5,.06,glow,{glow:1});
  b.box(0,1.08,-2.4,1.6,.7,1.3,cream,{top:rim});b.box(0,1.78,-2.4,1.8,.1,1.5,rim,{});
  b.box(0,1.45,-4.15,.22,.22,1.5,dark,{});b.box(0,1.4,-4.95,.5,.4,.4,gold,{});
  sk3Mast(b,0,1.08,-.3,6.0,dark,5.25,3.5);sk3Mast(b,0,1.08,-2.3,4.6,dark,4.45,2.7);
  b.cyl(0,5.45,-.3,.5,.62,.55,8,rgb('#5a3a22'),{cap:1,top:rgb('#3a2418')});b.cyl(0,4.4,-2.3,.4,.5,.5,8,rgb('#5a3a22'),{cap:1,top:rgb('#3a2418')});
  sk3Sail(b,0,2.35,-.45,3.3,3.1,2.9,.7,6,i=>i%2?yel:red);sk3Sail(b,0,2.3,-2.45,2.5,2.3,2.15,.55,5,i=>i%2?yel:red);
  /* the black flag with a skull, high on the main mast, and the sailor's own flag on the fore mast */
  {const x=0,y=7.12,z=-.3,L=1.3*sg,blk2=rgb('#15151a'),wh=rgb('#f4f4f4');b.quad([x,y,z],[x+L,y,z],[x+L,y+.85,z],[x,y+.85,z],blk2,{flat:1});
   b.box(x+L*.5,y+.32,z,.3,.3,.06,wh,{flat:1});b.quad([x+L*.18,y+.14,z+.02],[x+L*.82,y+.58,z+.02],[x+L*.82,y+.66,z+.02],[x+L*.18,y+.22,z+.02],wh,{flat:1});b.quad([x+L*.18,y+.58,z+.02],[x+L*.82,y+.14,z+.02],[x+L*.82,y+.22,z+.02],[x+L*.18,y+.66,z+.02],wh,{flat:1})}
  flagGeo(b,w,[0,4.65,-2.3],[sg*.5,0,.87],1.3,.88,.34,w==='maya'?0:1.7)};

/* ---- 3. Striped-Sail Galleon: three masts, candy-striped sails, a tall carved stern ---- */
SK3.mk.gal=(b,w)=>{const sg=w==='maya'?-1:1,woodD=rgb('#5d3a1c'),wood=rgb('#8a5a2b'),wood2=rgb('#9a6a35'),band=rgb('#4c5b6a'),gold=rgb('#d9a93f'),deck=rgb('#b78447'),dark=rgb('#2e1a0c'),glow=[1,.84,.48],red=rgb('#d9503f'),cream=rgb('#f6e6da'),tan=rgb('#c58a4a');
  const H=[[0,-4.2],[.85,-3.6],[1.4,-2.3],[1.68,-.5],[1.72,1.5],[1.55,3.0],[1.15,3.4]],F=sk3Ring(H),cen=[0,-.3];
  sk3Loft(b,F,cen,[{y:-1,kx:.52,kz:.8},{y:-.3,kx:.9,kz:.94},{y:.3,kx:1,kz:1},{y:.8,kx:1.03,kz:1.012},{y:1.15,kx:1.05,kz:1.02}],[woodD,wood,band,gold],deck);
  [-1,1].forEach(s=>[-1.5,-.5,.5,1.5].forEach(z=>b.box(s*1.72,.45,z,.1,.3,.4,dark,{})));
  b.box(0,1.15,2.1,2.9,1.5,2.0,wood2,{top:rgb('#c9a05a')});b.box(0,2.65,2.5,2.4,.9,1.4,wood,{top:rgb('#c9a05a')});b.box(0,3.55,2.5,2.6,.12,1.6,gold,{});
  b.box(0,1.9,3.1,1.4,.6,.06,glow,{glow:1});b.box(0,3.67,2.95,.1,.8,.1,dark,{});b.box(0,4.45,2.95,.3,.34,.3,glow,{glow:1});
  b.box(0,1.15,-2.9,1.9,.8,1.5,wood2,{top:rgb('#c9a05a')});b.box(0,1.62,-4.5,.22,.22,2.1,dark,{});b.box(0,1.45,-4.25,.55,.5,.5,tan,{});
  sk3Mast(b,0,1.15,-.4,7.0,dark,4.85,3.9);sk3Mast(b,0,1.15,-2.3,5.4,dark,4.3,3.1);sk3Mast(b,0,3.55,2.3,3.4,dark,5.6,2.5);
  b.box(0,6.95,-.4,2.9,.14,.14,dark,{});b.box(0,5.55,-2.3,2.2,.14,.14,dark,{});
  b.cyl(0,4.6,-.4,.5,.62,.5,8,rgb('#5a3a22'),{cap:1,top:dark});b.cyl(0,3.9,-2.3,.4,.5,.45,8,rgb('#5a3a22'),{cap:1,top:dark});
  const st=(i)=>i%2?cream:red;
  sk3Sail(b,0,2.1,-.8,3.9,3.7,2.7,.8,8,st);sk3Sail(b,0,4.95,-.7,3.0,2.8,1.95,.6,6,st);
  sk3Sail(b,0,2.0,-2.7,3.1,2.9,2.3,.6,6,st);sk3Sail(b,0,4.4,-2.6,2.3,2.1,1.15,.45,4,st);
  sk3Sail(b,0,3.95,2.0,2.3,2.1,1.65,.4,4,st);
  b.tri([0,6.55,-2.3],[sg*1.1,6.35,-1.95],[0,6.15,-2.3],red,{flat:1});b.tri([0,6.95,2.3],[sg*1.0,6.75,2.62],[0,6.55,2.3],red,{flat:1});
  flagGeo(b,w,[0,7.13,-.4],[sg*.5,0,.87],1.62,1.08,.34,w==='maya'?0:1.7)};

/* ---- 4. Modern Motor Yacht: white, low and fast, a long glass saloon and a radar arch ---- */
SK3.mk.ym=(b,w)=>{const sg=w==='maya'?-1:1,navy=rgb('#34455f'),white=rgb('#f3f6fa'),white2=rgb('#e3e9f1'),rim=rgb('#c7d0db'),teak=rgb('#c79a62'),glass=rgb('#1b3550'),grey=rgb('#8f9bab'),pad=rgb('#d9d4c8');
  const H=[[0,-4.7],[.5,-3.9],[.95,-2.5],[1.15,-.6],[1.22,1.2],[1.24,3.3]],F=sk3Ring(H),cen=[0,-.3];
  sk3Loft(b,F,cen,[{y:-.9,kx:.45,kz:.78},{y:-.05,kx:.92,kz:.96},{y:1.0,kx:1,kz:1},{y:1.14,kx:1.03,kz:1.01}],[navy,white,rim],teak);
  sk3Side(b,H,.99,.32,.42,-2.4,3.0,1.2,glass,{win:1,cw:.9,ch:.45});
  b.box(0,1.14,.9,2.1,1.1,3.7,white,{top:white2});b.box(0,1.46,.9,2.14,.56,3.1,glass,{win:1,cw:.95,ch:.56});
  b.box(0,2.24,1.4,1.64,.85,2.2,white,{top:white2});b.box(0,2.5,1.4,1.68,.4,1.6,glass,{win:1,cw:.9,ch:.4});
  b.box(0,3.09,1.4,1.9,.1,2.5,white,{});
  b.box(-.68,3.19,1.9,.09,.9,.09,grey,{});b.box(.68,3.19,1.9,.09,.9,.09,grey,{});b.box(0,4.05,1.9,1.45,.09,.09,grey,{});b.cyl(0,4.14,1.9,.3,.26,.28,8,white,{cap:1,top:white2});
  b.box(0,3.19,.7,.06,1.5,.06,grey,{});
  b.box(0,1.14,-2.2,1.3,.2,1.7,pad,{});b.box(0,1.14,-3.5,.9,.1,.5,white2,{});
  [-1,1].forEach(s=>{b.box(s*1.12,1.14,-1.0,.06,.4,.06,rim,{});b.box(s*1.12,1.14,2.9,.06,.4,.06,rim,{})});
  b.box(0,1.14,3.0,.08,1.8,.08,grey,{});flagGeo(b,w,[0,2.28,3.0],[sg*.4,0,.9],1.0,.66,.34,w==='maya'?0:1.7)};

/* ---- 5. Grand Superyacht: a long dark hull, white tiers of glass, a radar mast ---- */
SK3.mk.sy=(b,w)=>{const sg=w==='maya'?-1:1,dark=rgb('#1f2937'),white=rgb('#f1f4f8'),white2=rgb('#e2e8f0'),rim=rgb('#c8d0db'),teak=rgb('#bf9a68'),glass=rgb('#16283a'),grey=rgb('#8f9bab'),red=rgb('#d1313f');
  const H=[[0,-5.8],[.5,-4.8],[1.0,-3.2],[1.28,-1.2],[1.4,1.5],[1.4,3.9]],F=sk3Ring(H),cen=[0,-.8];
  sk3Loft(b,F,cen,[{y:-1,kx:.5,kz:.8},{y:.15,kx:.94,kz:.97},{y:1.25,kx:1,kz:1},{y:1.4,kx:1.03,kz:1.01}],[dark,white,rim],teak);
  sk3Side(b,H,.985,.55,.34,-3.9,3.6,1.25,glass,{win:1,cw:1,ch:.34});
  b.box(0,1.4,.2,2.5,1.0,7.0,white,{top:white2});b.box(0,1.74,.2,2.54,.46,6.3,glass,{win:1,cw:1,ch:.46});
  b.box(0,2.4,.9,2.1,.95,5.2,white,{top:white2});b.box(0,2.72,.9,2.14,.4,4.6,glass,{win:1,cw:1,ch:.4});
  b.box(0,3.35,1.4,1.7,.85,3.2,white,{top:white2});b.box(0,3.65,1.4,1.74,.38,2.6,glass,{win:1,cw:1,ch:.38});
  b.box(0,4.2,1.4,1.9,.1,3.4,white,{});
  b.box(0,3.35,-1.0,1.6,.8,1.8,white,{top:white2});b.box(0,3.6,-1.0,1.64,.34,1.4,glass,{win:1,cw:.9,ch:.34});b.box(0,4.15,-1.0,1.8,.1,2.0,white,{});
  b.box(0,4.3,1.0,.12,1.7,.12,grey,{});b.box(0,5.55,1.0,1.2,.08,.14,grey,{});b.box(0,5.0,1.0,.7,.07,.07,grey,{});b.cyl(0,4.25,-.3,.3,.26,.32,8,white,{cap:1,top:white2});
  b.box(0,1.4,-3.0,1.4,.14,2.2,rgb('#d9d4c8'),{});b.cyl(0,1.4,-4.1,.5,.5,.1,10,red,{cap:1,top:rgb('#c63a47')});
  [-1,1].forEach(s=>{b.box(s*1.16,1.4,-2.0,.06,.4,.06,rim,{});b.box(s*1.3,1.4,3.5,.06,.4,.06,rim,{})});
  b.box(0,1.4,3.8,.08,1.9,.08,grey,{});flagGeo(b,w,[0,2.58,3.8],[sg*.4,0,.9],1.1,.72,.34,w==='maya'?0:1.7)};

/* ---- plumbing: put the right model on the right boat ---- */
function sk3Geo(id,w){const k=id+w;if(SK3.geo[k])return SK3.geo[k];try{if(!SK3.mk[id]||typeof M3==='undefined'||!M3.T)return null;const b=GB();SK3.mk[id](b,w);return SK3.geo[k]=b.done(M3.T)}catch(e){return null}}
function sk3Apply(w,b){if(!b||!b.mesh)return;const s=typeof skinOf==='function'?skinOf(w):null,id=s?s.id:'';if((b.skid||'')===id)return;
  if(!b.geo0)b.geo0=b.mesh.geometry;
  if(id){const g=sk3Geo(id,w);if(!g)return;const m=SK3.meta[id];b.mesh.geometry=g;b.ks=m.ks;b.skb=m.bow;b.sks=m.stern}
  else{b.mesh.geometry=b.geo0;b.ks=1;b.skb=b.sks=undefined}
  b.skid=id}
function sk3All(){try{if(typeof M3!=='undefined'&&M3.boats)['al'].forEach(w=>sk3Apply(w,M3.boats[w]))}catch(e){}}
/* ---- 6. Expedition Voyager: navy hull, a helipad on the bow, decks that step down to a teak stern ---- */
SK3.mk.nv=(b,w)=>{const sg=w==='maya'?-1:1,navy=rgb('#16264a'),navy2=rgb('#22396b'),white=rgb('#f2f5f9'),white2=rgb('#e1e7ef'),rim=rgb('#c3ccd9'),teak=rgb('#c49a62'),glass=rgb('#13243a'),grey=rgb('#8f9bab'),pad=rgb('#2b6f86'),dark=rgb('#20252e'),pool=rgb('#2aa6c8');
  const H=[[0,-6.6],[.55,-5.4],[1.1,-3.6],[1.5,-1.2],[1.62,1.6],[1.6,4.5]],F=sk3Ring(H),cen=[0,-.8];
  sk3Loft(b,F,cen,[{y:-1.1,kx:.5,kz:.82},{y:.1,kx:.94,kz:.97},{y:1.35,kx:1,kz:1},{y:1.5,kx:1.03,kz:1.01}],[navy,navy2,rim],teak);
  sk3Side(b,H,.985,.62,.32,-4.6,3.9,1.3,glass,{win:1,cw:1,ch:.32});
  b.cyl(0,1.5,-3.5,1.02,1.02,.1,16,pad,{cap:1,top:rgb('#2f7d94')});
  b.box(-.32,1.61,-3.5,.1,.02,.74,white,{});b.box(.32,1.61,-3.5,.1,.02,.74,white,{});b.box(0,1.61,-3.5,.64,.02,.1,white,{});
  b.box(0,1.62,-3.5,.56,.46,1.04,dark,{});b.box(0,1.75,-2.5,.14,.14,1.5,dark,{});b.box(0,2.2,-3.45,.08,.5,.08,grey,{});b.box(0,2.5,-3.45,2.7,.04,.14,grey,{});b.box(0,2.42,-2.0,.04,.4,.04,grey,{});
  b.box(0,1.5,1.0,2.7,1.0,5.6,white,{top:white2});b.box(0,1.84,1.0,2.74,.46,5.0,glass,{win:1,cw:1,ch:.46});
  b.box(0,2.5,.9,2.2,.9,3.8,white,{top:white2});b.box(0,2.8,.9,2.24,.42,3.2,glass,{win:1,cw:.9,ch:.42});b.box(0,3.4,.9,2.4,.1,4.0,white2,{});
  b.box(0,3.5,-.4,1.8,.8,2.2,white,{top:white2});b.box(0,3.78,-.4,1.84,.36,1.8,glass,{win:1,cw:.9,ch:.36});b.box(0,4.3,-.4,2.0,.1,2.4,dark,{});
  b.box(0,4.4,-.2,.12,1.7,.12,grey,{});b.box(0,5.5,-.2,1.2,.08,.14,grey,{});b.box(0,5.0,-.2,.7,.07,.07,grey,{});b.cyl(0,4.4,1.1,.3,.26,.34,8,white,{cap:1,top:white2});
  b.box(0,1.5,4.0,2.1,.1,1.5,teak,{});b.box(0,1.58,3.9,1.1,.05,.8,pool,{});
  [-1,1].forEach(s=>{b.box(s*1.0,1.5,2.9,.06,.4,.06,rim,{});b.box(s*1.0,1.5,4.6,.06,.4,.06,rim,{})});
  b.box(0,1.5,4.6,.08,1.7,.08,grey,{});flagGeo(b,w,[0,3.0,4.6],[sg*.4,0,.9],1.1,.72,.34,w==='maya'?0:1.7)};

/* ---- 7. Sapphire Terrace: a deep blue hull under five white terraces that step up toward a radar mast ---- */
SK3.mk.sap=(b,w)=>{const sg=w==='maya'?-1:1,blue=rgb('#17378a'),blue2=rgb('#2455b0'),white=rgb('#f5f8fc'),white2=rgb('#e3e9f2'),rim=rgb('#c9d1de'),teak=rgb('#c9a06a'),glass=rgb('#122438'),grey=rgb('#8f9bab'),pool=rgb('#35c4e8'),dark=rgb('#1c2330');
  const H=[[0,-7.6],[.6,-6.3],[1.2,-4.3],[1.65,-1.8],[1.85,1.4],[1.85,5.2]],F=sk3Ring(H),cen=[0,-1];
  sk3Loft(b,F,cen,[{y:-1.3,kx:.5,kz:.84},{y:.1,kx:.95,kz:.97},{y:1.6,kx:1,kz:1},{y:1.8,kx:1.03,kz:1.01}],[blue,blue2,rim],teak);
  sk3Side(b,H,.985,.7,.36,-5.2,4.6,1.4,glass,{win:1,cw:1,ch:.36});
  const tier=(y,z,len,wd,hh)=>{b.box(0,y,z,wd,hh,len,white,{top:white2});b.box(0,y+hh*.38,z,wd+.04,hh*.45,len-.7,glass,{win:1,cw:1,ch:hh*.45});b.box(0,y+hh,z,wd+.28,.08,len+.5,white2,{})};
  tier(1.8,.9,8.2,3.4,.6);tier(2.5,1.4,6.6,2.9,.6);tier(3.2,1.9,5.2,2.4,.6);tier(3.9,2.4,3.8,1.9,.55);
  b.box(0,4.55,1.0,1.4,.65,1.9,white,{top:white2});b.box(0,4.76,1.0,1.44,.3,1.5,glass,{win:1,cw:.9,ch:.3});
  b.box(0,5.25,1.1,.12,1.5,.12,grey,{});b.box(0,6.1,1.1,1.1,.08,.14,grey,{});b.cyl(-.5,5.2,.7,.28,.24,.3,8,white,{cap:1,top:white2});b.cyl(.5,5.2,.7,.28,.24,.3,8,white,{cap:1,top:white2});
  b.box(0,1.8,4.2,2.3,.06,1.8,pool,{});b.box(0,1.8,5.5,2.8,.08,1.2,teak,{});
  [-1,1].forEach(s=>{b.box(s*1.2,1.8,4.3,.06,.4,.06,rim,{});b.box(s*1.2,1.8,2.8,.06,.4,.06,rim,{})});
  b.box(0,1.8,5.7,.08,1.9,.08,grey,{});flagGeo(b,w,[0,3.5,5.7],[sg*.4,0,.9],1.2,.78,.34,w==='maya'?0:1.7)};

/* ---- 8. Leviathan Liner: a white wall of decks with blue funnels and a rooftop water park ---- */
SK3.mk.lev=(b,w)=>{const sg=w==='maya'?-1:1,navy=rgb('#16306b'),white=rgb('#f6f8fb'),white2=rgb('#e4eaf2'),rim=rgb('#cdd5e0'),glass=rgb('#14283d'),grey=rgb('#8f9bab'),blue=rgb('#2b7bd1'),orange=rgb('#f08a24'),pool=rgb('#35c4e8'),red=rgb('#d9442f'),purple=rgb('#8a3fd1'),yel=rgb('#f2c230'),teak=rgb('#c9a06a');
  const H=[[0,-9.4],[.8,-8.0],[1.7,-5.6],[2.2,-2.4],[2.35,1.0],[2.35,6.2],[2.1,8.6]],F=sk3Ring(H),cen=[0,-.4];
  sk3Loft(b,F,cen,[{y:-1.4,kx:.55,kz:.84},{y:-.2,kx:.95,kz:.97},{y:3.4,kx:1,kz:1},{y:3.6,kx:1.015,kz:1.005}],[navy,white,rim],white2);
  [.1,.85,1.6,2.35].forEach(y=>sk3Side(b,H,.99,y,.28,-7.0,7.8,1.15,glass,{win:1,cw:1,ch:.28}));
  sk3Side(b,H,1.0,3.05,.22,-2.6,5.4,1.9,orange,{});
  b.box(0,3.6,-4.8,3.8,.6,1.8,white,{top:white2});b.box(0,3.8,-4.8,3.84,.28,1.4,glass,{win:1,cw:.9,ch:.28});
  b.box(0,3.6,1.9,4.4,1.1,9.6,white,{top:white2});b.box(0,3.95,1.9,4.44,.5,9.0,glass,{win:1,cw:1,ch:.5});
  b.box(0,4.7,2.2,3.9,1.0,7.6,white,{top:white2});b.box(0,5.0,2.2,3.94,.45,7.0,glass,{win:1,cw:1,ch:.45});
  b.box(0,5.7,2.5,3.3,.8,5.8,white,{top:white2});b.box(0,5.95,2.5,3.34,.35,5.2,glass,{win:1,cw:.9,ch:.35});
  b.cyl(-.9,6.5,-.5,.62,.52,1.5,10,blue,{cap:1,top:rgb('#4a92e6')});b.cyl(.9,6.5,-.5,.62,.52,1.5,10,blue,{cap:1,top:rgb('#4a92e6')});
  b.box(0,6.55,2.4,1.9,.06,1.5,pool,{});b.box(0,6.5,2.4,2.1,.06,1.7,yel,{});
  b.box(0,6.5,4.6,1.5,2.7,1.5,red,{top:rgb('#f26a4f')});
  const slide=(x0,y0,z0,x1,y1,z1,wd,col)=>{const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz)||1,px=-dz/l*wd/2,pz=dx/l*wd/2;b.quad([x0-px,y0,z0-pz],[x0+px,y0,z0+pz],[x1+px,y1,z1+pz],[x1-px,y1,z1-pz],col,{up:1})};
  slide(0,9.2,4.6,1.7,7.2,3.1,.5,purple);slide(1.7,7.2,3.1,.6,6.6,1.6,.5,purple);
  slide(0,9.2,4.6,-1.7,7.4,3.3,.5,yel);slide(-1.7,7.4,3.3,-.6,6.6,1.9,.5,yel);
  slide(.2,8.6,5.2,1.5,7.0,6.4,.5,blue);
  [-1,1].forEach(s=>{b.box(s*1.5,5.7,-2.0,.08,.4,3.0,rim,{});b.box(s*1.7,5.7,6.0,.06,.4,.06,rim,{})});
  b.box(0,6.5,-.2,.1,1.0,.1,grey,{});
  b.box(0,3.6,8.4,.08,2.0,.08,grey,{});flagGeo(b,w,[0,5.0,8.4],[sg*.4,0,.9],1.3,.84,.34,w==='maya'?0:1.7)};
SK3.meta.nv={ks:.86,bow:-6.2,stern:4.8};SK3.meta.sap={ks:.8,bow:-7.2,stern:5.6};SK3.meta.lev={ks:.62,bow:-9.0,stern:8.6};

const PLACES={mv:{k:'mv',n:'Maldives',city:'Malé',who:'maya',tz:'Indian/Maldives',lat:4.1755,lon:73.5093,ic:'🌴'},th:{k:'th',n:'Thailand',city:'Bangkok',who:'mari',tz:'Asia/Bangkok',lat:13.7563,lon:100.5018,ic:'🐘'}};
const GEO={now:()=>window.__now||Date.now()};
const RAD=Math.PI/180,DAYMS=864e5,J1970=2440588,J2000=2451545,OBL=RAD*23.4397;
const toDays=t=>t/DAYMS-0.5+J1970-J2000;
const rAsc=(l,b)=>Math.atan2(Math.sin(l)*Math.cos(OBL)-Math.tan(b)*Math.sin(OBL),Math.cos(l));
const decl=(l,b)=>Math.asin(Math.sin(b)*Math.cos(OBL)+Math.cos(b)*Math.sin(OBL)*Math.sin(l));
function sunCoords(d){const M=RAD*(357.5291+0.98560028*d),C=RAD*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M)),L=M+C+RAD*102.9372+Math.PI;return {dec:decl(L,0),ra:rAsc(L,0)}}
function sunAlt(t,lat,lon){const d=toDays(t),c=sunCoords(d),H=RAD*(280.16+360.9856235*d)+RAD*lon-c.ra,phi=RAD*lat;return Math.asin(Math.sin(phi)*Math.sin(c.dec)+Math.cos(phi)*Math.cos(c.dec)*Math.cos(H))/RAD}
function moonIllum(t){const d=toDays(t),s=sunCoords(d),L=RAD*(218.316+13.176396*d),M=RAD*(134.963+13.064993*d),F=RAD*(93.272+13.229350*d),l=L+RAD*6.289*Math.sin(M),b=RAD*5.128*Math.sin(F),dist=385001-20905*Math.cos(M),m={ra:rAsc(l,b),dec:decl(l,b)},sd=149598000;
  const phi=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra)),inc=Math.atan2(sd*Math.sin(phi),dist-sd*Math.cos(phi)),ang=Math.atan2(Math.cos(s.dec)*Math.sin(s.ra-m.ra),Math.sin(s.dec)*Math.cos(m.dec)-Math.cos(s.dec)*Math.sin(m.dec)*Math.cos(s.ra-m.ra));
  return {frac:(1+Math.cos(inc))/2,phase:0.5+0.5*inc*(ang<0?-1:1)/Math.PI}}
const moonName=p=>p<.03||p>.97?'New moon':p<.22?'Waxing crescent':p<.28?'First quarter':p<.47?'Waxing gibbous':p<.53?'Full moon':p<.72?'Waning gibbous':p<.78?'Last quarter':'Waning crescent';
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const w01=x=>Math.max(0,Math.min(1,x));
const SEV={};function sunEvents(pl,t){const k=pl.k,c=SEV[k];if(c&&Math.abs(t-c.t)<120000)return c.v;const step=300000,v={rises:[],sets:[]};let x=t-14*36e5,prev=sunAlt(x,pl.lat,pl.lon);
  for(x+=step;x<=t+14*36e5;x+=step){const a=sunAlt(x,pl.lat,pl.lon);if(prev<-.833&&a>=-.833)v.rises.push(x-step*(a+.833)/(a-prev));else if(prev>=-.833&&a<-.833)v.sets.push(x-step*(a+.833)/(a-prev));prev=a}SEV[k]={t,v};return v}
const lastBefore=(a,t)=>a.filter(x=>x<=t).pop(),firstAfter=(a,t)=>a.find(x=>x>t);
/* sky state for one place at one moment */
function skyOf(pl,t){const alt=sunAlt(t,pl.lat,pl.lon),ev=sunEvents(pl,t),isDay=alt>-.833;let frac=.5;
  if(isDay){const r=lastBefore(ev.rises,t),s=firstAfter(ev.sets,t);if(r&&s)frac=(t-r)/(s-r)}else{const s=lastBefore(ev.sets,t),r=firstAfter(ev.rises,t);if(s&&r)frac=(t-s)/(r-s)}
  frac=w01(frac);const dayF=sm(-5,9,alt),nightF=1-sm(-15,-3,alt),duskF=Math.exp(-Math.pow(alt/6.5,2))*(1-dayF*.25);
  return {alt,isDay,frac,dayF,nightF,duskF,morning:isDay?frac<.5:frac>.5,rise:firstAfter(ev.rises,t-DAYMS/2)||0,set:firstAfter(ev.sets,t-DAYMS/2)||0,ev}}
/* clocks */
const FMT={};const fmt=(tz,o)=>{const k=tz+JSON.stringify(o);return FMT[k]||(FMT[k]=new Intl.DateTimeFormat('en-GB',Object.assign({timeZone:tz},o)))};
const wClock=(pl,t)=>fmt(pl.tz,{hour:'2-digit',minute:'2-digit',hour12:false}).format(t);
const dateOf2=(pl,t)=>fmt(pl.tz,{weekday:'short',day:'numeric',month:'short'}).format(t);
const hourOf=(pl,t)=>{const p=fmt(pl.tz,{hour:'numeric',minute:'numeric',hour12:false}).formatToParts(t),h=+p.find(x=>x.type==='hour').value%24,m=+p.find(x=>x.type==='minute').value;return h+m/60};
/* weather: reported by the owner's session when fresh, otherwise typical for the month */
const WXM={mv:{t:[27.8,28.2,28.8,29.2,28.7,28.3,28.1,28.1,28.1,28.2,28.2,28],a:1.5,c:[.35,.3,.35,.5,.65,.65,.6,.6,.6,.6,.6,.5],r:[.15,.1,.15,.3,.45,.45,.4,.4,.4,.4,.4,.3]},
 th:{t:[27.5,28.5,29.5,30.5,30,29.5,29,28.8,28.5,28.5,28,27],a:3.6,c:[.3,.3,.4,.5,.65,.7,.7,.75,.75,.65,.4,.3],r:[.05,.05,.1,.25,.5,.55,.55,.6,.65,.45,.15,.05]}};
function wxNow(pl,t){const R=CLOUD.wx&&CLOUD.wx[pl.k];if(R&&CLOUD.wx.at&&t-CLOUD.wx.at<4*36e5&&t>=CLOUD.wx.at-6e4)return {t:+R.t,c:w01(+R.c||0),r:w01(+R.r||0),txt:String(R.d||''),src:'reported',at:CLOUD.wx.at};
  const mo=new Date(t).getUTCMonth(),T=WXM[pl.k],h=hourOf(pl,t);return {t:T.t[mo]+T.a*Math.cos(2*Math.PI*(h-14)/24),c:T.c[mo],r:T.r[mo]*.6,txt:'',src:'typical',at:0}}
function wxIcon(w,sk){const night=!sk.isDay&&sk.nightF>.5;if(w.r>.7)return '⛈️';if(w.r>.45)return '🌧️';if(night)return w.c>.55?'☁️':w.c>.3?'🌥️':'🌙';return w.c<.2?'☀️':w.c<.45?'🌤️':w.c<.7?'⛅':'☁️'}
function wxWord(w,sk){if(w.txt)return w.txt;const night=!sk.isDay&&sk.nightF>.5;if(w.r>.7)return 'Storms around';if(w.r>.45)return 'Showers likely';return w.c<.2?(night?'Clear night':'Clear and sunny'):w.c<.45?(night?'Mostly clear':'Mostly sunny'):w.c<.7?'Partly cloudy':'Cloudy'}
/* one snapshot of everything, refreshed every few seconds */
let WSNAP=null;function world(force){const t=GEO.now();if(!force&&WSNAP&&Math.abs(t-WSNAP.t)<1500&&!window.__now)return WSNAP;
  const o={t,moon:moonIllum(t)};['mv','th'].forEach(k=>{const pl=PLACES[k],sk=skyOf(pl,t),w=wxNow(pl,t);o[k]={pl,sk,wx:w,clock:wClock(pl,t),date:dateOf2(pl,t),icon:wxIcon(w,sk)}});WSNAP=o;return o}



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
const TR_SVG=`<svg class="tcs" viewBox="0 0 80 72" aria-hidden="true"><ellipse cx="40" cy="66" rx="30" ry="5" fill="#000" opacity=".28"/>
 <g class="tcbody"><rect x="9" y="32" width="62" height="32" rx="5" fill="url(#trw)"/><rect x="9" y="32" width="62" height="7" fill="#000" opacity=".16"/>
  <rect x="17" y="32" width="8" height="32" fill="url(#trg)"/><rect x="55" y="32" width="8" height="32" fill="url(#trg)"/><rect x="9" y="58" width="62" height="6" rx="3" fill="url(#trg)"/>
  <g fill="#fff6c8"><circle cx="21" cy="40" r="1.6"/><circle cx="21" cy="54" r="1.6"/><circle cx="59" cy="40" r="1.6"/><circle cx="59" cy="54" r="1.6"/></g>
  <ellipse class="tcin" cx="40" cy="33" rx="29" ry="5" fill="#fff6c8" opacity="0"/></g>
 <g class="lid"><path d="M9 32V25C9 12 22 6 40 6s31 6 31 19v7z" fill="url(#trw)"/><path d="M9 32V25C9 12 22 6 40 6s31 6 31 19v7z" fill="url(#trh)"/>
  <rect x="17" y="8" width="8" height="25" fill="url(#trg)" transform="skewX(-0)"/><rect x="55" y="8" width="8" height="25" fill="url(#trg)"/>
  <path d="M9 32h62" stroke="#ffe08a" stroke-width="3"/><path d="M16 17C24 10 34 8 40 8" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>
  <rect x="33" y="27" width="14" height="13" rx="3" fill="url(#trg)" stroke="#8a5a14" stroke-width="1.2"/><circle cx="40" cy="32" r="2.2" fill="#3a2008"/><rect x="39" y="32" width="2" height="5" rx="1" fill="#3a2008"/></g></svg>`;
function trDefsOnce(){if(document.getElementById('trdefs'))return;const d=document.createElement('div');d.id='trdefs';d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML=`<svg width="0" height="0"><defs><linearGradient id="trg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".45" stop-color="#ffbf47"/><stop offset="1" stop-color="#b96e12"/></linearGradient><linearGradient id="trw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9772f"/><stop offset="1" stop-color="#6a3b12"/></linearGradient><linearGradient id="trh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs></svg>`;document.body.appendChild(d)}

/* ---- the octopus, drawn once and reused. 200 x 180 units, the boat sits at about (100,138) ---- */
function krBez(p,t){const u=1-t;return [u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0],u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1]]}
function krTent(p,w0,w1,cls){const n=18,L=[],R=[],C=[];
  for(let i=0;i<=n;i++){const t=i/n,a=krBez(p,Math.max(0,t-.01)),b=krBez(p,Math.min(1,t+.01)),c=krBez(p,t);let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    const w=(w0+(w1-w0)*Math.pow(t,.8))/2*(1+.1*Math.sin(t*9)),tip=t>.94?Math.max(.2,(1-t)/.06):1,ww=w*tip;L.push([c[0]-dy*ww,c[1]+dx*ww]);R.push([c[0]+dy*ww,c[1]-dx*ww]);C.push([c[0],c[1],w,dx,dy])}
  const pts=L.concat(R.reverse()),d='M'+pts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+'Z';
  let su='';for(let i=3;i<n-1;i+=2){const c=C[i];su+=`<circle cx="${(c[0]+c[4]*c[2]*.32).toFixed(1)}" cy="${(c[1]-c[3]*c[2]*.32).toFixed(1)}" r="${Math.max(.9,c[2]*.26).toFixed(1)}"/>`}
  return `<g class="ten ${cls}" style="transform-origin:${p[0][0]}px ${p[0][1]}px"><path d="${d}" fill="url(#krg)" stroke="#2a0508" stroke-width="1.2" stroke-linejoin="round"/><g fill="#ffc9b8" fill-opacity=".82">${su}</g></g>`}
const KRART=(()=>{
  const back=[krTent([[62,80],[22,84],[6,128],[32,168]],18,4,'t1'),krTent([[138,80],[178,84],[194,128],[168,168]],18,4,'t2'),krTent([[78,86],[38,112],[40,148],[68,174]],15,4,'t3'),krTent([[122,86],[162,112],[160,148],[132,174]],15,4,'t4')].join('');
  const front=[krTent([[70,90],[28,126],[72,178],[130,138]],19,3.5,'t5'),krTent([[130,90],[172,126],[128,178],[70,142]],19,3.5,'t1'),krTent([[86,92],[68,118],[98,114],[116,138]],14,3,'t3')].join('');
  const head=`<g class="hd"><path d="M50 72C42 30 68 4 100 4S158 30 150 72C142 92 58 92 50 72Z" fill="url(#krh)" stroke="#2a0508" stroke-width="1.6"/>
    <path d="M66 26C76 14 96 10 112 12" stroke="#fff" stroke-opacity=".28" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="#3d0509" fill-opacity=".55"><circle cx="70" cy="40" r="4"/><circle cx="84" cy="24" r="3"/><circle cx="118" cy="22" r="4.2"/><circle cx="132" cy="40" r="3.4"/><circle cx="100" cy="30" r="2.6"/><circle cx="58" cy="58" r="2.8"/><circle cx="142" cy="58" r="2.8"/></g>
    <g class="eye"><ellipse cx="78" cy="64" rx="13" ry="12" fill="#fff3b0" stroke="#2a0508" stroke-width="2"/><ellipse cx="78" cy="65" rx="8.5" ry="9.5" fill="#ffae1a"/><ellipse cx="79" cy="65" rx="3.4" ry="9" fill="#120102"/><circle cx="74" cy="60" r="2.2" fill="#fff"/></g>
    <g class="eye"><ellipse cx="122" cy="64" rx="13" ry="12" fill="#fff3b0" stroke="#2a0508" stroke-width="2"/><ellipse cx="122" cy="65" rx="8.5" ry="9.5" fill="#ffae1a"/><ellipse cx="121" cy="65" rx="3.4" ry="9" fill="#120102"/><circle cx="118" cy="60" r="2.2" fill="#fff"/></g>
    <path d="M62 50L92 62" stroke="#2a0508" stroke-width="6" stroke-linecap="round"/><path d="M138 50L108 62" stroke="#2a0508" stroke-width="6" stroke-linecap="round"/>
    <path d="M90 84Q100 94 110 84Q100 88 90 84Z" fill="#120102"/></g>`;
  const defs=`<defs><linearGradient id="krg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8222e"/><stop offset="1" stop-color="#6a0e17"/></linearGradient><radialGradient id="krh" cx=".4" cy=".25" r=".85"><stop offset="0" stop-color="#e0505a"/><stop offset=".55" stop-color="#90161f"/><stop offset="1" stop-color="#45060e"/></radialGradient></defs>`;
  return {back:`<div class="ks"><svg viewBox="0 0 200 180" aria-hidden="true">${defs}${back}${head}</svg></div>`,front:`<div class="ks"><svg viewBox="0 0 200 180" aria-hidden="true">${front}</svg></div>`}})();

/* ================================================================ THE VOYAGE SCREEN (3D) ================================================================ */
/* two clear clocks: Thailand and the Maldives, with day or night and the weather */
function m3ClockHtml(){let W=null;try{W=world()}catch(e){}const one=(k,name)=>{const r=W&&W[k],sk=r&&r.sk,night=sk&&sk.nightF>.5;return '<span class="ck '+k+(night?' night':'')+'">'+AE.voyage.flag(k)+'<span class="ckt"><b>'+(r?r.clock:'--:--')+'</b><span class="ckn">'+name+' '+(r?(night?'🌙':'☀️')+' '+Math.round(r.wx.t)+'°':'')+'</span></span></span>'};return one('th','Thailand')+one('mv','Maldives')}
setInterval(()=>{const c=document.getElementById('v3ck');if(c&&!document.hidden)c.innerHTML=m3ClockHtml()},15000);
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function m3Gl(){if(M3.st==='fail'&&Date.now()<M3.failAt)return false;if(m3Gl.v!=null)return m3Gl.v;try{const c=document.createElement('canvas');m3Gl.v=!!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))&&!!(window.CSS&&CSS.supports&&CSS.supports('translate','1px 1px'))}catch(e){m3Gl.v=false}return m3Gl.v}
/* a point beside the sailing line: d > 0 inside the U, d < 0 outside (in frame pixels) */
function rtBeside(p,d){const a=rtP(p-.06),b=rtP(p+.06),c=rtP(p);let tx=(b[0]-a[0])*PXX,ty=(b[1]-a[1])*PXY;const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;return [c[0]+(-ty)*d/PXX,c[1]+tx*d/PXY]}
const chestHtml=(cls,label,cd)=>{trDefsOnce();return `<span class="tch-rays"></span><span class="tch-in">${TR_SVG}<i class="tch-sp a">✦</i><i class="tch-sp b">✧</i><i class="tch-sp c">✦</i></span>${cd?`<span class="tch-cd">${cd}</span>`:''}`};
function spawnHtml(sp,x,y,reach,id){const k=sp.kind,g=sp.gift,gk=g&&g.kind;const pos=`data-x="${x.toFixed(2)}" data-y="${y.toFixed(2)}" data-sp="${id}" style="left:${x}%;top:${y}%"`,far=reach?'':' far';
  if(k==='sealed'||gk==='sealed')return `<button class="tchest sealed${far}" ${pos} aria-label="A sealed chest. It needs a key.">${chestHtml('','','🔒 key')}</button>`;
  if(k==='chest'||k==='golden'||gk==='golden'||(g&&gk!=='pearls'&&gk!=='shells'))return `<button class="tchest${k==='golden'||gk==='golden'?' lk':''}${g?' wel':''}${far}" ${pos} aria-label="${g?'A gift chest':'A treasure chest'}">${chestHtml('',g?'gift':'',g?'a gift':'')}</button>`;
  if(k==='log'||gk==='logs')return `<button class="shell eco lg" ${pos} aria-label="Collect a wood log">${AE.voyage.logSVG()}</button>`;
  if(k==='pearl'||k==='pearls'||gk==='pearls')return `<button class="shell eco oy${far}" ${pos} aria-label="Open an oyster">${ECO_OY_SVG}</button>`;
  if(k==='bottle')return `<button class="shell bottle${far}" ${pos} aria-label="A message in a bottle">${AE.voyage.bottleSVG()}</button>`;
  return `<button class="shell${far}" ${pos} aria-label="Collect a shell">🐚</button>`}
function crabView(st,arg){const V=AE.voyage,h=AE.h,s=V.st(st);rtBuild();const cur=V.curIndex(st),R=V.route(),N=RT.N;
  const root=h('div',{class:'screen voyage3'});root.append(V.hud(st));
  const ci=RT.main[cur],sea=V.SEAS[ci.isl.sea];
  const mus=h('button',{class:'v3-ib'+(AE.music&&AE.music.allowed()?' on':''),'aria-label':'Music',onclick:()=>{const on=AE.music.toggle();mus.classList.toggle('on',on);mus.textContent=on?'🎵':'🔇'}},AE.music&&AE.music.allowed()?'🎵':'🔇');
  root.append(h('div',{class:'v3-row'},h('button',{class:'v3-chip',onclick:()=>V.islandSheet(ci.isl)},h('span',{class:'flagc sm',html:V.flag(sea.flag)}),h('b',null,ci.isl.name),h('span',{class:'num'},'Chapter '+(cur+1)+' of '+N+' · '+sea.en)),AE.bellBtn?AE.bellBtn('v3-ib'):null,mus));
  root.append(h('div',{class:'v3-clocks',id:'v3ck',html:m3ClockHtml()}));
  const oc=document.createElement('div');oc.className='oc';oc.id='oc';oc.setAttribute('role','group');oc.setAttribute('aria-label','Voyage map from Thailand to the Maldives. Drag up and down to look along the route.');
  const SP={};let html=geoLabels()+
    `<span class="plab hw" data-x="46.5" data-y="37.6" style="left:46.5%;top:37.6%">Lighthouse</span>`+`<span class="plab hw dest" data-x="50" data-y="${(RT.yEnd+8).toFixed(2)}" style="left:50%;top:0">❤️ Addu Atoll · Maldives</span>`+
    RT.seas.map(o=>`<span class="plab gl sea v3sea" data-x="${o.x.toFixed(2)}" data-y="${o.y.toFixed(2)}" style="left:${o.x}%;top:${o.y}%">${escH(o.n)}</span>`).join('');
  const flagOf=si=>`<span class="flags"><span class="pf">${V.flag(V.SEAS[si].flag).replace('<svg ','<svg class="fl" ')}</span></span>`;
  RT.main.forEach(m=>{const c=V.chap(st,m.isl),d=c.all,open=V.islandOpen(st,m.isl),nx=m.gi===cur&&!d,ic=m.gi===N-1?'❤️':m.isl.u%3===0?'🏰':'📖',pr=c.done&&!d?' <i class="ip">'+c.done+'/'+c.total+'</i>':'';
    html+=`<button class="isl${d?' done':''}${nx?' next':''}${open?'':' lk'}${m.isl.u%3===0?' test':''}" data-k="m${m.gi}" data-x="${m.x.toFixed(2)}" data-y="${m.y.toFixed(2)}" style="left:${m.x}%;top:${m.y}%" aria-label="${escH(m.isl.name)}, chapter ${m.gi+1}${d?', finished':open?'':', locked'}"><span class="ib"><span class="sand"></span><i class="ig">${ic}</i>${d?flagOf(m.isl.sea):''}</span><span class="il">${escH(m.isl.name)}${pr}</span></button>`});
  RT.side.forEach((o,i)=>{const d=s.side[o.isl.id],open=V.islandOpen(st,o.isl);
    html+=`<button class="isl side${d?' done':''}${open?'':' lk'}" data-k="s${i}" data-x="${o.x.toFixed(2)}" data-y="${o.y.toFixed(2)}" style="left:${o.x}%;top:${o.y}%" aria-label="${escH(o.isl.name)}, side mission"><span class="ib"><span class="sand"></span><i class="ig">🧭</i></span><span class="il">${escH(o.isl.name)}</span></button>`});
  /* things on the water: between islands, plus today's tide and any gifts near the boat */
  for(let gi=-1;gi<N-1;gi++){const L2=V.spawnsFor(gi),n2=L2.length;L2.forEach((sp,j)=>{if(s.got[sp.id])return;const q=rtBeside(gi+(j+1)/(n2+1),(j%2?-1:1)*(34+sp.fx*26));SP[sp.id]=sp;html+=spawnHtml(sp,q[0],q[1],true,sp.id)})}
  {const bp=V.boatP(st);V.dailySpawns().concat(V.gifts()).forEach((sp,j)=>{if(s.got[sp.id])return;const q=rtBeside(Math.min(N-1.15,Math.max(-.85,bp+.12+j*.09)),(j%2?38:-38));SP[sp.id]=sp;html+=spawnHtml(sp,q[0],q[1],true,sp.id)})}
  html+=`<button class="boat me skn" id="bt-al" style="--c:#1fe0cf" aria-label="${escH(AE.user.name)}’s boat"><span class="nm">🐢 ${escH(AE.user.name)}<i class="kn"></i><i class="hpb${s.hull<35?' l':s.hull<70?' m':''}"><b style="width:${s.hull}%"></b></i></span></button><div class="gaplab" id="gaplab"></div>`+
    `<button class="v3-ctr" id="v3ctr" type="button">⛵ Back to my boat</button>`;
  oc.innerHTML=html;root.append(oc);
  oc.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!oc.contains(t))return;
    if(t.id==='v3ctr'){m3Follow();return}
    if(t.id==='bt-al'){V.boatSheet();return}
    if(t.dataset.sp){const sp=SP[t.dataset.sp];if(sp)V.collect(sp,t,true);return}
    const k=t.dataset.k;if(!k||!t.classList.contains('isl'))return;if(k[0]==='m')V.islandSheet(RT.main[+k.slice(1)].isl);else V.islandSheet(RT.side[+k.slice(1)].isl)});
  M3.follow=true;M3.bp=null;M3.cyT=null;M3.focusY=null;
  if(arg&&(arg.sp||arg.gi!=null)){const el=arg.sp?oc.querySelector('[data-sp="'+arg.sp+'"]'):oc.querySelector('[data-k="m'+arg.gi+'"]');if(el){M3.focusY=+el.dataset.y;el.classList.add('ping');setTimeout(()=>el.classList.remove('ping'),5000)}}
  requestAnimationFrame(()=>{const nav=document.querySelector('.nav');oc.style.bottom=(nav?nav.offsetHeight:64)+'px';m3Mount();mapCreature();hubSky();krArm()});
  AE.presence={screen:'voyage',title:'Chapter '+(cur+1)};
  return root}
AE.crab={ok:()=>m3Gl(),view:crabView,M3,RT,look:m3LookAt,follow:m3Follow};

/* ================================================================ THE CHEST OPENING (from Operation Crab) ================================================================ */
const TRV={on:false,tm:[]};let AC=null;
const trRgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
const TR_CHG=[600,800,1050,1400,1900];
function trAC(){try{const st=AE.state&&AE.state.set;if(st&&st.sfx===false)return null;AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function trTone(f,at,d,type,v,f2){const a=trAC();if(!a)return;try{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+at;o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.06,t+Math.min(.03,d/3));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.03)}catch(e){}}
function trAudioCharge(ri,ms){const d=ms/1000,k=2+ri*.45;trTone(170,0,d,'sawtooth',.026,170*k);trTone(340,0,d,'sine',.04,340*k);for(let i=0;i<Math.floor(d*7);i++)trTone(880+i*34,i/7,.05,'square',.011)}
function trAudioOpen(ri){const base=[523.25,587.33,659.25,698.46,783.99][ri],sc=[[0,4,7],[0,4,7,12],[0,4,7,12,16],[0,4,7,12,16,19,24],[0,4,7,12,16,19,24,28,31,36]][ri];
  sc.forEach((s,i)=>trTone(base*Math.pow(2,s/12),i*.075,.5+ri*.16,i%2?'triangle':'sine',.055));if(ri>=3)trTone(base/2,0,1.4,'sine',.07);trTone(1900,0,.45,'triangle',.02,3400)}
function trBurst(ri,col){let c=document.getElementById('fx');if(!c){c=document.createElement('canvas');c.id='fx';c.setAttribute('aria-hidden','true');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';document.body.appendChild(c)}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const n=Math.max(16,Math.round([34,52,84,140,230][ri]*PERF.pk)),pal=['#ffbf47','#fff3b0',col,'#ffffff',col],cx=innerWidth/2,cy=innerHeight*.38;
  const P=[...Array(n)].map((_,i)=>{const a=Math.random()*Math.PI*2,v=(i%4===0?14:6)+Math.random()*(8+ri*2.4);return {x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-5,r:2.5+Math.random()*4,c:pal[i%pal.length],l:1,s:i%3===0,rot:Math.random()*6,vr:(Math.random()-.5)*.4}});
  (function f(){x.clearRect(0,0,c.width,c.height);let alive=false;P.forEach(p=>{p.vy+=.3;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.l-=.011;if(p.l>0){alive=true;x.globalAlpha=Math.max(p.l,0);x.fillStyle=p.c;x.save();x.translate(p.x,p.y);x.rotate(p.rot);if(p.s){x.beginPath();for(let k=0;k<4;k++){x.lineTo(0,-p.r*2);x.rotate(Math.PI/4);x.lineTo(0,-p.r*.5);x.rotate(Math.PI/4)}x.fill()}else x.fillRect(-p.r/2,-p.r*.8,p.r,p.r*1.6);x.restore()}});if(alive)requestAnimationFrame(f);else x.clearRect(0,0,c.width,c.height)})()}
function trCloseNow(){TRV.tm.forEach(clearTimeout);TRV.tm=[];const o=document.getElementById('trv');if(o)o.remove();TRV.on=false}
function trCardHtml(roll,opt){const T=AE.treasure,it=roll.item,R=T.RAR[it[3]],set=T.SETS[it[4]],s=AE.voyage.st(),own=s.tre[it[0]],items=T.ITEMS.filter(i=>i[4]===it[4]),got=items.filter(i=>s.tre[i[0]]).length;
  const pips=items.map(i=>`<i class="${s.tre[i[0]]?'on':''}"></i>`).join('');
  const how=opt.gift?'🎁 A gift':opt.sealed?'🔑 Sealed chest':opt.golden?'👑 Golden chest':'';
  const setDone=roll.isNew&&got===items.length;
  return `<div class="tags"><span class="trrib">${R.n}</span>${roll.isNew?'<span class="trtag new">New!</span>':`<span class="trtag">×${own?own.n:1} owned</span>`}${how?`<span class="trtag">${how}</span>`:''}</div>
   <h3>${escH(it[2])}</h3><p class="trd">${escH(it[5])}</p>
   <div class="trm"><span>${set.ic} ${escH(set.n)} · ${got}/${items.length}</span><div class="trsetbar">${pips}</div></div>
   ${setDone?`<div class="trbanner">🏅 Set complete: ${escH(set.n)}<br><span style="color:var(--gold)">Title unlocked: ${escH(set.gt||set.title||'')}</span></div>`:''}
   <div class="row"><button class="btn mango" data-tr="close">${roll.isNew?'Wonderful!':'Nice!'}</button><button class="btn ghost" data-tr="book">🧰 Collection</button></div>`}
/* roll = {item, isNew}; opt = {golden, sealed, gift, from: a DOMRect the chest flies out of, done: called after closing} */
function trReveal(roll,opt){opt=opt||{};if(!roll||!roll.item)return;trCloseNow();trDefsOnce();
  const T=AE.treasure,it=roll.item,rk=it[3],ri=Math.max(0,T.ORDER.indexOf(rk)),R=T.RAR[rk],o=document.createElement('div');
  o.id='trv';o.className='trv r-'+rk;o.dataset.st='0';
  o.style.setProperty('--rc',R.col);o.style.setProperty('--rc2',trRgba(R.col,.32));o.style.setProperty('--rc3',trRgba(R.col,.75));o.style.setProperty('--chg',TR_CHG[ri]+'ms');
  let fx=0,fy=0,fs=.3;if(opt.from&&opt.from.width){const cx=opt.from.left+opt.from.width/2,cy=opt.from.top+opt.from.height/2;fx=cx-innerWidth/2;fy=cy-innerHeight*.38;fs=Math.max(.2,Math.min(.5,opt.from.width/200))}
  o.style.setProperty('--fx',fx+'px');o.style.setProperty('--fy',fy+'px');o.style.setProperty('--fs',fs);
  o.innerHTML=`<div class="trv-bg"></div><div class="trv-rays"></div><div class="trv-tip">${opt.gift?'A gift is on its way…':'The chest is glowing…'}</div>
   <div class="trv-stage"><div class="trv-beam"></div><div class="trv-chest">${TR_SVG}<span class="trv-orb">🔥</span></div><div class="trv-item"><div class="tr-aura"></div><div class="em">${it[1]}</div></div></div>
   <div class="trv-flash"></div><div class="trcard" role="dialog" aria-label="${escH(it[2])}">${trCardHtml(roll,opt)}</div>`;
  document.body.appendChild(o);TRV.on=true;
  try{if(roll.isNew&&AE.notify)AE.notify({quiet:1,ic:it[1],t:'New treasure: '+it[2],s:R.n+' · '+(T.SETS[it[4]]||{}).n,go:['treasure','book:'+it[0]]})}catch(e){}
  const Tm=(ms,fn)=>{TRV.tm.push(setTimeout(fn,ms))},st=n=>{if(o.isConnected)o.dataset.st=String(n)};
  const chg=TR_CHG[ri],t1=opt.from?880:380,t2=t1+chg,t3=t2+650;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{st(1);trTone(660,0,.08,'triangle',.04)}));
  Tm(t1,()=>{st(2);trAudioCharge(ri,chg);buzz([30,50,30])});
  Tm(t2,()=>{st(3);trAudioOpen(ri);trBurst(ri,R.col);buzz(ri>=3?[40,30,80,30,120]:[30,20,40])});
  Tm(t3,()=>st(4));
  const close=()=>{trCloseNow();if(opt.done)try{opt.done()}catch(e){}};
  o.addEventListener('click',e=>{const b=e.target.closest('[data-tr]');if(b){if(b.dataset.tr==='book'){close();AE.go('treasure','book:'+it[0])}else close();return}
    if(+o.dataset.st>=4)return;TRV.tm.forEach(clearTimeout);TRV.tm=[];st(3);trAudioOpen(Math.min(ri,2));TRV.tm.push(setTimeout(()=>st(4),380))})}
AE.crab.reveal=trReveal;

/* ================================================================ THE KRAKEN (art from Operation Crab) ================================================================
   Now and then, while she is on the map (never during a lesson), the Kraken rises under her boat.
   She fires the cannons by tapping the big button. Every few seconds it bites the hull.
   Win: gold, pearls, sometimes a key. Lose: the hull is torn. If the hull breaks, the boat sinks and
   the Kraken takes some gold, pearls and one treasure; fishermen tow the boat back. Wood logs repair the hull. */
const KR={on:false,phase:'',hp:0,max:0,t0:0,dur:20000,cool:0,bite:0,armT:0,tick:0,sink0:0,art:null,ui:null,fire:null,ov:null};
const krCtl=()=>(AE.voyage&&AE.voyage.ctl())||{};
function krCan(){const st=AE.state,s=AE.voyage.st(st);if(!m3Here()||AE.session||document.hidden||!M3_OK()||!M3.boats.al)return false;
  if(document.querySelector('.sheet,#trv,.pop-note'))return false;if(krCtl().krakenOff)return false;
  if(Object.keys(st.done||{}).length<2)return false;const day=AE.dkey();if(s.kr.day!==day){s.kr.day=day;s.kr.n=0}
  if(s.kr.n>=3)return false;if(Date.now()-(s.kr.last||0)<75*60e3)return false;return true}
function krArm(){clearTimeout(KR.armT);if(KR.on)return;const s=AE.voyage.st(),c=krCtl(),forced=!!(c.kraken&&c.kraken>(s.kr.seen||0));
  KR.armT=setTimeout(()=>{if(!m3Here()||KR.on)return;
    if(forced){if(AE.session||document.querySelector('.sheet,#trv')||!M3_OK()){krArm();return}s.kr.seen=c.kraken;krStart();return}
    if(krCan()&&Math.random()<.5)krStart();else krArm()},forced?5000:40000+Math.random()*110000)}
function krBoom(hit){const a=trAC();if(!a)return;try{const t=a.currentTime,n=a.createBufferSource(),len=Math.floor(a.sampleRate*.45),b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);
  n.buffer=b;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hit?900:1500;const g=a.createGain();g.gain.value=.55;n.connect(lp);lp.connect(g);g.connect(a.destination);n.start(t);trTone(75,0,.32,'sine',.3,38)}catch(e){}}
function krRoar(){trTone(110,0,1.3,'sawtooth',.05,52);trTone(82,.1,1.4,'square',.03,41);trTone(55,0,1.6,'sine',.12,30)}
function krBoatXY(){const o=M3.ov.find(x=>x.boat);return o&&o.px!=null?[o.px,o.py]:[M3.cw/2,M3.ch/2]}
function krPop(txt,cls,dx,dy){const oc=$('#oc');if(!oc)return;const p=krBoatXY(),e=document.createElement('div');e.className='kr-pop '+(cls||'');e.textContent=txt;e.style.left=(p[0]+(dx||0))+'px';e.style.top=(p[1]+(dy||-40))+'px';oc.appendChild(e);setTimeout(()=>e.remove(),1300)}
function krHull(){const s=AE.voyage.st(),b=document.querySelector('#bt-al .hpb b');if(b){b.style.width=s.hull+'%';b.parentNode.className='hpb'+(s.hull<35?' l':s.hull<70?' m':'')}}
function krStart(){const oc=$('#oc');if(!oc||!M3_OK()||KR.on)return;const st=AE.state,s=AE.voyage.st(st),cur=AE.voyage.curIndex(st);
  KR.on=true;KR.phase='fight';{const day=AE.dkey();if(s.kr.day!==day){s.kr.day=day;s.kr.n=0}}s.kr.n=(s.kr.n||0)+1;s.kr.last=Date.now();AE.saveSoon();AE.track('kraken',{r:'start'});
  KR.max=KR.hp=12+Math.min(18,cur);KR.dur=20000;KR.t0=performance.now();KR.bite=KR.t0+3500;KR.cool=0;
  m3Follow();oc.classList.add('kr-on');
  const art=document.createElement('div');art.className='krl on';art.innerHTML=KRART.back+KRART.front;oc.appendChild(art);KR.art=art;
  m3Reg(art,0,0,{noscale:1,dx:-65,dy:-92,fn:()=>{const b=M3.boats.al;return b&&b.w3}});
  const ui=document.createElement('div');ui.className='kru';ui.innerHTML='<div class="krt hot">🐙 The Kraken attacks! <b id="krtm">20</b></div><div class="krbar"><i id="krhp" style="width:100%"></i></div><div class="krs" id="krsay">Tap FIRE as fast as you can!</div>';oc.appendChild(ui);KR.ui=ui;
  m3Reg(ui,0,0,{noscale:1,dx:-90,dy:-178,fn:()=>{const b=M3.boats.al;return b&&b.w3}});
  const f=document.createElement('button');f.type='button';f.className='kr-fire';f.innerHTML='<span>🔥</span><b>FIRE!</b>';f.addEventListener('pointerdown',krFire);oc.appendChild(f);KR.fire=f;
  krRoar();buzz([60,40,60,40,120]);
  clearInterval(KR.tick);KR.tick=setInterval(krStep,120)}
function krFire(e){if(e){e.preventDefault();e.stopPropagation()}const now=performance.now();if(!KR.on||KR.phase!=='fight'||now<KR.cool)return;KR.cool=now+230;
  const oc=$('#oc'),p=krBoatXY(),fl=document.createElement('div');fl.className='kr-flash';fl.style.left=p[0]+'px';fl.style.top=(p[1]-10)+'px';oc.appendChild(fl);setTimeout(()=>fl.remove(),400);
  const hit=Math.random()<.8;krBoom(hit);buzz(hit?22:8);
  if(hit){KR.hp--;KR.art.classList.add('hit');setTimeout(()=>KR.art&&KR.art.classList.remove('hit'),130);krPop('-1','hit',(Math.random()-.5)*50,-70-Math.random()*30)}else krPop('splash!','miss',(Math.random()-.5)*70,-50);
  const hp=document.getElementById('krhp');if(hp)hp.style.width=Math.max(0,KR.hp/KR.max*100)+'%';
  if(KR.hp<=0)krEnd('win')}
function krStep(){if(!KR.on)return;if(!m3Here()){krEnd('away');return}const now=performance.now(),left=Math.max(0,KR.dur-(now-KR.t0));
  const tm=document.getElementById('krtm');if(tm)tm.textContent=Math.ceil(left/1000);
  if(KR.phase!=='fight')return;
  if(now>=KR.bite){KR.bite=now+3200;const s=AE.voyage.st();s.hull=Math.max(0,s.hull-6);krHull();KR.art.classList.add('atk');setTimeout(()=>KR.art&&KR.art.classList.remove('atk'),900);krPop('-6% hull','bite',0,-20);buzz([80,30,80]);trTone(140,0,.25,'sawtooth',.05,70);
    if(s.hull<=0){krEnd('sink');return}}
  if(left<=0)krEnd('time')}
function krClean(delay){clearInterval(KR.tick);const a=KR.art,u=KR.ui,f=KR.fire,oc=$('#oc');if(f)f.remove();setTimeout(()=>{if(a)a.remove();if(u)u.remove();if(oc)oc.classList.remove('kr-on')},delay||0);KR.art=KR.ui=KR.fire=null}
function krEnd(why){if(!KR.on)return;const st=AE.state,V=AE.voyage,s=V.st(st),cur=V.curIndex(st),say=document.getElementById('krsay'),tl=document.querySelector('.kru .krt');
  KR.phase=why;
  if(why==='win'){
    s.kr.won=(s.kr.won||0)+1;const gold=30+cur*4+Math.floor(Math.random()*25),pearls=2+Math.floor(Math.random()*3);V.addGold(gold);V.addPearls(pearls);
    let extra='';if(Math.random()<.3){s.rp.p+=1;extra+=', a pink pearl'}if(Math.random()<.12){s.keys+=1;extra+=' and a 🔑 key'}
    if(KR.art)KR.art.classList.add('flee');if(tl){tl.className='krt good';tl.innerHTML='🎉 You drove it away!'}if(say)say.textContent='+'+gold+' gold, +'+pearls+' pearls'+extra;
    trAudioOpen(3);trBurst(2,'#46e39a');AE.track('kraken',{r:'won',gold,pearls});AE.saveSoon();V.refreshHud&&V.refreshHud();
    setTimeout(()=>AE.notify({ic:'🐙',t:'You beat the Kraken!',s:'+'+gold+' gold and +'+pearls+' pearls'+extra+'.',go:['treasure','shop']}),1600);
    krClean(2300);setTimeout(()=>{KR.on=false;KR.phase='';krArm()},2400);return}
  if(why==='away'){s.hull=Math.max(1,s.hull-10);AE.saveSoon();krClean(0);KR.on=false;KR.phase='';AE.notify({quiet:1,ic:'🐙',t:'The Kraken bit your boat while you were away',s:'Hull −10%. Wood logs can fix it.',go:['boat']});return}
  if(why==='time')s.hull=Math.max(0,s.hull-20);
  if(s.hull>0){s.kr.lost=(s.kr.lost||0)+1;if(KR.art)KR.art.classList.add('flee');if(tl){tl.className='krt bad';tl.innerHTML='😣 The Kraken tore the hull'}if(say)say.textContent='Hull '+s.hull+'%. Collect wood logs to repair it.';krHull();
    AE.track('kraken',{r:'lost',hull:s.hull});AE.saveSoon();setTimeout(()=>AE.notify({ic:'🪵',t:'Your hull is at '+s.hull+'%',s:'Pick up wood logs on the sea and repair your boat.',go:['boat']}),1500);krClean(2300);setTimeout(()=>{KR.on=false;KR.phase='';krArm()},2400);return}
  /* the boat sinks */
  KR.phase='sink';KR.sink0=performance.now();s.kr.sunk=(s.kr.sunk||0)+1;
  if(KR.art)KR.art.classList.add('sink');if(tl){tl.className='krt bad';tl.innerHTML='🌊 Your boat is sinking!'}if(say)say.textContent='The Kraken pulls it under…';
  const lost=[];const g=Math.floor(s.gold*.2);if(g>0){s.gold-=g;lost.push(g+' gold')}const p=Math.floor(s.p*.25);if(p>0){s.p-=p;lost.push(p+' white pearls')}
  if(s.rp.p>0&&Math.random()<.5){s.rp.p-=1;lost.push('1 pink pearl')}
  const own=Object.keys(s.tre).filter(id=>{const it=AE.treasure.byId[id];return it&&['c','u','r'].includes(it[3])});
  if(own.length){const id=own[Math.floor(Math.random()*own.length)],it=AE.treasure.byId[id],o=s.tre[id];if(o.n>1)o.n-=1;else delete s.tre[id];lost.push(it[1]+' '+it[2])}
  s.hull=40;AE.track('kraken',{r:'sunk',lost:lost.join(', ')});AE.saveSoon();
  trTone(220,0,2.2,'sine',.08,55);buzz([200,100,300]);
  setTimeout(()=>{krClean(0);KR.on=false;KR.phase='';krHull();V.refreshHud&&V.refreshHud();
    const h=AE.h;AE.sheet(h('div',{class:'stack',style:{alignItems:'center',textAlign:'center',gap:'10px'}},h('div',{style:{fontSize:'3.4rem'}},'🌊🐙'),h('h2',null,'Your boat sank!'),
      h('p',null,'The Kraken pulled it under and took:'),h('div',{class:'kr-lost'},lost.length?lost.map(x=>h('span',null,x)):h('span',null,'nothing this time')),
      h('p',{class:'small muted'},'Friendly fishermen towed your boat back (hull 40%). Keep the hull strong with wood logs, and fire faster next time!'),
      h('button',{class:'btn mango block',onclick:()=>{document.querySelectorAll('.sheet,.veil').forEach(x=>x.remove());V.boatSheet()}},'🔨 Repair my boat')));krArm()},3600)}
/* the 3D boat shakes while it fights, and goes under when it sinks */
function krFx(w){if(!KR.on||w!=='al')return null;const t=performance.now();
  if(KR.phase==='sink'){const k=Math.min(1,(t-KR.sink0)/3200);return{rz:.5*k,rx:.2*k,dy:-3.2*k*k}}
  if(KR.phase==='fight'){const bit=t-(KR.bite-3200)<500?1:0;return{rz:Math.sin(t/45)*.05*(1+bit*2),rx:Math.sin(t/70)*.03,dy:-.05-bit*.2}}
  return null}
AE.kraken={start:()=>{if(m3Here())krStart()},fire:krFire,state:KR};


})();
