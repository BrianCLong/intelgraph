module.exports = {
  root: true,
  env: { node: true, es2021: true, jest: true },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parserOptions: { ecmaVersion: 12, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules: { '@typescript-eslint/no-explicit-any': 'off' },
};
