// full request -> route -> Prisma -> PostgreSQL tests for trips
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { validTrip, validItem } = require('../helpers/fixtures');

const missingId = '00000000-0000-0000-0000-000000000000';
const createTrip = async (overrides) => (await request(app).post('/api/trips').send(validTrip(overrides))).body;

// every test starts with an empty database (deleting trips cascades to items and expenses)
beforeEach(async () => {
  await prisma.trip.deleteMany();
});

afterAll(async () => {
  await prisma.trip.deleteMany();
  await prisma.$disconnect();
});

describe('health checks', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /api/health/db', async () => {
    const res = await request(app).get('/api/health/db');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });
});

describe('POST /api/trips', () => {
  test('creates a trip and saves it', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send(validTrip({ budget: 500.25, startLat: 43.0389, startLng: -87.9065 }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Chicago Weekend',
      startDate: '2026-11-13',
      endDate: '2026-11-15',
      budget: 500.25,
      startLat: 43.0389,
      startLng: -87.9065,
      isBookmarked: false,
    });
    expect(await prisma.trip.findUnique({ where: { id: res.body.id } })).not.toBeNull();
  });

  test('allows a trip with no budget and a same-day trip', async () => {
    const res = await request(app).post('/api/trips').send(validTrip({ endDate: '2026-11-13' }));

    expect(res.status).toBe(201);
    expect(res.body.budget).toBeNull();
  });

  test('saves nothing when the body is invalid', async () => {
    await request(app).post('/api/trips').send(validTrip({ title: '' }));

    expect(await prisma.trip.count()).toBe(0);
  });
});

describe('GET /api/trips', () => {
  test('returns an empty list when there are no trips', async () => {
    const res = await request(app).get('/api/trips');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns trips oldest first', async () => {
    await createTrip({ title: 'First' });
    await createTrip({ title: 'Second' });

    const res = await request(app).get('/api/trips');

    expect(res.body.map((t) => t.title)).toEqual(['First', 'Second']);
  });
});

describe('GET /api/trips/:id', () => {
  test('returns one trip', async () => {
    const trip = await createTrip();

    const res = await request(app).get(`/api/trips/${trip.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(trip);
  });

  test.each([missingId, 'not-an-id'])('returns 404 for %s', async (id) => {
    const res = await request(app).get(`/api/trips/${id}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Trip not found' });
  });
});

describe('PUT /api/trips/:id', () => {
  test('changes only the fields that were sent', async () => {
    const trip = await createTrip({ budget: 500 });

    const res = await request(app).put(`/api/trips/${trip.id}`).send({ title: 'Renamed', isBookmarked: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: 'Renamed',
      isBookmarked: true,
      destination: trip.destination,
      startDate: trip.startDate,
      budget: 500,
    });
  });

  test('can clear the budget', async () => {
    const trip = await createTrip({ budget: 500 });

    const res = await request(app).put(`/api/trips/${trip.id}`).send({ budget: null });

    expect(res.body.budget).toBeNull();
  });

  test.each([{ endDate: '2026-11-01' }, { startDate: '2026-12-01' }])(
    'rejects %p because it would end before it starts',
    async (change) => {
      const trip = await createTrip();

      const res = await request(app).put(`/api/trips/${trip.id}`).send(change);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'endDate cannot be before startDate' });
      expect((await request(app).get(`/api/trips/${trip.id}`)).body).toEqual(trip);
    }
  );

  test('rejects an empty title', async () => {
    const trip = await createTrip();

    const res = await request(app).put(`/api/trips/${trip.id}`).send({ title: '' });

    expect(res.status).toBe(400);
  });

  test('returns 404 for a missing trip', async () => {
    const res = await request(app).put(`/api/trips/${missingId}`).send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/trips/:id', () => {
  test('deletes the trip along with its items and expenses', async () => {
    const trip = await createTrip();
    await request(app).post(`/api/trips/${trip.id}/items`).send(validItem());
    // there's no expense route yet, so add one straight to the database
    await prisma.expense.create({
      data: { tripId: trip.id, description: 'Train', amount: 52.5, date: new Date('2026-11-13') },
    });

    const res = await request(app).delete(`/api/trips/${trip.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.trip.count()).toBe(0);
    expect(await prisma.itineraryItem.count()).toBe(0);
    expect(await prisma.expense.count()).toBe(0);
  });

  test('leaves other trips alone', async () => {
    const doomed = await createTrip({ title: 'Doomed' });
    const kept = await createTrip({ title: 'Kept' });

    await request(app).delete(`/api/trips/${doomed.id}`);

    expect((await request(app).get('/api/trips')).body).toEqual([kept]);
  });

  test('returns 404 for a missing trip', async () => {
    const res = await request(app).delete(`/api/trips/${missingId}`);

    expect(res.status).toBe(404);
  });
});
