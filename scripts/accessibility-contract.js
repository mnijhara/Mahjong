const fs = require('fs');

const read = file => fs.readFileSync(file, 'utf8');
const files = {
  index: read('index.html'),
  styles: read('styles.css'),
  a11y: read('solitaire-a11y.js'),
  accessibility: read('accessibility.css'),
};

const checks = [
  ['index.html has the semantic skip link', files.index.includes('class="skip-link"')],
  ['accessibility stylesheet is loaded by the Solitaire accessibility layer', files.a11y.includes("accessibilityStyles.href = 'accessibility.css'")],
  ['accessibility stylesheet exposes a visible skip-link focus state', /\.skip-link:focus(?:,|\{)/.test(files.accessibility) && /position:\s*fixed/.test(files.accessibility)],
  ['skip link targets the board', files.index.includes('href="#board"')],
  ['board has grid semantics', /id="board"[^>]*role="grid"/.test(files.index)],
  ['completion modal has dialog semantics', /id="modal"[^>]*role="dialog"[^>]*aria-modal="true"/.test(files.index)],
  ['completion modal has an accessible title', files.index.includes('id="modalTitle"')],
  ['completion modal has an accessible description', files.index.includes('id="modalCopy"')],
  ['Undo exposes the U shortcut', files.a11y.includes("setAttribute('aria-keyshortcuts', 'U')")],
  ['Hint exposes the H shortcut', files.a11y.includes("setAttribute('aria-keyshortcuts', 'H')")],
  ['game status uses a status live region', files.a11y.includes("setAttribute('role', 'status')") && files.a11y.includes("setAttribute('aria-live', 'polite')")],
  ['status announcements are atomic', files.a11y.includes("setAttribute('aria-atomic', 'true')")],
  ['Escape dismisses the completion modal', files.a11y.includes("event.key === 'Escape'")],
  ['focus restoration is implemented', files.a11y.includes('returnFocusElement')],
  ['reduced-motion support exists', files.styles.includes('prefers-reduced-motion')],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length) {
  console.error('Accessibility contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Accessibility contract validated (${checks.length} checks).`);
