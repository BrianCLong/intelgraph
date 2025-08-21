import { v4 as uuid } from 'uuid';
import { expandNeighborhood } from './GraphOpsService.js';
import { similarityService } from './SimilarityService.js';

interface CopilotRequest {
  jobId?: string;
  question: string;
  investigationId: string;
  tenantId: string;
  pubsub: { publish: (channel: string, payload: any) => void };
}

interface CopilotCitation {
  nodeId: string;
}

interface CopilotFinalChunk {
  jobId: string;
  text: string | null;
  done: boolean;
  citations: CopilotCitation[];
}

export class GraphRAGCopilotService {
  private cache: Map<string, { chunk: CopilotFinalChunk; expires: number }>;
  private ttlMs: number;

  constructor(ttlMs = 30_000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  async ask(request: CopilotRequest): Promise<{ jobId: string }> {
    const jobId = request.jobId ?? uuid();
    const cached = this.cache.get(jobId);
    if (cached && cached.expires > Date.now()) {
      request.pubsub.publish(`COPILOT_ANSWER_${jobId}`, { payload: cached.chunk });
      return { jobId };
    }

    const similar = await similarityService.findSimilar({
      investigationId: request.investigationId,
      text: request.question,
      topK: 3,
    });
    const entityIds = similar.results.map((r) => r.entityId);
    if (entityIds[0]) {
      try {
        await expandNeighborhood(entityIds[0], 1, {
          tenantId: request.tenantId,
          investigationId: request.investigationId,
        });
      } catch {
        /* swallow */
      }
    }

    const citations: CopilotCitation[] = entityIds.map((id) => ({ nodeId: id }));
    const answer = entityIds.length
      ? `Related entities: ${entityIds.join(', ')}`
      : 'No related entities found.';

    for (const word of answer.split(' ')) {
      request.pubsub.publish(`COPILOT_ANSWER_${jobId}`, {
        payload: { jobId, text: `${word} `, done: false },
      });
    }

    const finalChunk: CopilotFinalChunk = {
      jobId,
      text: null,
      done: true,
      citations,
    };
    request.pubsub.publish(`COPILOT_ANSWER_${jobId}`, { payload: finalChunk });
    this.cache.set(jobId, { chunk: finalChunk, expires: Date.now() + this.ttlMs });
    return { jobId };
  }
}

export const graphRAGCopilotService = new GraphRAGCopilotService();
