// two groups of tests:
//   unit        - Prisma is faked, so no database is needed
//   integration - real requests against a separate PostgreSQL test database
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      clearMocks: true,
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
      setupFiles: ['<rootDir>/tests/helpers/useTestDatabase.js'],
    },
  ],
};
