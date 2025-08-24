import { writeFileSync } from 'fs';

// Demo seeding script: writes a small dataset to data/demo.json
const demoData = {
  entities: [
    { id: 'p1', type: 'Person', name: 'Alice' },
    { id: 'o1', type: 'Org', name: 'ACME' }
  ],
  edges: [
    { id: 'e1', type: 'relatesTo', from: 'p1', to: 'o1' }
  ]
};

writeFileSync('data/demo.json', JSON.stringify(demoData, null, 2));
console.log('Seeded demo data to data/demo.json');
