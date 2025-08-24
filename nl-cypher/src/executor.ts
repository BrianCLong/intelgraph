import { trace } from '@opentelemetry/api';
import type { Driver } from 'neo4j-driver';
import { estimateCost } from './estimator.ts';
import { loadSafeList, validateQuery } from './validator.ts';

const tracer = trace.getTracer('nl-cypher');
const safe = loadSafeList();
const BUDGET = 100;

export async function execute(cypher: string, ticket: string, driver: Driver) {
  return tracer.startActiveSpan('execute', async (span) => {
    if (ticket !== 'ALLOW') {
      span.end();
      throw new Error('Unauthorized');
    }
    const warnings = validateQuery(cypher, safe);
    if (warnings.length) {
      span.end();
      throw new Error('Query failed validation');
    }
    const est = estimateCost(cypher);
    if (est.cost > BUDGET) {
      span.end();
      throw new Error('Query exceeds budget');
    }
    const session = driver.session({ defaultAccessMode: 'READ' });
    try {
      const res = await session.run(cypher);
      span.end();
      return res.records.map((r) => r.toObject());
    } finally {
      await session.close();
    }
  });
}
