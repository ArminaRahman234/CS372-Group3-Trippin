// a small in-memory stand-in for the Express API, used in place of fetch
// it answers with the same JSON shapes as server/src/routes/trips.js
import { vi } from 'vitest'

const reply = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => body,
})

export function fakeApi({ trips = [], items = {} } = {}) {
  // copies, so a test that edits data never changes the shared fixtures
  const db = structuredClone({ trips, items })
  let nextId = 1

  const fetchMock = vi.fn(async (url, { method = 'GET', body } = {}) => {
    // "/api/trips/:tripId/items/:itemId"
    const [, , , tripId, child, itemId] = url.split('/')
    const data = body ? JSON.parse(body) : undefined

    if (!tripId) {
      if (method === 'GET') return reply(200, db.trips)
      const trip = { id: `new-${nextId++}`, isBookmarked: false, ...data }
      db.trips.push(trip)
      return reply(201, trip)
    }

    if (!child) {
      if (method === 'DELETE') {
        db.trips = db.trips.filter((t) => t.id !== tripId)
        return reply(204)
      }
      const trip = db.trips.find((t) => t.id === tripId)
      Object.assign(trip, data)
      return reply(200, { ...trip })
    }

    const list = (db.items[tripId] ??= [])
    if (method === 'GET') return reply(200, list)
    if (method === 'POST') {
      const item = { id: `new-${nextId++}`, tripId, ...data }
      list.push(item)
      return reply(201, item)
    }
    if (method === 'DELETE') {
      db.items[tripId] = list.filter((i) => i.id !== itemId)
      return reply(204)
    }
    const item = list.find((i) => i.id === itemId)
    Object.assign(item, data)
    return reply(200, { ...item })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
