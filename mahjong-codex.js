(() => {
  'use strict';

  const CODEX_ID = 'mahjongCodexModal';

  function createCodexModal() {
    if (document.getElementById(CODEX_ID)) return;

    const modal = document.createElement('div');
    modal.id = CODEX_ID;
    modal.className = 'codex-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'codexTitle');

    modal.innerHTML = `
      <div class="codex-card">
        <header class="codex-header">
          <div>
            <p class="codex-kicker">Cultural Heritage & Rules Compendium</p>
            <h2 id="codexTitle" class="codex-title">The Mahjong Codex</h2>
          </div>
          <button type="button" class="codex-close-btn" id="codexCloseBtn" aria-label="Close Codex">✕</button>
        </header>

        <nav class="codex-tabs" aria-label="Codex sections">
          <button type="button" class="codex-tab active" data-tab="traditions">5 Traditions Compared</button>
          <button type="button" class="codex-tab" data-tab="anatomy">Tile Anatomy</button>
          <button type="button" class="codex-tab" data-tab="heritage">History & Diaspora</button>
          <button type="button" class="codex-tab" data-tab="etiquette">Table Etiquette</button>
        </nav>

        <div class="codex-body">
          <!-- Section 1: 5 Traditions -->
          <section class="codex-section active" id="codex-traditions">
            <h3>Five Great Global Traditions</h3>
            <p>Mahjong is not a single ruleset, but a living family of intellectual traditions played by hundreds of millions. Our platform faithfully implements all five flagship styles:</p>

            <div class="codex-table-wrap">
              <table class="codex-table">
                <thead>
                  <tr>
                    <th>Tradition</th>
                    <th>Deck Size</th>
                    <th>Hand Size</th>
                    <th>Distinctive Rules</th>
                    <th>Winning Formula</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>American Mah Jongg</strong></td>
                    <td><span class="codex-badge">152 tiles</span></td>
                    <td>14 tiles</td>
                    <td>Charleston tile exchange, 8 Jokers, card combinations, no Chi</td>
                    <td>Specific pattern from the annual card line</td>
                  </tr>
                  <tr>
                    <td><strong>Hong Kong / Cantonese</strong></td>
                    <td><span class="codex-badge">144 tiles</span></td>
                    <td>13 (14 to win)</td>
                    <td>Live Chow/Pung/Kong/Hu claiming, 8 Flowers/Seasons, Fan scoring</td>
                    <td>4 Melds + 1 Pair (14 tiles)</td>
                  </tr>
                  <tr>
                    <td><strong>Japanese Riichi</strong></td>
                    <td><span class="codex-badge">136 tiles</span></td>
                    <td>13 (14 to win)</td>
                    <td>Dora bonus indicator, Riichi declarations, Furiten & Genbutsu defense</td>
                    <td>4 Melds + 1 Pair + Valid Yaku</td>
                  </tr>
                  <tr>
                    <td><strong>Taiwanese 16-Tile</strong></td>
                    <td><span class="codex-badge">144 tiles</span></td>
                    <td>16 (17 to win)</td>
                    <td>Expansive 16-tile closed hands, dealer deals 17, Tai scoring</td>
                    <td>5 Melds + 1 Pair (17 tiles)</td>
                  </tr>
                  <tr>
                    <td><strong>Sichuan Bloody Rules</strong></td>
                    <td><span class="codex-badge">108 tiles</span></td>
                    <td>13 (14 to win)</td>
                    <td>Suited tiles only (no honors), No Chow, Multi-winner battle to the end</td>
                    <td>Pure flush, triplets, or 7 pairs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Section 2: Tile Anatomy -->
          <section class="codex-section" id="codex-anatomy">
            <h3>Tile Anatomy & Symbolism</h3>
            <p>A full traditional Mahjong set contains 144 exquisite tiles divided into Suited ranks, Honor tiles, and auspicious Flowers:</p>

            <div class="codex-grid-cards">
              <div class="codex-card-item">
                <h4>Characters · 萬子 (Wàn)</h4>
                <p>Numbered 1 through 9 (一 to 九). Represents currency denominations (myriads / 10,000 coins) from ancient China.</p>
              </div>
              <div class="codex-card-item">
                <h4>Bamboos · 條子 / 索子 (Tiáo / Suǒ)</h4>
                <p>Numbered 1 through 9. Tile 1 is traditionally rendered as a graceful Sparrow (麻雀). Represents strings of ancient coins.</p>
              </div>
              <div class="codex-card-item">
                <h4>Dots · 筒子 / 餅子 (Tǒng / Bǐng)</h4>
                <p>Numbered 1 through 9. Circular glyphs representing round copper coins with square centers.</p>
              </div>
              <div class="codex-card-item">
                <h4>Winds · 四風 (Fēng)</h4>
                <p>East (東), South (南), West (西), and North (北). The prevailing round wind and seat wind bestow strategic scoring bonuses.</p>
              </div>
              <div class="codex-card-item">
                <h4>Dragons · 三元牌 (Sānyuán)</h4>
                <p>Red Dragon (中 · Zhong), Green Dragon (發 · Fa / Wealth), White Dragon (白 · Bai / Purity and Origin).</p>
              </div>
              <div class="codex-card-item">
                <h4>Flowers & Seasons · 花季</h4>
                <p>Four Noble Plants (Plum 梅, Orchid 蘭, Chrysanthemum 菊, Bamboo 竹) and Four Seasons (春, 夏, 秋, 冬).</p>
              </div>
            </div>
          </section>

          <!-- Section 3: History & Diaspora -->
          <section class="codex-section" id="codex-heritage">
            <h3>History & The Asian Diaspora</h3>
            <p>Mahjong was born in the middle of the 19th century in the port city of <strong>Ningbo, Zhejiang Province</strong>, during the late Qing Dynasty. Drawing inspiration from ancient Chinese card games like *Mǎdiào* (馬吊), artisans carved the symbols onto bone and bamboo backed with dovetail joints.</p>
            <p>The name <em>Majiang</em> (麻將) derives from <em>Maque</em> (麻雀), meaning <strong>sparrow</strong>, named for the rhythmic, musical clicking sound of shuffling tiles that evokes a flock of sparrows chattering in the eaves.</p>
            <p>In the 1920s, standard bearer Joseph P. Babcock introduced the game to America, sparking a nationwide sensation that led to the formation of the National Mah Jongg League (NMJL) in 1937. Concurrently, the game traversed the Asian diaspora—evolving into Riichi in Japan with tactical furiten defense, 16-tile Mahjong in Taiwan, and Bloody Battle rules in Sichuan.</p>
          </section>

          <!-- Section 4: Table Etiquette -->
          <section class="codex-section" id="codex-etiquette">
            <h3>Table Etiquette & Master Tenets</h3>
            <p>True Mahjong mastery combines sharp tactical probability with graceful table decorum:</p>
            <div class="codex-grid-cards">
              <div class="codex-card-item">
                <h4>Clear Declarations</h4>
                <p>Announce claims immediately and clearly (*Chow*, *Pung*, *Kong*, *Hu*, *Riichi*) before touching the tile.</p>
              </div>
              <div class="codex-card-item">
                <h4>Gentle Placement</h4>
                <p>Discard tiles deliberately onto the baize felt without obscuring previously discarded lines.</p>
              </div>
              <div class="codex-card-item">
                <h4>Respect the Wall</h4>
                <p>The dead wall (Wangpai / 王牌) represents hidden destiny; never draw from it except for legitimate replacement tiles.</p>
              </div>
              <div class="codex-card-item">
                <h4>Defensive Mindfulness</h4>
                <p>When an opponent calls Riichi or exposes pure flush melds, play Genbutsu (safe discards) to protect your table standing.</p>
              </div>
            </div>
          </section>
        </div>

        <footer class="codex-footer">
          <span>The Mahjong Codex · Dedicated to the living heritage of Mahjong</span>
          <span>Press <kbd>Esc</kbd> to dismiss</span>
        </footer>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button & outside click & Escape key
    modal.querySelector('#codexCloseBtn')?.addEventListener('click', closeCodex);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCodex();
    });

    // Tab switching
    const tabs = modal.querySelectorAll('.codex-tab');
    const sections = modal.querySelectorAll('.codex-section');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        const target = modal.querySelector(`#codex-${tab.dataset.tab}`);
        if (target) target.classList.add('active');
        window.mahjongAudio?.playClick();
      });
    });
  }

  function openCodex() {
    createCodexModal();
    const modal = document.getElementById(CODEX_ID);
    if (!modal) return;
    modal.classList.remove('hidden');
    window.mahjongAudio?.playChime(true);
  }

  function closeCodex() {
    const modal = document.getElementById(CODEX_ID);
    if (modal) modal.classList.add('hidden');
    window.mahjongAudio?.playClick();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById(CODEX_ID);
      if (modal && !modal.classList.contains('hidden')) {
        closeCodex();
      }
    }
  });

  window.openMahjongCodex = openCodex;
  window.closeMahjongCodex = closeCodex;

  // Auto-bind to button if present
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('codexLaunchBtn')?.addEventListener('click', openCodex);
  });
})();
