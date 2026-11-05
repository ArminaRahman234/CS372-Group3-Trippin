// entry point for the backend api
// loads the .env file so DATABASE_URL and PORT are available
require('dotenv').config();

const app = require('./app');
const prisma = require('./db');

// this is where the server actually starts up
// sets the port to what we set or just defaults to 5000
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// close the database connection cleanly when the server stops
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
