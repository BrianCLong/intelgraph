// ESLint v9 flat-config root
// Applies base JS/TS rules across the monorepo; package-level configs refine further.
import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import path from 'node:path';

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.cache/**',
  '**/generated/**',
  'frontend/.vite/**', // legacy build artifacts
  'client/src/components/graph/CytoscapeGraph.jsx',
  'apps/web/public/mockServiceWorker.js',
  'server/server.js'
];

export default [
  { ignores: IGNORE },
  js.configs.recommended,
  ...tseslint.configs.recommended, // type-agnostic rules; package configs can opt into type-aware if desired
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        // Avoid project-based type checking here to keep root fast
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off'
    }
  },
  // Disable formatting-related rules in favor of Prettier
  prettier
];
