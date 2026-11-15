/* main.js — start the app */
(function () {
  const A = window.AE;
  const m = document.querySelector('meta[name="ae-mode"]');
  const server = !!(m && m.content === 'server');
  // A fresh start (one time per FRESH value): her progress is saved to the server first, then this phone
  // logs out, its caches and old copies are cleared, and the app opens on the login page, clean.
  const FRESH = '2026-11-15b';
  const ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const js = (k) => { try { return JSON.parse(ls(k)); } catch (e) { return null; } };

  async function freshStart() {
    const token = js('ae.token'), user = js('ae.user');
    if (token && user) {
      const call = async (path, body, method) => {
        const r = await fetch('/api/' + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
        const j = await r.json().catch(() => ({}));
        if (!r.ok && r.status !== 409) { const e = new Error(j.error || 'Server error'); e.status = r.status; throw e; }
        return j;
      };
      if (user.role === 'learner') {
        // 1. her waiting activity log
        const q = js('ae.q') || [];
        for (let i = 0; i < q.length; i += 300) await call('events', { events: q.slice(i, i + 300) });
        // 2. her progress on this phone, only if it is newer than the server copy
        const local = js('ae.st.' + user.id);
        if (local) {
          const sv = (await call('state')).state;
          const newer = !sv || ((local.rev || 0) > (sv.rev || 0) && (local.resetAt || 0) >= (sv.resetAt || 0));
          if (newer) await call('state', { state: local }, 'PUT');
        }
      }
      try { await call('logout', {}); } catch (e) { /* the session ends anyway */ }
    }
    // 3. clean this phone: keep only the theme and the last username
    const keep = { 'ae.theme': ls('ae.theme'), 'ae.lastuser': ls('ae.lastuser') || (user && user.username ? JSON.stringify(user.username) : null) };
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('ae.')).forEach((k) => localStorage.removeItem(k));
      Object.entries(keep).forEach(([k, v]) => { if (v != null) localStorage.setItem(k, v); });
      localStorage.setItem('ae.fresh', FRESH);
      sessionStorage.clear();
    } catch (e) { /* storage blocked */ }
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* no caches */ }
    try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* no worker */ }
    location.replace(location.pathname + '?fresh=' + Date.now());
  }

  if (server && ls('ae.fresh') !== FRESH && navigator.onLine !== false) {
    // offline or the server cannot be reached: start normally and try again next time (nothing is cleared)
    freshStart().catch(() => { A.boot(); });
    return;
  }
  if (/[?&]fresh=/.test(location.search)) history.replaceState(null, '', location.pathname);
  A.boot();
  if (server && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    if (document.readyState === 'complete') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
