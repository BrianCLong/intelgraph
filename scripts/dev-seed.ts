// Seeds demo cases for GA-CaseOps skeleton
import fetch from 'node-fetch';

async function run() {
  await fetch('http://localhost:8000/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Seeded Case', description: 'demo' })
  });
}

run();
