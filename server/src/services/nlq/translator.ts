export interface TranslationResult {
  cypher: string;
  citations: Array<{ nodeId: string; source: string; confidence: number }>;
}

export interface NLQTranslator {
  translate(input: {
    question: string;
    caseId: string;
    tenantId: string;
  }): Promise<TranslationResult>;
}

class RuleBasedTranslator implements NLQTranslator {
  async translate({
    question,
    tenantId,
  }: {
    question: string;
    caseId: string;
    tenantId: string;
  }): Promise<TranslationResult> {
    // Very naive placeholder: always scope by tenantId
    const cypher = 'MATCH (n {tenantId: $tenantId}) RETURN n LIMIT 5';
    return { cypher, citations: [] };
  }
}

export const translator: NLQTranslator = new RuleBasedTranslator();
