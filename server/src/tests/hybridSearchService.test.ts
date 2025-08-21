import HybridSearchService from '../services/HybridSearchService';
import RankingService from '../services/RankingService';

describe('HybridSearchService', () => {
  const lexical = async () => [{ id: '1', title: 'foo', snippet: 'foo', score: 0.8 }];
  const semanticMock = {
    search: jest.fn().mockResolvedValue([
      { id: '1', text: 'foo', score: 0.6 },
      { id: '2', text: 'bar', score: 0.9 },
    ]),
  } as any;
  const ranking = new RankingService({ lexical: 1, semantic: 1, graph: 1 });
  const graphScore = (id: string) => (id === '1' ? 0.5 : 0.1);

  it('merges lexical and semantic results and ranks', async () => {
    const service = new HybridSearchService(lexical, semanticMock, ranking, graphScore);
    const results = await service.search('foo');
    expect(results[0].id).toBe('1');
    expect(results[0].score).toBeCloseTo(1.9);
    expect(results[0].explain.vector).toBeCloseTo(0.6);
    expect(results[1].id).toBe('2');
  });

  it('falls back to lexical when semantic fails', async () => {
    const failingSemantic = { search: jest.fn().mockRejectedValue(new Error('fail')) } as any;
    const service = new HybridSearchService(lexical, failingSemantic, ranking, graphScore);
    const results = await service.search('foo');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
