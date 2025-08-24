import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS kyc_subjects(id text primary key, name text);`);
  await client.query(`INSERT INTO kyc_subjects(id,name) VALUES('1','Alice Smith') ON CONFLICT DO NOTHING;`);
  await client.end();
  console.log('seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
