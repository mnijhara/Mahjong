(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const comboEl = $('americanCombinations');
  const directionEl = $('americanDirections');
  if (!comboEl || !directionEl) return;

  const suitNames = { dots: 'Dots', bams: 'Bams', craks: 'Craks' };
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

  function card(title, meta, detail, tone = '') {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `american-combo-card${tone ? ` ${tone}` : ''}`;
    el.innerHTML = `<span class="combo-title">${title}</span><span class="combo-meta">${meta}</span><span class="combo-detail">${detail}</span>`;
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
      if (count >= 3) cards.push(card(`${count >= 5 ? 'Quint' : count === 4 ? 'Kong' : 'Pung'} · ${label}`, `${count} natural`, 'Already grouped in your rack', 'strong'));
      else cards.push(card(`Pair · ${label}`, '2 natural', jokers ? 'Pairs cannot use Jokers' : 'Protect this pair', 'pair'));
    });

    if (jokers && cards.length < 6) {
      groups.filter(g => g.indexes.length >= 2).slice(0, 3).forEach((g) => {
        const count = g.indexes.length;
        if (count < 5) {
          const needed = Math.max(0, 3 - count);
          const maxGroup = Math.min(5, count + jokers);
          if (maxGroup >= 3) cards.push(card(`Joker-assisted ${maxGroup === 5 ? 'Quint' : maxGroup === 4 ? 'Kong' : 'Pung'} · ${labelFor(g.tile)}`, `${count} natural + ${Math.min(jokers, needed || maxGroup - count)} Joker`, 'Jokers may fill eligible groups of 3+', 'joker'));
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
    footer.textContent = `${hand.length} tiles · ${groups.filter(g => g.indexes.length >= 2).length} natural group${groups.filter(g => g.indexes.length >= 2).length === 1 ? '' : 's'} · ${jokers} Joker${jokers === 1 ? '' : 's'}`;
    comboEl.appendChild(footer);
  }

  function renderDirections(hand, started) {
    directionEl.innerHTML = '';
    if (!started) return;
    const suited = hand.filter(t => t.type === 'suited');
    const even = suited.filter(t => t.value % 2 === 0).length;
    const odd = suited.filter(t => t.value % 2 === 1).length;
    const honors = hand.filter(t => t.type === 'wind' || t.type === 'dragon').length;
    const flowers = hand.filter(t => t.type === 'flower').length;
    const groups = groupTiles(hand);
    const triples = groups.filter(g => g.indexes.length >= 3).length;
    const pairs = groups.filter(g => g.indexes.length >= 2).length;

    const directions = [
      ['Quints / Kongs', triples ? `${triples} strong group${triples === 1 ? '' : 's'}` : 'No triplet yet', triples ? 'Your best group-building signal right now.' : 'Look for a third copy of an existing pair.'],
      ['Pairs & Singles', `${pairs} pair${pairs === 1 ? '' : 's'}`, 'Pairs are valuable anchors; Jokers cannot replace pairs or singles.'],
      ['Even-number family', `${even} suited tiles`, 'A useful direction when your hand is rich in 2, 4, 6 and 8 tiles.'],
      ['Odd-number family', `${odd} suited tiles`, 'A useful direction when your hand is rich in 1, 3, 5, 7 and 9 tiles.'],
      ['Winds & Dragons', `${honors} honor tiles`, 'Worth watching when matching honors start to cluster.'],
      ['Flowers', `${flowers} flower${flowers === 1 ? '' : 's'}`, 'Flowers are interchangeable in American Mah Jongg and are never passed as Jokers.']
    ];
    directions.sort((a, b) => {
      const score = (x) => Number.parseInt(x[1], 10) || 0;
      return score(b) - score(a);
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
