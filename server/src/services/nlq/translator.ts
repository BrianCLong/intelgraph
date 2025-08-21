export interface CopilotCitation {
  nodeId: string;
  source: string;
  confidence: number;
}

export interface TranslationResult {
  cypher: string;
  params: Record<string, any>;
  citations: CopilotCitation[];
  metrics: Record<string, any>;
}

export class NLQTranslator {
  async translate(question: string, tenantId: string): Promise<TranslationResult> {
    const lower = question.toLowerCase();
    let cypher: string;
    if (lower.includes('person') || lower.includes('people')) {
      cypher = 'MATCH (n:Person) WHERE n.tenantId = $tenantId RETURN n LIMIT 25';
    } else {
      cypher = 'MATCH (n) WHERE n.tenantId = $tenantId RETURN n LIMIT 25';
    }
    return {
      cypher,
      params: { tenantId },
      citations: [],
      metrics: { strategy: 'rule' },
    };
  }
}

export const translator = new NLQTranslator();
