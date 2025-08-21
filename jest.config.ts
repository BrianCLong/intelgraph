import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/*.spec.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsconfig: {
        esModuleInterop: true
      }
    }
  }
};

export default config;
