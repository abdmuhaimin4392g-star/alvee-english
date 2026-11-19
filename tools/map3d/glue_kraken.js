
/* ================================================================ THE KRAKEN ================================================================
   Now and then, while she is on the map (never during a lesson), the Kraken rises under her boat.
   She fires the cannons by tapping the big button. Every few seconds it bites the hull.
   Win: gold, pearls, sometimes a key. Lose: the hull is torn. If the hull breaks, the boat sinks and
   the Kraken takes some gold, pearls and one treasure; fishermen tow the boat back. Wood logs repair the hull. */
const KR={on:false,phase:'',hp:0,max:0,t0:0,dur:20000,cool:0,bite:0,armT:0,tick:0,sink0:0,art:null,ui:null,fire:null,ov:null};
const krCtl=()=>(AE.voyage&&AE.voyage.ctl())||{};
/* Daily attacks are earned by time on the map: 2 a day, a 3rd on very busy days (20+ minutes on the map).
   Each one comes at a random moment while she is on the map: 30 s to 4 min of map time after the last one. */
function krDay(s){const day=AE.dkey();if(s.kr.day!==day){s.kr.day=day;s.kr.n=0;s.kr.mt=0;s.kr.at=30+Math.floor(Math.random()*150)}if(s.kr.mt==null)s.kr.mt=0;if(s.kr.at==null)s.kr.at=30+Math.floor(Math.random()*150);return s.kr}
function krQuota(k){return 2+(k.mt>=1200?1:0)}
function krCan(){const st=AE.state,s=AE.voyage.st(st);if(!m3Here()||AE.session||document.hidden||!M3_OK()||!M3.boats.al)return false;
  if(document.querySelector('.sheet,#trv,.pt-ov'))return false;if(krCtl().krakenOff)return false;
  if(Object.keys(st.done||{}).length<2)return false;const k=krDay(s);
  if(k.n>=krQuota(k))return false;if(k.mt<k.at)return false;if(Date.now()-(k.last||0)<4*60e3)return false;return true}
function krArm(){clearTimeout(KR.armT);if(KR.on)return;const s=AE.voyage.st(),c=krCtl(),forced=!!(c.kraken&&c.kraken>(s.kr.seen||0));
  KR.armT=setTimeout(()=>{if(!m3Here()||KR.on)return;
    if(forced){if(AE.session||document.querySelector('.sheet,#trv,.pt-ov')||!M3_OK()){krArm();return}s.kr.seen=c.kraken;document.querySelectorAll('.pop-note').forEach(x=>x.remove());krStart();return}
    if(!document.hidden&&!AE.session){const k=krDay(s);k.mt+=5;if(k.mt%60===0)AE.saveSoon()}
    if(krCan()){const k=krDay(s);k.at=k.mt+60+Math.floor(Math.random()*180);document.querySelectorAll('.pop-note').forEach(x=>x.remove());krStart()}else krArm()},5000)}
function krBoom(hit){const a=trAC();if(!a)return;try{const t=a.currentTime,n=a.createBufferSource(),len=Math.floor(a.sampleRate*.45),b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);
  n.buffer=b;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hit?900:1500;const g=a.createGain();g.gain.value=.55;n.connect(lp);lp.connect(g);g.connect(a.destination);n.start(t);trTone(75,0,.32,'sine',.3,38)}catch(e){}}
