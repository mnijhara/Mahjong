(() => {
  'use strict';

  const STORAGE_KEY = 'mahjong-daily-challenge-v1';
  const LAYOUT_KEYS = ['turtle', 'pyramid', 'dragon', 'castle', 'crab'];

  let activeDailyMode = false;
  let activeDailyDate = '';

  // Deterministic Mulberry32 PRNG
  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function hashDateString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getDailyLayoutId(dateStr) {
    const hash = hashDateString(dateStr);
    return LAYOUT_KEYS[hash % LAYOUT_KEYS.length];
  }

  function loadDailyData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { history: {}, currentStreak: 0, maxStreak: 0, lastCompletedDate: '' };
  }

  function saveDailyData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function recordCompletion(dateStr, timeStr, moves) {
    const data = loadDailyData();
    if (!data.history[dateStr]) {
      // Calculate streak
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - 1);
      const prevStr = prevDate.toISOString().slice(0, 10);

      if (data.lastCompletedDate === prevStr) {
        data.currentStreak += 1;
      } else if (data.lastCompletedDate === dateStr) {
        // already today
      } else {
        data.currentStreak = 1;
      }
      if (data.currentStreak > data.maxStreak) {
        data.maxStreak = data.currentStreak;
      }
      data.lastCompletedDate = dateStr;
    }

    data.history[dateStr] = {
      completed: true,
      time: timeStr,
      moves: moves,
      layout: getDailyLayoutId(dateStr),
      completedAt: Date.now()
    };
    saveDailyData(data);
  }

  function showToast(text) {
    document.querySelector('.daily-copy-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'daily-copy-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }

  function copyShareResult(dateStr) {
    const data = loadDailyData();
    const entry = data.history[dateStr];
    if (!entry) return;

    const layoutDef = window.SOLITAIRE_LAYOUTS?.find(l => l.id === entry.layout);
    const layoutName = layoutDef ? `${layoutDef.icon} ${layoutDef.name}` : entry.layout;

    const text = [
      `🀄 Mahjong Daily Challenge`,
      `📅 ${dateStr} · ${layoutName}`,
      `⏱ Time: ${entry.time} | 🎯 Moves: ${entry.moves}`,
      `🔥 Current Streak: ${data.currentStreak} Day${data.currentStreak === 1 ? '' : 's'}`,
      `Play free: https://mnijhara.github.io/Mahjong`
    ].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Result copied to clipboard! 📋'));
    } else {
      showToast('Result ready to share!');
    }
  }

  // ── Build Modal ────────────────────────────────────────────────────────────
  function createDailyModal() {
    if (document.getElementById('dailyChallengeModal')) return;

    const modal = document.createElement('div');
    modal.id = 'dailyChallengeModal';
    modal.className = 'daily-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'dailyModalTitle');

    modal.innerHTML = `
      <div class="daily-modal-card">
        <button class="daily-close-btn" id="dailyCloseBtn" type="button" aria-label="Close Daily Challenge">&times;</button>
        <div class="daily-header-icon">📅</div>
        <p class="daily-eyebrow">Worldwide Daily Puzzle</p>
        <h2 id="dailyModalTitle">Daily Challenge</h2>
        <div class="daily-date-label" id="dailyDateLabel"></div>

        <div class="daily-stats-row">
          <div class="daily-stat-pill">
            <span>Streak</span>
            <strong id="dailyStatStreak">0 🔥</strong>
          </div>
          <div class="daily-stat-pill">
            <span>Best Streak</span>
            <strong id="dailyStatBest">0 🏆</strong>
          </div>
          <div class="daily-stat-pill">
            <span>Total Solved</span>
            <strong id="dailyStatTotal">0 ⭐</strong>
          </div>
        </div>

        <div class="daily-calendar-strip" id="dailyCalendarStrip"></div>

        <div class="daily-today-card" id="dailyTodayCard">
          <div class="daily-today-info">
            <h3 id="dailyCardLayoutTitle">Today's Layout</h3>
            <p id="dailyCardStatus">Ready to play today's board</p>
          </div>
          <div class="daily-today-badge" id="dailyCardBadge">144 Tiles</div>
        </div>

        <div class="daily-actions">
          <button class="daily-btn primary" id="dailyPlayBtn" type="button">Play Today's Challenge ▶</button>
          <button class="daily-btn secondary hidden" id="dailyShareBtn" type="button">Share Result 📋</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#dailyCloseBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#dailyPlayBtn')?.addEventListener('click', () => {
      closeModal();
      startDailyChallenge(getTodayString());
    });

    modal.querySelector('#dailyShareBtn')?.addEventListener('click', () => {
      copyShareResult(getTodayString());
    });
  }

  function updateModalUI() {
    const modal = document.getElementById('dailyChallengeModal');
    if (!modal) return;

    const todayStr = getTodayString();
    const data = loadDailyData();
    const layoutId = getDailyLayoutId(todayStr);
    const layoutDef = window.SOLITAIRE_LAYOUTS?.find(l => l.id === layoutId);
    const todayEntry = data.history[todayStr];

    // Format readable date
    const d = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = d.toLocaleDateString('en-US', options);

    const dateEl = modal.querySelector('#dailyDateLabel');
    if (dateEl) dateEl.textContent = formattedDate;

    // Stats
    const streakEl = modal.querySelector('#dailyStatStreak');
    if (streakEl) streakEl.textContent = `${data.currentStreak} 🔥`;
    const bestEl = modal.querySelector('#dailyStatBest');
    if (bestEl) bestEl.textContent = `${data.maxStreak} 🏆`;
    const totalSolved = Object.keys(data.history).filter(k => data.history[k].completed).length;
    const totalEl = modal.querySelector('#dailyStatTotal');
    if (totalEl) totalEl.textContent = `${totalSolved} ⭐`;

    // 7-Day calendar strip
    const strip = modal.querySelector('#dailyCalendarStrip');
    if (strip) {
      strip.innerHTML = '';
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const cur = new Date();
        cur.setDate(cur.getDate() - i);
        const curStr = cur.toISOString().slice(0, 10);
        const isToday = i === 0;
        const isDone = Boolean(data.history[curStr]?.completed);

        const col = document.createElement('div');
        col.className = `daily-cal-day${isToday ? ' today' : ''}`;
        col.innerHTML = `
          <span class="cal-weekday">${weekdays[cur.getDay()]}</span>
          <span class="cal-date">${cur.getDate()}</span>
          <span class="cal-status-icon">${isDone ? '⭐' : isToday ? '○' : '·'}</span>
        `;
        strip.appendChild(col);
      }
    }

    // Today card info
    const titleEl = modal.querySelector('#dailyCardLayoutTitle');
    if (titleEl) titleEl.textContent = `${layoutDef ? layoutDef.icon : '🀄'} ${layoutDef ? layoutDef.name : layoutId} Layout`;

    const statusEl = modal.querySelector('#dailyCardStatus');
    const playBtn = modal.querySelector('#dailyPlayBtn');
    const shareBtn = modal.querySelector('#dailyShareBtn');

    if (todayEntry?.completed) {
      if (statusEl) statusEl.textContent = `Completed in ${todayEntry.time} (${todayEntry.moves} moves)!`;
      if (playBtn) playBtn.textContent = 'Replay Today\'s Challenge ↻';
      shareBtn?.classList.remove('hidden');
    } else {
      if (statusEl) statusEl.textContent = 'Global seeded board · Guaranteed solvable';
      if (playBtn) playBtn.textContent = 'Play Today\'s Challenge ▶';
      shareBtn?.classList.add('hidden');
    }
  }

  function openModal() {
    createDailyModal();
    updateModalUI();
    const modal = document.getElementById('dailyChallengeModal');
    if (modal) {
      modal.classList.remove('hidden');
      window.mahjongAudio?.playClick();
    }
  }

  function closeModal() {
    const modal = document.getElementById('dailyChallengeModal');
    if (modal) modal.classList.add('hidden');
  }

  // ── Start Daily Challenge Game ─────────────────────────────────────────────
  function startDailyChallenge(dateStr) {
    activeDailyMode = true;
    activeDailyDate = dateStr;

    // 1. Switch to Solitaire style
    const styleSelect = document.getElementById('gameStyle');
    if (styleSelect && styleSelect.value !== 'solitaire') {
      styleSelect.value = 'solitaire';
      styleSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 2. Load the daily layout
    const layoutId = getDailyLayoutId(dateStr);
    const layoutDef = window.SOLITAIRE_LAYOUTS?.find(l => l.id === layoutId);
    if (window.switchSolitaireLayout) {
      window.switchSolitaireLayout(layoutId);
    }

    // 3. Add Banner above Solitaire Board
    document.querySelector('.daily-board-banner')?.remove();
    const boardWrap = document.querySelector('.board-wrap');
    if (boardWrap) {
      const banner = document.createElement('div');
      banner.className = 'daily-board-banner';
      banner.id = 'dailyBoardBanner';
      banner.innerHTML = `<span>📅 DAILY CHALLENGE</span> · ${dateStr} (${layoutDef ? layoutDef.name : layoutId})`;
      boardWrap.appendChild(banner);
    }

    // 4. Trigger Solitaire Start
    const startBtn = document.getElementById('startGame');
    if (startBtn) startBtn.click();
  }

  // ── Seeded Solvable Deck Generator ─────────────────────────────────────────
  function makeDailySolvableDeck(dateStr, solutionOrder, standardTypes, specialPairs) {
    const seed = hashDateString(dateStr);
    const random = mulberry32(seed);

    function seededShuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    const unique = [];
    standardTypes.forEach(t => {
      if (t.kind === 'special') return;
      if (!unique.some(u => u.kind === t.kind && u.suit === t.suit && u.value === t.value && u.key === t.key)) {
        unique.push({ ...t });
      }
    });

    const pairTypes = [];
    unique.forEach(t => {
      pairTypes.push([{ ...t }, { ...t }]);
      pairTypes.push([{ ...t }, { ...t }]);
    });

    const flowers = specialPairs.filter(t => t[1] === 'flower').map(t => ({ kind: 'special', key: 'flower', glyph: t[0], label: t[0] }));
    const seasons = specialPairs.filter(t => t[1] === 'season').map(t => ({ kind: 'special', key: 'season', glyph: t[0], label: t[0] }));
    pairTypes.push([flowers[0], flowers[1]], [flowers[2], flowers[3]], [seasons[0], seasons[1]], [seasons[2], seasons[3]]);

    seededShuffle(pairTypes);

    const deck = new Array(144);
    for (let i = 0; i < 72; i++) {
      const pair = pairTypes[i].slice();
      seededShuffle(pair);
      deck[solutionOrder[i * 2]] = pair[0];
      deck[solutionOrder[i * 2 + 1]] = pair[1];
    }
    return deck;
  }

  // Bind topbar Daily Challenge launcher
  function initDailyButton() {
    const codexBtn = document.getElementById('codexLaunchBtn');
    if (codexBtn && !document.getElementById('dailyChallengeBtn')) {
      const btn = document.createElement('button');
      btn.id = 'dailyChallengeBtn';
      btn.className = 'icon-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open Daily Challenge');
      btn.setAttribute('title', 'Daily Challenge · Worldwide seeded puzzle & daily streak');
      btn.innerHTML = '📅';
      btn.addEventListener('click', openModal);
      codexBtn.parentElement.insertBefore(btn, codexBtn.nextSibling);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createDailyModal();
      initDailyButton();
    });
  } else {
    createDailyModal();
    initDailyButton();
  }

  window.mahjongDaily = {
    openModal,
    isDailyActive: () => activeDailyMode,
    getDailyDate: () => activeDailyDate || getTodayString(),
    getDailyDeck: makeDailySolvableDeck,
    recordCompletion: (timeStr, moves) => {
      if (activeDailyMode) {
        recordCompletion(activeDailyDate || getTodayString(), timeStr, moves);
        document.querySelector('.daily-board-banner')?.remove();
        activeDailyMode = false;
        setTimeout(openModal, 1200);
      }
    }
  };
})();
