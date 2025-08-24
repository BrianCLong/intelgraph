import { trace } from '@opentelemetry/api';
import { LlmRouter } from './Engines/LlmRouter.ts';
import { sanitizeInput } from './sanitizer.ts';
import { loadSafeList, validateQuery } from './validator.ts';
import { estimateCost } from './estimator.ts';

export interface TranslateResult {
  cypher: string;
  rationale: string;
  warnings: string[];
  estCost: number;
  estRows: number;
}

const tracer = trace.getTracer('nl-cypher');
const safe = loadSafeList();

export async function translate(text: string, router: LlmRouter): Promise<TranslateResult> {
  return tracer.startActiveSpan('translate', async (span) => {
    const { text: clean, warnings } = sanitizeInput(text);
    const llm = await router.translate(clean);
    const vRes = await tracer.startActiveSpan('validate', async (vSpan) => {
      const vWarnings = validateQuery(llm.cypher, safe);
      vSpan.end();
      return vWarnings;
    });
    warnings.push(...vRes);
    const estimate = await tracer.startActiveSpan('estimate', async (eSpan) => {
      const est = estimateCost(llm.cypher);
      eSpan.end();
      return est;
    });
    span.end();
    return { cypher: llm.cypher, rationale: llm.rationale, warnings, estCost: estimate.cost, estRows: estimate.rows };
  });
}
