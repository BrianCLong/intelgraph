import neo4j from 'neo4j-driver';
import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';

export async function executeSandbox(cypher: string, rowLimit = 10) {
  if (/(CREATE|MERGE|DELETE|SET)/i.test(cypher)) {
    throw new Error('Mutations are not allowed');
  }
  let container: StartedNeo4jContainer;
  try {
    container = await new Neo4jContainer('neo4j:5').withPassword('password').start();
  } catch {
    throw new Error('Neo4j container unavailable');
  }
  const uri = container.getBoltUri();
  const driver = neo4j.driver(uri, neo4j.auth.basic('neo4j', 'password'));
  const session = driver.session();
  try {
    const result = await session.run(`${cypher} LIMIT ${rowLimit}`);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
    await driver.close();
    await container.stop();
  }
}
