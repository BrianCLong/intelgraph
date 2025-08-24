import axios from 'axios';

export async function getCandidates(baseUrl: string, entities: any[], threshold = 0.8) {
  const url = `${baseUrl}/er/candidates`;
  const { data } = await axios.post(url, { entities, threshold });
  return data;
}

export async function mergeEntities(
  baseUrl: string,
  payload: {
    source_id: string;
    target_id: string;
    reason: string;
    actor: string;
    labels?: string[];
  },
) {
  const url = `${baseUrl}/er/merge`;
  const { data } = await axios.post(url, payload);
  return data;
}

export async function splitEntities(
  baseUrl: string,
  payload: { source_id: string; target_id: string; reason: string; actor: string },
) {
  const url = `${baseUrl}/er/split`;
  const { data } = await axios.post(url, payload);
  return data;
}

export async function explainMatch(baseUrl: string, matchId: string) {
  const url = `${baseUrl}/er/explain/${matchId}`;
  const { data } = await axios.get(url);
  return data;
}
