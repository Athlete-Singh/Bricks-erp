// Point the app at the test database before AppModule loads.
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true });
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://brics:brics@localhost:5432/brics_test';
// The test database is local and speaks no SSL. Development may now point at a
// hosted database with DATABASE_SSL=true, and that value would otherwise leak
// in from backend/.env and fail every suite with "server does not support SSL".
process.env.DATABASE_SSL = 'false';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-at-least-32-characters';
process.env.LOG_LEVEL = 'error';
