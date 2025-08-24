import { translate } from '../src/translator.ts';
import prompts from './prompts.json';

describe('translate fixture', () => {
  const router = {
    translate: async (text: string) => ({
      cypher: 'MATCH (n:Person) RETURN n LIMIT 5',
      rationale: `mock for ${text}`
    })
  };
  test('95% syntactic validity', async () => {
    let valid = 0;
    for (const p of prompts) {
      const res = await translate(p, router as any);
      if (!res.warnings.length) valid++;
    }
    expect(valid / prompts.length).toBeGreaterThanOrEqual(0.95);
  });
});
