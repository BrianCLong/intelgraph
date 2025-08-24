import axios from 'axios';

export interface EnrichItem {
  provider: string;
  query: string;
}

export async function submitEnrichment(baseUrl: string, items: EnrichItem[]) {
  const res = await axios.post(`${baseUrl}/enrich`, { items });
  return res.data as { jobId: string };
}

export async function getEnrichment(baseUrl: string, jobId: string) {
  const res = await axios.get(`${baseUrl}/enrich/${jobId}`);
  return res.data as { status: string; result: unknown[] };
}
