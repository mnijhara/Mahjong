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
    if (suggestedBtn) {
      suggestedBtn.setAttribute('aria-pressed', String(visible));
      suggestedBtn.textContent = visible ? 'Suggested hands' : 'Show suggestions';
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

  configBtn?.addEventListener('click', () => openSettings(!settings.classList.contains('open')));
  suggestedBtn?.addEventListener('click', () => {
    const visible = !insights || insights.classList.contains('hidden');
    setInsightsVisible(visible);
    if (visible) insights?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  setInsightsVisible(true);
  setPhaseLabel();

  const status = $('americanStatus');
  if (status) new MutationObserver(setPhaseLabel).observe(status, { childList: true, characterData: true, subtree: true });

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
