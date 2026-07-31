#!/usr/bin/env node
/**
 * Rasterize public/icon.svg into the PNG sizes the manifest declares.
 *
 * Generated at build time rather than committed so the icon has one source of
 * truth; editing the SVG is enough to update every size.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'public/icon.svg'), 'utf8');
const outDir = resolve(root, 'dist/icons');

mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(resolve(outDir, `icon-${size}.png`), png);
}

console.log(`icons: wrote 4 PNGs to ${outDir}`);
