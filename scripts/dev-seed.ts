import fs from 'fs';

// Demo seed script for GA-Assist
export async function seed() {
  const sampleDocs = [
    { id: 1, title: 'Demo', text: 'Alice works at Acme Corp.' },
  ];
  fs.writeFileSync('seed-output.json', JSON.stringify(sampleDocs, null, 2));
  console.log('Seeded demo documents');
}

if (require.main === module) {
  seed();
}
