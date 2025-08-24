export interface EvaluationInput {
  subject: string;
  action: string;
  resource: string;
  context: Record<string, unknown>;
}

export async function evaluate(input: EvaluationInput) {
  const url = process.env.OPA_URL ?? 'http://localhost:8181/v1/data/graphql/guard';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`OPA decision failed: ${res.status}`);
  const json = (await res.json()) as { result?: { allow?: boolean; obligations?: unknown[] } };
  const result = json.result ?? {};
  return { allow: Boolean(result.allow), obligations: result.obligations ?? [] };
}
