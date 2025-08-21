import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;
export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!),
      { disableLosslessIntegers: true }
    );
  }
  return driver;
}

export async function withSession<T>(fn: (s: any) => Promise<T>): Promise<T> {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}
