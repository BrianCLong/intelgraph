import { faker } from 'faker';

/**
 * Seeds demo data and toggles synthetic load.
 * This script is intentionally simple and logs actions instead of
 * connecting to real services.
 */
async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding demo data...');
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-console
    console.log(`user ${i}:`, faker.internet.email());
  }
  // eslint-disable-next-line no-console
  console.log('Synthetic load enabled');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
