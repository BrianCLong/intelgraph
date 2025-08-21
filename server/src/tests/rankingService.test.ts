import RankingService from '../services/RankingService';

describe('RankingService', () => {
  it('combines scores with weights and sorts descending', () => {
    const service = new RankingService({ lexical: 1, semantic: 2, graph: 3 });
    const results = service.rank([
      { id: 'a', lexicalScore: 0.2, vectorScore: 0.1, graphScore: 0.5 },
      { id: 'b', lexicalScore: 0.4, vectorScore: 0.2, graphScore: 0.1 },
    ]);
    expect(results[0].id).toBe('a');
    expect(results[0].score).toBeCloseTo(1.9);
    expect(results[0].explain.graph).toBeCloseTo(0.5);
  });
});
