import fetch from 'node-fetch';

export async function evaluate(policy: string, input: any): Promise<{ allow: boolean; reason?: string[] }> {
  const resp = await fetch((process.env.OPA_URL || 'http://localhost:8181/v1/data/') + policy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  });
  const json = await resp.json();
  const deny = json.result?.deny || [];
  return { allow: deny.length === 0, reason: deny };
}
