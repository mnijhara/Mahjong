(() => {
  'use strict';

  const STORAGE_THEME = 'mahjong-tile-theme';
  const STORAGE_PHOTO = 'mahjong-custom-photo-v2';
  const STORAGE_PHOTO_MODE = 'mahjong-photo-mode-v2';

  const tileThemes = {
    ivory: { label: 'Classic Ivory', face: 'linear-gradient(145deg,#fffefb,#eee9dd)', edge: '#cfc8b9', shadow: '#d4cec1', glyph: '#1c473a', accent: '#c99a45', back: 'linear-gradient(145deg,#f6f1e4,#d9d0bf)', backInk: '#8f7651' },
    jade: { label: 'Jade Green', face: 'linear-gradient(145deg,#eef8f1,#cfe4d8)', edge: '#9db9aa', shadow: '#9ab6a6', glyph: '#174c3b', accent: '#2d8a70', back: 'linear-gradient(145deg,#d8eadf,#9fc4b1)', backInk: '#245d49' },
    ocean: { label: 'Porcelain Blue', face: 'linear-gradient(145deg,#f4f9ff,#d9e5f1)', edge: '#a9b9c9', shadow: '#a8b8c8', glyph: '#244f70', accent: '#4f82aa', back: 'linear-gradient(145deg,#dbeaf5,#a7c5da)', backInk: '#315e7c' },
    rose: { label: 'Rosewood', face: 'linear-gradient(145deg,#fff7f2,#ead8d1)', edge: '#c9aaa0', shadow: '#c5a49a', glyph: '#6b3540', accent: '#a95f6d', back: 'linear-gradient(145deg,#ead8d1,#c99da4)', backInk: '#70414a' },
    ebony: { label: 'Ebony & Gold', face: 'linear-gradient(145deg,#232326,#131314)', edge: '#4a4437', shadow: '#22201c', glyph: '#f2c94c', accent: '#e5b839', back: 'linear-gradient(145deg,#1f1c16,#0d0b07)', backInk: '#ffd700' },
    neon: { label: 'Cyberpunk Neon', face: 'linear-gradient(145deg,#121820,#080c10)', edge: '#00e5ff', shadow: '#005f73', glyph: '#00f0ff', accent: '#ff0055', back: 'linear-gradient(145deg,#1a092b,#090212)', backInk: '#ff007f' },
    contrast: { label: 'High Contrast', face: 'linear-gradient(145deg,#ffffff,#eeeeee)', edge: '#202020', shadow: '#222222', glyph: '#000000', accent: '#000000', back: 'linear-gradient(145deg,#444,#111)', backInk: '#ffffff' },
    crystal: { label: 'Washizu Crystal', face: 'linear-gradient(135deg,rgba(240,250,255,0.8),rgba(195,225,245,0.45))', edge: 'rgba(255,255,255,0.85)', shadow: 'rgba(150,195,215,0.4)', glyph: '#0f4c5c', accent: '#00b4d8', back: 'linear-gradient(135deg,rgba(225,245,255,0.7),rgba(175,220,240,0.45))', backInk: '#0f4c5c' }
  };

  let currentThemeKey = 'ivory';
  let activeFilter = 'natural';
  let activeTarget = 'back';
  let rawPhotoDataUrl = null;
  let processedPhotoDataUrl = null;

  try {
    currentThemeKey = localStorage.getItem(STORAGE_THEME) || 'ivory';
    if (!tileThemes[currentThemeKey]) currentThemeKey = 'ivory';
    rawPhotoDataUrl = localStorage.getItem(STORAGE_PHOTO) || null;
    activeTarget = localStorage.getItem(STORAGE_PHOTO_MODE) || 'back';
  } catch (e) {}

  function applyTileTheme(key) {
    currentThemeKey = tileThemes[key] ? key : 'ivory';
    const theme = tileThemes[currentThemeKey];

    let style = document.getElementById('tile-theme-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tile-theme-style';
      document.head.appendChild(style);
    }

    style.textContent = `
      .tile-customizer{margin-top:14px;width:min(560px,100%)}
      .tile-customizer label{display:block;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8b7158;margin-bottom:8px}
      .tile-customizer .view-label{margin-top:12px}.tile-customizer .view-help{margin:7px 0 0;font-size:10px;line-height:1.45;color:var(--muted)}
      .tile-customizer select{width:100%;min-height:46px;border:1px solid var(--line);border-radius:12px;background:#fffaf2;color:var(--ink);padding:0 42px 0 14px;font:600 13px 'DM Sans',sans-serif;box-shadow:0 5px 16px #243b2b0d;cursor:pointer}
      .tile-customizer select:focus-visible{outline:3px solid ${theme.accent};outline-offset:3px}
      .tile,.american-tile,.chinese-tile{background:${theme.face};border-color:${theme.edge};box-shadow:4px 5px 0 ${theme.shadow},5px 8px 12px #2a382d1d;${currentThemeKey==='crystal'?'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);':''}}
      .tile::after,.chinese-tile::after{border-color:${theme.edge}88}.tile .glyph,.american-glyph,.chinese-glyph{color:${theme.glyph}}.tile.selected,.american-tile.selected,.chinese-tile.selected{outline-color:${theme.accent}88}
      .tile.free:hover,.american-tile:hover,.chinese-tile:hover{box-shadow:4px 8px 0 ${theme.shadow},7px 14px 18px #2a382d2a}.discard-tile{background:${theme.face};border:1px solid ${theme.edge};color:${theme.glyph}}
      .mini-tile-back{background:${theme.back};border-color:${theme.edge}}.mini-tile-back::before{border-color:${theme.edge};color:${theme.backInk}}
      @media(max-width:800px){.tile-customizer{margin-top:12px}}
    `;

    try {
      localStorage.setItem(STORAGE_THEME, currentThemeKey);
    } catch (e) {}

    // Synchronize any active select dropdowns on the page
    const customizerSelect = document.getElementById('tileStyle');
    if (customizerSelect && customizerSelect.value !== currentThemeKey) {
      customizerSelect.value = currentThemeKey;
    }
    const americanSelect = document.getElementById('americanTileStyle');
    if (americanSelect && americanSelect.value !== currentThemeKey) {
      americanSelect.value = currentThemeKey;
    }

    updateSpecimen();
  }

  // Pixel manipulation filters for custom photo tiles
  function processCanvasFilter(img, filterType) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 240;
    const height = 320;
    canvas.width = width;
    canvas.height = height;

    // Draw aspect-fill cover
    const scale = Math.max(width / img.width, height / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    const sx = (width - sw) / 2;
    const sy = (height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh);

    if (filterType === 'natural') {
      return canvas.toDataURL('image/jpeg', 0.85);
    }

    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      if (filterType === 'jade') {
        // Imperial Jade duotone (#123824 to #c1eed5)
        d[i] = Math.round(18 + lum * (193 - 18));
        d[i + 1] = Math.round(56 + lum * (238 - 56));
        d[i + 2] = Math.round(36 + lum * (213 - 36));
      } else if (filterType === 'cinnabar') {
        // Cinnabar red lacquer stamp (#3d0a0a to #e8453c)
        d[i] = Math.round(61 + lum * (232 - 61));
        d[i + 1] = Math.round(10 + lum * (69 - 10));
        d[i + 2] = Math.round(10 + lum * (60 - 10));
      } else if (filterType === 'sepia') {
        // Antique sepia
        d[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        d[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        d[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      } else if (filterType === 'cyber') {
        // Cyberpunk neon
        const high = lum > 0.45 ? 1 : lum * 1.8;
        d[i] = Math.round(lum < 0.3 ? 10 : 255 * high);
        d[i + 1] = Math.round(lum < 0.5 ? 20 : 0);
        d[i + 2] = Math.round(200 * lum + 55);
      } else if (filterType === 'gold') {
        // Metallic Gold duotone (#241904 to #fedc73)
        d[i] = Math.round(36 + lum * (254 - 36));
        d[i + 1] = Math.round(25 + lum * (220 - 25));
        d[i + 2] = Math.round(4 + lum * (115 - 4));
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  function applyCustomPhoto(dataUrl, targetMode) {
    let customStyle = document.getElementById('custom-photo-style');
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'custom-photo-style';
      document.head.appendChild(customStyle);
    }

    if (!dataUrl) {
      document.body.classList.remove('has-custom-back', 'has-custom-face');
      customStyle.textContent = '';
      return;
    }

    if (targetMode === 'back') {
      document.body.classList.add('has-custom-back');
      document.body.classList.remove('has-custom-face');
      customStyle.textContent = `
        :root { --custom-tile-back: url("${dataUrl}"); }
        .mini-tile-back { background-image: url("${dataUrl}") !important; background-size: cover !important; background-position: center !important; }
      `;
    } else {
      document.body.classList.add('has-custom-face');
      document.body.classList.remove('has-custom-back');
      customStyle.textContent = `
        :root { --custom-tile-face: url("${dataUrl}"); }
        .tile, .american-tile, .chinese-tile {
          background-image: linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.72)), url("${dataUrl}") !important;
          background-size: cover !important;
          background-position: center !important;
        }
      `;
    }
  }

  function updateSpecimen() {
    const specimen = document.getElementById('specimenTile');
    if (!specimen) return;
    const theme = tileThemes[currentThemeKey] || tileThemes.ivory;

    specimen.style.background = theme.face;
    specimen.style.borderColor = theme.edge;
    specimen.style.boxShadow = `6px 12px 28px rgba(18, 35, 28, 0.22), 4px 6px 0 ${theme.shadow}`;

    const glyph = specimen.querySelector('.specimen-glyph');
    if (glyph) glyph.style.color = theme.glyph;

    const corner = specimen.querySelector('.specimen-corner');
    if (corner) corner.style.color = theme.accent;

    const suit = specimen.querySelector('.specimen-suit');
    if (suit) suit.style.color = theme.accent;

    if (processedPhotoDataUrl) {
      if (activeTarget === 'back') {
        specimen.style.backgroundImage = `url("${processedPhotoDataUrl}")`;
        specimen.style.backgroundSize = 'cover';
        if (glyph) glyph.style.display = 'none';
        if (corner) corner.style.display = 'none';
        if (suit) suit.style.display = 'none';
      } else {
        specimen.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.65), rgba(255,255,255,0.65)), url("${processedPhotoDataUrl}")`;
        specimen.style.backgroundSize = 'cover';
        if (glyph) glyph.style.display = '';
        if (corner) corner.style.display = '';
        if (suit) suit.style.display = '';
      }
    } else {
      if (glyph) glyph.style.display = '';
      if (corner) corner.style.display = '';
      if (suit) suit.style.display = '';
    }
  }

  function setupModalUI() {
    let modal = document.getElementById('tileStudioModal');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'tileStudioModal';
    modal.className = 'studio-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'studioTitle');

    modal.innerHTML = `
      <div class="studio-dialog">
        <header class="studio-header">
          <div>
            <h2 id="studioTitle">Artisanal Tile Studio</h2>
            <p>Customize handcrafted materials, tactile acoustics, and bespoke photo tiles.</p>
          </div>
          <button class="studio-close" id="studioCloseBtn" type="button" aria-label="Close Studio">✕</button>
        </header>
        <div class="studio-body">
          <div class="specimen-stage" id="specimenStage">
            <div class="specimen-tile-wrap" id="specimenWrap">
              <div class="specimen-tile" id="specimenTile">
                <span class="specimen-corner">8</span>
                <span class="specimen-glyph">萬</span>
                <span class="specimen-suit">CRAK</span>
              </div>
            </div>
            <p class="specimen-hint">Drag or hover to inspect 3D bevel</p>
          </div>
          <div class="studio-controls">
            <div class="studio-section">
              <div class="studio-section-title"><span>Artisanal Material Themes</span></div>
              <div class="material-grid" id="materialGrid"></div>
            </div>

            <div class="studio-section">
              <div class="studio-section-title"><span>Custom Photo Tiles</span></div>
              <label class="photo-upload-dropzone" for="photoInput" id="photoDropzone">
                <input type="file" id="photoInput" accept="image/*">
                <div class="upload-icon">📷</div>
                <strong>Upload Custom Photo</strong>
                <span>Family, pet, portrait or monogram</span>
              </label>

              <div class="studio-section-title" style="margin-top:14px;"><span>Artistic Ceramic Filter</span></div>
              <div class="filter-pills" id="filterPills">
                <button class="filter-pill active" data-filter="natural" type="button">Natural</button>
                <button class="filter-pill" data-filter="jade" type="button">Imperial Jade</button>
                <button class="filter-pill" data-filter="cinnabar" type="button">Cinnabar Seal</button>
                <button class="filter-pill" data-filter="sepia" type="button">Antique Sepia</button>
                <button class="filter-pill" data-filter="cyber" type="button">Cyber Glow</button>
                <button class="filter-pill" data-filter="gold" type="button">Gold Leaf</button>
              </div>

              <div class="studio-section-title" style="margin-top:14px;"><span>Apply Photo To</span></div>
              <div class="target-options" id="targetOptions">
                <button class="target-option active" data-target="back" type="button">Tile Backs (Concealed)</button>
                <button class="target-option" data-target="face" type="button">Tile Faces (Watermarked)</button>
              </div>
            </div>
          </div>
        </div>
        <footer class="studio-footer">
          <button class="studio-reset-btn" id="studioResetBtn" type="button">Reset to Classic Ivory</button>
          <button class="studio-apply-btn" id="studioApplyBtn" type="button">Done</button>
        </footer>
      </div>
    `;

    document.body.appendChild(modal);

    // Build Material Cards
    const grid = modal.querySelector('#materialGrid');
    Object.entries(tileThemes).forEach(([key, theme]) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `material-card${key === currentThemeKey ? ' active' : ''}`;
      card.dataset.theme = key;
      card.innerHTML = `
        <span class="material-preview-dot" style="background:${theme.face};border-color:${theme.edge}"></span>
        <span>${theme.label}</span>
      `;
      card.addEventListener('click', () => {
        grid.querySelectorAll('.material-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        applyTileTheme(key);
        window.mahjongAudio?.playClick();
      });
      grid.appendChild(card);
    });

    // 3D Tile Tilt Physics
    const stage = modal.querySelector('#specimenStage');
    const wrap = modal.querySelector('#specimenWrap');
    if (stage && wrap) {
      stage.addEventListener('mousemove', (e) => {
        const rect = stage.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = -(y / (rect.height / 2)) * 18;
        const rotateY = (x / (rect.width / 2)) * 18;
        wrap.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      stage.addEventListener('mouseleave', () => {
        wrap.style.transform = 'rotateX(0deg) rotateY(0deg)';
      });
    }

    // Photo input handler
    const fileInput = modal.querySelector('#photoInput');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          rawPhotoDataUrl = ev.target.result;
          try {
            localStorage.setItem(STORAGE_PHOTO, rawPhotoDataUrl);
          } catch (err) {}
          processedPhotoDataUrl = processCanvasFilter(img, activeFilter);
          applyCustomPhoto(processedPhotoDataUrl, activeTarget);
          updateSpecimen();
          window.mahjongAudio?.playChime(true);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Filter pill handlers
    modal.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        if (rawPhotoDataUrl) {
          const img = new Image();
          img.onload = () => {
            processedPhotoDataUrl = processCanvasFilter(img, activeFilter);
            applyCustomPhoto(processedPhotoDataUrl, activeTarget);
            updateSpecimen();
          };
          img.src = rawPhotoDataUrl;
        }
        window.mahjongAudio?.playClick();
      });
    });

    // Target option handlers
    modal.querySelectorAll('.target-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.target-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTarget = btn.dataset.target;
        try {
          localStorage.setItem(STORAGE_PHOTO_MODE, activeTarget);
        } catch (e) {}
        if (processedPhotoDataUrl) {
          applyCustomPhoto(processedPhotoDataUrl, activeTarget);
          updateSpecimen();
        }
        window.mahjongAudio?.playClick();
      });
    });

    // Reset button
    modal.querySelector('#studioResetBtn').addEventListener('click', () => {
      rawPhotoDataUrl = null;
      processedPhotoDataUrl = null;
      try {
        localStorage.removeItem(STORAGE_PHOTO);
      } catch (e) {}
      applyCustomPhoto(null, 'back');
      applyTileTheme('ivory');
      grid.querySelectorAll('.material-card').forEach(c => c.classList.toggle('active', c.dataset.theme === 'ivory'));
      updateSpecimen();
      window.mahjongAudio?.playSlide();
    });

    // Done / Close buttons
    const closeBtn = modal.querySelector('#studioCloseBtn');
    const applyBtn = modal.querySelector('#studioApplyBtn');
    const close = () => {
      modal.classList.add('hidden');
      window.mahjongAudio?.playSlide();
    };
    closeBtn.addEventListener('click', close);
    applyBtn.addEventListener('click', close);
  }

  function openStudio() {
    setupModalUI();
    const modal = document.getElementById('tileStudioModal');
    if (modal) {
      modal.classList.remove('hidden');
      updateSpecimen();
      window.mahjongAudio?.playSlide();
    }
  }

  // Launch button in topbar
  function installLaunchButton() {
    if (document.getElementById('tileStudioLaunchBtn')) return;
    const stats = document.querySelector('.stats');
    if (!stats) return;

    const btn = document.createElement('button');
    btn.id = 'tileStudioLaunchBtn';
    btn.className = 'icon-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open Artisanal Tile Studio');
    btn.title = 'Tile Studio · Artisanal Materials & Custom Photo Tiles';
    btn.innerHTML = '✦';
    btn.style.cssText = 'margin-left: 8px; font-size: 15px; color: var(--gold); border-color: #d9cda9; background: #fffcf5;';
    btn.addEventListener('click', openStudio);

    stats.parentNode.insertBefore(btn, document.getElementById('soundBtn'));
  }

  // Initialize
  applyTileTheme(currentThemeKey);
  if (rawPhotoDataUrl) {
    const img = new Image();
    img.onload = () => {
      processedPhotoDataUrl = processCanvasFilter(img, activeFilter);
      applyCustomPhoto(processedPhotoDataUrl, activeTarget);
    };
    img.src = rawPhotoDataUrl;
  }

  window.addEventListener('DOMContentLoaded', () => {
    installLaunchButton();
    setupModalUI();
  });

  window.tileStudio = {
    open: openStudio,
    applyTheme: applyTileTheme,
    themes: tileThemes,
    getTheme: () => currentThemeKey
  };
})();
