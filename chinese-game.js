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

  // All 34 unique tile templates for Tenpai candidate calculation
  const ALL_CANDIDATE_TILES = [];
  SUITS.forEach(suit => {
    for (let v = 1; v <= 9; v++) {
      ALL_CANDIDATE_TILES.push({
        type: 'suited',
        suit,
        value: v,
        label: `${v} ${SUIT_NAMES[suit]}`,
        glyph: suit === 'craks' ? ['一','二','三','四','五','六','七','八','九'][v - 1] : suit === 'bams' ? '🀐' : '●'
      });
    }
  });
  WINDS.forEach(([key, glyph]) => {
    ALL_CANDIDATE_TILES.push({ type: 'wind', key, label: `${key.toUpperCase()} Wind`, glyph });
  });
  DRAGONS.forEach(([key, glyph]) => {
    ALL_CANDIDATE_TILES.push({ type: 'dragon', key, label: `${key.toUpperCase()} Dragon`, glyph });
  });

  let currentStyle = 'hong-kong'; // 'hong-kong', 'chinese-classical', 'taiwanese', 'riichi'
  let wall = [];
  let deadWall = [];
  let doraIndicator = null;
  let riichiDeclared = [false, false, false, false];
  let riichiPot = 0;
  let playerScores = [25000, 25000, 25000, 25000];

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

  function getDoraTile(indicator) {
    if (!indicator) return null;
    if (indicator.type === 'suited') {
      const nextVal = indicator.value === 9 ? 1 : indicator.value + 1;
      return { type: 'suited', suit: indicator.suit, value: nextVal };
    }
    if (indicator.type === 'wind') {
      const order = ['east', 'south', 'west', 'north'];
      const idx = order.indexOf(indicator.key);
      return { type: 'wind', key: order[(idx + 1) % 4] };
    }
    if (indicator.type === 'dragon') {
      const order = ['white', 'green', 'red'];
      const idx = order.indexOf(indicator.key);
      return { type: 'dragon', key: order[(idx + 1) % 3] };
    }
    return null;
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

    // 8 Flowers/Seasons (only for Hong Kong, Classical, Taiwanese)
    if (currentStyle !== 'riichi') {
      FLOWERS.forEach((glyph, idx) => {
        tiles.push({ id: `flower-${idx}`, type: 'flower', key: 'flower', label: `Flower ${glyph}`, glyph });
      });
    }

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

  function checkCanDeclareRiichi(playerIndex) {
    if (currentStyle !== 'riichi' || riichiDeclared[playerIndex]) return false;
    const p = players[playerIndex];
    if (!p || p.melds.length > 0) return false;
    if (playerScores[playerIndex] < 1000) return false;
    if (p.hand.length % 3 !== 2) return false;

    for (let i = 0; i < p.hand.length; i++) {
      const testHand = p.hand.filter((_, idx) => idx !== i);
      for (const candidate of ALL_CANDIDATE_TILES) {
        if (isWinningHand([...testHand, candidate])) {
          return true;
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

    return { fan, breakdown, unit: 'Fan (番)' };
  }

  function calculateTai(hand, melds, winningTile, isZimo) {
    const allTiles = [...hand, ...melds.flat()];
    let tai = 1;
    const breakdown = ['Base Win (底台) 1 Tai'];

    if (isZimo) {
      tai += 1;
      breakdown.push('Self-Draw (Zimo / 自摸) +1 Tai');
    }
    if (melds.length === 0) {
      tai += 1;
      breakdown.push('Concealed Hand (Men Qing / 門清) +1 Tai');
    }

    const hasSequences = melds.some(m => m.length === 3 && m[0].type === 'suited' && m[0].value !== m[1].value);
    if (!hasSequences) {
      tai += 4;
      breakdown.push('All Triplets (Peng Peng Hu / 碰碰糊) +4 Tai');
    }

    const suitedTiles = allTiles.filter(t => t.type === 'suited');
    const honors = allTiles.filter(t => t.type === 'wind' || t.type === 'dragon');
    const suitsInHand = new Set(suitedTiles.map(t => t.suit));

    if (suitsInHand.size === 1 && honors.length === 0) {
      tai += 8;
      breakdown.push('Pure One-Suit (Qing Yi Se / 清一色) +8 Tai');
    } else if (suitsInHand.size === 1 && honors.length > 0) {
      tai += 4;
      breakdown.push('Mixed One-Suit (Hun Yi Se / 混一色) +4 Tai');
    }

    DRAGONS.forEach(([key, name]) => {
      const dragonCount = allTiles.filter(t => t.type === 'dragon' && t.key === key).length;
      if (dragonCount >= 3) {
        tai += 1;
        breakdown.push(`${key.toUpperCase()} Dragon Pung +1 Tai`);
      }
    });

    return { fan: tai, breakdown, unit: 'Tai (台)' };
  }

  function calculateHan(hand, melds, winningTile, isZimo, winnerIndex = 0) {
    const allTiles = [...hand, ...melds.flat()];
    let han = 0;
    const breakdown = [];

    if (riichiDeclared[winnerIndex]) {
      han += 1;
      breakdown.push('Riichi (立直) +1 Han');
    }
    if (melds.length === 0 && isZimo) {
      han += 1;
      breakdown.push('Menzen Tsumo (門前清自摸和) +1 Han');
    }

    const hasTerminalsOrHonors = allTiles.some(t => t.type !== 'suited' || t.value === 1 || t.value === 9);
    if (!hasTerminalsOrHonors) {
      han += 1;
      breakdown.push('Tanyao (断幺九 / All Simples) +1 Han');
    }

    const hasSequences = melds.some(m => m.length === 3 && m[0].type === 'suited' && m[0].value !== m[1].value);
    if (!hasSequences) {
      han += 2;
      breakdown.push('Toitoi (対々和 / All Triplets) +2 Han');
    }

    DRAGONS.forEach(([key, name]) => {
      const count = allTiles.filter(t => t.type === 'dragon' && t.key === key).length;
      if (count >= 3) {
        han += 1;
        breakdown.push(`Yakuhai: ${key.toUpperCase()} Dragon (役牌) +1 Han`);
      }
    });

    const suitedTiles = allTiles.filter(t => t.type === 'suited');
    const honors = allTiles.filter(t => t.type === 'wind' || t.type === 'dragon');
    const suitsInHand = new Set(suitedTiles.map(t => t.suit));
    if (suitsInHand.size === 1 && honors.length === 0) {
      han += 6;
      breakdown.push('Chinitsu (清一色 / Full Flush) +6 Han');
    } else if (suitsInHand.size === 1 && honors.length > 0) {
      han += 3;
      breakdown.push('Honitsu (混一色 / Half Flush) +3 Han');
    }

    if (doraIndicator) {
      const dora = getDoraTile(doraIndicator);
      if (dora) {
        const doraHits = allTiles.filter(t => {
          if (dora.type === 'suited') return t.type === 'suited' && t.suit === dora.suit && t.value === dora.value;
          if (dora.type === 'wind') return t.type === 'wind' && t.key === dora.key;
          if (dora.type === 'dragon') return t.type === 'dragon' && t.key === dora.key;
          return false;
        }).length;
        if (doraHits > 0) {
          han += doraHits;
          breakdown.push(`Dora (宝牌 × ${doraHits}) +${doraHits} Han`);
        }
      }
    }

    if (breakdown.length === 0) {
      han = 1;
      breakdown.push('Pinfu / Standard Hand (平和) 1 Han');
    }

    return { fan: han, breakdown, unit: 'Han (飜)' };
  }

  function scoreForVariant(hand, melds, winningTile, isZimo, winnerIndex) {
    if (currentStyle === 'taiwanese') {
      return calculateTai(hand, melds, winningTile, isZimo);
    }
    if (currentStyle === 'riichi') {
      return calculateHan(hand, melds, winningTile, isZimo, winnerIndex);
    }
    return calculateFan(hand, melds, winningTile, isZimo);
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

  function updateHeaders() {
    const table = $('chineseTable');
    if (!table) return;
    const kicker = table.querySelector('.chinese-kicker');
    const h2 = table.querySelector('.chinese-header h2');
    if (currentStyle === 'taiwanese') {
      if (kicker) kicker.textContent = 'Taiwanese 16-Tile Mahjong · 5 Melds + 1 Pair · 4 Players';
      if (h2) h2.textContent = 'Formosa 16-Tile Arena';
    } else if (currentStyle === 'riichi') {
      if (kicker) kicker.textContent = 'Japanese Riichi Mahjong · Dora, Riichi & Yaku · 4 Players';
      if (h2) h2.textContent = 'Riichi Mahjong Arena';
    } else if (currentStyle === 'chinese-classical') {
      if (kicker) kicker.textContent = 'Chinese Classical Tradition · 144 Tiles · 4 Players';
      if (h2) h2.textContent = 'Classical Mahjong Table';
    } else {
      if (kicker) kicker.textContent = 'Traditional Chinese · Hong Kong Rules · 4 Players';
      if (h2) h2.textContent = 'Grand Mahjong Table';
    }
  }

  function renderTable() {
    const table = $('chineseTable');
    if (!table) return;

    // Center compass text
    const compass = $('chineseCenterArena')?.querySelector('.discard-compass');
    if (compass) {
      if (currentStyle === 'riichi') compass.textContent = 'Riichi Table · 東一局';
      else if (currentStyle === 'taiwanese') compass.textContent = 'Taiwanese 16-Tile · 東風圈';
      else compass.textContent = 'East Round · 東風局';
    }

    // Riichi HUD
    let riichiHud = $('riichiHud');
    if (currentStyle === 'riichi') {
      if (!riichiHud) {
        riichiHud = document.createElement('div');
        riichiHud.id = 'riichiHud';
        riichiHud.className = 'riichi-hud';
        const arena = $('chineseCenterArena');
        if (arena) arena.insertBefore(riichiHud, arena.firstChild);
      }
      riichiHud.innerHTML = `
        <div class="riichi-round">東一局 · 0 本場</div>
        <div class="riichi-dora-box">
          <span class="dora-tag">DORA 宝牌</span>
          <div class="dora-tile-mini" title="Dora Indicator: ${doraIndicator ? doraIndicator.label : ''}">
            <span>${doraIndicator ? doraIndicator.glyph : ''}</span>
            <small>${doraIndicator?.value || ''}</small>
          </div>
        </div>
        <div class="riichi-stick-pot" title="Riichi Stick Deposit">
          <div class="riichi-stick"></div>
          <span>${riichiPot} pts</span>
        </div>
      `;
    } else if (riichiHud) {
      riichiHud.remove();
    }

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

    // Active Turn Seat Highlighting & Scores
    for (let i = 0; i < 4; i++) {
      const seatEl = $(`seat-${i}`);
      if (seatEl) {
        seatEl.classList.toggle('active', started && currentTurn === i && phase !== 'claim');
        const countSpan = seatEl.querySelector('.hand-count');
        if (countSpan && players[i]) {
          let extra = '';
          if (currentStyle === 'riichi') {
            extra = ` · <span class="seat-score-badge${riichiDeclared[i] ? ' riichi-active' : ''}">${playerScores[i].toLocaleString()} pts${riichiDeclared[i] ? ' [立直]' : ''}</span>`;
          }
          countSpan.innerHTML = `${players[i].hand.length} tiles · ${players[i].melds.length} melds${extra}`;
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

    // Riichi Declaration Action Bar
    let riichiBar = $('chineseRiichiBar');
    const isPlayerTurn = started && currentTurn === 0 && phase === 'turn';
    if (isPlayerTurn && checkCanDeclareRiichi(0)) {
      if (!riichiBar) {
        riichiBar = document.createElement('div');
        riichiBar.id = 'chineseRiichiBar';
        riichiBar.className = 'claim-bar';
        const container = $('chineseCenterArena');
        if (container) container.appendChild(riichiBar);
      }
      riichiBar.innerHTML = '';
      const btnRiichi = document.createElement('button');
      btnRiichi.className = 'claim-btn riichi';
      btnRiichi.textContent = 'RIICHI (立直 / Call Riichi)';
      btnRiichi.addEventListener('click', () => {
        riichiDeclared[0] = true;
        playerScores[0] -= 1000;
        riichiPot += 1000;
        window.mahjongAudio?.playChime(true);
        riichiBar.remove();
        const statusEl = $('chineseStatusBadge');
        if (statusEl) statusEl.textContent = 'Riichi Declared! Choose a tile to discard.';
        renderTable();
      });
      riichiBar.appendChild(btnRiichi);
    } else if (riichiBar) {
      riichiBar.remove();
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
      btnHu.textContent = currentStyle === 'riichi' ? 'RON! (栄和 / Win)' : 'HU! (和 / Win)';
      btnHu.addEventListener('click', () => executeClaim('hu', discardedTile, fromPlayer));
      bar.appendChild(btnHu);
    }

    if (claims.canKong && !riichiDeclared[0]) {
      const btnKong = document.createElement('button');
      btnKong.className = 'claim-btn kong';
      btnKong.textContent = 'KONG (槓)';
      btnKong.addEventListener('click', () => executeClaim('kong', discardedTile, fromPlayer));
      bar.appendChild(btnKong);
    }

    if (claims.canPung && !riichiDeclared[0]) {
      const btnPung = document.createElement('button');
      btnPung.className = 'claim-btn pung';
      btnPung.textContent = 'PUNG (碰)';
      btnPung.addEventListener('click', () => executeClaim('pung', discardedTile, fromPlayer));
      bar.appendChild(btnPung);
    }

    if (claims.canChow && !riichiDeclared[0]) {
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
      const score = scoreForVariant(p.hand, p.melds, tile, false, 0);
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
      // Draw replacement tile
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

    // Remove any riichi declaration bar
    const riichiBar = $('chineseRiichiBar');
    if (riichiBar) riichiBar.remove();

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
        finishGame(i, scoreForVariant(players[i].hand, players[i].melds, tile, false, i));
        return;
      }
    }

    // Advance to next player
    advanceToNextPlayer((playerIndex + 1) % 4);
  }

  function advanceToNextPlayer(nextPlayerIndex) {
    currentTurn = nextPlayerIndex;
    if (wall.length === 0) {
      finishGame(-1, { fan: 0, breakdown: ['Wall exhausted · Draw game (Liuju / 流局)'], unit: 'Pts' });
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
      const delay = (typeof window !== 'undefined' && window.navigator?.webdriver) ? 20 : 500;
      window.setTimeout(() => {
        aiPlayTurn(currentTurn);
      }, delay);
    }
  }

  function aiPlayTurn(aiIndex) {
    if (phase !== 'turn' || currentTurn !== aiIndex) return;
    const p = players[aiIndex];

    // Check if AI won on self-draw
    if (isWinningHand(p.hand)) {
      finishGame(aiIndex, scoreForVariant(p.hand, p.melds, p.hand[p.hand.length - 1], true, aiIndex));
      return;
    }

    // AI Riichi check
    if (currentStyle === 'riichi' && !riichiDeclared[aiIndex] && p.melds.length === 0 && playerScores[aiIndex] >= 1000) {
      if (checkCanDeclareRiichi(aiIndex) && Math.random() < 0.4) {
        riichiDeclared[aiIndex] = true;
        playerScores[aiIndex] -= 1000;
        riichiPot += 1000;
        window.mahjongAudio?.playChime(true);
      }
    }

    // Choose discard
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
    const unitLabel = scoreResult.unit || (currentStyle === 'taiwanese' ? 'Tai' : currentStyle === 'riichi' ? 'Han' : 'Fan');

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-icon">🀄</div>
        <p class="eyebrow">${winnerIndex === 0 ? 'Splendid Victory' : 'Round Complete'}</p>
        <h2>${winnerIndex === 0 ? 'Mahjong!' : `${winnerName} Wins!`}</h2>
        <p>${scoreResult.breakdown.join(' · ')}</p>
        <div class="modal-stats">
          <div><span>SCORE</span><strong>${scoreResult.fan} ${unitLabel}</strong></div>
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

  function startGame(styleName) {
    if (styleName) {
      currentStyle = styleName;
    } else if ($('gameStyle')) {
      const gs = $('gameStyle').value;
      if (['hong-kong', 'chinese-classical', 'taiwanese', 'riichi'].includes(gs)) {
        currentStyle = gs;
      }
    }

    wall = buildChineseDeck();
    discards = [];
    riichiDeclared = [false, false, false, false];
    riichiPot = 0;
    playerScores = [25000, 25000, 25000, 25000];

    if (currentStyle === 'riichi') {
      deadWall = wall.splice(-14, 14);
      doraIndicator = deadWall[2];
    } else {
      deadWall = [];
      doraIndicator = null;
    }

    players = [
      { name: 'You', hand: [], melds: [] },
      { name: 'Master Lin', hand: [], melds: [] },
      { name: 'Wei', hand: [], melds: [] },
      { name: 'Mei', hand: [], melds: [] }
    ];

    // Deal: 16 tiles for Taiwanese, 13 tiles for others
    const handSize = currentStyle === 'taiwanese' ? 16 : 13;
    for (let r = 0; r < handSize; r++) {
      for (let p = 0; p < 4; p++) {
        players[p].hand.push(wall.pop());
      }
    }

    // East (Seat 0) draws opening extra tile (17th for Taiwanese, 14th for others)
    players[0].hand.push(wall.pop());
    sortHand(players[0].hand);

    currentTurn = 0;
    phase = 'turn';
    started = true;

    updateHeaders();
    window.mahjongAudio?.playClick();
    renderTable();
  }

  function showChinese(show, styleName) {
    const table = $('chineseTable');
    if (!table) return;
    table.classList.toggle('hidden', !show);
    if (show) {
      const styleChanged = Boolean(styleName && styleName !== currentStyle);
      if (styleName) currentStyle = styleName;
      if (!started || styleChanged) {
        startGame(styleName);
      }
    }
  }

  window.startChineseGame = startGame;
  window.showChineseGame = showChinese;
  window.chineseGameState = () => ({
    started,
    phase,
    wall: wall.length,
    turn: currentTurn,
    style: currentStyle,
    dora: doraIndicator ? doraIndicator.label : null,
    handSize: players[0]?.hand?.length || 0
  });

  $('chineseStartBtn')?.addEventListener('click', () => startGame());
})();
