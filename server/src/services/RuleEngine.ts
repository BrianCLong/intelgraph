export interface Rule {
  id: string;
  spec: any;
}

export class RuleEngine {
  async evaluate(rule: Rule): Promise<any[]> {
    // Placeholder evaluator: real implementation would query Neo4j and PGVector
    return [];
  }
}

export const ruleEngine = new RuleEngine();
