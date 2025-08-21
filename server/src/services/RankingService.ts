import pino from 'pino';

export interface RankingWeights {
  lexical?: number;
  semantic?: number;
  graph?: number;
}

export interface RankableResult {
  id: string;
  title?: string;
  snippet?: string;
  lexicalScore?: number;
  vectorScore?: number;
  graphScore?: number;
}

export interface RankedResult extends RankableResult {
  score: number;
  explain: {
    lexical: number;
    vector: number;
    graph: number;
  };
}

export default class RankingService {
  private logger = pino({ name: 'RankingService' });
  private weights: Required<RankingWeights>;

  constructor(weights: RankingWeights = { lexical: 1, semantic: 1, graph: 1 }) {
    this.weights = {
      lexical: weights.lexical ?? 1,
      semantic: weights.semantic ?? 1,
      graph: weights.graph ?? 1,
    };
  }

  rank(results: RankableResult[]): RankedResult[] {
    const ranked = results.map((r) => {
      const lexical = r.lexicalScore ?? 0;
      const vector = r.vectorScore ?? 0;
      const graph = r.graphScore ?? 0;
      const score =
        lexical * this.weights.lexical +
        vector * this.weights.semantic +
        graph * this.weights.graph;
      return {
        ...r,
        lexicalScore: lexical,
        vectorScore: vector,
        graphScore: graph,
        score,
        explain: { lexical, vector, graph },
      } as RankedResult;
    });

    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }
}
