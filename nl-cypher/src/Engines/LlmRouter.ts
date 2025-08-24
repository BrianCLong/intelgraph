import OpenAI from 'openai';

export interface LlmResponse {
  cypher: string;
  rationale: string;
}

export class LlmRouter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async translate(text: string): Promise<LlmResponse> {
    const system = 'You convert natural language to Cypher safely. Return JSON with cypher and rationale.';
    const resp = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      temperature: 0,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    });
    const parsed = JSON.parse(resp.output_text);
    return { cypher: parsed.cypher || '', rationale: parsed.rationale || '' };
  }
}
