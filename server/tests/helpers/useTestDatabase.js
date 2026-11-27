// runs before each integration test file, so Prisma connects to the test database
const testDatabaseUrl = require('./testDatabaseUrl');

process.env.DATABASE_URL = testDatabaseUrl();
