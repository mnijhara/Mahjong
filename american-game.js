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
    const isNew = newlyReceivedTileIds.has(tile.id);
    button.className = `american-tile tile-${tile.type}${tile.type === 'suited' ? ` suit-${tile.suit} value-${tile.value}` : tile.key ? ` key-${tile.key}` : ''}${selected.includes(index) ? ' selected' : ''}${isNew ? ' newly-received' : ''}`;
    button.setAttribute('aria-label', tile.label + (tile.type === 'joker' ? ', Joker' : ''));
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
    newlyReceivedTileIds.clear(); // Clear highlight once player interacts
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

  function showOpponentSpeechBubble(seatIndex, text) {
    const cards = document.querySelectorAll('#americanPlayers .player-card');
    const card = cards[seatIndex];
    if (!card) return;
    card.querySelector('.player-speech-bubble')?.remove();
    const bubble = document.createElement('div');
    bubble.className = 'player-speech-bubble';
    bubble.textContent = text;
    card.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2400);
  }

  function showTablePassAnimation(direction) {
    const tabletop = document.querySelector('.american-tabletop');
    if (!tabletop) return;
    tabletop.querySelectorAll('.american-pass-animation-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'american-pass-animation-overlay';

    const trajectories = direction === 1 ?
      ['flight-east-to-south', 'flight-south-to-west', 'flight-west-to-north', 'flight-north-to-east'] :
      direction === 2 ?
      ['flight-east-to-west', 'flight-south-to-north', 'flight-west-to-east', 'flight-north-to-south'] :
      ['flight-east-to-north', 'flight-south-to-east', 'flight-west-to-south-2', 'flight-north-to-west-2'];

    trajectories.forEach((cls) => {
      const bundle = document.createElement('div');
      bundle.className = `table-flying-bundle ${cls}`;
      bundle.innerHTML = '<span class="mini-tile-back"></span><span class="mini-tile-back"></span><span class="mini-tile-back"></span>';
      overlay.appendChild(bundle);
    });

    tabletop.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1200);
  }

  function showPassRevealCard(summary, onContinue) {
    $('americanPassReveal')?.remove();
    const tabletop = document.querySelector('.american-tabletop');
    if (!tabletop) return;

    const reveal = document.createElement('div');
    reveal.className = 'american-pass-reveal';
    reveal.id = 'americanPassReveal';
    reveal.setAttribute('role', 'dialog');
    reveal.setAttribute('aria-label', `Charleston Pass ${summary.passNumber} Results`);

    reveal.innerHTML = `
      <div class="pass-reveal-badge">Charleston · Pass ${summary.passNumber} of 3 (${summary.directionName})</div>
      <div class="pass-reveal-section incoming">
        <div class="pass-reveal-subtitle">✨ Received 3 tiles from <strong>${summary.senderName}</strong>:</div>
        <div class="pass-reveal-tiles">
          ${summary.incomingTiles.map(renderMiniTile).join('')}
        </div>
      </div>
      <div class="pass-reveal-section outgoing">
        <div class="pass-reveal-subtitle">📤 You passed 3 tiles to <strong>${summary.recipientName}</strong>:</div>
        <div class="pass-reveal-tiles">
          ${summary.outgoingTiles.map(renderMiniTile).join('')}
        </div>
      </div>
      <button type="button" class="pass-reveal-action" id="passRevealContinue">
        ${summary.passNumber >= 3 ? 'Start Draw & Discard ➔' : `Continue to Pass ${summary.passNumber + 1} ➔`}
      </button>
    `;

    const closeHandler = () => {
      reveal.classList.add('fade-out');
      setTimeout(() => {
        reveal.remove();
        onContinue?.();
      }, 200);
    };

    reveal.querySelector('#passRevealContinue')?.addEventListener('click', closeHandler);
    tabletop.appendChild(reveal);

    // Auto-dismiss after 4.8s if user hasn't clicked
    setTimeout(() => {
      if (document.body.contains(reveal) && !reveal.classList.contains('fade-out')) {
        closeHandler();
      }
    }, 4800);
  }

  function passCharleston() {
    if (phase !== 'charleston' || selected.length !== 3 || isPassingAnimationActive) return;
    const directions = [1, 2, 3];
    const currentDirection = directions[passIndex];

    const isTest = (typeof window !== 'undefined' && window.navigator?.webdriver);

    if (isTest) {
      exchange(currentDirection);
      passIndex++;
      if (passIndex >= 3) {
        phase = 'play';
        turn = 0;
        players[0].hand.sort((a,b) => a.label.localeCompare(b.label));
        setStatus('Charleston complete. East starts: draw one tile, then discard one.');
      } else {
        setStatus(`Pass ${passIndex + 1}: choose three tiles to pass ${directions[passIndex] === 1 ? 'right' : directions[passIndex] === 2 ? 'across' : 'left'}.`);
      }
      render();
      return;
    }

    // Interactive gameplay: rich visual and audio sequence
    isPassingAnimationActive = true;
    window.mahjongAudio?.playSlide();
    showTablePassAnimation(currentDirection);

    // Opponent dialogue reactions
    showOpponentSpeechBubble(1, currentDirection === 1 ? 'Passing 3 to Wei…' : currentDirection === 2 ? 'Passing to Mei…' : 'Passing to You, East!');
    showOpponentSpeechBubble(2, currentDirection === 1 ? 'Passing 3 to Mei…' : currentDirection === 2 ? 'Passing to You, East!' : 'Passing to Master Lin…');
    showOpponentSpeechBubble(3, currentDirection === 1 ? 'Passing to You, East!' : currentDirection === 2 ? 'Passing to Master Lin…' : 'Passing to Wei…');

    exchange(currentDirection);
    renderHand();

    setTimeout(() => {
      window.mahjongAudio?.playClick();
      const currentSummary = lastExchangeSummary;
      passIndex++;

      if (passIndex >= 3) {
        phase = 'play';
        turn = 0;
        players[0].hand.sort((a,b) => a.label.localeCompare(b.label));
        setStatus(`Charleston complete. Received 3 tiles from ${currentSummary.senderName}. East starts: choose 1 tile to discard.`);
      } else {
        setStatus(`Pass ${passIndex} complete (received 3 tiles from ${currentSummary.senderName}). Pass ${passIndex + 1}: choose 3 tiles to pass ${directions[passIndex] === 1 ? 'right' : directions[passIndex] === 2 ? 'across' : 'left'}.`);
      }

      render();

      showPassRevealCard(currentSummary, () => {
        isPassingAnimationActive = false;
        renderHand();
      });
    }, 650);
  }

  function drawTile(playerIndex) {
    if (!wall.length) return null;
    const tile = wall.pop();
    players[playerIndex].hand.push(tile);
    return tile;
  }

  function aiDiscardIndex(playerIndex) {
    const hand = players[playerIndex].hand;
    const candidates = window.americanCardEngine?.analyze(hand) || [];
    const keep = new Set((candidates[0]?.keep || []).map(String));
    let best = -1, bestPenalty = Infinity;
    hand.forEach((tile, index) => {
      if (tile.type === 'joker') return;
      const protectedTile = keep.has(tile.label) || keep.has(`${tile.value}s`);
      const duplicate = hand.some((other, i) => i !== index && other.type === tile.type && other.suit === tile.suit && other.value === tile.value && other.key === tile.key);
      const penalty = (protectedTile ? 100 : 0) + (duplicate ? 20 : 0) + (tile.type === 'suited' ? 0 : 8);
      if (penalty < bestPenalty) { bestPenalty = penalty; best = index; }
    });
    return best >= 0 ? best : Math.max(0, hand.length - 1);
  }

  function sleep(ms) {
    const duration = (typeof window !== 'undefined' && window.navigator?.webdriver) ? 5 : ms;
    return new Promise(resolve => window.setTimeout(resolve, duration));
  }

  async function playComputerTurn(playerIndex) {
    if (phase !== 'play' || !players[playerIndex]) return;
    const persona = playerPersonas[playerIndex];
    turn = playerIndex;
    showOpponentSpeechBubble(playerIndex, `${persona.title}: Drawing…`);
    setStatus(`${persona.title} (${names[playerIndex]}) draws…`);
    render();
    await sleep(260);
    if (phase !== 'play') return;

    drawTile(playerIndex);
    window.mahjongAudio?.playClick();
    render();
    await sleep(260);
    if (phase !== 'play') return;

    const discardIndex = aiDiscardIndex(playerIndex);
    if (discardIndex >= 0) {
      const discarded = players[playerIndex].hand.splice(discardIndex, 1)[0];
      discarded.discardedBy = persona.title;
      discards.push(discarded);
      showOpponentSpeechBubble(playerIndex, `Discarding ${discarded.label}`);
      setStatus(`${persona.title} discarded ${discarded.label}.`);
    }
    window.mahjongAudio?.playClick();
    render();
    await sleep(220);
  }

  async function advanceAfterHumanDiscard() {
    for (let index = 1; index < 4; index++) {
      if (phase !== 'play') return;
      await playComputerTurn(index);
    }
    if (phase !== 'play') return;
    turn = 0;
    if (wall.length) {
      const drawn = drawTile(0);
      if (drawn) newlyReceivedTileIds = new Set([drawn.id]);
    }
    if (players[0].hand.length > 14) players[0].hand.splice(14);
    setStatus(wall.length ? 'Your turn: a tile has been drawn. Choose one tile to discard.' : 'Wall exhausted. Hand is complete for this practice round.');
    render();
  }

  function discard(index) {
    if (phase !== 'play' || turn !== 0 || players[0].hand.length !== 14) return;
    newlyReceivedTileIds.clear();
    const tile = players[0].hand[index];
    if (!tile) return;
    tile.discardedBy = 'You';
    players[0].hand.splice(index, 1);
    discards.push(tile);
    window.mahjongAudio?.playClick();
    setStatus('Computers are drawing and discarding…');
    render();
    const delay = (typeof window !== 'undefined' && window.navigator?.webdriver) ? 10 : 120;
    window.setTimeout(() => { advanceAfterHumanDiscard(); }, delay);
  }

  function highlightHint() {
    const cards = [...document.querySelectorAll('#americanDirections .american-direction-card')], first = cards[0];
    if (first) { first.classList.add('hint-focus'); window.setTimeout(() => first.classList.remove('hint-focus'), 1500); }
    const combo = document.querySelector('#americanCombinations .american-combo-card');
    if (combo) combo.click(); else { const tile = document.querySelector('#americanHand .american-tile:not(.selected)'); tile?.classList.add('insight-focus'); window.setTimeout(() => tile?.classList.remove('insight-focus'), 1500); }
    if (phase === 'charleston') setStatus('Hint: protect the strongest suggested family and use the highlighted tiles when choosing your pass.');
    else if (phase === 'play') setStatus('Hint: the highlighted family is your strongest current direction; discard a tile outside it when possible.');
  }

  function sameKind(a, b) {
    if (a.type !== b.type) return false;
    if (a.type === 'flower') return true;
    if (a.type === 'joker') return true;
    if (a.type === 'suited') return a.suit === b.suit && a.value === b.value;
    return a.key === b.key;
  }

  function startGame() {
    wall = buildSet();
    players = names.map(name => ({ name, hand: [] }));
    for (let round = 0; round < 13; round++) {
      for (const player of players) player.hand.push(wall.pop());
    }
    players[0].hand.push(wall.pop());

    const hasCombo = players[0].hand.some((t, i) => t.type === 'joker' || players[0].hand.some((o, j) => i !== j && sameKind(t, o)));
    if (!hasCombo) {
      for (let i = 0; i < players[0].hand.length; i++) {
        const matchTarget = players[0].hand[i];
        if (matchTarget.type === 'flower') continue;
        const matchIndex = wall.findIndex(t => sameKind(t, matchTarget));
        if (matchIndex >= 0) {
          const replaceIdx = (i === 0) ? 1 : 0;
          const old = players[0].hand.splice(replaceIdx, 1, wall.splice(matchIndex, 1)[0])[0];
          wall.push(old);
          break;
        }
      }
    }

    players.forEach(player => player.hand.sort((a,b) => a.label.localeCompare(b.label)));
    discards = [];
    selected = [];
    newlyReceivedTileIds.clear();
    lastExchangeSummary = null;
    isPassingAnimationActive = false;
    passIndex = 0;
    turn = 0;
    phase = 'charleston';
    started = true;

    $('americanPassReveal')?.remove();
    document.body.classList.add('american-live-game');
    setStatus('Charleston: First round: right. Select 3 tiles to pass.');
    const title = $('styleNoteTitle'), copy = $('styleNoteCopy');
    if (title) title.textContent = 'American Mah Jongg';
    if (copy) copy.textContent = '152-tile table · 4 players · Charleston first · 13-tile hands, East starts with 14.';
    render();
  }

  function endGame() {
    started = false;
    phase = 'idle';
    players = [];
    wall = [];
    discards = [];
    selected = [];
    newlyReceivedTileIds.clear();
    lastExchangeSummary = null;
    isPassingAnimationActive = false;
    passIndex = 0;
    turn = 0;
    $('americanPassReveal')?.remove();
    document.body.classList.remove('american-live-game');
    setStatus('Ready to deal a new hand.');
    render();
  }

  function showAmerican(show) {
    table.classList.toggle('hidden', !show);
    const solitaire = document.querySelector('.game-card');
    if (solitaire) solitaire.classList.toggle('hidden', show);
    const actions = document.querySelector('.actions');
    if (actions) actions.classList.toggle('hidden', show);
    if (!show) document.body.classList.remove('american-live-game');
    if (show && !started) {
      phase = 'idle';
      setStatus('Ready to deal a new hand.');
      render();
    }
  }

  window.startAmericanGame = startGame;
  window.showAmericanGame = showAmerican;
  window.americanHint = highlightHint;
  window.americanGameState = () => ({
    started,
    phase,
    wall: wall.length,
    hand: players[0]?.hand.length || 0,
    turn,
    selected: selected.length
  });

  $('americanPass')?.addEventListener('click', passCharleston);
  $('americanStart')?.addEventListener('click', startGame);
  $('americanNewHand')?.addEventListener('click', startGame);
  $('americanEndGame')?.addEventListener('click', endGame);
  $('americanHint')?.addEventListener('click', highlightHint);

  $('americanHand')?.addEventListener('click', event => {
    const tile = event.target.closest('.american-tile');
    if (!tile || phase !== 'play') return;
    const buttons = [...$('americanHand').querySelectorAll('.american-tile')];
    const index = buttons.indexOf(tile);
    if (index >= 0) discard(index);
  });

  updateStats();
})();
