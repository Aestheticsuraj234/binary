// One ESLint setup for the whole monorepo.
// It automates the practical parts of the Google TypeScript Style Guide:
// https://google.github.io/styleguide/tsguide.html
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.expo/**',
      '**/dist/**',
      '**/.turbo/**',
      // Trigger.dev's local build output (from `trigger dev`).
      '**/.trigger/**',
      '**/next-env.d.ts',
      '**/*.config.{js,mjs,cjs}',
      'apps/mobile/expo-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {'react-hooks': reactHooks},
    languageOptions: {
      globals: {...globals.node, ...globals.browser},
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Google style: const over let, never var, strict equality.
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],

      // Google style: no `any`, no non-null assertions.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],

      // Google style: named exports. Framework files that must use a default
      // export (pages, layouts, routes) are allowed further down.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use a named export (Google TypeScript Style Guide).',
        },
      ],

      // Google style: camelCase values, PascalCase types, UPPER_CASE constants.
      '@typescript-eslint/naming-convention': [
        'error',
        {selector: 'typeLike', format: ['PascalCase']},
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {selector: 'function', format: ['camelCase', 'PascalCase']},
      ],
    },
  },
  {
    // Next.js, Expo Router and Trigger.dev require default exports here.
    files: [
      'apps/web/src/app/**/*.tsx',
      'apps/mobile/src/app/**/*.tsx',
      'apps/api/trigger.config.ts',
    ],
    rules: {'no-restricted-syntax': 'off'},
  },
);
