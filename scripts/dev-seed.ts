import fetch from 'node-fetch';

async function seed() {
  const records = [
    { id: 'doc1', text: 'Alpha Org signed a contract.' },
    { id: 'doc2', text: 'Beta Corp filed a lawsuit.' }
  ];
  await fetch('http://localhost:8000/index/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  console.log('Seeded records');
}

seed();
