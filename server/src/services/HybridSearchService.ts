import RankingService, { RankedResult } from './RankingService.js';
import SemanticSearchService from './SemanticSearchService.js';

export interface SearchOptions {
  filters?: Record<string, any>;
  topK?: number;
  mode?: 'LEXICAL' | 'SEMANTIC' | 'HYBRID';
}

export type RetrievalResult = {
  id: string;
  title?: string;
  snippet?: string;
  score: number;
};

export type RetrievalFunc = (
  query: string,
  topK: number,
  filters?: Record<string, any>,
) => Promise<RetrievalResult[]>;

export default class HybridSearchService {
  constructor(
    private lexical: RetrievalFunc = async () => [],
    private semantic: SemanticSearchService = new SemanticSearchService(),
    private ranking: RankingService = new RankingService(),
    private graphScore: (id: string) => number = () => 0,
  ) {}

  async search(
    query: string,
    { filters = {}, topK = 25, mode = 'HYBRID' }: SearchOptions = {},
  ): Promise<RankedResult[]> {
    let lexicalResults: RetrievalResult[] = [];
    let semanticResults: RetrievalResult[] = [];

    if (mode !== 'SEMANTIC') {
      lexicalResults = await this.lexical(query, topK, filters);
    }

    if (mode !== 'LEXICAL') {
      try {
        const sem = await this.semantic.search(query, filters, topK);
        semanticResults = sem.map((s) => ({
          id: s.id,
          title: s.text,
          snippet: s.text,
          score: s.score,
        }));
      } catch (err) {
        // Semantic search may not be available; continue with lexical results
      }
    }

    const merged = new Map<string, any>();
    for (const r of lexicalResults) {
      merged.set(r.id, {
        id: r.id,
        title: r.title,
        snippet: r.snippet,
        lexicalScore: r.score,
        vectorScore: 0,
      });
    }
    for (const r of semanticResults) {
      const existing = merged.get(r.id) || {
        id: r.id,
        title: r.title,
        snippet: r.snippet,
        lexicalScore: 0,
      };
      existing.vectorScore = r.score;
      merged.set(r.id, existing);
    }

    const withGraph = Array.from(merged.values()).map((r) => ({
      ...r,
      graphScore: this.graphScore(r.id),
    }));

    return this.ranking.rank(withGraph).slice(0, topK);
  }
}
