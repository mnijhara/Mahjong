(() => {
  'use strict';

  // Strategy engine for the current American card family. It deliberately scores
  // pattern families rather than reproducing the licensed annual card text.
  const SUITS = ['dots', 'bams', 'craks'];
  const EVEN = new Set([2, 4, 6, 8]);
  const ODD = new Set([1, 3, 5, 7, 9]);
  const THREE_SIX_NINE = new Set([3, 6, 9]);

  const naturalKey = (tile) => {
    if (tile.type === 'suited') return `${tile.suit}-${tile.value}`;
    if (tile.type === 'wind' || tile.type === 'dragon') return `${tile.type}-${tile.key}`;
    if (tile.type === 'flower') return 'flower';
    return tile.type;
  };

  const groups = (hand) => {
    const map = new Map();
    hand.forEach((tile, index) => {
      if (tile.type === 'joker') return;
      const key = naturalKey(tile);
      if (!map.has(key)) map.set(key, { tile, indexes: [] });
      map.get(key).indexes.push(index);
    });
    return [...map.values()];
  };

  const suited = (hand) => hand.filter(tile => tile.type === 'suited');
  const countWhere = (tiles, predicate) => tiles.reduce((n, tile) => n + (predicate(tile) ? 1 : 0), 0);
  const rankCounts = (hand) => {
    const map = new Map();
    suited(hand).forEach(tile => map.set(tile.value, (map.get(tile.value) || 0) + 1));
    return map;
  };

  function longestRun(hand) {
    let best = { length: 0, suit: null, values: [] };
    SUITS.forEach(suit => {
      const values = [...new Set(suited(hand).filter(t => t.suit === suit).map(t => t.value))].sort((a, b) => a - b);
      let start = 0;
      for (let i = 1; i <= values.length; i++) {
        if (i === values.length || values[i] !== values[i - 1] + 1) {
          const run = values.slice(start, i);
          if (run.length > best.length) best = { length: run.length, suit, values: run };
          start = i;
        }
      }
    });
    return best;
  }

  function sameSuitDensity(hand) {
    const counts = new Map(SUITS.map(suit => [suit, 0]));
    suited(hand).forEach(tile => counts.set(tile.suit, counts.get(tile.suit) + 1));
    return Math.max(...counts.values(), 0);
  }

  function scoreCandidate(hand, definition) {
    const s = suited(hand);
    const jokers = countWhere(hand, t => t.type === 'joker');
    const honors = countWhere(hand, t => t.type === 'wind' || t.type === 'dragon');
    const even = countWhere(s, t => EVEN.has(t.value));
    const odd = countWhere(s, t => ODD.has(t.value));
    const threeSixNine = countWhere(s, t => THREE_SIX_NINE.has(t.value));
    const year = countWhere(s, t => t.value === 2 || t.value === 6) + countWhere(hand, t => t.type === 'dragon' && t.key === 'white');
    const pairs = groups(hand).filter(g => g.indexes.length === 2);
    const triples = groups(hand).filter(g => g.indexes.length >= 3);
    const rankMax = Math.max(0, ...rankCounts(hand).values());
    const run = longestRun(hand);
    let score = 0;
    let reason = '';
    let keep = [];

    switch (definition.id) {
      case '2026':
        score = Math.min(100, 25 + year * 7 + honors * 2);
        reason = `${year} useful 2/6-or-Soap tiles; protect natural singles and matching groups.`;
        keep = s.filter(t => t.value === 2 || t.value === 6).map(t => t.label);
        break;
      case '2468':
        score = Math.min(100, 15 + even * 8 + Math.max(0, sameSuitDensity(hand) - 3) * 3);
        reason = `${even} even tiles already fit the family; same-suit concentration improves the route.`;
        keep = s.filter(t => EVEN.has(t.value)).map(t => t.label);
        break;
      case 'like':
        score = Math.min(100, 18 + rankMax * 16 + triples.length * 8 + pairs.length * 3);
        reason = `The strongest repeated rank has ${rankMax} natural tile${rankMax === 1 ? '' : 's'}; repeated ranks are valuable here.`;
        keep = [...rankCounts(hand).entries()].filter(([, count]) => count === rankMax).map(([rank]) => `${rank}s`);
        break;
      case 'quints':
        score = Math.min(100, 12 + triples.length * 18 + jokers * 9);
        reason = `${triples.length} natural group${triples.length === 1 ? '' : 's'} plus ${jokers} Joker${jokers === 1 ? '' : 's'} gives this route flexibility.`;
        keep = triples.flatMap(g => g.indexes.map(i => hand[i].label));
        break;
      case 'run':
        score = Math.min(100, 10 + run.length * 18 + Math.max(0, sameSuitDensity(hand) - 4) * 4);
        reason = run.length >= 3 ? `${run.length}-tile ${run.suit} run (${run.values.join('-')}) is your clearest sequence.` : 'Look for adjacent ranks in one suit before committing.';
        keep = run.values.map(value => `${value} ${run.suit === 'dots' ? 'Dot' : run.suit === 'bams' ? 'Bam' : 'Crak'}`);
        break;
      case '13579':
        score = Math.min(100, 15 + odd * 8);
        reason = `${odd} odd tiles already fit the family; keep natural pairs/groups while you collect odds.`;
        keep = s.filter(t => ODD.has(t.value)).map(t => t.label);
        break;
      case 'winds-dragons':
        score = Math.min(100, 15 + honors * 14 + triples.filter(g => g.tile.type === 'wind' || g.tile.type === 'dragon').length * 15);
        reason = `${honors} Wind/Dragon tiles give you a meaningful honors route.`;
        keep = hand.filter(t => t.type === 'wind' || t.type === 'dragon').map(t => t.label);
        break;
      case '369':
        score = Math.min(100, 15 + threeSixNine * 10);
        reason = `${threeSixNine} tiles are 3/6/9; this family is worth keeping alive.`;
        keep = s.filter(t => THREE_SIX_NINE.has(t.value)).map(t => t.label);
        break;
      case 'pairs':
        score = Math.min(100, 12 + pairs.length * 17 - jokers * 4);
        reason = `${pairs.length} natural pair${pairs.length === 1 ? '' : 's'} found; Jokers cannot replace pairs or singles.`;
        keep = pairs.flatMap(g => g.indexes.map(i => hand[i].label));
        break;
    }

    return { ...definition, score: Math.round(score), reason, keep: [...new Set(keep)].slice(0, 6) };
  }

  function analyze(hand) {
    if (!Array.isArray(hand) || hand.length === 0) return [];
    const definitions = [
      { id: '2026', title: '2026 family', tag: '2 · 6 · Soap', advice: 'Protect useful 2s/6s and natural special tiles.' },
      { id: '2468', title: '2468 family', tag: 'Evens', advice: 'Favor 2, 4, 6, 8 and a coherent suit.' },
      { id: 'like', title: 'Any Like Numbers', tag: 'Repeat a rank', advice: 'Keep the strongest repeated number across suits.' },
      { id: 'quints', title: 'Quints', tag: '5-of-a-kind', advice: 'Natural triplets + Jokers are the strongest early signal.' },
      { id: 'run', title: 'Consecutive Run', tag: 'Sequence', advice: 'Protect adjacent numbers in the same suit.' },
      { id: '13579', title: '13579 family', tag: 'Odds', advice: 'Keep natural odd-number groups together.' },
      { id: 'winds-dragons', title: 'Winds & Dragons', tag: 'Honors', advice: 'Protect clustered Winds/Dragons and their groups.' },
      { id: '369', title: '369 family', tag: '3 · 6 · 9', advice: 'Collect recurring 3s, 6s and 9s.' },
      { id: 'pairs', title: 'Singles & Pairs', tag: 'Pair-rich', advice: 'Natural pairs matter; Jokers cannot substitute.' }
    ];
    return definitions.map(def => scoreCandidate(hand, def)).sort((a, b) => b.score - a.score);
  }

  window.americanCardEngine = { analyze };
})();
