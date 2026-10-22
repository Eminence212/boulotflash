/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@boulotflash/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node10',
          ignoreDeprecations: '6.0',
          esModuleInterop: true,
          resolveJsonModule: true,
          strict: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
};
