/** e2e tests run against a real PostgreSQL (TEST_DATABASE_URL). CI provides a postgres service. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setup-env.js'],
};
