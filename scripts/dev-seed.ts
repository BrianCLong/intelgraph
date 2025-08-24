import { writeFileSync } from 'fs';

interface SeedData {
  investigations: { id: string; title: string }[];
}

const data: SeedData = {
  investigations: [
    { id: '1', title: 'Demo Investigation' }
  ]
};

writeFileSync('seed-data.json', JSON.stringify(data, null, 2));
console.log('Seed data written');
