(() => {
  'use strict';

  const select = document.getElementById('gameStyle');
  const description = document.getElementById('styleDescription');
  const noteTitle = document.getElementById('styleNoteTitle');
  const noteCopy = document.getElementById('styleNoteCopy');
  const start = document.getElementById('startGame');
  if (!select || !description || !noteTitle || !noteCopy || !start) return;

  const styles = {
    american: {
      playable: true,
      description: 'American Mah Jongg is the primary mode: four players, 152 tiles, Charleston, Jokers and a 14-tile winning hand.',
      note: 'Playable table foundation: 152-tile deal, four seats, first Charleston and Joker-safe passing. Card validation, calling, scoring and computer turns are next.'
    },
    solitaire: {
      playable: true,
      description: 'Play the classic single-player matching game with a solvable 144-tile layout, hints, undo and safe shuffle.',
      note: 'Single-player tile matching with a solvable 144-tile layout.'
    },
    riichi: {
      playable: false,
      description: 'Japanese Riichi Mahjong uses four players, calls such as Chi/Pon/Kan, Riichi declarations and yaku-based winning rules.',
      note: 'Planned: Riichi table, calls, yaku, furiten, scoring and four-player flow.'
    },
    'hong-kong': {
      playable: false,
      description: 'Hong Kong Mahjong is a four-player traditional rules family with regional scoring and hand-building conventions.',
      note: 'Planned: Hong Kong rules, table flow and configurable scoring.'
    },
    'chinese-classical': {
      playable: false,
      description: 'Chinese Classical Mahjong is an older four-player rules family with a different scoring philosophy from modern regional variants.',
      note: 'Planned: Chinese Classical hand validation and scoring.'
    },
    taiwanese: {
      playable: false,
      description: 'Taiwanese Mahjong uses 16 tiles in the hand and distinctive scoring and winning-hand rules.',
      note: 'Planned: 16-tile gameplay, scoring and table flow.'
    },
    singapore: {
      playable: false,
      description: 'Singapore Mahjong is a four-player variant with its own scoring and special hand rules.',
      note: 'Planned: Singapore rules and scoring.'
    }
  };

  function renderStyle() {
    const style = styles[select.value] || styles.american;
    description.textContent = style.description;
    noteTitle.textContent = select.options[select.selectedIndex].textContent.split(' — ')[0];
    noteCopy.textContent = style.note;
    start.disabled = !style.playable;
    const resumable = select.value === 'solitaire' && window.hasSolitaireSave && window.hasSolitaireSave();
    start.textContent = style.playable ? (resumable ? 'Resume game' : 'Start game') : 'Coming soon';
    start.setAttribute('aria-disabled', String(!style.playable));
    if (window.showAmericanGame) window.showAmericanGame(select.value === 'american');
  }

  select.addEventListener('change', renderStyle);
  renderStyle();
})();
