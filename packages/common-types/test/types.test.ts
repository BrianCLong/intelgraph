import { SearchResult } from '../src';

test('SearchResult type', () => {
  const res: SearchResult = {
    id: '1',
    type: 'Document',
    title: 'Title',
    snippet: 'Snippet',
    score: 1,
    bm25: 1,
    vectorScore: 1,
    graphBoost: 0,
    explanation: []
  };
  expect(res.id).toBe('1');
});
