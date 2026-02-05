module.exports = {
  // Use the ts-jest ESM preset so TypeScript ESM modules are handled correctly
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'shared/**/*.ts',
    '!shared/**/*.d.ts',
  ],
};
