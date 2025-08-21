module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['plugin:react/recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['react', '@typescript-eslint'],
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
