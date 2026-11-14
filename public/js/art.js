/* art.js — drawn graphics: Tao the sea-turtle mascot, line icons, medals */
(function () {
  'use strict';
  const A = window.AE;
  const ART = (A.art = {});
  let uidN = 0;
  const uid = (p) => p + (++uidN);

  // ---------------------------------------------------------------- icons (24×24, line style)
  const P = {
    flame: '<path d="M12 2.5c.8 3.6 5 5.6 5 10.5a5 5 0 0 1-10 0c0-2.7 1.6-3.9 2.2-6.4 1 .9 1.8 2 2.3 3.6 1.2-2.6.8-4.9.5-7.7z"/>',
    star: '<path d="M12 2.8l2.8 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.7 3.2 1.3-6.4-4.8-4.4 6.4-.7z"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M8 7h8M8 10.5h6"/>',
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-5 4.5V15.4A2.5 2.5 0 0 1 4 13z"/><path d="M8.5 8.5h7M8.5 11.5h4"/>',
    bell: '<path d="M3.5 18.5h17"/><path d="M5.5 18.5a6.5 6.5 0 0 1 13 0"/><path d="M12 12v-.5M12 8.5V6M10 6h4"/>',
    crown: '<path d="M3 7.5l4.5 4 4.5-6.5 4.5 6.5 4.5-4-2 11.5H5z"/><path d="M5.8 15.5h12.4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/><path d="M16.5 3.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z"/>',
    sprout: '<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.3 3-7.3 8-7.3 0 5-3.2 8-8 7.3z"/><path d="M12 15c0-3.3-2.4-5.6-6.5-5.6 0 4 2.4 6.2 6.5 5.6z"/>',
    heart: '<path d="M12 20.3s-7.5-4.6-7.5-10.4A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.6c0 5.8-7.5 10.4-7.5 10.4z"/>',
    trophy: '<path d="M7.5 3.5h9v5.5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.5H4.5a3 3 0 0 0 3 4M16.5 5.5h3a3 3 0 0 1-3 4M12 13.5V17M8 20.5h8M9.5 17h5v3.5h-5z"/>',
    grad: '<path d="M1.5 9L12 4l10.5 5L12 14z"/><path d="M6 11.2v4.8c3.2 2.4 8.8 2.4 12 0v-4.8M22.5 9v5.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.2 15.2l5.3 5.3"/>',
    repeat: '<path d="M4.5 11a7.5 7.5 0 0 1 13-4.6L19.5 8.5"/><path d="M19.5 3.5v5h-5"/><path d="M19.5 13a7.5 7.5 0 0 1-13 4.6L4.5 15.5"/><path d="M4.5 20.5v-5h5"/>',
    bolt: '<path d="M13.5 2.5L4.5 14h7l-1 7.5 9-11.5h-7z"/>',
    shell: '<path d="M12 20.5L3.6 10.2a8.4 8.4 0 0 1 16.8 0z"/><path d="M12 20.5L7.5 4.6M12 20.5V3.5M12 20.5l4.5-15.9M12 20.5L4.2 8M12 20.5L19.8 8"/>',
    wave: '<path d="M2 10c2.5 0 2.5-2.5 5-2.5S9.5 10 12 10s2.5-2.5 5-2.5 2.5 2.5 5 2.5"/><path d="M2 15.5c2.5 0 2.5-2.5 5-2.5s2.5 2.5 5 2.5 2.5-2.5 5-2.5 2.5 2.5 5 2.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6"/>',
    palm: '<path d="M11 21.5c0-5.5.8-9.4 3-12.5"/><path d="M14 9c-2.2-2.7-5.7-2.9-8.3-.9M14 9c2.8-2 6-1.4 7.5.6M14 9c-.2-3-1.9-5-4.8-6M14 9c.9-3 3.6-4.5 6.2-4"/><path d="M7.5 21.5h9"/>',
    sunrise: '<path d="M2.5 18.5h19M6.5 18.5a5.5 5.5 0 0 1 11 0"/><path d="M12 5v3.5M4.6 10.6l2 1.8M19.4 10.6l-2 1.8M9.5 6.5L12 4l2.5 2.5"/>',
    hotel: '<path d="M4 21V5.5L12 3l8 2.5V21"/><path d="M9.5 21v-4.5h5V21M8 8.5h2M14 8.5h2M8 12.5h2M14 12.5h2M2.5 21h19"/>',
    gem: '<path d="M6.5 3.5h11l4 5.5L12 20.5 2.5 9z"/><path d="M2.5 9h19M9.5 3.5L12 9l2.5-5.5M12 20.5L8.5 9M12 20.5L15.5 9"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/>',
    hundred: '<path d="M3 8.5l2-1.5v10"/><circle cx="11" cy="12" r="3.6"/><circle cx="18.6" cy="12" r="3.6"/>',
    plane: '<path d="M2.5 13.5l7-1.5 5-7.5h2l-2.5 7 5-.5 1.5-2.5h1.5l-1 4 1 4h-1.5L19 14.5l-5-.5 2.5 7h-2l-5-7.5-7-1.5z"/>',
    music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.8 5.7 3.8 9s-1.2 6.3-3.8 9c-2.6-2.7-3.8-5.7-3.8-9S9.4 5.7 12 3z"/>',
    home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    map: '<path d="M3 6.5l5.5-2.5 7 2.5 5.5-2.5v13.5L15.5 20l-7-2.5L3 20z"/><path d="M8.5 4v13.5M15.5 6.5V20"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
    words: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5"/>',
    download: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2"/>',
    medal: '<circle cx="12" cy="14.5" r="6"/><path d="M8.5 9.6L5.5 3h5l1.5 3.5L13.5 3h5l-3 6.6"/><path d="M12 11.7l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/>',
  };
  ART.icon = (name, size, cls) => {
    const s = size || 22;
    return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.star}</svg>`;
  };
  ART.iconEl = (name, size, cls) => { const sp = document.createElement('span'); sp.className = 'ico-wrap'; sp.innerHTML = ART.icon(name, size, cls); return sp; };

  // ---------------------------------------------------------------- Tao, the sea-turtle helper
  // moods: happy · kind (after a mistake) · think · talk · wave · sleep · party
  ART.mascot = (mood, size) => {
    const id = uid('t');
    const s = size || 72;
    const eyes = {
      happy: '<path d="M37 37q3-4 6 0M53 37q3-4 6 0" stroke="#1E3A40" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      party: '<path d="M37 37q3-4 6 0M53 37q3-4 6 0" stroke="#1E3A40" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      kind: '<ellipse cx="40" cy="37" rx="3.4" ry="4.2" fill="#1E3A40"/><ellipse cx="56" cy="37" rx="3.4" ry="4.2" fill="#1E3A40"/><circle cx="41.2" cy="35.4" r="1.2" fill="#fff"/><circle cx="57.2" cy="35.4" r="1.2" fill="#fff"/><path d="M35.5 31.5l6-1.5M60.5 31.5l-6-1.5" stroke="#1E3A40" stroke-width="2" stroke-linecap="round"/>',
      think: '<ellipse cx="41" cy="35.5" rx="3.4" ry="4.2" fill="#1E3A40"/><ellipse cx="57" cy="35.5" rx="3.4" ry="4.2" fill="#1E3A40"/><circle cx="42.4" cy="33.6" r="1.3" fill="#fff"/><circle cx="58.4" cy="33.6" r="1.3" fill="#fff"/>',
      talk: '<ellipse cx="40" cy="37" rx="3.4" ry="4.2" fill="#1E3A40"/><ellipse cx="56" cy="37" rx="3.4" ry="4.2" fill="#1E3A40"/><circle cx="41.2" cy="35.4" r="1.3" fill="#fff"/><circle cx="57.2" cy="35.4" r="1.3" fill="#fff"/>',
      wave: '<ellipse cx="40" cy="37" rx="3.4" ry="4.2" fill="#1E3A40"/><ellipse cx="56" cy="37" rx="3.4" ry="4.2" fill="#1E3A40"/><circle cx="41.2" cy="35.4" r="1.3" fill="#fff"/><circle cx="57.2" cy="35.4" r="1.3" fill="#fff"/>',
      sleep: '<path d="M37 38q3 3 6 0M53 38q3 3 6 0" stroke="#1E3A40" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    }[mood] || '';
    const mouth = {
      happy: '<path d="M42 45q6 7 12 0z" fill="#E5476C"/><path d="M44 46.5q4 3 8 0" fill="#FF9DB4"/>',
      party: '<path d="M42 45q6 7 12 0z" fill="#E5476C"/>',
      kind: '<path d="M43.5 47q4.5 3 9 0" stroke="#1E3A40" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
      think: '<path d="M45 47.5h6" stroke="#1E3A40" stroke-width="2.2" stroke-linecap="round"/>',
      talk: '<ellipse cx="48" cy="47" rx="4" ry="3.2" fill="#E5476C"/>',
      wave: '<path d="M43 45.5q5 5 10 0" stroke="#1E3A40" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
      sleep: '<path d="M45 47h6" stroke="#1E3A40" stroke-width="2" stroke-linecap="round"/>',
    }[mood] || '';
    const extra = {
      think: '<g fill="#fff" stroke="#0E8A8A" stroke-width="1.6"><circle cx="78" cy="22" r="3"/><circle cx="85" cy="13" r="5"/></g><text x="85" y="16.5" text-anchor="middle" font-size="8" font-weight="700" fill="#0E8A8A">?</text>',
      kind: '<path d="M80 14c-2-3-6-1-4 2l4 4 4-4c2-3-2-5-4-2z" fill="#E5476C"/>',
      party: '<path d="M33 18l5-14 7 12z" fill="#FFB21E"/><circle cx="38" cy="4" r="2.4" fill="#E5476C"/><g fill="#FFB21E"><circle cx="16" cy="20" r="2"/><circle cx="82" cy="18" r="2"/></g><g fill="#0E8A8A"><rect x="76" y="30" width="4" height="4" rx="1" transform="rotate(30 78 32)"/><rect x="12" y="34" width="4" height="4" rx="1" transform="rotate(-20 14 36)"/></g>',
      sleep: '<text x="72" y="20" font-size="11" font-weight="700" fill="#0E8A8A">z</text><text x="80" y="11" font-size="8" font-weight="700" fill="#0E8A8A">z</text>',
      talk: '<path d="M78 24q5 4 0 9M83 20q8 8 0 17" stroke="#0E8A8A" stroke-width="2" fill="none" stroke-linecap="round"/>',
    }[mood] || '';
    const flipper = mood === 'wave' || mood === 'party'
      ? '<path d="M71 58q12-10 14-22q1-4-3-2q-6 6-14 16z" fill="url(#' + id + 's)" class="tao-wave"/>'
      : '<path d="M70 62q12 2 16 10q1 3-3 3q-8-2-15-7z" fill="url(#' + id + 's)"/>';
    return `<svg class="tao tao-${mood || 'happy'}" viewBox="0 0 96 96" width="${s}" height="${s}" role="img" aria-label="Tao the turtle">
<defs><radialGradient id="${id}h" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#B8F0D8"/><stop offset="1" stop-color="#5FC9A6"/></radialGradient>
<radialGradient id="${id}b" cx="45%" cy="30%" r="75%"><stop offset="0" stop-color="#3FC3B8"/><stop offset="1" stop-color="#0A6F72"/></radialGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FE3C4"/><stop offset="1" stop-color="#47B38F"/></linearGradient></defs>
<ellipse cx="48" cy="90" rx="26" ry="4" fill="#0A3B40" opacity=".12"/>
<path d="M26 62q-12 2-16 10q-1 3 3 3q8-2 15-7z" fill="url(#${id}s)"/>${flipper}
<path d="M33 80q-3 7 3 8q6 0 6-7z M63 80q3 7-3 8q-6 0-6-7z" fill="url(#${id}s)"/>
<ellipse cx="48" cy="68" rx="27" ry="20" fill="url(#${id}b)"/>
<g fill="none" stroke="#7FE0D2" stroke-width="1.6" opacity=".75"><path d="M48 52l8 5v10l-8 5-8-5V57z"/><path d="M40 57l-9-2M56 57l9-2M40 67l-9 4M56 67l9 4M48 72v12"/></g>
<ellipse cx="48" cy="61" rx="18" ry="5" fill="#fff" opacity=".12"/>
<circle cx="48" cy="40" r="21" fill="url(#${id}h)"/>
<ellipse cx="41" cy="27" rx="7" ry="3.5" fill="#fff" opacity=".45"/>
<circle cx="35" cy="44" r="3.6" fill="#FF8FA8" opacity=".55"/><circle cx="61" cy="44" r="3.6" fill="#FF8FA8" opacity=".55"/>
${eyes}${mouth}${extra}</svg>`;
  };
  ART.mascotEl = (mood, size) => { const d = document.createElement('div'); d.className = 'tao-wrap'; d.innerHTML = ART.mascot(mood, size); return d; };

  // ---------------------------------------------------------------- medals
  const TIERS = {
    bronze: { n: 'Bronze', th: 'ทองแดง', c: ['#FFE0C2', '#E0975A', '#9A5524', '#6E3A15'] },
    silver: { n: 'Silver', th: 'เงิน', c: ['#FFFFFF', '#D3DEE3', '#8C9EA6', '#56666D'] },
    gold: { n: 'Gold', th: 'ทอง', c: ['#FFF7C4', '#FFCB3D', '#C88A00', '#7E5600'] },
    pearl: { n: 'Pearl', th: 'ไข่มุก (หายาก)', c: ['#FFFFFF', '#F3D9FF', '#9FD9F5', '#6B4FC8'] },
  };
  ART.TIERS = TIERS;
  const RIBBON = { learn: ['#0E8A8A', '#0A5F66'], streak: ['#FF7A45', '#C2410C'], words: ['#2DB36B', '#17733F'], talk: ['#E5476C', '#A02246'], time: ['#7C5CD6', '#4C2FA0'], month: ['#3B82F6', '#1E4FB8'], star: ['#FFB21E', '#B87700'] };
  ART.medal = (m, opts) => {
    const o = opts || {};
    const s = o.size || 96;
    const id = uid('m');
    const t = TIERS[m.tier] || TIERS.bronze;
    const r = RIBBON[m.cat] || RIBBON.learn;
    const locked = !!o.locked;
    const c = locked ? ['#F1F4F4', '#D7DFDE', '#A9B6B5', '#7E8C8B'] : t.c;
    const rays = !locked && (m.tier === 'gold' || m.tier === 'pearl')
      ? `<g class="m-rays" opacity=".55">${Array.from({ length: 12 }, (_, i) => `<path d="M60 70 L${60 + Math.cos((i * Math.PI) / 6) * 56} ${70 + Math.sin((i * Math.PI) / 6) * 56} L${60 + Math.cos((i * Math.PI) / 6 + 0.12) * 56} ${70 + Math.sin((i * Math.PI) / 6 + 0.12) * 56}Z" fill="${m.tier === 'pearl' ? '#C9B8FF' : '#FFD86B'}"/>`).join('')}</g>` : '';
    const notch = Array.from({ length: 24 }, (_, i) => { const a = (i * Math.PI) / 12; return `${60 + Math.cos(a) * 41},${70 + Math.sin(a) * 41} ${60 + Math.cos(a + Math.PI / 24) * 38},${70 + Math.sin(a + Math.PI / 24) * 38}`; }).join(' ');
    const icon = locked ? P.lock : (P[m.icon] || P.star);
    return `<svg class="medal${locked ? ' locked' : ''} tier-${m.tier}" viewBox="0 0 120 120" width="${s}" height="${s}" role="img" aria-label="${A.esc(m.en)}${locked ? ' (locked)' : ''}">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".45" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>
<linearGradient id="${id}i" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".6" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>
<clipPath id="${id}c"><circle cx="60" cy="70" r="30"/></clipPath>
${m.tier === 'pearl' && !locked ? `<linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD6F5"/><stop offset=".35" stop-color="#C9F0FF"/><stop offset=".7" stop-color="#E5D4FF"/><stop offset="1" stop-color="#FFF3C4"/></linearGradient>` : ''}</defs>
${rays}
<path d="M38 4h18l10 34H48z" fill="${locked ? '#C7D1D0' : r[0]}"/><path d="M82 4H64L54 38h18z" fill="${locked ? '#B3BFBE' : r[1]}"/>
<path d="M47 4h7l10 34h-7z" fill="#fff" opacity=".25"/>
<polygon points="${notch}" fill="url(#${id}g)" stroke="${c[3]}" stroke-width="1.2" stroke-linejoin="round"/>
<circle cx="60" cy="70" r="33" fill="url(#${id}g)"/>
<circle cx="60" cy="70" r="30" fill="${m.tier === 'pearl' && !locked ? `url(#${id}p)` : `url(#${id}i)`}" stroke="${c[3]}" stroke-opacity=".35" stroke-width="1.4"/>
<g clip-path="url(#${id}c)"><rect class="m-shine" x="20" y="20" width="16" height="110" fill="#fff" opacity=".35" transform="rotate(25 60 70)"/></g>
<g transform="translate(42 52) scale(1.5)" fill="none" stroke="${locked ? '#7E8C8B' : c[3]}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
${!locked && m.big ? `<text x="60" y="97" text-anchor="middle" font-family="Mitr, sans-serif" font-size="11" fill="${c[3]}" font-weight="600">${A.esc(m.big)}</text>` : ''}
</svg>`;
  };

  // ---------------------------------------------------------------- island scenery (sky, sea, palms) by time of day
  ART.phase = () => { const hr = new Date().getHours(); return hr >= 6 && hr < 11 ? 'morning' : hr >= 11 && hr < 16 ? 'day' : hr >= 16 && hr < 19 ? 'sunset' : 'night'; };
  const SKY = {
    morning: ['#A9DDF3', '#FFE3C7', '#FFD9A0'], day: ['#5EC1EA', '#BFEAF7', '#E9FBFF'],
    sunset: ['#5B4B9A', '#F28C6B', '#FFD08A'], night: ['#0B1638', '#24386B', '#3B4F86'],
  };
  const SEA = { morning: ['#53C6C8', '#0E8A8A'], day: ['#3CC8C6', '#0A7A84'], sunset: ['#4E8FA8', '#1E4F6A'], night: ['#1B4E66', '#0A2433'] };
  ART.palm = (x, y, sc, flip, night) => {
    const f = flip ? -1 : 1;
    const leaf = night ? '#1F5A4A' : '#2FA36B', leaf2 = night ? '#174636' : '#1F8455', trunk = night ? '#5E4A36' : '#9A6B42';
    return `<g class="palm" transform="translate(${x} ${y}) scale(${sc * f} ${sc})">
<path d="M0 0 C 2 -18, 6 -34, 14 -48" stroke="${trunk}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
<path d="M1 -8l4 1M3 -18l4 1M6 -28l4 1M9 -37l4 1" stroke="#000" stroke-opacity=".18" stroke-width="1.5"/>
<g class="fronds" style="transform-origin:14px -48px">
<path d="M14 -48 C 2 -56, -12 -52, -18 -40 C -8 -48, 4 -50, 14 -46Z" fill="${leaf}"/>
<path d="M14 -48 C 26 -58, 40 -54, 44 -42 C 34 -50, 24 -50, 14 -46Z" fill="${leaf}"/>
<path d="M14 -48 C 8 -64, 18 -72, 30 -70 C 20 -66, 16 -58, 15 -48Z" fill="${leaf2}"/>
<path d="M14 -48 C 4 -62, -8 -64, -14 -58 C -4 -58, 6 -54, 13 -47Z" fill="${leaf2}"/>
<path d="M14 -48 C 22 -46, 30 -36, 30 -26 C 24 -34, 18 -42, 13 -46Z" fill="${leaf2}"/>
<circle cx="12" cy="-45" r="2.6" fill="#7A4E2A"/><circle cx="16" cy="-44" r="2.4" fill="#6A4222"/></g></g>`;
  };
  // returns { defs, sky, sea, front } svg strings for a W×H scene with the beach line at G
  ART.scene = (W, H, G, phase, id) => {
    const sky = SKY[phase], sea = SEA[phase], night = phase === 'night';
    const defs = `<linearGradient id="${id}sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".65" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
<linearGradient id="${id}se" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea[0]}"/><stop offset="1" stop-color="${sea[1]}"/></linearGradient>
<radialGradient id="${id}sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${night ? '#FFF6D8' : '#FFF4B8'}" stop-opacity=".9"/><stop offset="1" stop-color="${night ? '#FFF6D8' : '#FFD54A'}" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}sa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#C9B48C' : '#FBE7BE'}"/><stop offset="1" stop-color="${night ? '#9C875F' : '#EBCB8E'}"/></linearGradient>`;
    let skyS = `<rect width="${W}" height="${G + 10}" fill="url(#${id}sk)"/>`;
    if (night) {
      skyS += Array.from({ length: 26 }, (_, i) => { const x = (i * 137) % W, y = (i * 53) % (G - 40) + 6; return `<circle class="twinkle" style="animation-delay:${(i % 7) * 0.4}s" cx="${x}" cy="${y}" r="${i % 3 ? 1 : 1.6}" fill="#fff"/>`; }).join('');
      skyS += `<circle cx="${W - 64}" cy="40" r="34" fill="url(#${id}sun)"/><circle cx="${W - 64}" cy="40" r="15" fill="#FFF6D8"/><circle cx="${W - 58}" cy="35" r="13" fill="${sky[0]}"/>`;
    } else {
      const sy = phase === 'sunset' ? G - 30 : phase === 'morning' ? 60 : 42;
      skyS += `<circle class="sun-glow" cx="${W - 70}" cy="${sy}" r="${phase === 'sunset' ? 60 : 46}" fill="url(#${id}sun)"/><circle cx="${W - 70}" cy="${sy}" r="${phase === 'sunset' ? 24 : 18}" fill="${phase === 'sunset' ? '#FFC36B' : '#FFE07D'}"/>`;
      skyS += `<g class="clouds" fill="#fff" opacity=".9"><g class="cloud c1"><ellipse cx="70" cy="50" rx="28" ry="9"/><ellipse cx="88" cy="44" rx="18" ry="10"/><ellipse cx="56" cy="46" rx="12" ry="7"/></g><g class="cloud c2"><ellipse cx="${W * 0.55}" cy="30" rx="22" ry="7"/><ellipse cx="${W * 0.55 + 14}" cy="25" rx="13" ry="7"/></g></g>`;
      skyS += `<g class="birds" fill="none" stroke="${phase === 'sunset' ? '#3B2A55' : '#2B5560'}" stroke-width="1.5" stroke-linecap="round"><path d="M120 62q4-4 8 0q4-4 8 0"/><path d="M146 52q3-3 6 0q3-3 6 0"/></g>`;
    }
    // far islands
    skyS += `<path d="M-10 ${G} Q 40 ${G - 30} 90 ${G - 6} Q 120 ${G - 22} 160 ${G} Z" fill="${night ? '#163449' : phase === 'sunset' ? '#7B5E8E' : '#7FCFB6'}" opacity=".75"/>`;
    skyS += `<path d="M${W - 150} ${G} Q ${W - 100} ${G - 24} ${W - 40} ${G - 4} Q ${W - 10} ${G - 14} ${W + 10} ${G} Z" fill="${night ? '#122B3D' : phase === 'sunset' ? '#6A4E7E' : '#6CC2A6'}" opacity=".6"/>`;
    let seaS = `<rect y="${G}" width="${W}" height="${H - G}" fill="url(#${id}se)"/>`;
    seaS += `<path class="sea-shimmer" d="M0 ${G + 6} H${W}" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="14 22"/>`;
    seaS += `<g class="wv wv1" fill="#fff" opacity=".22"><path d="M0 ${G + 22} q 15 -6 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 v 4 H0Z"/></g>`;
    seaS += `<g class="wv wv2" fill="#fff" opacity=".14"><path d="M-30 ${G + 38} q 20 -7 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 v 4 H-30Z"/></g>`;
    seaS += `<g transform="translate(30 ${G + 16})"><g class="boat"><path d="M0 0 h26 l-5 6 h-16z" fill="${night ? '#2A3E52' : '#fff'}"/><path d="M13 -1 V-22 L25 -3z" fill="${night ? '#E9D9B4' : '#FFB21E'}"/><path d="M12 -1 V-17 L4 -3z" fill="${night ? '#C9B48C' : '#E5476C'}"/></g></g>`;
    if (night) seaS += `<rect x="${W - 76}" y="${G + 6}" width="24" height="${H - G - 10}" fill="#FFF6D8" opacity=".12"/>`;
    else if (phase === 'sunset') seaS += `<rect x="${W - 86}" y="${G + 4}" width="34" height="${H - G - 8}" fill="#FFD08A" opacity=".22"/>`;
    return { defs, sky: skyS, sea: seaS, night };
  };

  // ---------------------------------------------------------------- small helpers for scenes
  ART.waves = (color, op) => `<svg class="wave-strip" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12 Q 25 2 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 T 350 12 T 400 12 V24 H0Z" fill="${color}" opacity="${op || 1}"/></svg>`;
})();
