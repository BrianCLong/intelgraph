import { promises as fs } from 'node:fs';

async function main() {
  const seed = {
    assistants: [{ id: 'assist1', name: 'Investigation Copilot', purpose: 'INVESTIGATION' }],
    queries: { gql: { risk: 'query { risk }' }, cypher: { neighbors: 'MATCH (n) RETURN n' }, sql: { docs: 'SELECT 1' } }
  };
  await fs.writeFile('seed.json', JSON.stringify(seed, null, 2));
  console.log('seeded');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
