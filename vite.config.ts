import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

/**
 * Build config for the extension pages (popup + options).
 *
 * These are regular HTML entry points and may ship as ES modules. The content
 * script is built separately by vite.content.config.ts because MV3 content
 * scripts cannot be ES modules.
 */
export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  publicDir: false,
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'chrome111',
    rollupOptions: {
      // Entry HTML lives directly in src/ so Rollup emits dist/popup.html and
      // dist/options.html, matching the paths the manifest declares.
      input: {
        popup: resolve(import.meta.dirname, 'src/popup.html'),
        options: resolve(import.meta.dirname, 'src/options.html'),
      },
      output: {
        // Flatten so popup/index.html becomes dist/popup.html, matching the
        // paths declared in manifest.json.
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [{ src: resolve(import.meta.dirname, 'public/manifest.json'), dest: '.' }],
    }),
  ],
});
