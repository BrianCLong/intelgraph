import { NlToCypherService } from '../src/ai/nl-to-cypher/nl-to-cypher.service';
import type { ModelAdapter } from '../src/ai/nl-to-cypher/model-adapter';

class MockAdapter implements ModelAdapter {
  async generate(prompt: string): Promise<string> {
    return `generated: ${prompt}`;
  }
}

describe('NlToCypherService', () => {
  it('translates known prompts', async () => {
    const service = new NlToCypherService(new MockAdapter());
    await expect(service.translate('show all nodes')).resolves.toBe('MATCH (n) RETURN n LIMIT 25');
  });

  it('falls back to model adapter', async () => {
    const service = new NlToCypherService(new MockAdapter());
    await expect(service.translate('unknown')).resolves.toBe('generated: unknown');
  });
});
