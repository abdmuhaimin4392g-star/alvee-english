
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
function sk3All(){try{if(typeof M3!=='undefined'&&M3.boats)['maya','mari'].forEach(w=>sk3Apply(w,M3.boats[w]))}catch(e){}}