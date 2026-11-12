const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
  {
    ...js.configs.recommended,
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Type-aware unused-variable checks belong to TypeScript's compiler;
      // keep the core rule informative without blocking legacy files.
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // The parser understands TypeScript syntax, but core ESLint does not
      // resolve TS types and globals; those are covered by the TS type-check.
      'no-undef': 'off',
    },
  },
];
