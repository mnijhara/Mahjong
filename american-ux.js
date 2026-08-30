(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const settings = $('americanSettings');
  const configBtn = $('americanConfiguration');
  const suggestedBtn = $('americanSuggested');
  const insights = $('americanInsights');
  const tileSelect = $('americanTileStyle');
  const showInsights = $('americanShowInsights');
  const phaseLabel = $('americanPhaseLabel');
  const centerBanner = $('americanCenterBanner');

  function syncTileStyle(value) {
    const mainSelect = $('tileStyle');
    if (mainSelect) {
      mainSelect.value = value;
      mainSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    try { localStorage.setItem('mahjong-tile-theme', value); } catch (e) {}
  }

  function currentTileStyle() {
    try { return localStorage.getItem('mahjong-tile-theme') || 'ivory'; } catch (e) { return 'ivory'; }
  }

  function setInsightsVisible(visible) {
    if (insights) insights.classList.toggle('hidden', !visible);
    document.body.classList.toggle('american-suggestions-open', Boolean(visible));
    if (suggestedBtn) {
      suggestedBtn.setAttribute('aria-pressed', String(visible));
      suggestedBtn.textContent = visible ? 'Hide suggestions' : 'Suggested Hands';
    }
    if (showInsights) showInsights.checked = visible;
  }

  function setPhaseLabel() {
    const status = $('americanStatus')?.textContent || 'Ready';
    if (phaseLabel) {
      if (/Charleston/i.test(status)) phaseLabel.textContent = 'Charleston';
      else if (/draw|discard|turn|computer/i.test(status)) phaseLabel.textContent = 'Play';
      else phaseLabel.textContent = 'Ready';
    }
    if (centerBanner) centerBanner.innerHTML = `${status.replace(/\.$/, '')} <span>· Follow the highlighted controls below</span>`;
  }

  function openSettings(open) {
    if (!settings || !configBtn) return;
    settings.classList.toggle('open', open);
    configBtn.setAttribute('aria-expanded', String(open));
  }

  function injectLiveTableMotionStyles() {
    if ($('americanLiveMotionStyles')) return;
    const style = document.createElement('style');
    style.id = 'americanLiveMotionStyles';
    style.textContent = `
      .american-live-game .player-card.pass-active{outline:2px solid #f2d890;background:#245443;transform:scale(1.025);transition:transform .18s,background .18s,outline .18s;z-index:8}
      .american-live-game .player-card.pass-received::after{content:'3 tiles received';position:absolute;right:8px;bottom:7px;padding:3px 6px;border-radius:999px;background:#f2d890;color:#4b3a1f;font:800 7px/1 'DM Sans',sans-serif;letter-spacing:.04em;box-shadow:0 2px 5px #061c1633;animation:americanPassBadge 1.8s ease forwards}
      .american-live-game .player-card{position:absolute}
      .american-live-game .pass-activity{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:18;display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;background:#173e31ee;color:#fff;box-shadow:0 5px 16px #071d1566;font:700 9px/1 'DM Sans',sans-serif;pointer-events:none;white-space:nowrap;opacity:0;animation:americanPassActivity 1.9s ease forwards}
      .american-live-game .pass-activity .pass-tiles{display:flex;gap:2px}
      .american-live-game .pass-activity .pass-tile{width:9px;height:13px;border-radius:2px;background:linear-gradient(145deg,#fffdf5,#d9d0bf);box-shadow:1px 1px 0 #061c1644}
      @keyframes americanPassBadge{0%{opacity:0;transform:translateY(5px)}18%{opacity:1;transform:translateY(0)}72%{opacity:1}100%{opacity:0;transform:translateY(-3px)}}
      @keyframes americanPassActivity{0%{opacity:0;transform:translate(-50%,-50%) scale(.9)}12%{opacity:1;transform:translate(-50%,-50%) scale(1)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,-62%) scale(.96)}}
      @media(max-width:800px){.american-live-game .pass-activity{font-size:7px;padding:5px 8px;gap:5px}.american-live-game .pass-activity .pass-tile{width:7px;height:10px}.american-live-game .player-card.pass-received::after{right:4px;bottom:4px;font-size:5px;padding:2px 4px}}
    `;
    document.head.appendChild(style);
  }

  function animateCharlestonPass(statusText) {
    if (!document.body.classList.contains('american-live-game')) return;
    const match = statusText.match(/Pass (\d+)\s*:/i);
    if (!match) return;
    const passNumber = Number(match[1]);
    const directions = ['right', 'across', 'left'];
    const direction = directions[Math.min(passNumber - 1, 2)];
    const seats = [...document.querySelectorAll('#americanPlayers .player-card')];
    if (seats.length < 4) return;

    seats.forEach(card => card.classList.remove('pass-active', 'pass-received'));
    document.querySelectorAll('.pass-activity').forEach(el => el.remove());

    const targetIndexes = direction === 'right' ? [1, 2, 3, 0] : direction === 'across' ? [2, 3, 0, 1] : [3, 0, 1, 2];
    targetIndexes.forEach((seatIndex, step) => {
      window.setTimeout(() => {
        const card = seats[seatIndex];
        card?.classList.add('pass-active', 'pass-received');
        window.setTimeout(() => card?.classList.remove('pass-active'), 520);
      }, step * 120);
    });

    const activity = document.createElement('div');
    activity.className = 'pass-activity';
    activity.setAttribute('aria-hidden', 'true');
    activity.innerHTML = `<span>Charleston · pass ${passNumber}/3 ${direction}</span><span class="pass-tiles"><i class="pass-tile"></i><i class="pass-tile"></i><i class="pass-tile"></i></span>`;
    document.querySelector('.american-tabletop')?.appendChild(activity);
    window.setTimeout(() => activity.remove(), 2000);
  }

  function observeLiveTable() {
    const status = $('americanStatus');
    if (!status) return;
    let previous = '';
    new MutationObserver(() => {
      const next = status.textContent || '';
      setPhaseLabel();
      if (next !== previous) {
        previous = next;
        animateCharlestonPass(next);
      }
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }

  configBtn?.addEventListener('click', () => openSettings(!settings.classList.contains('open')));
  suggestedBtn?.addEventListener('click', () => {
    const visible = Boolean(insights && !insights.classList.contains('hidden'));
    setInsightsVisible(!visible);
    if (!visible) insights?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  showInsights?.addEventListener('change', () => setInsightsVisible(showInsights.checked));
  tileSelect?.addEventListener('change', () => syncTileStyle(tileSelect.value));

  $('americanNewHand')?.addEventListener('click', () => window.startAmericanGame?.());
  $('americanHint')?.addEventListener('click', () => {
    if (window.americanHint) { window.americanHint(); return; }
    const combo = document.querySelector('#americanCombinations .american-combo-card');
    if (combo) combo.click();
  });

  if (tileSelect) tileSelect.value = currentTileStyle();
  setInsightsVisible(false);
  setPhaseLabel();
  injectLiveTableMotionStyles();
  observeLiveTable();

  const styleSelect = $('gameStyle');
  if (styleSelect) {
    new MutationObserver(() => {
      document.body.classList.toggle('american-mode', styleSelect.value === 'american');
      setPhaseLabel();
    }).observe(styleSelect, { attributes: true, childList: true, characterData: true });
    styleSelect.addEventListener('change', () => document.body.classList.toggle('american-mode', styleSelect.value === 'american'));
    document.body.classList.toggle('american-mode', styleSelect.value === 'american');
  }
})();
