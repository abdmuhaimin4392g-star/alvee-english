
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
ACT.goctry=el=>{try{closeSheet()}catch(e){}sfx('tap');go(el.dataset.v)};