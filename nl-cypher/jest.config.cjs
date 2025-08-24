module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: { 'ts-jest': { useESM: true } },
  testEnvironment: 'node',
};
