import { writeFileSync } from 'fs';

/**
 * Seed demo data for development.
 */
async function main() {
  const data = {
    queries: [],
    scenes: [],
    overlays: [],
    comments: [],
    storyboards: [],
    exports: [],
  };
  writeFileSync('dev-seed.json', JSON.stringify(data, null, 2));
  console.log('seed written');
}

main();
