/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node10',
          ignoreDeprecations: '6.0',
          esModuleInterop: true,
          strict: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
