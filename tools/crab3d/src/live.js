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

