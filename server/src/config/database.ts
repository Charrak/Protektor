import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Graceful Shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Datenbankverbindung geschlossen');
});

export { prisma };
