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

// bugs found while writing these tests
// test.failing passes while the bug exists; once it's fixed, change it to a normal test
describe('known bugs', () => {
  test.failing('a date that does not exist (Feb 30) is rejected', async () => {
    prisma.trip.create.mockResolvedValue(storedTrip);

    const res = await request(app)
      .post('/api/trips')
      .send(validTrip({ startDate: '2026-02-30', endDate: '2026-03-05' }));

    expect(res.status).toBe(400);
  });

  test.failing('broken JSON gets a 400, not a 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/trips')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
  });
});
