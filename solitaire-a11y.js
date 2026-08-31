(() => {
  'use strict';
  const modal = document.getElementById('modal');
  if (!modal) return;

  const getFocusable = () => [...modal.querySelectorAll('button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length > 0);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || modal.classList.contains('hidden')) return;
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
})();
