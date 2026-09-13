(() => {
  'use strict';

  const STORAGE_KEY = 'mahjong-stats-v1';
  const LAYOUT_KEYS = ['turtle', 'pyramid', 'dragon', 'castle', 'crab'];

  function getDefaultStats() {
    const layouts = {};
    LAYOUT_KEYS.forEach(k => {
      layouts[k] = { played: 0, won: 0, bestTime: '—', bestSeconds: Infinity, bestMoves: '—' };
    });
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      longestCombo: 0,
      totalTilesMatched: 0,
      layouts
    };
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure all layout keys exist
        LAYOUT_KEYS.forEach(k => {
          if (!parsed.layouts[k]) {
            parsed.layouts[k] = { played: 0, won: 0, bestTime: '—', bestSeconds: Infinity, bestMoves: '—' };
          }
        });
        return parsed;
      }
    } catch (e) {}
    return getDefaultStats();
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function recordGameStart(layoutId) {
    const stats = loadStats();
    stats.gamesPlayed += 1;
    if (stats.layouts[layoutId]) {
      stats.layouts[layoutId].played += 1;
    }
    saveStats(stats);
  }

  function recordTileMatch(comboStreak) {
    const stats = loadStats();
    stats.totalTilesMatched += 2;
    if (comboStreak > stats.longestCombo) {
      stats.longestCombo = comboStreak;
    }
    saveStats(stats);
  }

  function recordGameWin(layoutId, timeStr, seconds, moves) {
    const stats = loadStats();
    stats.gamesWon += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }

    const layout = stats.layouts[layoutId];
    if (layout) {
      layout.won += 1;
      if (seconds < layout.bestSeconds) {
        layout.bestSeconds = seconds;
        layout.bestTime = timeStr;
      }
      if (layout.bestMoves === '—' || moves < layout.bestMoves) {
        layout.bestMoves = moves;
      }
    }
    saveStats(stats);
  }

  function resetStats() {
    if (confirm('Are you sure you want to reset all Mahjong statistics and personal bests?')) {
      const stats = getDefaultStats();
      saveStats(stats);
      updateModalUI();
    }
  }

  // ── Build Modal ────────────────────────────────────────────────────────────
  function createStatsModal() {
    if (document.getElementById('mahjongStatsModal')) return;

    const modal = document.createElement('div');
    modal.id = 'mahjongStatsModal';
    modal.className = 'stats-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'statsModalTitle');

    modal.innerHTML = `
      <div class="stats-modal-card">
        <button class="stats-close-btn" id="statsCloseBtn" type="button" aria-label="Close Statistics">&times;</button>
        <div class="stats-header-icon">📊</div>
        <p class="stats-eyebrow">Personal Records</p>
        <h2 id="statsModalTitle">Your Statistics</h2>

        <div class="stats-grid">
          <div class="stats-tile">
            <span>Win Rate</span>
            <strong id="statWinRate">0%</strong>
            <small id="statWinFraction">0 won of 0 played</small>
          </div>
          <div class="stats-tile">
            <span>Win Streak</span>
            <strong id="statStreak">0 🔥</strong>
            <small id="statMaxStreak">Best: 0 in a row</small>
          </div>
          <div class="stats-tile">
            <span>Max Combo</span>
            <strong id="statCombo">⚡ x0</strong>
            <small id="statTilesMatched">0 tiles matched</small>
          </div>
          <div class="stats-tile">
            <span>Daily Challenges</span>
            <strong id="statDailyStreak">0 📅</strong>
            <small id="statDailyCompleted">Active streak</small>
          </div>
        </div>

        <div class="stats-table-heading">Best Records by Board Layout</div>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Layout</th>
              <th>Best Time</th>
              <th>Best Moves</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody id="statsTableBody"></tbody>
        </table>

        <button class="stats-reset-link" id="statsResetBtn" type="button">Reset statistics…</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#statsCloseBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#statsResetBtn')?.addEventListener('click', resetStats);
  }

  function updateModalUI() {
    const modal = document.getElementById('mahjongStatsModal');
    if (!modal) return;

    const stats = loadStats();
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

    const winRateEl = modal.querySelector('#statWinRate');
    if (winRateEl) winRateEl.textContent = `${winRate}%`;

    const fracEl = modal.querySelector('#statWinFraction');
    if (fracEl) fracEl.textContent = `${stats.gamesWon} won of ${stats.gamesPlayed} played`;

    const streakEl = modal.querySelector('#statStreak');
    if (streakEl) streakEl.textContent = `${stats.currentStreak} 🔥`;

    const maxStreakEl = modal.querySelector('#statMaxStreak');
    if (maxStreakEl) maxStreakEl.textContent = `Best: ${stats.maxStreak} in a row`;

    const comboEl = modal.querySelector('#statCombo');
    if (comboEl) comboEl.textContent = `⚡ x${stats.longestCombo}`;

    const tilesEl = modal.querySelector('#statTilesMatched');
    if (tilesEl) tilesEl.textContent = `${stats.totalTilesMatched} tiles matched`;

    // Daily stats integration if available
    try {
      const dailyRaw = localStorage.getItem('mahjong-daily-challenge-v1');
      if (dailyRaw) {
        const daily = JSON.parse(dailyRaw);
        const dailyStreakEl = modal.querySelector('#statDailyStreak');
        if (dailyStreakEl) dailyStreakEl.textContent = `${daily.currentStreak || 0} 📅`;
        const dailySub = modal.querySelector('#statDailyCompleted');
        const solvedCount = Object.keys(daily.history || {}).filter(k => daily.history[k].completed).length;
        if (dailySub) dailySub.textContent = `${solvedCount} total solved`;
      }
    } catch (e) {}

    // Layout table
    const tbody = modal.querySelector('#statsTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      LAYOUT_KEYS.forEach(k => {
        const layoutDef = window.SOLITAIRE_LAYOUTS?.find(l => l.id === k);
        const name = layoutDef ? `${layoutDef.icon} ${layoutDef.name}` : k;
        const data = stats.layouts[k] || { played: 0, won: 0, bestTime: '—', bestMoves: '—' };
        const rate = data.played > 0 ? `${Math.round((data.won / data.played) * 100)}%` : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="layout-name-cell">${name}</td>
          <td>${data.bestTime}</td>
          <td>${data.bestMoves}</td>
          <td>${rate} <small style="color:var(--muted)">(${data.won}/${data.played})</small></td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  function openModal() {
    createStatsModal();
    updateModalUI();
    const modal = document.getElementById('mahjongStatsModal');
    if (modal) {
      modal.classList.remove('hidden');
      window.mahjongAudio?.playClick();
    }
  }

  function closeModal() {
    const modal = document.getElementById('mahjongStatsModal');
    if (modal) modal.classList.add('hidden');
  }

  // Bind topbar Stats launcher
  function initStatsButton() {
    const dailyBtn = document.getElementById('dailyChallengeBtn');
    const soundBtn = document.getElementById('soundBtn');
    const parent = soundBtn?.parentElement;
    if (parent && !document.getElementById('statsBtn')) {
      const btn = document.createElement('button');
      btn.id = 'statsBtn';
      btn.className = 'icon-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open Statistics');
      btn.setAttribute('title', 'Statistics & Personal Records');
      btn.innerHTML = '📊';
      btn.addEventListener('click', openModal);

      if (dailyBtn && dailyBtn.nextSibling) {
        parent.insertBefore(btn, dailyBtn.nextSibling);
      } else if (soundBtn) {
        parent.insertBefore(btn, soundBtn);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createStatsModal();
      initStatsButton();
    });
  } else {
    createStatsModal();
    initStatsButton();
  }

  window.mahjongStats = {
    openModal,
    recordGameStart,
    recordTileMatch,
    recordGameWin
  };
})();
