// one shared Prisma client for the whole server
// import this anywhere you need to talk to the database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
