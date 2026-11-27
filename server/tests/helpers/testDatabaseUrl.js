// works out which database the integration tests are allowed to use
// the tests delete data, so they must never point at your development database
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

function testDatabaseUrl() {
  let value = process.env.TEST_DATABASE_URL;

  // no TEST_DATABASE_URL: reuse DATABASE_URL with "_test" added to the database name
  if (!value) {
    if (!process.env.DATABASE_URL) {
      throw new Error('Set DATABASE_URL (or TEST_DATABASE_URL) in server/.env to run the integration tests');
    }
    const url = new URL(process.env.DATABASE_URL);
    if (!url.pathname.endsWith('_test')) url.pathname += '_test';
    value = url.toString();
  }

  if (!new URL(value).pathname.endsWith('_test')) {
    throw new Error('The test database name must end in "_test" because the tests delete its data');
  }
  return value;
}

module.exports = testDatabaseUrl;
