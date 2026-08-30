(() => {
  'use strict';

  const BOARD_W = 1000;
  const BOARD_H = 590;
  const MOBILE_MAX = 800;
  const board = document.getElementById('board');
  const wrap = board?.closest('.board-wrap');
  if (!board || !wrap) return;

  let frame = 0;

  function fitBoard() {
    frame = 0;
    if (!document.body.classList.contains('solitaire-mode') || window.innerWidth > MOBILE_MAX) {
      board.style.removeProperty('transform');
      board.style.removeProperty('margin');
      return;
    }

    const cs = getComputedStyle(wrap);
    const availableWidth = Math.max(0, wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    const availableHeight = Math.max(0, wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
    if (availableWidth < 20 || availableHeight < 20) return;

    // Keep the entire 1000×590 logical board visible. Width and height are both
    // constraints, so short landscape phones no longer crop the top/bottom rows.
    const scale = Math.min(availableWidth / BOARD_W, availableHeight / BOARD_H);
    const safeScale = Math.max(0.22, Math.min(scale, 0.8));
    board.style.transformOrigin = 'center center';
    board.style.transform = `scale(${safeScale})`;
    board.style.margin = '0';
  }

  function scheduleFit() {
    if (frame) return;
    frame = requestAnimationFrame(fitBoard);
  }

  const observer = new ResizeObserver(scheduleFit);
  observer.observe(wrap);
  window.addEventListener('resize', scheduleFit, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(scheduleFit, 80), { passive: true });
  document.getElementById('gameStyle')?.addEventListener('change', () => setTimeout(scheduleFit, 0));
  scheduleFit();
})();
