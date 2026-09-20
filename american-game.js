(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const table = $('americanTable');
  if (!table) return;

  const names = ['East', 'South', 'West', 'North'];
  const playerPersonas = [
    { name: 'East', title: 'You', avatar: '東', bio: 'Dealer' },
    { name: 'South', title: 'Master Lin', avatar: '林', bio: 'Tactician' },
    { name: 'West', title: 'Wei', avatar: '魏', bio: 'Aggressive' },
    { name: 'North', title: 'Mei', avatar: '梅', bio: 'Quick Builder' }
  ];

  const suitGlyph = { dots: '●', bams: '竹', craks: '萬' };
  const suitName = { dots: 'Dot', bams: 'Bam', craks: 'Crak' };
  const winds = [['east','東'],['south','南'],['west','西'],['north','北']];
  const dragons = [['red','中'],['green','發'],['white','白']];

  let players = [], wall = [], discards = [], phase = 'idle', passIndex = 0, selected = [], turn = 0, started = false;
  let newlyReceivedTileIds = new Set();
  let lastExchangeSummary = null;
  let isPassingAnimationActive = false;

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function buildSet() {
    const tiles = [];
    for (const suit of ['dots','bams','craks']) {
      for (let value = 1; value <= 9; value++) {
        for (let n = 0; n < 4; n++) {
          tiles.push({
            id: `${suit}-${value}-${n}`,
            type: 'suited',
            suit,
            value,
            label: `${value} ${suitName[suit]}`,
            glyph: suitGlyph[suit]
          });
        }
      }
    }
    for (const [key, glyph] of winds) {
      for (let n = 0; n < 4; n++) {
        tiles.push({ id: `${key}-${n}`, type: 'wind', key, label: `${key} Wind`, glyph });
      }
    }
    for (const [key, glyph] of dragons) {
      for (let n = 0; n < 4; n++) {
        tiles.push({ id: `${key}-dragon-${n}`, type: 'dragon', key, label: `${key} Dragon`, glyph });
      }
    }
    for (let n = 1; n <= 8; n++) {
      tiles.push({ id: `flower-${n}`, type: 'flower', key: 'flower', value: n, label: `Flower ${n}`, glyph: '✿' });
    }
    for (let n = 1; n <= 8; n++) {
      tiles.push({ id: `joker-${n}`, type: 'joker', key: 'joker', label: 'Joker', glyph: '★' });
    }
    if (tiles.length !== 152) throw new Error(`American set must contain 152 tiles, got ${tiles.length}`);
    return shuffle(tiles);
  }

  function setStatus(text) {
    const el = $('americanStatus');
    if (el) el.textContent = text;
  }

  function updateStats() {
    const time = $('time'), moves = $('moves'), pairs = $('pairs');
    const labels = document.querySelectorAll('.stats span');
    if (labels.length >= 3) {
      labels[0].textContent = 'PHASE';
      labels[1].textContent = 'WALL';
      labels[2].textContent = 'HAND';
    }
    if (time) time.textContent = phase === 'charleston' ? `PASS ${passIndex + 1}/3` : phase === 'play' ? 'PLAY' : 'READY';
    if (moves) moves.textContent = started ? String(wall.length) : '—';
    if (pairs) pairs.textContent = started ? `${players[0]?.hand.length || 0} tiles` : 'Ready';
  }

  function renderTileFace(tile) {
    if (tile.type === 'suited') {
      const count = tile.value;
      const pipClass = tile.suit === 'dots' ? 'dots' : tile.suit === 'bams' ? 'bams' : 'craks';
      const pips = Array.from({ length: count }, (_, i) =>
        `<span class="tile-pip pip-${i + 1}">${tile.suit === 'dots' ? '●' : tile.suit === 'bams' ? '♣' : '萬'}</span>`
      ).join('');
      return `<span class="tile-corner tile-corner-top">${count}</span><span class="tile-suit-label">${suitName[tile.suit].toUpperCase()}</span><span class="tile-pips ${pipClass}" aria-hidden="true">${pips}</span><span class="tile-center-mark">${tile.suit === 'craks' ? '萬' : tile.suit === 'bams' ? '竹' : '●'}</span><span class="tile-corner tile-corner-bottom">${count}</span>`;
    }
    if (tile.type === 'wind') {
      const windName = tile.key[0].toUpperCase() + tile.key.slice(1);
      return `<span class="tile-corner tile-corner-top">${windName[0]}</span><span class="tile-hanzi wind-hanzi">${tile.glyph}</span><span class="tile-english">${windName} Wind</span>`;
    }
    if (tile.type === 'dragon') {
      const dragonName = tile.key[0].toUpperCase() + tile.key.slice(1);
      return `<span class="tile-corner tile-corner-top">${dragonName[0]}</span><span class="tile-hanzi dragon-hanzi dragon-${tile.key}">${tile.glyph}</span><span class="tile-english">${dragonName} Dragon</span>`;
    }
    if (tile.type === 'flower') {
      return `<span class="tile-corner tile-corner-top">${tile.value}</span><span class="tile-hanzi flower-hanzi">✿</span><span class="tile-english">Flower ${tile.value}</span>`;
    }
    return `<span class="tile-joker-mark">★</span><span class="tile-joker-text">JOKER</span><span class="tile-joker-sub">Wild tile</span>`;
  }

  function renderMiniTile(tile) {
    const glyph = tile.type === 'suited' ? (tile.suit === 'craks' ? ['一','二','三','四','五','六','七','八','九'][tile.value - 1] : tile.glyph) : tile.glyph;
    return `<div class="mini-reveal-tile"><span class="reveal-glyph">${glyph}</span><span class="reveal-label">${tile.label}</span></div>`;
  }

  function tileButton(tile, index) {
    const button = document.createElement('button');
    button.type = 'button';
    const isSelected = selected.includes(index);
    const isNew = newlyReceivedTileIds.has(tile.id);
    button.className = `american-tile tile-${tile.type}${tile.type === 'suited' ? ` suit-${tile.suit} value-${tile.value}` : tile.key ? ` key-${tile.key}` : ''}${isSelected ? ' selected' : ''}${isNew ? ' newly-received' : ''}`;
    button.setAttribute('aria-label', tile.label);
    button.setAttribute('aria-pressed', String(isSelected));
    button.title = tile.label;
    if (isNew) button.dataset.received = 'true';
    button.innerHTML = renderTileFace(tile);
    button.addEventListener('click', () => toggleSelected(index));
    return button;
  }

  function renderHand() {
    const hand = $('americanHand');
    if (!hand) return;
    hand.innerHTML = '';
    const current = players[0]?.hand || [];
    current.forEach((tile, index) => hand.appendChild(tileButton(tile, index)));
    window.updateAmericanInsights?.(current, { started, phase });
    const count = $('americanSelection');
    if (count) {
      count.textContent = !started ? 'Start a hand to begin the Charleston' :
        phase === 'charleston' ? (selected.length ? `${selected.length} / 3 selected` : 'Select 3 tiles to pass') :
        turn === 0 ? 'Your turn · draw, then discard one tile' :
        `${playerPersonas[turn].title} is thinking…`;
    }
    const pass = $('americanPass');
    if (pass) pass.disabled = isPassingAnimationActive || phase !== 'charleston' || selected.length !== 3;
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
      const persona = playerPersonas[index];
      const card = document.createElement('section');
      card.className = `player-card seat-${names[index].toLowerCase()}${index === 0 ? ' human' : ''}${index === turn && phase === 'play' ? ' active' : ''}`;
      card.dataset.seatIndex = String(index);

      const hiddenRack = index === 0 ?
        '<span class="rack-placeholder">Your tiles are shown below</span>' :
        Array.from({ length: player.hand.length }, (_, tileIndex) => `<span class="mini-tile-back" aria-hidden="true"><span>${tileIndex + 1}</span></span>`).join('');

      card.innerHTML = `
        <div class="player-head">
          <div class="player-avatar" aria-hidden="true">${persona.avatar}</div>
          <div class="player-head-info">
            <strong>${names[index]}</strong>
            <span class="player-persona-title">${persona.title} · ${persona.bio}</span>
          </div>
        </div>
        <div class="rack-count">${player.hand.length} tiles${index === 0 ? ' · visible below' : ' · concealed'}</div>
        <div class="mini-rack ${index === 0 ? 'your-rack' : 'opponent-rack'}" aria-label="${index === 0 ? 'Your rack is shown below' : `${persona.title} concealed rack, ${player.hand.length} tiles face down`}" role="img">${hiddenRack}</div>
      `;
      rack.appendChild(card);
    });
  }

  function renderDiscard() {
    const center = $('americanDiscards');
    if (!center) return;
    center.innerHTML = '';
    const recent = discards.slice(-18);
    recent.forEach((tile, idx) => {
      const isLatest = idx === recent.length - 1;
      const el = document.createElement('div');
      el.className = `discard-tile tile-${tile.type}${tile.type === 'suited' ? ` suit-${tile.suit}` : ''}${isLatest ? ' latest-discard' : ''}`;
      el.title = `${tile.label}${tile.discardedBy ? ` (by ${tile.discardedBy})` : ''}`;
      el.textContent = tile.type === 'suited' ? `${tile.value} ${suitGlyph[tile.suit]}` : tile.glyph;
      center.appendChild(el);
    });
  }

  function render() {
    renderHand();
    renderPlayers();
    renderDiscard();
    updateStats();
    window.dispatchEvent(new CustomEvent('mahjong:american-update'));
  }

  function toggleSelected(index) {
    if (phase !== 'charleston' || isPassingAnimationActive) return;
    newlyReceivedTileIds.clear();
    const tile = players[0].hand[index];
    if (!tile) return;
    if (tile.type === 'joker') {
      setStatus('Jokers cannot be passed during the Charleston.');
      return;
    }
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
    let userOutgoing = [];

    players.forEach((player, index) => {
      const picks = index === 0 ? [...selected].sort((a,b) => b-a) : chooseAiPass(player.hand);
      const outgoing = picks.map(i => player.hand[i]);
      if (index === 0) userOutgoing = outgoing.map(t => ({ ...t }));
      picks.forEach(i => player.hand.splice(i, 1));
      const target = (index + direction + 4) % 4;
      incoming[target].push(...outgoing);
    });

    const userIncoming = incoming[0].map(t => ({ ...t }));
    newlyReceivedTileIds = new Set(userIncoming.map(t => t.id));

    players.forEach((player, index) => player.hand.push(...incoming[index]));
    selected = [];

    const senderIdx = (0 - direction + 4) % 4;
    const recipientIdx = (0 + direction) % 4;

    lastExchangeSummary = {
      passNumber: passIndex + 1,
      directionName: direction === 1 ? 'right' : direction === 2 ? 'across' : 'left',
      outgoingTiles: userOutgoing,
      incomingTiles: userIncoming,
      senderName: `${playerPersonas[senderIdx].title} (${names[senderIdx]})`,
      recipientName: `${playerPersonas[recipientIdx].title} (${names[recipientIdx]})`
    };
  }
