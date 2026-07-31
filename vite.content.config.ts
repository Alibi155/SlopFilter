import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Build config for the content script.
 *
 * MV3 content scripts are injected as classic scripts, so this must be a single
 * self-contained IIFE with no import statements. Built into the same dist/ as
 * the pages, without emptying it.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: false,
    target: 'chrome111',
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/index.ts'),
      name: 'SlopFilter',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        // The single stylesheet imported by the content script.
        assetFileNames: 'content.css',
        extend: true,
      },
    },
  },
});
