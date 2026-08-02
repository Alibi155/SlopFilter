import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // slopfilter-*/ is an unpacked release bundle — built output, not source.
  // Linting it fails on files no tsconfig covers, which is a confusing way to
  // learn that someone unzipped a build into the project root.
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'slopfilter-*/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Trailing `void promise` is the house style for deliberate fire-and-forget.
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Build tooling: plain Node ESM, outside the TS project, so type-aware
    // linting is switched off rather than pointed at a tsconfig it is not in.
    files: ['scripts/**/*.mjs', 'tools/**/*.mjs', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      parserOptions: { projectService: false, project: false, program: null },
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
);
