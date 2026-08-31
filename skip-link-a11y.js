(() => {
  'use strict';
  if (document.getElementById('skipToGameBoard')) return;
  const target = document.getElementById('gameBoard') || document.getElementById('board');
  if (!target) return;

  const link = document.createElement('a');
  link.id = 'skipToGameBoard';
  link.href = '#gameBoard';
  link.textContent = 'Skip to game board';
  link.style.cssText = 'position:fixed;left:12px;top:-100px;z-index:2000;padding:10px 14px;border-radius:8px;background:#153d32;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.2);transition:top .12s';
  link.addEventListener('focus', () => { link.style.top = '12px'; });
  link.addEventListener('blur', () => { link.style.top = '-100px'; });
  link.addEventListener('click', () => {
    requestAnimationFrame(() => target.focus({ preventScroll: false }));
  });
  document.body.prepend(link);
})();
