import { GraphRAGCopilotService } from '../services/GraphRAGCopilotService.js';
import { similarityService } from '../services/SimilarityService.js';
import * as GraphOps from '../services/GraphOpsService.js';

describe('GraphRAGCopilotService', () => {
  test('streams answer and caches', async () => {
    jest.spyOn(similarityService, 'findSimilar').mockResolvedValue({
      query: { type: 'text', value: 'q' },
      results: [{ entityId: 'n1', similarity: 0.9 }],
      totalResults: 1,
      executionTime: 1,
    } as any);
    jest.spyOn(GraphOps, 'expandNeighborhood').mockResolvedValue({ nodes: [], edges: [] } as any);

    const pubsub = { publish: jest.fn() };
    const service = new GraphRAGCopilotService(1000);
    const { jobId } = await service.ask({
      question: 'hi',
      investigationId: 'inv1',
      tenantId: 't1',
      pubsub,
    });
    expect(jobId).toBeDefined();
    expect(pubsub.publish).toHaveBeenCalled();

    // second call should hit cache
    pubsub.publish.mockClear();
    await service.ask({
      question: 'hi',
      investigationId: 'inv1',
      tenantId: 't1',
      pubsub,
      jobId,
    });
    expect(pubsub.publish).toHaveBeenCalledTimes(1);
  });
});
