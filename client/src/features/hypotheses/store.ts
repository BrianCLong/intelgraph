export interface Evidence {
  id: string;
  description: string;
  cited: boolean;
  weight: number;
}

export interface Hypothesis {
  id: string;
  text: string;
  prior: number;
  evidence: Evidence[];
  posterior: number;
  residualUnknowns: string[];
  dissent: string[];
}

export interface HypothesisStore {
  hypotheses: Hypothesis[];
  addHypothesis: (h: Omit<Hypothesis, 'posterior'>) => void;
  addEvidence: (id: string, e: Evidence) => void;
  addDissent: (id: string, note: string) => void;
}

export function createHypothesisStore(): HypothesisStore {
  const store: HypothesisStore = {
    hypotheses: [],
    addHypothesis(h) {
      store.hypotheses.push({ ...h, posterior: h.prior });
    },
    addEvidence(id, e) {
      const h = store.hypotheses.find((x) => x.id === id);
      if (!h) return;
      h.evidence.push(e);
      const odds = h.posterior / (1 - h.posterior);
      const updated = odds * e.weight;
      h.posterior = updated / (1 + updated);
    },
    addDissent(id, note) {
      const h = store.hypotheses.find((x) => x.id === id);
      if (h) h.dissent.push(note);
    },
  };
  return store;
}
