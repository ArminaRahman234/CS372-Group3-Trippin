// sample data shaped like the API responses
export const chicagoTrip = {
  id: 'trip-1',
  title: 'Chicago Weekend',
  startLocation: 'Fort Wayne, IN',
  destination: 'Chicago, IL',
  startDate: '2026-11-13',
  endDate: '2026-11-15',
  isBookmarked: false,
}

export const apiItem = (overrides = {}) => ({
  id: 'item-1',
  tripId: 'trip-1',
  title: 'Navy Pier',
  type: 'Activity',
  location: 'Navy Pier, Chicago',
  lat: null,
  lng: null,
  date: '2026-11-14',
  time: '13:00',
  notes: null,
  ...overrides,
})
