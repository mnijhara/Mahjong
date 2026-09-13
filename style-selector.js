(() => {
  'use strict';

  const select = document.getElementById('gameStyle');
  const description = document.getElementById('styleDescription');
  const noteTitle = document.getElementById('styleNoteTitle');
  const noteCopy = document.getElementById('styleNoteCopy');
  const start = document.getElementById('startGame');
  if (!select || !description || !noteTitle || !noteCopy || !start) return;

  const styles = {
    american: { playable: true, description: 'American Mah Jongg is the primary mode: four players, 152 tiles, Charleston, Jokers and a 14-tile winning hand.', note: 'Playable table foundation: 152-tile deal, four seats, first Charleston and Joker-safe passing. Card validation, calling, scoring and computer turns are next.' },
    solitaire: { playable: true, description: 'Play the classic single-player matching game with a solvable 144-tile layout, hints, undo and safe shuffle.', note: 'Single-player tile matching with a solvable 144-tile layout.' },
    riichi: { playable: true, description: 'Japanese Riichi Mahjong uses four players, calls such as Chi/Pon/Kan, Riichi declarations and yaku-based winning rules.', note: 'Playable 4-player table with Dora, calls, and winning hand validation.' },
    'hong-kong': { playable: true, description: 'Hong Kong Mahjong is a four-player traditional rules family with regional scoring, live Chow/Pung/Kong/Hu claiming and Fan calculation.', note: 'Playable 4-player table with 144 tiles, live claims, and hand scoring.' },
    'chinese-classical': { playable: true, description: 'Chinese Classical Mahjong is a traditional four-player rules family with 144 tiles and classic hand-building conventions.', note: 'Playable 4-player table with dealer rotation and meld validation.' },
    taiwanese: { playable: true, description: 'Taiwanese Mahjong features 16-tile hands (East starts with 17), 5 melds + 1 pair winning structure, and traditional Tai scoring.', note: 'Playable 16-tile table with dealer rotation, Chow/Pung/Kong claims and Tai scoring.' },
    singapore: { playable: false, description: 'Singapore Mahjong is a four-player variant with its own scoring and special hand rules.', note: 'Planned: Singapore rules and scoring.' }
  };

  const tileThemes = {
    ivory: { label: 'Classic Ivory', face: 'linear-gradient(145deg,#fffefb,#eee9dd)', edge: '#cfc8b9', shadow: '#d4cec1', glyph: '#1c473a', accent: '#c99a45', back: 'linear-gradient(145deg,#f6f1e4,#d9d0bf)', backInk: '#8f7651' },
    jade: { label: 'Jade Green', face: 'linear-gradient(145deg,#eef8f1,#cfe4d8)', edge: '#9db9aa', shadow: '#9ab6a6', glyph: '#174c3b', accent: '#2d8a70', back: 'linear-gradient(145deg,#d8eadf,#9fc4b1)', backInk: '#245d49' },
    ocean: { label: 'Porcelain Blue', face: 'linear-gradient(145deg,#f4f9ff,#d9e5f1)', edge: '#a9b9c9', shadow: '#a8b8c8', glyph: '#244f70', accent: '#4f82aa', back: 'linear-gradient(145deg,#dbeaf5,#a7c5da)', backInk: '#315e7c' },
    rose: { label: 'Rosewood', face: 'linear-gradient(145deg,#fff7f2,#ead8d1)', edge: '#c9aaa0', shadow: '#c5a49a', glyph: '#6b3540', accent: '#a95f6d', back: 'linear-gradient(145deg,#ead8d1,#c99da4)', backInk: '#70414a' },
    ebony: { label: 'Ebony & Gold', face: 'linear-gradient(145deg,#232326,#131314)', edge: '#4a4437', shadow: '#22201c', glyph: '#f2c94c', accent: '#e5b839', back: 'linear-gradient(145deg,#1f1c16,#0d0b07)', backInk: '#ffd700' },
    neon: { label: 'Cyberpunk Neon', face: 'linear-gradient(145deg,#121820,#080c10)', edge: '#00e5ff', shadow: '#005f73', glyph: '#00f0ff', accent: '#ff0055', back: 'linear-gradient(145deg,#1a092b,#090212)', backInk: '#ff007f' },
    contrast: { label: 'High Contrast', face: 'linear-gradient(145deg,#ffffff,#eeeeee)', edge: '#202020', shadow: '#222222', glyph: '#000000', accent: '#000000', back: 'linear-gradient(145deg,#444,#111)', backInk: '#ffffff' }
  };

  function installTileCustomizer() {
    if (document.getElementById('tileCustomizer')) return;
    const wrap = document.createElement('div');
    wrap.id = 'tileCustomizer';
    wrap.className = 'tile-customizer';
    wrap.innerHTML = '<label for="tileStyle">Tile design</label><select id="tileStyle" aria-label="Choose tile design"></select><label class="view-label" for="tableView">Table view</label><select id="tableView" aria-label="Choose table view"><option value="responsive">Responsive</option><option value="landscape">Landscape</option></select><p class="view-help" id="tableViewHelp">Landscape uses a wide table layout for easier play on a rotated phone.</p>';
    const picker = select.closest('.style-picker');
    if (!picker) return;
    picker.appendChild(wrap);
    const tileSelect = wrap.querySelector('#tileStyle');
    Object.entries(tileThemes).forEach(([value, theme]) => { const option = document.createElement('option'); option.value = value; option.textContent = theme.label; tileSelect.appendChild(option); });
    let saved = 'ivory';
    try { saved = localStorage.getItem('mahjong-tile-theme') || 'ivory'; } catch (e) {}
    tileSelect.value = tileThemes[saved] ? saved : 'ivory';
    applyTileTheme(tileSelect.value);
    tileSelect.addEventListener('change', () => { applyTileTheme(tileSelect.value); try { localStorage.setItem('mahjong-tile-theme', tileSelect.value); } catch (e) {} });

    const viewSelect = wrap.querySelector('#tableView');
    let savedView = 'responsive';
    try { savedView = localStorage.getItem('mahjong-table-view') || 'responsive'; } catch (e) {}
    viewSelect.value = savedView === 'landscape' ? 'landscape' : 'responsive';
    applyTableView(viewSelect.value);
    viewSelect.addEventListener('change', () => { applyTableView(viewSelect.value); try { localStorage.setItem('mahjong-table-view', viewSelect.value); } catch (e) {} });
  }

  function ensureLandscapeNotice() {
    let notice = document.getElementById('landscapeRotateNotice');
    const table = document.getElementById('americanTable');
    if (!notice && table) {
      notice = document.createElement('div'); notice.id = 'landscapeRotateNotice'; notice.className = 'landscape-rotate-notice'; notice.setAttribute('role', 'status');
      notice.textContent = 'Rotate your phone to landscape for the full four-seat table.';
      table.parentNode.insertBefore(notice, table);
    }
    return notice;
  }

  function applyTableView(value) {
    const landscape = value === 'landscape';
    document.body.classList.toggle('preferred-landscape', landscape);
    const notice = ensureLandscapeNotice();
    if (notice) notice.setAttribute('aria-hidden', String(!landscape));
    const help = document.getElementById('tableViewHelp');
    if (help) help.textContent = landscape ? 'Landscape uses a wide four-seat table. Rotate the phone to see the full table.' : 'Responsive adapts the table to the current screen size.';
    try {
      if (screen.orientation?.unlock && !landscape) screen.orientation.unlock();
      if (screen.orientation?.lock && landscape) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
  }

  function applyTileTheme(key) {
    const theme = tileThemes[key] || tileThemes.ivory;
    let style = document.getElementById('tile-theme-style');
    if (!style) { style = document.createElement('style'); style.id = 'tile-theme-style'; document.head.appendChild(style); }
    style.textContent = `
      .tile-customizer{margin-top:14px;width:min(560px,100%)}
      .tile-customizer label{display:block;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8b7158;margin-bottom:8px}
      .tile-customizer .view-label{margin-top:12px}.tile-customizer .view-help{margin:7px 0 0;font-size:10px;line-height:1.45;color:var(--muted)}
      .tile-customizer select{width:100%;min-height:46px;border:1px solid var(--line);border-radius:12px;background:#fffaf2;color:var(--ink);padding:0 42px 0 14px;font:600 13px 'DM Sans',sans-serif;box-shadow:0 5px 16px #243b2b0d;cursor:pointer}
      .tile-customizer select:focus-visible{outline:3px solid ${theme.accent};outline-offset:3px}
      .tile,.american-tile,.chinese-tile{background:${theme.face};border-color:${theme.edge};box-shadow:4px 5px 0 ${theme.shadow},5px 8px 12px #2a382d1d}
      .tile::after,.chinese-tile::after{border-color:${theme.edge}88}.tile .glyph,.american-glyph,.chinese-glyph{color:${theme.glyph}}.tile.selected,.american-tile.selected,.chinese-tile.selected{outline-color:${theme.accent}88}
      .tile.free:hover,.american-tile:hover,.chinese-tile:hover{box-shadow:4px 8px 0 ${theme.shadow},7px 14px 18px #2a382d2a}.discard-tile{background:${theme.face};border:1px solid ${theme.edge};color:${theme.glyph}}
      .mini-tile-back{background:${theme.back};border-color:${theme.edge}}.mini-tile-back::before{border-color:${theme.edge};color:${theme.backInk}}
      @media(max-width:800px){.tile-customizer{margin-top:12px}}
    `;
    if (window.tileStudio && window.tileStudio.applyTheme) {
      window.tileStudio.applyTheme(key);
    }
  }

  function renderStyle() {
    const val = select.value;
    const style = styles[val] || styles.american;

    // Apply specific mode classes
    Object.keys(styles).forEach(k => {
      document.body.classList.toggle(`${k}-mode`, val === k);
    });

    const isChineseFamily = val === 'hong-kong' || val === 'chinese-classical' || val === 'riichi' || val === 'taiwanese';
    document.body.classList.toggle('chinese-mode', isChineseFamily);

    description.textContent = style.description;
    noteTitle.textContent = select.options[select.selectedIndex].textContent.split(' — ')[0];
    noteCopy.textContent = style.note;
    start.disabled = !style.playable;
    const resumable = val === 'solitaire' && window.hasSolitaireSave && window.hasSolitaireSave();
    start.textContent = style.playable ? (resumable ? 'Resume game' : 'Start game') : 'Coming soon';
    start.setAttribute('aria-disabled', String(!style.playable));

    if (window.showAmericanGame) window.showAmericanGame(val === 'american');
    if (window.showChineseGame) window.showChineseGame(isChineseFamily, val);

    const solitaireCard = document.querySelector('.game-card');
    if (solitaireCard) solitaireCard.classList.toggle('hidden', val !== 'solitaire');

    const actions = document.querySelector('.actions');
    if (actions) actions.classList.toggle('hidden', val !== 'solitaire');
  }

  installTileCustomizer();
  select.addEventListener('change', () => {
    renderStyle();
    window.mahjongAudio?.playSlide();
  });
  renderStyle();

  start.addEventListener('click', () => {
    const val = select.value;
    if (val === 'hong-kong' || val === 'chinese-classical' || val === 'riichi' || val === 'taiwanese') {
      if (window.startChineseGame) window.startChineseGame(val);
    }
  });

  // Load the viewport fitter only after the DOM and style state exist.
  const fitScript = document.createElement('script');
  fitScript.src = 'solitaire-fit.js?v=20260830-1';
  fitScript.defer = true;
  document.head.appendChild(fitScript);
})();
