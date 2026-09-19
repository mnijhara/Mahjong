(() => {
  'use strict';
  const modal = document.getElementById('modal');
  if (!modal) return;

  const undoButton = document.getElementById('undo');
  const hintButton = document.getElementById('hint');
  if (undoButton) undoButton.setAttribute('aria-keyshortcuts', 'U');
  if (hintButton) hintButton.setAttribute('aria-keyshortcuts', 'H');

  let returnFocusElement = null;
  let wasVisible = !modal.classList.contains('hidden');

  const isVisible = () => !modal.classList.contains('hidden');
  const getFocusable = () => [...modal.querySelectorAll('button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length > 0);

  const focusFirst = () => {
    const first = getFocusable()[0];
    if (first && document.activeElement !== first) first.focus();
  };

  const syncModalFocus = () => {
    const visible = isVisible();
    if (visible && !wasVisible) {
      returnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      requestAnimationFrame(focusFirst);
    } else if (!visible && wasVisible) {
      const target = returnFocusElement;
      returnFocusElement = null;
      if (target?.isConnected && typeof target.focus === 'function') {
        requestAnimationFrame(() => target.focus({ preventScroll: true }));
      }
    }
    wasVisible = visible;
  };

  document.addEventListener('keydown', event => {
    if (!isVisible()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      const playAgain = document.getElementById('playAgain');
      if (playAgain && !playAgain.disabled) playAgain.click();
      return;
    }
    if (event.key !== 'Tab') return;
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

  new MutationObserver(syncModalFocus).observe(modal, { attributes: true, attributeFilter: ['class'] });
  syncModalFocus();

  const board = document.getElementById('board');
  if (board && !document.getElementById('skipToGameBoard')) {
    board.tabIndex = -1;
    const link = document.createElement('a');
    link.id = 'skipToGameBoard';
    link.href = '#board';
    link.textContent = 'Skip to game board';
    link.style.cssText = 'position:fixed;left:12px;top:-100px;z-index:2000;padding:10px 14px;border-radius:8px;background:#153d32;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.2);transition:top .12s';
    link.addEventListener('focus', () => { link.style.top = '12px'; });
    link.addEventListener('blur', () => { link.style.top = '-100px'; });
    link.addEventListener('click', () => requestAnimationFrame(() => board.focus({ preventScroll: false })));
    document.body.prepend(link);
  }
})();
