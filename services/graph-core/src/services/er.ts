import { Entity } from '../schema';

export interface CandidateScore {
  id: string;
  score: number;
  breakdown: Record<string, number>;
  weights: Record<string, number>;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzySimilarity(a?: string, b?: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 0 : 1 - dist / maxLen;
}

const weights = { name: 0.6, email: 0.4 };

export function scoreEntities(a: Entity, b: Entity): CandidateScore {
  const breakdown: Record<string, number> = {};
  let score = 0;
  const nameSim = fuzzySimilarity(a.attributes.name as string, b.attributes.name as string);
  breakdown.name = Number((nameSim * weights.name).toFixed(2));
  score += breakdown.name;
  const emailSim = fuzzySimilarity(a.attributes.email as string, b.attributes.email as string);
  breakdown.email = Number((emailSim * weights.email).toFixed(2));
  score += breakdown.email;
  return { id: `${a.id}|${b.id}`, score: Number(score.toFixed(2)), breakdown, weights };
}

type Decision = { candidateId: string; approved: boolean; by: string; at: string };
const decisions = new Map<string, Decision>();
const explanations = new Map<string, CandidateScore>();

export function enqueueCandidate(score: CandidateScore) {
  explanations.set(score.id, score);
}

export function decide(candidateId: string, approved: boolean, user: string) {
  decisions.set(candidateId, { candidateId, approved, by: user, at: new Date().toISOString() });
}

export function getDecision(id: string) {
  return decisions.get(id);
}

export function getExplanation(id: string) {
  return explanations.get(id);
}

export function listCandidates() {
  return Array.from(explanations.values());
}
