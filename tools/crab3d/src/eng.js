
/* ============ 3D VOYAGE MAP: engine, shaders, geometry builder ============ */
const M3={st:'idle',p:null,failAt:0,T:null,R:null,sc:null,cam:null,hc:null,cv:null,cw:390,ch:936,t:0,last:0,yaw:0,pit:0,tyaw:0,vyaw:0,run:false,vis:true,boats:{},isl:{},cl:[],ov:[],U:null,dragged:0,pitch:50*Math.PI/180,r:348,ro:null,io:null};
const M3_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
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