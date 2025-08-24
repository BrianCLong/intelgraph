export interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  score: number;
  bm25: number;
  vectorScore: number;
  graphBoost: number;
  explanation: string[];
}

export interface AskDraft {
  question: string;
  answerDraft: string[];
  citations: { id: string; spans: string[] }[];
  manifest: Record<string, unknown>;
}
