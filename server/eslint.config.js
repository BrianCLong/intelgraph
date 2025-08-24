// ESLint v9 flat config for the Node/TS server
import globals from 'globals';
import * as tseslint from 'typescript-eslint';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts', '*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        // Avoid project: './tsconfig.json' until tsconfig includes tests to prevent perf/parse errors
        ecmaFeatures: { jsx: false }
      }
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      // Disabled pending project-wide type-aware linting setup
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off'
    }
  },
  {
    files: ['tests/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    plugins: { jest: (await import('eslint-plugin-jest')).default },
    languageOptions: { globals: { ...globals.node, jest: true } },
    rules: {
      'jest/expect-expect': 'warn',
      'jest/no-disabled-tests': 'warn',
      'jest/no-identical-title': 'error'
    }
  },
  prettier
];
