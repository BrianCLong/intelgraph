import fs from 'fs';
import fetch from 'node-fetch';

async function run() {
  const text = 'Seed document with email seed@example.com';
  fs.writeFileSync('seed.txt', text);
  const form = new (require('form-data'))();
  form.append('file', fs.createReadStream('seed.txt'));
  const res = await fetch('http://localhost:8000/doc/upload', { method: 'POST', body: form });
  const json = await res.json();
  console.log('uploaded', json);
}

run();
