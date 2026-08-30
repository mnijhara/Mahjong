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

  function card(title, meta, detail, indexes = [], tone = '') {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `american-combo-card${tone ? ` ${tone}` : ''}`;
    el.innerHTML = `<span class="combo-title">${title}</span><span class="combo-meta">${meta}</span><span class="combo-detail">${detail}</span>`;
    el.addEventListener('click', () => {
      const rack = $('americanHand');
      if (!rack) return;
      rack.querySelectorAll('.insight-focus').forEach(tile => tile.classList.remove('insight-focus'));
      indexes.forEach(index => rack.querySelectorAll('.american-tile')[index]?.classList.add('insight-focus'));
      window.setTimeout(() => rack.querySelectorAll('.insight-focus').forEach(tile => tile.classList.remove('insight-focus')), 1400);
    });
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
        const maxGroup = Math.min(6, count + jokers);
        if (maxGroup >= 3 && count < 6) {
          const jokerUsed = Math.min(jokers, maxGroup - count);
          cards.push(card(`Joker-assisted ${maxGroup === 5 ? 'Quint' : maxGroup === 4 ? 'Kong' : maxGroup === 3 ? 'Pung' : 'Sextet'} · ${labelFor(g.tile)}`, `${count} natural + ${jokerUsed} Joker`, 'Jokers can fill groups of 3+; not pairs or singles', g.indexes, 'joker'));
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
    if (!started) return;

    const suited = hand.filter(t => t.type === 'suited');
    const even = suited.filter(t => t.value % 2 === 0).length;
    const odd = suited.filter(t => t.value % 2 === 1).length;
    const threeSixNine = suited.filter(t => [3, 6, 9].includes(t.value)).length;
    const year = suited.filter(t => [2, 6].includes(t.value)).length;
    const honors = hand.filter(t => t.type === 'wind' || t.type === 'dragon').length;
    const jokers = hand.filter(t => t.type === 'joker').length;
    const groups = groupTiles(hand);
    const pairs = groups.filter(g => g.indexes.length === 2).length;
    const triples = groups.filter(g => g.indexes.length >= 3).length;
    const rankCounts = new Map();
    suited.forEach(t => rankCounts.set(t.value, (rankCounts.get(t.value) || 0) + 1));
    const anyLike = Math.max(0, ...rankCounts.values());
    const runs = suited.reduce((score, tile) => score + ([1,2,3,4,5,6,7,8,9].includes(tile.value) ? 1 : 0), 0);

    const directions = [
      ['2026', `${year} matching ranks`, 'Look for 2s and 6s early; special 2026/NEWS tiles must remain natural.'],
      ['2468', `${even} even tiles`, 'Strong when your rack is already concentrated on 2, 4, 6 and 8.'],
      ['Any Like Numbers', `${anyLike} same-rank cluster`, 'Promising when one number is appearing repeatedly across suits.'],
      ['Quints', `${triples} triplet${triples === 1 ? '' : 's'} · ${jokers} Joker${jokers === 1 ? '' : 's'}`, 'A natural triplet plus Jokers is the clearest signal for a Quint/Kong route.'],
      ['Consecutive Run', `${runs} suited tiles`, 'Keep adjacent ranks in the same suit when a run starts to form.'],
      ['13579', `${odd} odd tiles`, 'Strong when 1, 3, 5, 7 and 9 dominate the suited rack.'],
      ['Winds & Dragons', `${honors} honor tiles`, 'Watch clustered Winds or Dragons; protect matching honors.'],
      ['369', `${threeSixNine} tiles`, 'A useful direction when 3, 6 and 9 are recurring.'],
      ['Singles & Pairs', `${pairs} pair${pairs === 1 ? '' : 's'}`, 'Pair-rich hands can point here; Jokers never substitute for pairs or singles.']
    ];

    directions.sort((a, b) => {
      const numeric = (text) => Number.parseInt(text, 10) || 0;
      return numeric(b[1]) - numeric(a[1]);
    });
    directions.slice(0, 4).forEach(([title, meta, detail]) => {
      const el = document.createElement('div');
      el.className = 'american-direction-card';
      el.innerHTML = `<strong>${title}</strong><span>${meta}</span><small>${detail}</small>`;
      directionEl.appendChild(el);
    });
  }

  window.updateAmericanInsights = (hand, state) => {
    renderCombinations(hand, Boolean(state?.started), state?.phase || 'idle');
    renderDirections(hand, Boolean(state?.started));
  };
})();
