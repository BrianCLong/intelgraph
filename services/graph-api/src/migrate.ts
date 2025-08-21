import { readFileSync } from 'fs';
import path from 'path';
import neo4j from 'neo4j-driver';

async function run() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'test')
  );
  const session = driver.session();
  const file = readFileSync(path.join(__dirname, '../migrations/001-init.cypher'), 'utf-8');
  try {
    await session.run(file);
  } finally {
    await session.close();
    await driver.close();
  }
}

run();
