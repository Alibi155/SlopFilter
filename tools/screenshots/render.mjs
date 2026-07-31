#!/usr/bin/env node
/**
 * Rasterizes the generated screenshot pages to the exact sizes the Chrome Web
 * Store requires.
 *
 * Headless Chrome rather than a bundled browser: the extension targets Chrome,
 * so the store assets should be rendered by the engine that will run it, and
 * `--window-size` gives an exact pixel canvas with no cropping or scaling.
 *
 * Set CHROME to override the binary, e.g. on Linux:
 *   CHROME=/usr/bin/google-chrome npm run screenshots
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const pages = resolve(here, 'pages');
const out = resolve(root, 'docs/screenshots');

const CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const chrome = CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  console.error(
    'No Chrome or Chromium found. Set CHROME=/path/to/chrome and re-run.\nTried:\n  ' +
      CANDIDATES.join('\n  '),
  );
  process.exit(1);
}

/** Store-mandated sizes: 1280x800 screenshots, 440x280 small promo tile. */
const SHOTS = [
  ['1-before-after', 1280, 800],
  ['2-in-feed', 1280, 800],
  ['3-reasons', 1280, 800],
  ['4-popup', 1280, 800],
  ['5-options', 1280, 800],
  ['promo-tile', 440, 280],
];

mkdirSync(out, { recursive: true });

for (const [name, width, height] of SHOTS) {
  const page = resolve(pages, `${name === 'promo-tile' ? 'promo' : name}.html`);
  const png = resolve(out, `${name}.png`);
  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      // Without this a HiDPI host would silently emit 2x images, which the
      // store rejects for being the wrong dimensions.
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      `--screenshot=${png}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  );
  console.log(`screenshots: ${name}.png  ${width}x${height}`);
}

console.log(`\nWrote ${SHOTS.length} assets to docs/screenshots/`);
