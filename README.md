# Mahjong Solitaire

A polished, responsive browser-based Mahjong game built with plain HTML, CSS and JavaScript — no backend, account, or build system required.

## Features

- 144-tile layered Mahjong Solitaire board
- Open-tile detection with classic left/right and above blocking rules
- Matching for suits, honors, flowers and seasons
- Timer, move counter and pair progress
- Undo system (`U` keyboard shortcut)
- Hint system (`H` keyboard shortcut)
- Solvability-preserving shuffle of remaining tiles
- Sound toggle with lightweight browser audio
- Keyboard focus states, skip-to-board navigation and reduced-motion support
- Responsive desktop and mobile layout
- American Mah Jongg hand guidance and Charleston flow
- PWA manifest and service worker
- Automated GitHub Actions validation on pushes and pull requests
- Static-hosting friendly

## Run locally

No build step is required. Serve the repository root with any static web server and open `index.html`.

For example:

```bash
npx serve .
```

Do not open only a copied `index.html` if you want to verify PWA/service-worker behavior; use an HTTP server.

## Deploy to Hostinger

The application is a **static site**. There is no Node.js process or server-side application to configure on Hostinger.

Upload the **entire repository contents** to the public web root, preserving the directory structure. Do not upload only `index.html`, `styles.css`, and `game.js`: the application references multiple CSS/JavaScript modules, `manifest.webmanifest`, `sw.js`, `sw-register.js`, the PWA icons, `.htaccess`, and the supporting game assets.

The public web root should contain at least:

- `index.html`
- `.htaccess`
- `manifest.webmanifest`
- `sw.js`
- `sw-register.js`
- all referenced `.css` and `.js` files
- `icons/mahjong-192.svg`
- `icons/mahjong-512.svg`
- `404.html`

Keep the existing relative paths intact. Do not rename or flatten the asset directories.

After upload, verify the site over **HTTPS** and check that `/manifest.webmanifest`, `/sw.js`, both PWA icons, and a deliberately missing URL return the expected responses. The repository's Hostinger live smoke test performs these checks when `SITE_URL` is supplied.

## Validation

The repository includes GitHub Actions for:

- JavaScript/static validation
- American Mahjong browser regression
- Solitaire lifecycle and responsive viewport regression
- accessibility contract checks
- PWA shell and service-worker contracts
- production security/header checks
- Hostinger deployment preflight
- optional Hostinger live smoke validation

Useful local commands include:

```bash
npm run validate
npm run browser-regression
npm run hostinger:preflight
npm run hostinger:live-smoke
```

The live smoke command requires a deployed HTTPS URL:

```bash
SITE_URL=https://example.com npm run hostinger:live-smoke
```

Never commit deployment URLs containing credentials or any secrets.
