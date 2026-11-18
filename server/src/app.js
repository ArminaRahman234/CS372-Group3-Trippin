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

// catches anything thrown inside a route (bad ids, database errors) so the client gets json back
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

module.exports = app;
