// valid request bodies that the tests can start from and tweak
const validTrip = (overrides = {}) => ({
  title: 'Chicago Weekend',
  startLocation: 'Milwaukee, WI',
  destination: 'Chicago, IL',
  startDate: '2026-11-13',
  endDate: '2026-11-15',
  ...overrides,
});

const validItem = (overrides = {}) => ({
  title: 'Millennium Park',
  location: 'Millennium Park, Chicago',
  date: '2026-11-14',
  time: '10:00',
  ...overrides,
});

module.exports = { validTrip, validItem };
