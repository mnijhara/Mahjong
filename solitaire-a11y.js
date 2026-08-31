(() => {
  'use strict';
  const modal = document.getElementById('modal');
  if (!modal) return;

  const isVisible = () => !modal.classList.contains('hidden');
  const getFocusable = () => [...modal.querySelectorAll('button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length > 0);

  const focusFirst = () => {
    const first = getFocusable()[0];
    if (first && document.activeElement !== first) first.focus();
  };

  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !isVisible()) return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('focusin', event => {
    if (!isVisible() || modal.contains(event.target)) return;
    focusFirst();
  });

  const target = document.getElementById('gameBoard') || document.getElementById('board');
  if (target && !document.getElementById('skipToGameBoard')) {
    const link = document.createElement('a');
    link.id = 'skipToGameBoard';
    link.href = '#gameBoard';
    link.textContent = 'Skip to game board';
    link.style.cssText = 'position:fixed;left:12px;top:-100px;z-index:2000;padding:10px 14px;border-radius:8px;background:#153d32;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.2);transition:top .12s';
    link.addEventListener('focus', () => { link.style.top = '12px'; });
    link.addEventListener('blur', () => { link.style.top = '-100px'; });
    link.addEventListener('click', () => requestAnimationFrame(() => target.focus({ preventScroll: false })));
    document.body.prepend(link);
  }
})();
