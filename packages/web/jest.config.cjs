module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  collectCoverage: true,
  coverageDirectory: 'coverage'
};
