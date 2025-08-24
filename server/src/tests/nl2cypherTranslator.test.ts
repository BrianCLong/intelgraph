import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nl2cypher } from '../nl2cypher/index';

describe('nl2cypher corpus', () => {
  it('produces expected cypher and AST for corpus', () => {
    const corpusPath = join(__dirname, '../../../contracts/nl2cypher/prompts.tsv');
    const lines = readFileSync(corpusPath, 'utf-8').trim().split('\n');
    let success = 0;
    for (const line of lines) {
      const [promptPart, astJsonPart, cypherPart] = line.split('\t');
      const prompt = promptPart.trim();
      const astExpected = JSON.parse(astJsonPart.trim());
      const cypherExpected = cypherPart.trim();
      const result = nl2cypher(prompt);
      expect(result.cypher.trim()).toBe(cypherExpected);
      expect(result.ast).toEqual(astExpected);
      success++;
    }
    expect(success / lines.length).toBeGreaterThanOrEqual(0.95);
  });
});
