// builds the express app without starting it
// kept separate from index.js so tests (#18) can import the app directly
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const tripRoutes = require('./routes/trips');

// creates the server object
const app = express();

// browser will want to naturally block the request because 5173 != 5000, this says its ok
app.use(cors());

// takes the json information it recieves and converts it to a js object
app.use(express.json());

// just a quick check to make sure that everything is running ok
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// checks that the server can reach the database
app.get('/api/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

// trips and their itinerary items
app.use('/api/trips', tripRoutes);

// any other /api address gets a json 404 instead of express's html page
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// messages for the mistakes express catches while reading a request
const REQUEST_ERRORS = {
  'entity.parse.failed': 'Request body is not valid JSON',
  'entity.too.large': 'Request body is too large',
};

// catches anything thrown inside a route (bad ids, database errors) so the client gets json back
app.use((err, req, res, next) => {
  // 4xx means the request was the problem, so keep that status
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: REQUEST_ERRORS[err.type] || 'Bad request' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

module.exports = app;
