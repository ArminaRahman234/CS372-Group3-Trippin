// builds the express app without starting it
// kept separate from index.js so tests (#18) can import the app directly
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

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

// routes for trips, itinerary items and expenses go here (#13, #14)

module.exports = app;
