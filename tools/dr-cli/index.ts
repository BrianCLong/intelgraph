#!/usr/bin/env node

const [, , command, arg] = process.argv;
const baseUrl = process.env.DR_URL ?? 'http://localhost:3000';

async function run() {
  if (command === 'backup') {
    const res = await fetch(`${baseUrl}/dr/backup`, { method: 'POST' });
    console.log(await res.json());
  } else if (command === 'restore') {
    const res = await fetch(`${baseUrl}/dr/restore`, { method: 'POST', body: arg ?? '' });
    console.log(await res.json());
  } else if (command === 'status') {
    const res = await fetch(`${baseUrl}/dr/status/${arg}`);
    console.log(await res.json());
  } else {
    console.log('usage: dr-cli <backup|restore|status> [id]');
  }
}

run();
