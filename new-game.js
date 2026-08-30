(() => {
  'use strict';

  const button = document.getElementById('newGame');
  const select = document.getElementById('gameStyle');
  const start = document.getElementById('startGame');
  if (!button || !select || !start) return;

  function sync() {
    const supported = select.value === 'solitaire' || select.value === 'american';
    button.disabled = !supported || start.disabled;
    button.setAttribute('aria-disabled', String(button.disabled));
  }

  button.addEventListener('click', () => {
    if (button.disabled) return;
    if (select.value === 'solitaire') {
      try { localStorage.removeItem('mahjong-solitaire-save-v1'); } catch (e) {}
    }
    start.click();
  });

  select.addEventListener('change', sync);
  sync();
})();
