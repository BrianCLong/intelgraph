const logger = require('./src/logger');

async function seed() {
  logger.info('seeding started');
  // Add seed logic here
  logger.info('seeding complete');
}

seed();
