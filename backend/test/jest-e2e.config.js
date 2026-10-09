/** e2e tests run against a real PostgreSQL (TEST_DATABASE_URL). CI provides a postgres service. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  transformIgnorePatterns: ['/node_modules/(?!@nestjs/jwt)/'],

  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setup-env.js'],
  testTimeout: 30000,
};
