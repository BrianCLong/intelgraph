export interface Evidence {
  id: string;
  description: string;
  likelihoodGivenHypothesis: number; // P(E|H)
  likelihoodGivenAlternative: number; // P(E|~H)
  cited: boolean;
}

export interface Hypothesis {
  id: string;
  statement: string;
  prior: number; // P(H)
  evidence: Evidence[];
  posterior: number; // updated probability
  residualUnknowns: string[];
  dissent: string[];
}

export function bayesianUpdate(prior: number, evidence: Evidence[]): number {
  let odds = prior / (1 - prior);
  for (const e of evidence) {
    const weight = e.likelihoodGivenHypothesis / e.likelihoodGivenAlternative;
    odds *= weight;
  }
  return odds / (1 + odds);
}

export function applyEvidence(h: Hypothesis, e: Evidence): Hypothesis {
  const evidence = [...h.evidence, e];
  const posterior = bayesianUpdate(h.prior, evidence);
  return { ...h, evidence, posterior };
}

export function addDissent(h: Hypothesis, note: string): Hypothesis {
  return { ...h, dissent: [...h.dissent, note] };
}

export function missingEvidencePrompts(h: Hypothesis): string[] {
  const uncited = h.evidence.filter((e) => !e.cited);
  return uncited.map((e) => `Evidence ${e.id} lacks citation`);
}