function krRoar(){trTone(110,0,1.3,'sawtooth',.05,52);trTone(82,.1,1.4,'square',.03,41);trTone(55,0,1.6,'sine',.12,30)}
function krBoatXY(){const o=M3.ov.find(x=>x.boat);return o&&o.px!=null?[o.px,o.py]:[M3.cw/2,M3.ch/2]}
function krPop(txt,cls,dx,dy){const oc=$('#oc');if(!oc)return;const p=krBoatXY(),e=document.createElement('div');e.className='kr-pop '+(cls||'');e.textContent=txt;e.style.left=(p[0]+(dx||0))+'px';e.style.top=(p[1]+(dy||-40))+'px';oc.appendChild(e);setTimeout(()=>e.remove(),1300)}
function krHull(){const s=AE.voyage.st(),b=document.querySelector('#bt-al .hpb b');if(b){b.style.width=s.hull+'%';b.parentNode.className='hpb'+(s.hull<35?' l':s.hull<70?' m':'')}}
function krStart(){const oc=$('#oc');if(!oc||!M3_OK()||KR.on)return;const st=AE.state,s=AE.voyage.st(st),cur=AE.voyage.curIndex(st);
  KR.on=true;KR.phase='fight';krDay(s);s.kr.n=(s.kr.n||0)+1;s.kr.last=Date.now();AE.saveSoon();AE.track('kraken',{r:'start'});
  KR.max=KR.hp=12+Math.min(18,cur);KR.dur=20000;KR.t0=performance.now();KR.bite=KR.t0+3500;KR.cool=0;
  m3Follow();oc.classList.add('kr-on');
  const art=document.createElement('div');art.className='krl on';art.innerHTML=KRART.back+KRART.front;oc.appendChild(art);KR.art=art;
  m3Reg(art,0,0,{noscale:1,dx:-65,dy:-92,fn:()=>{const b=M3.boats.al;return b&&b.w3}});
  const ui=document.createElement('div');ui.className='kru fixed';ui.innerHTML='<div class="krt hot">🐙 The Kraken attacks! <b id="krtm">20</b></div><div class="krbar"><i id="krhp" style="width:100%"></i></div><div class="krs" id="krsay">Tap FIRE as fast as you can!</div>';oc.appendChild(ui);KR.ui=ui;
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
    s.kr.won=(s.kr.won||0)+1;s.kr.res='won';s.kr.end=Date.now();const gold=30+cur*4+Math.floor(Math.random()*25),pearls=2+Math.floor(Math.random()*3);V.addGold(gold);V.addPearls(pearls);
    let extra='';if(Math.random()<.3){s.rp.p+=1;extra+=', a pink pearl'}if(Math.random()<.12){s.keys+=1;extra+=' and a 🔑 key'}
    if(KR.art)KR.art.classList.add('flee');if(tl){tl.className='krt good';tl.innerHTML='🎉 You drove it away!'}if(say)say.textContent='+'+gold+' gold, +'+pearls+' pearls'+extra;
    trAudioOpen(3);trBurst(2,'#46e39a');AE.track('kraken',{r:'won',gold,pearls});AE.saveSoon();V.refreshHud&&V.refreshHud();
    setTimeout(()=>AE.notify({ic:'🐙',t:'You beat the Kraken!',s:'+'+gold+' gold and +'+pearls+' pearls'+extra+'.',go:['treasure','shop']}),1600);
    krClean(2300);setTimeout(()=>{KR.on=false;KR.phase='';krArm()},2400);return}
  if(why==='away'){s.hull=Math.max(1,s.hull-10);s.kr.res='bit';s.kr.end=Date.now();AE.saveSoon();krClean(0);KR.on=false;KR.phase='';AE.notify({quiet:1,ic:'🐙',t:'The Kraken bit your boat while you were away',s:'Hull −10%. Wood logs can fix it.',go:['boat']});return}
  if(why==='time')s.hull=Math.max(0,s.hull-20);
  if(s.hull>0){s.kr.lost=(s.kr.lost||0)+1;if(KR.art)KR.art.classList.add('flee');if(tl){tl.className='krt bad';tl.innerHTML='😣 The Kraken tore the hull'}if(say)say.textContent='Hull '+s.hull+'%. Collect wood logs to repair it.';krHull();
    s.kr.res='lost';s.kr.end=Date.now();AE.track('kraken',{r:'lost',hull:s.hull});AE.saveSoon();setTimeout(()=>AE.notify({ic:'🪵',t:'Your hull is at '+s.hull+'%',s:'Pick up wood logs on the sea and repair your boat.',go:['boat']}),1500);krClean(2300);setTimeout(()=>{KR.on=false;KR.phase='';krArm()},2400);return}
  /* the boat sinks */
  KR.phase='sink';KR.sink0=performance.now();s.kr.sunk=(s.kr.sunk||0)+1;
  if(KR.art)KR.art.classList.add('sink');if(tl){tl.className='krt bad';tl.innerHTML='🌊 Your boat is sinking!'}if(say)say.textContent='The Kraken pulls it under…';
  const lost=[];const g=Math.floor(s.gold*.2);if(g>0){s.gold-=g;lost.push(g+' gold')}const p=Math.floor(s.p*.25);if(p>0){s.p-=p;lost.push(p+' white pearls')}
  if(s.rp.p>0&&Math.random()<.5){s.rp.p-=1;lost.push('1 pink pearl')}
  const own=Object.keys(s.tre).filter(id=>{const it=AE.treasure.byId[id];return it&&['c','u','r'].includes(it[3])});
  if(own.length){const id=own[Math.floor(Math.random()*own.length)],it=AE.treasure.byId[id],o=s.tre[id];if(o.n>1)o.n-=1;else delete s.tre[id];lost.push(it[1]+' '+it[2])}
  s.hull=40;s.kr.res='sunk';s.kr.end=Date.now();AE.track('kraken',{r:'sunk',lost:lost.join(', ')});AE.saveSoon();
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
