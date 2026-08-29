# Mahjong Solitaire

A polished, responsive browser-based Mahjong Solitaire game built with plain HTML, CSS and JavaScript — no backend, account, or build system required.

## Features

- 144-tile layered solitaire board
- Open-tile detection with classic left/right and above blocking rules
- Matching for suits, honors, flowers and seasons
- Timer, move counter and pair progress
- Undo system (`U` keyboard shortcut)
- Hint system (`H` keyboard shortcut)
- Solvability-preserving shuffle of remaining tiles
- Sound toggle with lightweight browser audio
- Keyboard focus states and reduced-motion support
- Responsive desktop and mobile layout
- Automated GitHub Actions validation on pushes and pull requests
- Static-hosting friendly

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static web server.

## Deploy

No build step is required. Upload `index.html`, `styles.css`, and `game.js` to the public web root on a static Hostinger site.

## Validation

The repository includes a GitHub Actions workflow that checks JavaScript syntax, required production files and game controls, the 72-pair invariant, and accidental secret-like content.
