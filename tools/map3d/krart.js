
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
