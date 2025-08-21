import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};

export default config;
