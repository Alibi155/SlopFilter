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

/**
 * Store-mandated sizes: 1280x800 screenshots, 440x280 small promo tile,
 * 1400x560 marquee tile.
 *
 * The two promo tiles must have no alpha channel. Chrome emits a 24-bit PNG
 * whenever the page background is fully opaque, which both tile pages are —
 * verified after rendering rather than assumed.
 */
const SHOTS = [
  ['1-before-after', '1-before-after', 1280, 800],
  ['2-in-feed', '2-in-feed', 1280, 800],
  ['3-reasons', '3-reasons', 1280, 800],
  ['4-popup', '4-popup', 1280, 800],
  ['5-options', '5-options', 1280, 800],
  ['promo-tile', 'promo', 440, 280],
  ['marquee-tile', 'marquee', 1400, 560],
];

/** Assets the store rejects if they carry an alpha channel. */
const MUST_BE_OPAQUE = new Set(['promo-tile', 'marquee-tile']);

mkdirSync(out, { recursive: true });

/** Read an image property via macOS sips, or null where sips is unavailable. */
function imageProp(file, prop) {
  try {
    const text = execFileSync('sips', ['-g', prop, file], { encoding: 'utf8' });
    return text.trim().split('\n').pop().split(':').pop().trim();
  } catch {
    return null;
  }
}

for (const [name, source, width, height] of SHOTS) {
  const page = resolve(pages, `${source}.html`);
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

  const actual = [imageProp(png, 'pixelWidth'), imageProp(png, 'pixelHeight')];
  const alpha = imageProp(png, 'hasAlpha');
  let note = `${width}x${height}`;

  if (actual[0] && (actual[0] !== String(width) || actual[1] !== String(height))) {
    console.error(`  ! ${name}.png is ${actual.join('x')}, expected ${width}x${height}`);
    process.exitCode = 1;
  }
  if (MUST_BE_OPAQUE.has(name)) {
    if (alpha === 'yes') {
      console.error(`  ! ${name}.png has an alpha channel; the store requires 24-bit or JPEG`);
      process.exitCode = 1;
    } else if (alpha === 'no') {
      note += ', 24-bit no alpha';
    }
  }
  console.log(`screenshots: ${name}.png  ${note}`);
}

console.log(`\nWrote ${SHOTS.length} assets to docs/screenshots/`);
