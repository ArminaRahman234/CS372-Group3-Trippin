// runs once before the integration tests:
// creates the test database if it's missing and applies every migration
const { execSync } = require('child_process');
const path = require('path');
const testDatabaseUrl = require('./testDatabaseUrl');

module.exports = async () => {
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
};
