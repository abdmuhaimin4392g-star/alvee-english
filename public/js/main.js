/* main.js — start the app */
window.AE.boot();
(function () {
  const m = document.querySelector('meta[name="ae-mode"]');
  if (m && m.content === 'server' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
