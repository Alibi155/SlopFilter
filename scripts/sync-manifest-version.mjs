#!/usr/bin/env node
/**
 * Copy package.json's version into public/manifest.json.
 *
 * Run by npm's `version` lifecycle hook, so `npm version patch` updates both
 * files and commits them together. package.json stays the source of truth —
 * the build injects the same value into dist/manifest.json — but the checked-in
 * manifest has to agree or the repo tells two different stories, and a test
 * enforces that.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = resolve(root, 'package.json');
const manifestPath = resolve(root, 'public/manifest.json');

const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.version === version) {
  console.log(`manifest already at ${version}`);
} else {
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest version -> ${version}`);
}
