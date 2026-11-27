// checks that bad request bodies are rejected before anything reaches the database
const request = require('supertest');

jest.mock('../../src/db', () => ({
  trip: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  itineraryItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
}));

const prisma = require('../../src/db');
const app = require('../../src/app');
const { validTrip, validItem } = require('../helpers/fixtures');

// a trip the way Prisma would return it
const storedTrip = {
  id: 'trip-1',
  title: 'Chicago Weekend',
  startLocation: 'Milwaukee, WI',
  destination: 'Chicago, IL',
  startDate: new Date('2026-11-13'),
  endDate: new Date('2026-11-15'),
  budget: null,
};

describe('POST /api/trips validation', () => {
  test.each([
    [{ title: undefined }, 'title is required'],
    [{ title: '   ' }, 'title is required'],
    [{ title: 42 }, 'title is required'],
    [{ startLocation: '' }, 'startLocation is required'],
    [{ destination: undefined }, 'destination is required'],
    [{ startDate: undefined }, 'startDate must be YYYY-MM-DD'],
    [{ startDate: '11/13/2026' }, 'startDate must be YYYY-MM-DD'],
    [{ endDate: '2026-13-01' }, 'endDate must be YYYY-MM-DD'],
    [{ endDate: '2026-11-12' }, 'endDate cannot be before startDate'],
    [{ budget: 'lots' }, 'budget must be a number'],
    [{ startLat: 'north' }, 'startLat must be a number'],
    [{ destLng: 'west' }, 'destLng must be a number'],
    [{ budget: true }, 'budget must be a number'],
    [{ budget: [] }, 'budget must be a number'],
    [{ budget: -1 }, 'budget must be between 0 and 99999999.99'],
    [{ budget: 100000000 }, 'budget must be between 0 and 99999999.99'],
    [{ startLat: 90.1 }, 'startLat must be between -90 and 90'],
    [{ destLng: -180.1 }, 'destLng must be between -180 and 180'],
    [{ title: 'a\u0000b' }, 'title is required'],
    [{ isBookmarked: 'yes' }, 'isBookmarked must be true or false'],
  ])('rejects %p', async (change, message) => {
    const res = await request(app).post('/api/trips').send(validTrip(change));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: message });
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });

  test('rejects a request with no body', async () => {
    const res = await request(app).post('/api/trips');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  test('trims text, converts numbers and ignores fields it does not allow', async () => {
    prisma.trip.create.mockResolvedValue(storedTrip);

    await request(app)
      .post('/api/trips')
      .send(validTrip({ title: '  Spaced Out  ', budget: '250.50', startLat: '', id: 'mine', shareToken: 'abc' }));

    expect(prisma.trip.create).toHaveBeenCalledWith({
      data: {
        title: 'Spaced Out',
        startLocation: 'Milwaukee, WI',
        destination: 'Chicago, IL',
        startDate: new Date('2026-11-13'),
        endDate: new Date('2026-11-15'),
        budget: 250.5,
        startLat: null,
      },
    });
  });
});

describe('itinerary item validation', () => {
  beforeEach(() => {
    prisma.trip.findUnique.mockResolvedValue(storedTrip);
  });

  test.each([
    [{ title: '' }, 'title is required'],
    [{ location: undefined }, 'location is required'],
    [{ date: 'tomorrow' }, 'date must be YYYY-MM-DD'],
    [{ time: undefined }, 'time must be HH:MM'],
    [{ time: '24:00' }, 'time must be HH:MM'],
    [{ time: '9:00' }, 'time must be HH:MM'],
    [{ time: '10:60' }, 'time must be HH:MM'],
    [{ lat: 'up' }, 'lat must be a number'],
    [{ lng: 'left' }, 'lng must be a number'],
    [{ lat: -91 }, 'lat must be between -90 and 90'],
    [{ lng: 181 }, 'lng must be between -180 and 180'],
    [{ type: {} }, 'type must be text'],
    [{ type: '' }, 'type must be text'],
    [{ notes: 5 }, 'notes must be text'],
    [{ notes: 'a\u0000b' }, 'notes must be text'],
  ])('POST rejects %p', async (change, message) => {
    const res = await request(app).post('/api/trips/trip-1/items').send(validItem(change));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: message });
    expect(prisma.itineraryItem.create).not.toHaveBeenCalled();
  });

  test('PUT rejects a bad field without saving', async () => {
    prisma.itineraryItem.findFirst.mockResolvedValue({ id: 'item-1', tripId: 'trip-1' });

    const res = await request(app).put('/api/trips/trip-1/items/item-1').send({ time: 'noon' });

    expect(res.status).toBe(400);
    expect(prisma.itineraryItem.update).not.toHaveBeenCalled();
  });
});

describe('when the database fails', () => {
  test('the client gets a plain 500 without internal details', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.trip.findUnique.mockRejectedValue(new Error('password authentication failed'));

    const res = await request(app).get('/api/trips/trip-1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong on the server' });
    log.mockRestore();
  });

  test('the database health check reports 503', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/health/db');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', database: 'unreachable' });
    log.mockRestore();
  });
});

describe('dates', () => {
  test.each(['2026-02-30', '2027-02-29', '2026-04-31', '0000-01-01'])('rejects %s, which does not exist', async (date) => {
    const res = await request(app)
      .post('/api/trips')
      .send(validTrip({ startDate: date, endDate: '2028-01-01' }));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'startDate must be YYYY-MM-DD' });
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });

  test('accepts a real leap day', async () => {
    prisma.trip.create.mockResolvedValue(storedTrip);

    const res = await request(app)
      .post('/api/trips')
      .send(validTrip({ startDate: '2028-02-29', endDate: '2028-03-01' }));

    expect(res.status).toBe(201);
  });
});

describe('requests that cannot be handled', () => {
  test.each([
    ['broken JSON', '{"title": ', 400, 'Request body is not valid JSON'],
    ['a body that is too large', JSON.stringify({ title: 'x'.repeat(200000) }), 413, 'Request body is too large'],
  ])('%s gets a clear error', async (name, body, status, message) => {
    const res = await request(app).post('/api/trips').set('Content-Type', 'application/json').send(body);

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: message });
  });

  test('a badly encoded address gets a 400', async () => {
    const res = await request(app).get('/api/trips/%E0%A4%A');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Bad request' });
  });

  test('an unknown address gets a JSON 404', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
