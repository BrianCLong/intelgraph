import fs from 'node:fs';
import path from 'node:path';

const FIXTURES_DIR = path.join(__dirname, '..', 'samples');

export async function seed(): Promise<void> {
  const files = fs.existsSync(FIXTURES_DIR) ? fs.readdirSync(FIXTURES_DIR) : [];
  for (const file of files) {
    // In a real deployment these would be uploaded to object storage.
    const full = path.join(FIXTURES_DIR, file);
    const size = fs.statSync(full).size;
    console.log(`seeded ${file} (${size} bytes)`);
  }
}

if (require.main === module) {
  seed();
}
