import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'dist-single/', 'node_modules/', '.cache/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: globals.browser },
    rules: {
      // No debug logs in commits.
      'no-console': 'error',
    },
  },
  {
    // The data scripts run in Node and report progress on the command line.
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  // Turns off style rules that Prettier already handles, so the two tools don't argue.
  prettierConfig,
);
