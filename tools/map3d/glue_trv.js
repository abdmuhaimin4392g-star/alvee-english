
/* ================================================================ THE CHEST OPENING ================================================================ */
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
AE.map3d.reveal=trReveal;
