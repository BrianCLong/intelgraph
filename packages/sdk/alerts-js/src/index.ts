import axios from 'axios';

export interface RuleInput {
  source: string;
  threshold?: number;
  actions: { type: string; target: string }[];
  correlationKey: string;
  windowMs: number;
}

export async function createRule(baseUrl: string, rule: RuleInput) {
  const res = await axios.post(`${baseUrl}/alerts/rules`, rule);
  return res.data;
}

export async function testAlert(baseUrl: string, payload: unknown) {
  const res = await axios.post(`${baseUrl}/alerts/test`, payload);
  return res.data;
}

export async function ackAlert(baseUrl: string, id: string, reason: string) {
  const res = await axios.post(`${baseUrl}/alerts/ack`, { id, reason });
  return res.data;
}

export async function resolveAlert(baseUrl: string, id: string, reason: string) {
  const res = await axios.post(`${baseUrl}/alerts/resolve`, { id, reason });
  return res.data;
}
