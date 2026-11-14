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
