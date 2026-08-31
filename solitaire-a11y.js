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
})();
