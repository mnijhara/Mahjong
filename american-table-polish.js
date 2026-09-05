(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const table = $('americanTable');
  if (!table) return;

  const labels = ['East', 'South', 'West', 'North'];
  const directions = ['right', 'across', 'left'];
  let lastState = null;
  let lastPhase = null;
  let pulseTimer = null;
  let actionRail = null;

  function ensureRail() {
    if (actionRail) return actionRail;
    const tabletop = table.querySelector('.american-tabletop');
    if (!tabletop) return null;
    actionRail = document.createElement('div');
    actionRail.className = 'american-action-rail';
    actionRail.setAttribute('aria-live', 'polite');
    actionRail.innerHTML = '<span class="american-action-pulse" aria-hidden="true"></span><strong>Table ready</strong><span class="american-action-copy">Start a hand to see live table activity.</span>';
    tabletop.appendChild(actionRail);
    return actionRail;
  }

  function setRail(title, copy, kind = '') {
    const rail = ensureRail();
    if (!rail) return;
    rail.className = `american-action-rail ${kind}`.trim();
    rail.innerHTML = `<span class="american-action-pulse" aria-hidden="true"></span><strong>${title}</strong><span class="american-action-copy">${copy}</span>`;
  }

  function clearSeatActivity() {
    table.querySelectorAll('.player-card').forEach(card => {
      card.classList.remove('table-active', 'table-thinking', 'table-pass');
      const badge = card.querySelector('.player-action-badge');
      if (badge) badge.remove();
    });
  }

  function seatBadge(index, text, cls = '') {
    const cards = table.querySelectorAll('.player-card');
    const card = cards[index];
    if (!card) return;
    card.classList.add(cls);
    const badge = document.createElement('span');
    badge.className = 'player-action-badge';
    badge.textContent = text;
    card.querySelector('.player-head')?.appendChild(badge);
  }

  function showCharleston(state) {
    clearSeatActivity();
    const pass = Math.min(state?.selected === 3 ? 0 : 0, 0);
    const passNumber = Math.max(1, Number(document.getElementById('americanPhaseLabel')?.textContent?.match(/(\d)/)?.[1] || 1));
    const direction = directions[Math.min(passNumber - 1, directions.length - 1)];
    labels.forEach((_, i) => {
      if (i !== 0) seatBadge(i, `Passing ${direction}`, 'table-pass');
    });
    seatBadge(0, state?.selected ? `${state.selected}/3 selected` : 'Choose 3', 'table-active');
    setRail(`Charleston · ${direction}`, 'Your three-tile pass is being prepared. Opponents are concealed, but their table activity remains visible.', 'charleston');
  }

  function animateComputers() {
    clearInterval(pulseTimer);
    let index = 1;
    const tick = () => {
      const state = window.americanGameState?.();
      if (!state?.started || state.phase !== 'play' || state.turn === 0) {
        clearInterval(pulseTimer);
        pulseTimer = null;
        return;
      }
      clearSeatActivity();
      seatBadge(index, 'Thinking…', 'table-thinking');
      setRail(`${labels[index]} is playing`, 'Drawing from the wall and choosing a discard.', 'computer');
      index = index === 3 ? 1 : index + 1;
    };
    tick();
    pulseTimer = window.setInterval(tick, 520);
  }

  function update() {
    const state = window.americanGameState?.();
    if (!state) return;
    const changed = !lastState || JSON.stringify(state) !== JSON.stringify(lastState);
    if (!changed) return;
    lastState = state;

    if (!state.started) {
      clearSeatActivity();
      clearInterval(pulseTimer);
      pulseTimer = null;
      setRail('Table ready', 'Start a hand to see live table activity.');
      return;
    }

    if (state.phase === 'charleston') {
      clearInterval(pulseTimer);
      pulseTimer = null;
      showCharleston(state);
    } else if (state.phase === 'play') {
      if (state.turn === 0) {
        clearSeatActivity();
        setRail('Your turn', 'Choose a tile from your rack to discard. Your opponents’ hands stay concealed.', 'human');
      } else {
        animateComputers();
      }
    }

    if (lastPhase !== state.phase) lastPhase = state.phase;
  }

  ensureRail();
  window.setInterval(update, 180);
  window.addEventListener('mahjong:american-update', update);
  update();
})();
