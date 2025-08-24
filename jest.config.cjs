module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**'
  ],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/?(*.)+(spec|test).{ts,tsx,js,jsx}'
  ],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  projects: [
    {
      displayName: 'server',
      testMatch: ['<rootDir>/server/**/*.{test,spec}.{js,ts}'],
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      globals: {
        'ts-jest': {
          useESM: true
        }
      }
    },
    {
      displayName: 'client',
      testMatch: ['<rootDir>/client/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.js']
    }
    ,{
      displayName: 'stix-taxii-service',
      testMatch: ['<rootDir>/services/stix-taxii/**/*.{test,spec}.{js,ts}'],
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      globals: {
        'ts-jest': { useESM: true }
      }
    }
    ,{
      displayName: 'ioc-normalizer-js',
      testMatch: ['<rootDir>/packages/sdk/ioc-normalizer-js/**/*.{test,spec}.{js,ts}'],
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      globals: {
        'ts-jest': { useESM: true }
      }
    }
  ]
};