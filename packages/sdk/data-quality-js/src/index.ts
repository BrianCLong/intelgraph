export interface Rule {
  id: string;
  field: string;
  type: string;
  params?: Record<string, unknown>;
}

const post = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

export const createRule = (base: string, rule: Rule) => post(`${base}/dq/rules`, rule);
export const evaluate = (base: string, payload: unknown, rules: Rule[]) =>
  post(`${base}/dq/evaluate`, { payload, rules });
export const quarantineRetry = (base: string, id: string) =>
  post(`${base}/dq/quarantine/retry`, { item_id: id });
export const quarantineDrop = (base: string, id: string, reason: string) =>
  post(`${base}/dq/quarantine/drop`, { item_id: id, reason });
