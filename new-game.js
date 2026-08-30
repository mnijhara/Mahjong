(() => {
  'use strict';

  const button = document.getElementById('newGame');
  const select = document.getElementById('gameStyle');
  const start = document.getElementById('startGame');
  if (!button || !select || !start) return;

  function sync() {
    button.disabled = !start.disabled && select.value !== 'solitaire' && select.value !== 'american' ? true : false;
    button.setAttribute('aria-disabled', String(button.disabled));
  }

  button.addEventListener('click', () => {
    if (start.disabled) return;
    if (select.value === 'solitaire') {
      try { localStorage.removeItem('mahjong-solitaire-save-v1'); } catch (e) {}
    }
    start.click();
  });

  select.addEventListener('change', sync);
  sync();
})();
