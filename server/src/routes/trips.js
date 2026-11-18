// routes for trips and their itinerary items
// every response uses plain JSON: dates are "YYYY-MM-DD" strings and time is "HH:MM"
const express = require('express');
const prisma = require('../db');

const router = express.Router();

const toDateString = (d) => d.toISOString().slice(0, 10);

function serializeItem(item) {
  return { ...item, date: toDateString(item.date) };
}

function serializeTrip(trip) {
  const { itineraryItems, ...rest } = trip;
  return {
    ...rest,
    startDate: toDateString(trip.startDate),
    endDate: toDateString(trip.endDate),
    budget: trip.budget === null ? null : Number(trip.budget),
  };
}

const isDateString = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v));
const isTimeString = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isNonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const numOrNull = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

// pulls the trip fields we allow from the request body, checking them as we go
// partial = true is used for PUT so only the fields that were sent get changed
function readTrip(body, partial) {
  const data = {};
  for (const key of ['title', 'startLocation', 'destination']) {
    if (body[key] !== undefined || !partial) {
      if (!isNonEmpty(body[key])) return { error: `${key} is required` };
      data[key] = body[key].trim();
    }
  }
  for (const key of ['startDate', 'endDate']) {
    if (body[key] !== undefined || !partial) {
      if (!isDateString(body[key])) return { error: `${key} must be YYYY-MM-DD` };
      data[key] = new Date(body[key]);
    }
  }
  for (const key of ['startLat', 'startLng', 'destLat', 'destLng', 'budget']) {
    if (body[key] !== undefined) {
      const n = numOrNull(body[key]);
      if (n !== null && !Number.isFinite(n)) return { error: `${key} must be a number` };
      data[key] = n;
    }
  }
  if (body.isBookmarked !== undefined) {
    if (typeof body.isBookmarked !== 'boolean') return { error: 'isBookmarked must be true or false' };
    data.isBookmarked = body.isBookmarked;
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    return { error: 'endDate cannot be before startDate' };
  }
  return { data };
}

function readItem(body, partial) {
  const data = {};
  for (const key of ['title', 'location']) {
    if (body[key] !== undefined || !partial) {
      if (!isNonEmpty(body[key])) return { error: `${key} is required` };
      data[key] = body[key].trim();
    }
  }
  if (body.date !== undefined || !partial) {
    if (!isDateString(body.date)) return { error: 'date must be YYYY-MM-DD' };
    data.date = new Date(body.date);
  }
  if (body.time !== undefined || !partial) {
    if (!isTimeString(body.time)) return { error: 'time must be HH:MM' };
    data.time = body.time;
  }
  if (body.type !== undefined) data.type = String(body.type);
  if (body.notes !== undefined) data.notes = body.notes || null;
  for (const key of ['lat', 'lng']) {
    if (body[key] !== undefined) {
      const n = numOrNull(body[key]);
      if (n !== null && !Number.isFinite(n)) return { error: `${key} must be a number` };
      data[key] = n;
    }
  }
  return { data };
}

// express 5 forwards rejected promises to the error handler, so no try/catch needed
async function findTrip(id) {
  return prisma.trip.findUnique({ where: { id } });
}

// ---------- trips ----------

router.get('/', async (req, res) => {
  const trips = await prisma.trip.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(trips.map(serializeTrip));
});

router.post('/', async (req, res) => {
  const { data, error } = readTrip(req.body || {}, false);
  if (error) return res.status(400).json({ error });
  const trip = await prisma.trip.create({ data });
  res.status(201).json(serializeTrip(trip));
});

router.get('/:id', async (req, res) => {
  const trip = await findTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(serializeTrip(trip));
});

router.put('/:id', async (req, res) => {
  const existing = await findTrip(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Trip not found' });

  const { data, error } = readTrip(req.body || {}, true);
  if (error) return res.status(400).json({ error });

  const start = data.startDate || existing.startDate;
  const end = data.endDate || existing.endDate;
  if (end < start) return res.status(400).json({ error: 'endDate cannot be before startDate' });

  const trip = await prisma.trip.update({ where: { id: req.params.id }, data });
  res.json(serializeTrip(trip));
});

// itinerary items and expenses are removed too (cascade in the schema)
router.delete('/:id', async (req, res) => {
  const existing = await findTrip(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Trip not found' });
  await prisma.trip.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---------- itinerary items ----------

router.get('/:id/items', async (req, res) => {
  if (!(await findTrip(req.params.id))) return res.status(404).json({ error: 'Trip not found' });
  const items = await prisma.itineraryItem.findMany({
    where: { tripId: req.params.id },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  res.json(items.map(serializeItem));
});

router.post('/:id/items', async (req, res) => {
  if (!(await findTrip(req.params.id))) return res.status(404).json({ error: 'Trip not found' });
  const { data, error } = readItem(req.body || {}, false);
  if (error) return res.status(400).json({ error });
  const item = await prisma.itineraryItem.create({ data: { ...data, tripId: req.params.id } });
  res.status(201).json(serializeItem(item));
});

router.put('/:id/items/:itemId', async (req, res) => {
  const existing = await prisma.itineraryItem.findFirst({
    where: { id: req.params.itemId, tripId: req.params.id },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const { data, error } = readItem(req.body || {}, true);
  if (error) return res.status(400).json({ error });
  const item = await prisma.itineraryItem.update({ where: { id: existing.id }, data });
  res.json(serializeItem(item));
});

router.delete('/:id/items/:itemId', async (req, res) => {
  const existing = await prisma.itineraryItem.findFirst({
    where: { id: req.params.itemId, tripId: req.params.id },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  await prisma.itineraryItem.delete({ where: { id: existing.id } });
  res.status(204).end();
});

module.exports = router;
