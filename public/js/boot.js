/* boot.js — runs before the page draws: night mode without a white flash */
(function () {
  try {
    var t = localStorage.getItem('ae.theme') || 'auto';
    if (t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.className += ' dark';
  } catch (e) { /* storage blocked */ }
})();
