import type { ModelAdapter } from './model-adapter';

export class NlToCypherService {
  constructor(private readonly adapter: ModelAdapter) {}

  async translate(prompt: string): Promise<string> {
    if (/show all nodes/i.test(prompt)) {
      return 'MATCH (n) RETURN n LIMIT 25';
    }

    if (/count nodes/i.test(prompt)) {
      return 'MATCH (n) RETURN count(n) AS count';
    }

    return this.adapter.generate(prompt);
  }
}
