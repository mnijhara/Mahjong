(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const table = $('americanTable');
  if (!table) return;

  const names = ['East', 'South', 'West', 'North'];
  const suitGlyph = { dots: '●', bams: '竹', craks: '萬' };
  const suitName = { dots: 'Dot', bams: 'Bam', craks: 'Crak' };
  const winds = [['east','東'],['south','南'],['west','西'],['north','北']];
  const dragons = [['red','中'],['green','發'],['white','白']];

  let players = [], wall = [], discards = [], phase = 'idle', passIndex = 0, selected = [], turn = 0, started = false;

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function buildSet() {
    const tiles = [];
    for (const suit of ['dots','bams','craks']) for (let value = 1; value <= 9; value++) for (let n = 0; n < 4; n++) {
      tiles.push({ id: `${suit}-${value}-${n}`, type: 'suited', suit, value, label: `${value} ${suitName[suit]}`, glyph: suitGlyph[suit] });
    }
    for (const [key, glyph] of winds) for (let n = 0; n < 4; n++) tiles.push({ id: `${key}-${n}`, type: 'wind', key, label: `${key} Wind`, glyph });
    for (const [key, glyph] of dragons) for (let n = 0; n < 4; n++) tiles.push({ id: `${key}-dragon-${n}`, type: 'dragon', key, label: `${key} Dragon`, glyph });
    for (let n = 1; n <= 8; n++) tiles.push({ id: `flower-${n}`, type: 'flower', key: 'flower', label: `Flower ${n}`, glyph: '✿' });
    for (let n = 1; n <= 8; n++) tiles.push({ id: `joker-${n}`, type: 'joker', key: 'joker', label: 'Joker', glyph: '★' });
    if (tiles.length !== 152) throw new Error(`American set must contain 152 tiles, got ${tiles.length}`);
    return shuffle(tiles);
  }

  function setStatus(text) {
    const el = $('americanStatus');
    if (el) el.textContent = text;
  }

  function updateStats() {
    const time = $('time');
    const moves = $('moves');
    const pairs = $('pairs');
    const labels = document.querySelectorAll('.stats span');
    if (labels.length >= 3) { labels[0].textContent = 'PHASE'; labels[1].textContent = 'WALL'; labels[2].textContent = 'HAND'; }
    if (time) time.textContent = phase === 'charleston' ? `PASS ${passIndex + 1}/3` : phase === 'play' ? 'PLAY' : 'READY';
    if (moves) moves.textContent = started ? String(wall.length) : '—';
    if (pairs) pairs.textContent = started ? `${players[0]?.hand.length || 0} tiles` : 'Ready';
  }

  function tileButton(tile, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `american-tile${selected.includes(index) ? ' selected' : ''}`;
    button.setAttribute('aria-label', tile.label + (tile.type === 'joker' ? ', Joker' : ''));
    button.innerHTML = `<span class="american-glyph">${tile.glyph}</span><span class="american-value">${tile.type === 'suited' ? tile.value : tile.type === 'joker' ? 'J' : tile.type === 'flower' ? 'F' : tile.key?.[0]?.toUpperCase() || ''}</span>`;
    button.addEventListener('click', () => toggleSelected(index));
    return button;
  }

  function renderHand() {
    const hand = $('americanHand');
    if (!hand) return;
    hand.innerHTML = '';
    const sorted = players[0]?.hand || [];
    sorted.forEach((tile, index) => hand.appendChild(tileButton(tile, index)));
    const count = $('americanSelection');
    if (count) count.textContent = !started ? 'Start a hand to begin the Charleston' : selected.length ? `${selected.length} / 3 selected` : 'Select 3 tiles to pass';
    const pass = $('americanPass');
    if (pass) pass.disabled = phase !== 'charleston' || selected.length !== 3;
    const start = $('americanStart');
    if (start) start.textContent = started ? 'New hand ↻' : 'Start game';
  }

  function renderPlayers() {
    const rack = $('americanPlayers');
    if (!rack) return;
    rack.innerHTML = '';
    if (!started) {
      const empty = document.createElement('div');
      empty.className = 'american-empty-state';
      empty.innerHTML = '<strong>Ready to play</strong><span>Deal a new hand to begin the Charleston.</span>';
      rack.appendChild(empty);
      return;
    }
    players.forEach((player, index) => {
      const card = document.createElement('section');
      card.className = `player-card${index === 0 ? ' human' : ''}${index === turn && phase === 'play' ? ' active' : ''}`;
      card.innerHTML = `<div class="player-head"><strong>${names[index]}</strong><span>${index === 0 ? 'You' : 'Computer'}</span></div><div class="rack-count">${player.hand.length} tiles</div><div class="mini-rack" aria-label="${names[index]} hidden rack"></div>`;
      rack.appendChild(card);
    });
  }

  function renderDiscard() {
    const center = $('americanDiscards');
    if (!center) return;
    center.innerHTML = '';
    discards.slice(-12).forEach(tile => {
      const el = document.createElement('div');
      el.className = 'discard-tile';
      el.title = tile.label;
      el.textContent = tile.glyph;
      center.appendChild(el);
    });
  }

  function render() {
    renderHand(); renderPlayers(); renderDiscard(); updateStats();
  }

  function toggleSelected(index) {
    if (phase !== 'charleston') return;
    if (players[0].hand[index].type === 'joker') { setStatus('Jokers cannot be passed during the Charleston.'); return; }
    if (selected.includes(index)) selected = selected.filter(i => i !== index);
    else if (selected.length < 3) selected = [...selected, index];
    else setStatus('Choose exactly three tiles for this pass.');
    renderHand();
  }

  function chooseAiPass(hand) {
    const candidates = hand.map((tile, index) => ({ tile, index })).filter(x => x.tile.type !== 'joker');
    shuffle(candidates);
    return candidates.slice(0, 3).map(x => x.index).sort((a,b) => b-a);
  }

  function exchange(direction) {
    const incoming = players.map(() => []);
    players.forEach((player, index) => {
      const picks = index === 0 ? [...selected].sort((a,b) => b-a) : chooseAiPass(player.hand);
      const outgoing = picks.map(i => player.hand[i]);
      picks.forEach(i => player.hand.splice(i, 1));
      const target = (index + direction + 4) % 4;
      incoming[target].push(...outgoing);
    });
    players.forEach((player, index) => player.hand.push(...incoming[index]));
    selected = [];
  }

  function passCharleston() {
    if (phase !== 'charleston' || selected.length !== 3) return;
    const directions = [1, 2, 3];
    exchange(directions[passIndex]);
    passIndex++;
    if (passIndex >= 3) {
      phase = 'play'; turn = 0;
      players[0].hand.sort((a,b) => a.label.localeCompare(b.label));
      setStatus('Charleston complete. East has 14 tiles and starts by discarding.');
    } else {
      setStatus(`Pass ${passIndex + 1}: choose three tiles to pass ${directions[passIndex] === 1 ? 'right' : directions[passIndex] === 2 ? 'across' : 'left'}.`);
    }
    render();
  }

  function discard(index) {
    if (phase !== 'play' || turn !== 0) return;
    const tile = players[0].hand[index];
    players[0].hand.splice(index, 1);
    discards.push(tile);
    setStatus(`You discarded ${tile.label}. Computer turns are next in this practice table.`);
    render();
  }

  function startGame() {
    wall = buildSet();
    players = names.map((name) => ({ name, hand: [] }));
    for (let round = 0; round < 13; round++) for (const player of players) player.hand.push(wall.pop());
    players[0].hand.push(wall.pop());
    players.forEach(player => player.hand.sort((a,b) => a.label.localeCompare(b.label)));
    discards = []; selected = []; passIndex = 0; turn = 0; phase = 'charleston'; started = true;
    setStatus('First Charleston: choose three unwanted tiles. Jokers cannot be passed.');
    const title = $('styleNoteTitle');
    const copy = $('styleNoteCopy');
    if (title) title.textContent = 'American Mah Jongg';
    if (copy) copy.textContent = '152-tile table · 4 players · Charleston first · 13-tile hands, East starts with 14.';
    render();
  }

  function showAmerican(show) {
    table.classList.toggle('hidden', !show);
    const solitaire = document.querySelector('.game-card');
    if (solitaire) solitaire.classList.toggle('hidden', show);
    const actions = document.querySelector('.actions');
    if (actions) actions.classList.toggle('hidden', show);
    if (show) {
      if (!started) {
        phase = 'idle';
        setStatus('Ready to deal a new hand.');
        render();
      }
    }
  }

  window.startAmericanGame = startGame;
  window.showAmericanGame = showAmerican;

  $('americanPass')?.addEventListener('click', passCharleston);
  $('americanStart')?.addEventListener('click', startGame);
  $('americanHand')?.addEventListener('click', (event) => {
    const tile = event.target.closest('.american-tile');
    if (!tile || phase !== 'play') return;
    const buttons = [...$('americanHand').querySelectorAll('.american-tile')];
    const index = buttons.indexOf(tile);
    if (index >= 0) discard(index);
  });

  updateStats();
})();
