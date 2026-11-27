// full request -> route -> Prisma -> PostgreSQL tests for itinerary items
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db');
const { validTrip, validItem } = require('../helpers/fixtures');

const missingId = '00000000-0000-0000-0000-000000000000';
let trip;
let otherTrip;

const itemsUrl = (tripId) => `/api/trips/${tripId}/items`;
const createItem = async (overrides, tripId = trip.id) =>
  (await request(app).post(itemsUrl(tripId)).send(validItem(overrides))).body;
const listItems = async (tripId = trip.id) => (await request(app).get(itemsUrl(tripId))).body;

beforeEach(async () => {
  await prisma.trip.deleteMany();
  trip = (await request(app).post('/api/trips').send(validTrip())).body;
  otherTrip = (await request(app).post('/api/trips').send(validTrip({ title: 'Other' }))).body;
});

afterAll(async () => {
  await prisma.trip.deleteMany();
  await prisma.$disconnect();
});

describe('POST /api/trips/:id/items', () => {
  test('creates an item with the default type', async () => {
    const res = await request(app).post(itemsUrl(trip.id)).send(validItem({ lat: 41.8826, lng: -87.6226 }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tripId: trip.id,
      title: 'Millennium Park',
      type: 'Activity',
      date: '2026-11-14',
      time: '10:00',
      lat: 41.8826,
      lng: -87.6226,
      notes: null,
    });
  });

  test('returns 404 for a missing trip', async () => {
    const res = await request(app).post(itemsUrl(missingId)).send(validItem());

    expect(res.status).toBe(404);
    expect(await prisma.itineraryItem.count()).toBe(0);
  });
});

describe('GET /api/trips/:id/items', () => {
  test('sorts by date, then time', async () => {
    await createItem({ title: 'Third', date: '2026-11-15', time: '08:00' });
    await createItem({ title: 'Second', date: '2026-11-14', time: '18:00' });
    await createItem({ title: 'First', date: '2026-11-14', time: '09:00' });

    const items = await listItems();

    expect(items.map((i) => i.title)).toEqual(['First', 'Second', 'Third']);
  });

  test('only returns items for that trip', async () => {
    await createItem({ title: 'Mine' });
    await createItem({ title: 'Theirs' }, otherTrip.id);

    expect((await listItems()).map((i) => i.title)).toEqual(['Mine']);
  });

  test('returns 404 for a missing trip', async () => {
    const res = await request(app).get(itemsUrl(missingId));

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/trips/:id/items/:itemId', () => {
  test('changes only the fields that were sent', async () => {
    const item = await createItem({ notes: 'Bring a camera' });

    const res = await request(app).put(`${itemsUrl(trip.id)}/${item.id}`).send({ time: '11:30' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: item.title, time: '11:30', notes: 'Bring a camera' });
  });

  test('can clear the notes', async () => {
    const item = await createItem({ notes: 'Bring a camera' });

    const res = await request(app).put(`${itemsUrl(trip.id)}/${item.id}`).send({ notes: '' });

    expect(res.body.notes).toBeNull();
  });

  test('cannot edit an item through a different trip', async () => {
    const item = await createItem();

    const res = await request(app).put(`${itemsUrl(otherTrip.id)}/${item.id}`).send({ title: 'Hijacked' });

    expect(res.status).toBe(404);
    expect((await listItems())[0].title).toBe(item.title);
  });

  test('returns 404 for a missing item', async () => {
    const res = await request(app).put(`${itemsUrl(trip.id)}/${missingId}`).send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/trips/:id/items/:itemId', () => {
  test('deletes just that item', async () => {
    const doomed = await createItem({ title: 'Doomed' });
    await createItem({ title: 'Kept' });

    const res = await request(app).delete(`${itemsUrl(trip.id)}/${doomed.id}`);

    expect(res.status).toBe(204);
    expect((await listItems()).map((i) => i.title)).toEqual(['Kept']);
  });

  test('cannot delete an item through a different trip', async () => {
    const item = await createItem();

    const res = await request(app).delete(`${itemsUrl(otherTrip.id)}/${item.id}`);

    expect(res.status).toBe(404);
    expect(await prisma.itineraryItem.count()).toBe(1);
  });

  test('returns 404 for a missing item', async () => {
    const res = await request(app).delete(`${itemsUrl(trip.id)}/${missingId}`);

    expect(res.status).toBe(404);
  });
});
