(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const SUITS = ['craks', 'bams', 'dots'];
  const SUIT_GLYPHS = { craks: '萬', bams: '竹', dots: '●' };
  const SUIT_NAMES = { craks: 'Crak', bams: 'Bam', dots: 'Dot' };
  const WINDS = [['east', '東'], ['south', '南'], ['west', '西'], ['north', '北']];
  const DRAGONS = [['red', '中'], ['green', '發'], ['white', '白']];
  const FLOWERS = ['梅', '蘭', '菊', '竹', '春', '夏', '秋', '冬'];
  const BOT_NAMES = ['You (Player)', 'Master Lin', 'Wei', 'Mei'];

  let wall = [];
  let discards = [];
  let players = [];
  let currentTurn = 0;
  let phase = 'idle'; // 'idle', 'turn', 'claim', 'finished'
  let started = false;
  let roundWind = 'east';
  let pendingClaim = null; // { tile, fromPlayer, options }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function buildChineseDeck() {
    const tiles = [];
    // 3 Suits 1-9 x 4 copies
    SUITS.forEach(suit => {
      for (let v = 1; v <= 9; v++) {
        for (let copy = 0; copy < 4; copy++) {
          tiles.push({
            id: `${suit}-${v}-${copy}`,
            type: 'suited',
            suit,
            value: v,
            label: `${v} ${SUIT_NAMES[suit]}`,
            glyph: suit === 'craks' ? ['一','二','三','四','五','六','七','八','九'][v - 1] : suit === 'bams' ? '🀐' : '●'
          });
        }
      }
    });

    // 4 Winds x 4 copies
    WINDS.forEach(([key, glyph]) => {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ id: `wind-${key}-${copy}`, type: 'wind', key, label: `${key.toUpperCase()} Wind`, glyph });
      }
    });

    // 3 Dragons x 4 copies
    DRAGONS.forEach(([key, glyph]) => {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ id: `dragon-${key}-${copy}`, type: 'dragon', key, label: `${key.toUpperCase()} Dragon`, glyph });
      }
    });

    // 8 Flowers/Seasons
    FLOWERS.forEach((glyph, idx) => {
      tiles.push({ id: `flower-${idx}`, type: 'flower', key: 'flower', label: `Flower ${glyph}`, glyph });
    });

    return shuffle(tiles);
  }

  function tileKey(tile) {
    if (tile.type === 'suited') return `${tile.suit}-${tile.value}`;
    if (tile.type === 'wind' || tile.type === 'dragon') return `${tile.type}-${tile.key}`;
    return `flower-${tile.glyph}`;
  }

  function sortHand(hand) {
    const suitOrder = { craks: 1, bams: 2, dots: 3, wind: 4, dragon: 5, flower: 6 };
    return hand.sort((a, b) => {
      const oA = suitOrder[a.suit || a.type] || 99;
      const oB = suitOrder[b.suit || b.type] || 99;
      if (oA !== oB) return oA - oB;
      if (a.value && b.value) return a.value - b.value;
      return a.label.localeCompare(b.label);
    });
  }

  // Backtracking Hand Solver: Check if tiles form 1 pair + N melds (triplets or sequences)
  function isWinningHand(hand) {
    if (hand.length % 3 !== 2) return false;

    // Filter out flowers (flowers don't count towards regular 14-tile melds)
    const tiles = hand.filter(t => t.type !== 'flower');
    if (tiles.length % 3 !== 2) return false;

    // Map tiles to canonical keys and counts
    const counts = new Map();
    tiles.forEach(t => {
      const k = tileKey(t);
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    // Special: Seven Pairs (7 distinct pairs = 14 tiles)
    if (tiles.length === 14) {
      let pairs = 0;
      for (const count of counts.values()) {
        if (count === 2 || count === 4) pairs += count / 2;
      }
      if (pairs === 7) return true;
    }

    // Try each possible pair as the "Eye"
    for (const [key, count] of counts.entries()) {
      if (count >= 2) {
        counts.set(key, count - 2);
        if (canDecomposeMelds(counts, (tiles.length - 2) / 3)) {
          counts.set(key, count);
          return true;
        }
        counts.set(key, count);
      }
    }
    return false;
  }

  function canDecomposeMelds(counts, meldsNeeded) {
    if (meldsNeeded === 0) return true;

    // Find first available tile key
    let firstKey = null;
    for (const [key, count] of counts.entries()) {
      if (count > 0) {
        firstKey = key;
        break;
      }
    }
    if (!firstKey) return false;

    // Option A: Triplet (Pung)
    const count = counts.get(firstKey);
    if (count >= 3) {
      counts.set(firstKey, count - 3);
      if (canDecomposeMelds(counts, meldsNeeded - 1)) {
        counts.set(firstKey, count);
        return true;
      }
      counts.set(firstKey, count);
    }

    // Option B: Sequence (Chow) - only for suited tiles
    const parts = firstKey.split('-');
    if (parts.length === 2 && SUITS.includes(parts[0])) {
      const suit = parts[0];
      const val = parseInt(parts[1], 10);
      if (val <= 7) {
        const k2 = `${suit}-${val + 1}`;
        const k3 = `${suit}-${val + 2}`;
        if ((counts.get(k2) || 0) > 0 && (counts.get(k3) || 0) > 0) {
          counts.set(firstKey, counts.get(firstKey) - 1);
          counts.set(k2, counts.get(k2) - 1);
          counts.set(k3, counts.get(k3) - 1);
          if (canDecomposeMelds(counts, meldsNeeded - 1)) {
            counts.set(firstKey, counts.get(firstKey) + 1);
            counts.set(k2, counts.get(k2) + 1);
            counts.set(k3, counts.get(k3) + 1);
            return true;
          }
          counts.set(firstKey, counts.get(firstKey) + 1);
          counts.set(k2, counts.get(k2) + 1);
          counts.set(k3, counts.get(k3) + 1);
        }
      }
    }

    return false;
  }

  function calculateFan(hand, melds, winningTile, isZimo) {
    const allTiles = [...hand, ...melds.flat()];
    let fan = 1; // Base win
    const breakdown = [];

    if (isZimo) {
      fan += 1;
      breakdown.push('Self-Draw (Zimo / 自摸) +1 Fan');
    }

    // Check All Triplets (Toi Toi Hu)
    const hasSequences = melds.some(m => m.length === 3 && m[0].type === 'suited' && m[0].value !== m[1].value);
    if (!hasSequences) {
      fan += 3;
      breakdown.push('All Triplets (Toi Toi Hu / 對對糊) +3 Fan');
    }

    // Check Suits (Pure or Half Flush)
    const suitedTiles = allTiles.filter(t => t.type === 'suited');
    const honors = allTiles.filter(t => t.type === 'wind' || t.type === 'dragon');
    const suitsInHand = new Set(suitedTiles.map(t => t.suit));

    if (suitsInHand.size === 1 && honors.length === 0) {
      fan += 7;
      breakdown.push('Pure One-Suit (Qing Yi Se / 清一色) +7 Fan');
    } else if (suitsInHand.size === 1 && honors.length > 0) {
      fan += 3;
      breakdown.push('Mixed One-Suit (Hun Yi Se / 混一色) +3 Fan');
    }

    // Dragon Triplets
    DRAGONS.forEach(([key, name]) => {
      const dragonCount = allTiles.filter(t => t.type === 'dragon' && t.key === key).length;
      if (dragonCount >= 3) {
        fan += 1;
        breakdown.push(`${key.toUpperCase()} Dragon Pung +1 Fan`);
      }
    });

    if (breakdown.length === 0) {
      breakdown.push('Common Hand (Ping Hu / 平糊) 1 Fan');
    }

    return { fan, breakdown };
  }

  function checkHumanClaims(discardedTile, fromPlayer) {
    if (fromPlayer === 0) return null; // Can't claim your own tile
    const hand = players[0].hand;
    const key = tileKey(discardedTile);

    const matches = hand.filter(t => tileKey(t) === key);
    const canHu = isWinningHand([...hand, discardedTile]);
    const canKong = matches.length === 3;
    const canPung = matches.length >= 2;

    // Chow is only legal from the player to your immediate left (Player 3)
    let canChow = false;
    let chowOptions = [];
    if (fromPlayer === 3 && discardedTile.type === 'suited') {
      const v = discardedTile.value;
      const s = discardedTile.suit;
      const has = (val) => hand.some(t => t.suit === s && t.value === val);

      if (v >= 3 && has(v - 2) && has(v - 1)) chowOptions.push([v - 2, v - 1]);
      if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) chowOptions.push([v - 1, v + 1]);
      if (v <= 7 && has(v + 1) && has(v + 2)) chowOptions.push([v + 1, v + 2]);
      canChow = chowOptions.length > 0;
    }

    if (canHu || canKong || canPung || canChow) {
      return { canHu, canKong, canPung, canChow, chowOptions };
    }
    return null;
  }

  function renderTable() {
    const table = $('chineseTable');
    if (!table) return;

    // Discards
    const grid = $('chineseDiscardGrid');
    if (grid) {
      grid.innerHTML = '';
      discards.slice(-24).forEach((tile, i) => {
        const d = document.createElement('div');
        d.className = `discard-tile${i === discards.length - 1 ? ' last-discard' : ''}`;
        d.textContent = tile.type === 'suited' ? `${tile.value}${SUIT_GLYPHS[tile.suit]}` : tile.glyph;
        d.title = tile.label;
        grid.appendChild(d);
      });
    }

    // Wall Count
    const wallEl = $('chineseWallCount');
    if (wallEl) wallEl.textContent = `Wall: ${wall.length} tiles`;

    // Active Turn Seat Highlighting
    for (let i = 0; i < 4; i++) {
      const seatEl = $(`seat-${i}`);
      if (seatEl) {
        seatEl.classList.toggle('active', started && currentTurn === i && phase !== 'claim');
        const countSpan = seatEl.querySelector('.hand-count');
        if (countSpan && players[i]) {
          countSpan.textContent = `${players[i].hand.length} tiles · ${players[i].melds.length} melds`;
        }
      }
    }

    // Human Melds
    const meldArea = $('chineseMelds');
    if (meldArea && players[0]) {
      meldArea.innerHTML = '';
      players[0].melds.forEach(meld => {
        const grp = document.createElement('div');
        grp.className = 'meld-group';
        meld.forEach(tile => {
          const t = document.createElement('div');
          t.className = 'discard-tile';
          t.textContent = tile.type === 'suited' ? `${tile.value}${SUIT_GLYPHS[tile.suit]}` : tile.glyph;
          grp.appendChild(t);
        });
        meldArea.appendChild(grp);
      });
    }

    // Human Hand
    const handEl = $('chineseHand');
    if (handEl && players[0]) {
      handEl.innerHTML = '';
      const isPlayerTurn = started && currentTurn === 0 && phase === 'turn';
      players[0].hand.forEach((tile, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chinese-tile${index === players[0].hand.length - 1 && players[0].hand.length % 3 === 2 ? ' drawn-tile' : ''}`;
        btn.innerHTML = `
          <span class="tile-corner">${tile.value || tile.glyph}</span>
          <span class="chinese-glyph">${tile.glyph}</span>
          <span class="tile-sub">${tile.suit ? SUIT_NAMES[tile.suit] : ''}</span>
        `;
        btn.title = tile.label;
        if (isPlayerTurn) {
          btn.addEventListener('click', () => discardTile(0, index));
        }
        handEl.appendChild(btn);
      });
    }

    // Status Badge
    const statusEl = $('chineseStatusBadge');
    if (statusEl) {
      statusEl.textContent = !started ? 'Ready' : phase === 'claim' ? 'Claim Available' : currentTurn === 0 ? 'Your Turn (Choose discard)' : `${BOT_NAMES[currentTurn]} thinking…`;
    }
  }

  function showClaimBar(claims, discardedTile, fromPlayer) {
    phase = 'claim';
    let bar = $('chineseClaimBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'chineseClaimBar';
      bar.className = 'claim-bar';
      const container = $('chineseCenterArena');
      if (container) container.appendChild(bar);
    }
    bar.innerHTML = '';

    if (claims.canHu) {
      const btnHu = document.createElement('button');
      btnHu.className = 'claim-btn hu';
      btnHu.textContent = 'HU! (和 / Win)';
      btnHu.addEventListener('click', () => executeClaim('hu', discardedTile, fromPlayer));
      bar.appendChild(btnHu);
    }

    if (claims.canKong) {
      const btnKong = document.createElement('button');
      btnKong.className = 'claim-btn kong';
      btnKong.textContent = 'KONG (槓)';
      btnKong.addEventListener('click', () => executeClaim('kong', discardedTile, fromPlayer));
      bar.appendChild(btnKong);
    }

    if (claims.canPung) {
      const btnPung = document.createElement('button');
      btnPung.className = 'claim-btn pung';
      btnPung.textContent = 'PUNG (碰)';
      btnPung.addEventListener('click', () => executeClaim('pung', discardedTile, fromPlayer));
      bar.appendChild(btnPung);
    }

    if (claims.canChow) {
      const btnChow = document.createElement('button');
      btnChow.className = 'claim-btn chow';
      btnChow.textContent = 'CHOW (吃)';
      btnChow.addEventListener('click', () => executeClaim('chow', discardedTile, fromPlayer, claims.chowOptions[0]));
      bar.appendChild(btnChow);
    }

    const btnPass = document.createElement('button');
    btnPass.className = 'claim-btn pass';
    btnPass.textContent = 'Pass';
    btnPass.addEventListener('click', () => {
      bar.remove();
      phase = 'turn';
      advanceToNextPlayer((fromPlayer + 1) % 4);
    });
    bar.appendChild(btnPass);

    window.mahjongAudio?.playChime(true);
    renderTable();
  }

  function executeClaim(action, tile, fromPlayer, extra) {
    const bar = $('chineseClaimBar');
    if (bar) bar.remove();

    const p = players[0];
    const key = tileKey(tile);

    if (action === 'hu') {
      p.hand.push(tile);
      const score = calculateFan(p.hand, p.melds, tile, false);
      finishGame(0, score);
      return;
    }

    if (action === 'pung') {
      const idxs = [];
      p.hand.forEach((t, i) => { if (tileKey(t) === key && idxs.length < 2) idxs.push(i); });
      const removed = idxs.reverse().map(i => p.hand.splice(i, 1)[0]);
      p.melds.push([...removed, tile]);
      discards.pop();
      currentTurn = 0;
      phase = 'turn';
      window.mahjongAudio?.playChime(true);
      renderTable();
      return;
    }

    if (action === 'kong') {
      const idxs = [];
      p.hand.forEach((t, i) => { if (tileKey(t) === key && idxs.length < 3) idxs.push(i); });
      const removed = idxs.reverse().map(i => p.hand.splice(i, 1)[0]);
      p.melds.push([...removed, tile]);
      discards.pop();
      // Draw replacement tile from dead wall
      if (wall.length) p.hand.push(wall.pop());
      currentTurn = 0;
      phase = 'turn';
      window.mahjongAudio?.playChime(true);
      renderTable();
      return;
    }

    if (action === 'chow' && extra) {
      const [v1, v2] = extra;
      const s = tile.suit;
      const i1 = p.hand.findIndex(t => t.suit === s && t.value === v1);
      const t1 = p.hand.splice(i1, 1)[0];
      const i2 = p.hand.findIndex(t => t.suit === s && t.value === v2);
      const t2 = p.hand.splice(i2, 1)[0];
      p.melds.push([t1, tile, t2].sort((a,b) => a.value - b.value));
      discards.pop();
      currentTurn = 0;
      phase = 'turn';
      window.mahjongAudio?.playChime(true);
      renderTable();
      return;
    }
  }

  function discardTile(playerIndex, tileIndex) {
    if (phase !== 'turn' || currentTurn !== playerIndex) return;
    const tile = players[playerIndex].hand.splice(tileIndex, 1)[0];
    discards.push(tile);
    window.mahjongAudio?.playSlide();

    renderTable();

    // Check if human can claim this discard
    const humanClaims = checkHumanClaims(tile, playerIndex);
    if (humanClaims) {
      showClaimBar(humanClaims, tile, playerIndex);
      return;
    }

    // AI Check for wins
    for (let i = 1; i < 4; i++) {
      if (i !== playerIndex && isWinningHand([...players[i].hand, tile])) {
        players[i].hand.push(tile);
        finishGame(i, calculateFan(players[i].hand, players[i].melds, tile, false));
        return;
      }
    }

    // Advance to next player
    advanceToNextPlayer((playerIndex + 1) % 4);
  }

  function advanceToNextPlayer(nextPlayerIndex) {
    currentTurn = nextPlayerIndex;
    if (wall.length === 0) {
      finishGame(-1, { fan: 0, breakdown: ['Wall exhausted · Draw game (Liuju / 流局)'] });
      return;
    }

    // Next player draws
    const drawn = wall.pop();
    players[currentTurn].hand.push(drawn);
    phase = 'turn';
    renderTable();

    if (currentTurn === 0) {
      // Human turn: check self-draw win
      if (isWinningHand(players[0].hand)) {
        showClaimBar({ canHu: true }, drawn, 0);
      }
    } else {
      // AI turn
      window.setTimeout(() => {
        aiPlayTurn(currentTurn);
      }, 500);
    }
  }

  function aiPlayTurn(aiIndex) {
    if (phase !== 'turn' || currentTurn !== aiIndex) return;
    const p = players[aiIndex];

    // Check if AI won on self-draw
    if (isWinningHand(p.hand)) {
      finishGame(aiIndex, calculateFan(p.hand, p.melds, p.hand[p.hand.length - 1], true));
      return;
    }

    // Choose discard: Discard isolated winds/dragons or edge numbers
    let bestIdx = p.hand.length - 1;
    let minScore = Infinity;

    p.hand.forEach((tile, idx) => {
      let score = 0;
      const count = p.hand.filter(t => tileKey(t) === tileKey(tile)).length;
      score += count * 10;
      if (tile.type === 'suited') {
        const hasAdjacent = p.hand.some(t => t.suit === tile.suit && Math.abs(t.value - tile.value) === 1);
        if (hasAdjacent) score += 5;
      }
      if (score < minScore) {
        minScore = score;
        bestIdx = idx;
      }
    });

    discardTile(aiIndex, bestIdx);
  }

  function finishGame(winnerIndex, scoreResult) {
    phase = 'finished';
    started = false;

    window.mahjongAudio?.playWin();

    let modal = $('chineseWinModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'chineseWinModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');

    const winnerName = winnerIndex >= 0 ? BOT_NAMES[winnerIndex] : 'No one';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-icon">🀄</div>
        <p class="eyebrow">${winnerIndex === 0 ? 'Splendid Victory' : 'Round Complete'}</p>
        <h2>${winnerIndex === 0 ? 'Mahjong!' : `${winnerName} Wins!`}</h2>
        <p>${scoreResult.breakdown.join(' · ')}</p>
        <div class="modal-stats">
          <div><span>SCORE</span><strong>${scoreResult.fan} Fan</strong></div>
          <div><span>DISCARDS</span><strong>${discards.length}</strong></div>
        </div>
        <button class="btn primary full" id="chinesePlayAgainBtn" type="button">Deal Next Hand</button>
      </div>
    `;

    modal.querySelector('#chinesePlayAgainBtn').addEventListener('click', () => {
      modal.classList.add('hidden');
      startGame();
    });
  }

  function startGame() {
    wall = buildChineseDeck();
    discards = [];
    players = [
      { name: 'You', hand: [], melds: [] },
      { name: 'Master Lin', hand: [], melds: [] },
      { name: 'Wei', hand: [], melds: [] },
      { name: 'Mei', hand: [], melds: [] }
    ];

    // Deal 13 tiles to each
    for (let r = 0; r < 13; r++) {
      for (let p = 0; p < 4; p++) {
        players[p].hand.push(wall.pop());
      }
    }

    // East (Seat 0) draws 14th tile
    players[0].hand.push(wall.pop());
    sortHand(players[0].hand);

    currentTurn = 0;
    phase = 'turn';
    started = true;

    window.mahjongAudio?.playClick();
    renderTable();
  }

  function showChinese(show) {
    const table = $('chineseTable');
    if (!table) return;
    table.classList.toggle('hidden', !show);
    if (show && !started) {
      startGame();
    }
  }

  window.startChineseGame = startGame;
  window.showChineseGame = showChinese;
  window.chineseGameState = () => ({ started, phase, wall: wall.length, turn: currentTurn });
})();
