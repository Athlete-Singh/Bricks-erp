// Point the app at the test database before AppModule loads.
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true });
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://brics:brics@localhost:5432/brics_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-at-least-32-characters';
process.env.LOG_LEVEL = 'error';
