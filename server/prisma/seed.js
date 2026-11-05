// adds one demo user and trip so the database isn't empty while developing
// run with: npm run db:seed
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@trippin.dev' },
    update: {},
    create: { email: 'demo@trippin.dev', name: 'Demo User' },
  });

  // only add the demo trip once
  const existing = await prisma.trip.findFirst({ where: { userId: user.id, title: 'Chicago Weekend' } });
  if (existing) return;

  await prisma.trip.create({
    data: {
      title: 'Chicago Weekend',
      startLocation: 'Milwaukee, WI',
      destination: 'Chicago, IL',
      startDate: new Date('2026-11-13'),
      endDate: new Date('2026-11-15'),
      budget: 500,
      userId: user.id,
      itineraryItems: {
        create: [
          { title: 'Check in', type: 'Hotel', location: 'The Palmer House, Chicago', lat: 41.8807, lng: -87.6262, date: new Date('2026-11-13'), time: '15:00' },
          { title: 'Millennium Park', type: 'Park', location: 'Millennium Park, Chicago', lat: 41.8826, lng: -87.6226, date: new Date('2026-11-14'), time: '10:00' },
        ],
      },
      expenses: {
        create: [
          { description: 'Hotel (2 nights)', amount: 320, category: 'LODGING', date: new Date('2026-11-13') },
          { description: 'Train tickets', amount: 52.5, category: 'TRANSPORTATION', date: new Date('2026-11-13') },
        ],
      },
    },
  });
}

main()
  .then(() => console.log('Seeded demo data'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
