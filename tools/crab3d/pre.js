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
