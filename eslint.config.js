// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const oxlint = require('eslint-plugin-oxlint');

module.exports = defineConfig([
  expoConfig,
  // Disable ESLint rules already covered by oxlint to avoid duplication.
  // See: https://oxc.rs/docs/guide/usage/linter/eslint-plugin-oxlint
  oxlint.configs['flat/all'],
  {
    ignores: ['dist/*'],
  },
]);
