(() => {
  'use strict';

  const hand = document.getElementById('americanHand');
  if (!hand) return;

  const pipLayouts = {
    1: [5], 2: [2, 8], 3: [2, 5, 8], 4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9], 6: [1, 2, 3, 7, 8, 9],
    7: [1, 2, 3, 5, 7, 8, 9], 8: [1, 2, 3, 4, 6, 7, 8, 9],
    9: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function faceFromLabel(label) {
    const text = String(label || '').trim();
    const suited = text.match(/^(\d)\s+(Dot|Bam|Crak)$/i);
    if (suited) {
      const value = Number(suited[1]);
      const suit = suited[2].toLowerCase();
      const symbol = suit === 'dot' ? '●' : suit === 'bam' ? '▥' : '萬';
      const suitName = suit === 'dot' ? 'DOTS' : suit === 'bam' ? 'BAMS' : 'CRAKS';
      const layout = pipLayouts[value] || [];
      const cells = Array.from({ length: 9 }, (_, i) => `<span class="polish-pip ${layout.includes(i + 1) ? 'on' : ''}">${layout.includes(i + 1) ? symbol : ''}</span>`).join('');
      return `<span class="polish-number" aria-hidden="true">${value}</span><span class="polish-suit" aria-hidden="true">${esc(suitName)}</span><span class="polish-pips ${suit}" aria-hidden="true">${cells}</span><span class="polish-accessible">${esc(value)} ${esc(suit)}</span>`;
    }

    const wind = text.match(/^(East|South|West|North) Wind$/i);
    if (wind) {
      const names = { east: ['東', 'E'], south: ['南', 'S'], west: ['西', 'W'], north: ['北', 'N'] };
      const [hanzi, initial] = names[wind[1].toLowerCase()];
      return `<span class="polish-hanzi wind">${hanzi}</span><span class="polish-corner">${initial}</span><span class="polish-label">${esc(wind[1])} WIND</span>`;
    }

    const dragon = text.match(/^(Red|Green|White) Dragon$/i);
    if (dragon) {
      const data = { red: ['中', 'R'], green: ['發', 'G'], white: ['白', 'W'] }[dragon[1].toLowerCase()];
      return `<span class="polish-hanzi dragon-${dragon[1].toLowerCase()}">${data[0]}</span><span class="polish-corner">${data[1]}</span><span class="polish-label">${esc(dragon[1])} DRAGON</span>`;
    }

    const flower = text.match(/^Flower\s+(\d+)$/i);
    if (flower) return `<span class="polish-number">${flower[1]}</span><span class="polish-flower">✿</span><span class="polish-label">FLOWER</span>`;
    if (/joker/i.test(text)) return '<span class="polish-joker">★</span><span class="polish-joker-text">JOKER</span><span class="polish-label">WILD</span>';
    return null;
  }

  function polishTile(tile) {
    if (tile.dataset.polished === 'true') return;
    const label = tile.getAttribute('aria-label') || tile.title || '';
    const face = faceFromLabel(label);
    if (!face) return;
    tile.innerHTML = face;
    tile.dataset.polished = 'true';
  }

  function polishAll() {
    hand.querySelectorAll('.american-tile').forEach(polishTile);
  }

  polishAll();
  new MutationObserver(polishAll).observe(hand, { childList: true, subtree: true });
})();
