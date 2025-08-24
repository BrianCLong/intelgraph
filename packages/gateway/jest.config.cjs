module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@intelgraph/common-types$': '<rootDir>/../common-types/src'
  }
};
