(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const comboEl = $('americanCombinations');
  const directionEl = $('americanDirections');
  if (!comboEl || !directionEl) return;

  const labelFor = (tile) => tile.type === 'flower' ? 'Flowers' : tile.label;
  const keyFor = (tile) => {
    if (tile.type === 'flower') return 'flower';
    if (tile.type === 'joker') return 'joker';
    if (tile.type === 'suited') return `${tile.suit}-${tile.value}`;
    return `${tile.type}-${tile.key}`;
  };

  function groupTiles(hand) {
    const groups = new Map();
    hand.forEach((tile, index) => {
      if (tile.type === 'joker') return;
      const key = keyFor(tile);
      if (!groups.has(key)) groups.set(key, { tile, indexes: [] });
      groups.get(key).indexes.push(index);
    });
    return [...groups.values()].sort((a, b) => b.indexes.length - a.indexes.length || labelFor(a.tile).localeCompare(labelFor(b.tile)));
  }

  function focusIndexes(indexes) {
    const rack = $('americanHand');
    if (!rack) return;
    rack.querySelectorAll('.insight-focus').forEach(tile => tile.classList.remove('insight-focus'));
    indexes.forEach(index => rack.querySelectorAll('.american-tile')[index]?.classList.add('insight-focus'));
    window.setTimeout(() => rack.querySelectorAll('.insight-focus').forEach(tile => tile.classList.remove('insight-focus')), 1600);
  }

  function card(title, meta, detail, indexes = [], tone = '') {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `american-combo-card${tone ? ` ${tone}` : ''}`;
    el.innerHTML = `<span class="combo-title">${title}</span><span class="combo-meta">${meta}</span><span class="combo-detail">${detail}</span>`;
    el.addEventListener('click', () => focusIndexes(indexes));
    return el;
  }

  function renderCombinations(hand, started, phase) {
    comboEl.innerHTML = '';
    if (!started) {
      comboEl.innerHTML = '<div class="american-insight-empty">Deal a hand to see pairs, pungs, kongs, quints and Joker-assisted combinations.</div>';
      return;
    }

    const jokers = hand.filter(t => t.type === 'joker').length;
    const groups = groupTiles(hand);
    const cards = [];

    groups.filter(g => g.indexes.length >= 2).slice(0, 6).forEach((g) => {
      const count = g.indexes.length;
      const label = labelFor(g.tile);
      if (count >= 3) cards.push(card(`${count >= 5 ? 'Quint' : count === 4 ? 'Kong' : 'Pung'} · ${label}`, `${count} natural`, 'Already grouped in your rack', g.indexes, 'strong'));
      else cards.push(card(`Pair · ${label}`, '2 natural', 'Protect this pair · Jokers cannot replace it', g.indexes, 'pair'));
    });

    if (jokers && cards.length < 6) {
      groups.filter(g => g.indexes.length >= 2).slice(0, 3).forEach((g) => {
        const count = g.indexes.length;
        const maxGroup = Math.min(5, count + jokers);
        if (maxGroup >= 3 && count < 5) {
          const jokerUsed = Math.min(jokers, maxGroup - count);
          cards.push(card(`Joker-assisted ${maxGroup === 5 ? 'Quint' : maxGroup === 4 ? 'Kong' : 'Pung'} · ${labelFor(g.tile)}`, `${count} natural + ${jokerUsed} Joker`, 'Jokers can fill groups of 3+; not pairs or singles', g.indexes, 'joker'));
        }
      });
    }

    if (!cards.length) {
      comboEl.innerHTML = `<div class="american-insight-empty">No pair or group yet. Keep flexible tiles through the Charleston.${phase === 'charleston' ? ' Look for pairs before choosing your next pass.' : ''}</div>`;
      return;
    }
    cards.slice(0, 6).forEach(c => comboEl.appendChild(c));
    const footer = document.createElement('div');
    footer.className = 'american-insight-foot';
    const naturalGroups = groups.filter(g => g.indexes.length >= 2).length;
    footer.textContent = `${hand.length} tiles · ${naturalGroups} natural group${naturalGroups === 1 ? '' : 's'} · ${jokers} Joker${jokers === 1 ? '' : 's'} · tap a combination to highlight it`;
    comboEl.appendChild(footer);
  }

  function renderDirections(hand, started) {
    directionEl.innerHTML = '';
    if (!started) {
      directionEl.innerHTML = '<div class="american-insight-empty">Deal a hand to rank the card-family directions and see which tiles are worth protecting.</div>';
      return;
    }

    const candidates = window.americanCardEngine?.analyze(hand) || [];
    candidates.slice(0, 4).forEach((candidate, index) => {
      const el = document.createElement('article');
      el.className = `american-direction-card${index === 0 ? ' recommended' : ''}`;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${candidate.title}, ${candidate.score}% fit. ${candidate.advice}`);
      const keep = candidate.keep.length ? `Protect: ${candidate.keep.join(' · ')}` : candidate.advice;
      el.innerHTML = `<div class="direction-top"><strong>${candidate.title}</strong><span>${candidate.score}% fit</span></div><div class="direction-tag">${candidate.tag}</div><small>${candidate.reason}</small><small class="direction-keep">${keep}</small>`;
      const activate = () => {
        const rack = $('americanHand');
        if (!rack) return;
        const tiles = [...rack.querySelectorAll('.american-tile')];
        const keep = new Set(candidate.keep.map(String));
        const matches = [];
        tiles.forEach((tile, tileIndex) => {
          const label = tile.getAttribute('aria-label')?.replace(/, Joker$/, '') || '';
          const value = tile.querySelector('.american-value')?.textContent || '';
          if (keep.has(label) || (value && [...keep].some(k => k === `${value}s`))) matches.push(tileIndex);
        });
        if (!matches.length && tiles.length) matches.push(0);
        focusIndexes(matches);
        setTimeout(() => document.querySelectorAll('.american-direction-card.hint-focus').forEach(x => x.classList.remove('hint-focus')), 1600);
        el.classList.add('hint-focus');
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
      directionEl.appendChild(el);
    });

    const foot = document.createElement('div');
    foot.className = 'american-insight-foot';
    foot.textContent = 'Scores are live strategy signals, not guaranteed winning lines. Tap a family to highlight the tiles supporting it.';
    directionEl.appendChild(foot);
  }

  window.updateAmericanInsights = (hand, state) => {
    renderCombinations(hand, Boolean(state?.started), state?.phase || 'idle');
    renderDirections(hand, Boolean(state?.started));
  };
})();
