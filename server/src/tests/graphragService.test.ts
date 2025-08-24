import { GraphRAGService } from "../services/GraphRAGService.js";
import {
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
} from "../monitoring/metrics.js";
import { UserFacingError } from "../lib/errors.js";

describe("GraphRAGService", () => {
  const baseRequest = {
    investigationId: "inv1",
    question: "What is testing?",
  };

  function createService(llmResponses: string[]) {
    const neo4jSession = {
      run: jest.fn().mockResolvedValue({
        records: [
          {
            get: (field: string) => {
              if (field === "nodes") {
                return [
                  {
                    properties: {
                      id: "e1",
                      type: "Entity",
                      label: "Entity1",
                      properties: "{}",
                      confidence: 1,
                    },
                  },
                ];
              }
              if (field === "relationships") {
                return [
                  {
                    properties: {
                      id: "r1",
                      type: "REL",
                      fromEntityId: "e1",
                      toEntityId: "e1",
                      properties: "{}",
                      confidence: 1,
                    },
                  },
                ];
              }
              return null;
            },
          },
        ],
      }),
      close: jest.fn(),
    };
    const neo4jDriver = { session: () => neo4jSession } as any;

    const store = new Map<string, string>();
    const freq = new Map<string, number>();
    const zset = new Map<string, number>();
    const redis = {
      get: jest.fn(async (key: string) => store.get(key) || null),
      setex: jest.fn(async (key: string, _ttl: number, val: string) => {
        store.set(key, val);
      }),
      incr: jest.fn(async (key: string) => {
        const val = (freq.get(key) || 0) + 1;
        freq.set(key, val);
        return val;
      }),
      expire: jest.fn(async () => true),
      zincrby: jest.fn(async (_set: string, inc: number, key: string) => {
        const val = (zset.get(key) || 0) + inc;
        zset.set(key, val);
        return val;
      }),
      zrevrange: jest.fn(
        async (_set: string, start: number, stop: number, withScores: string) => {
          const arr = [...zset.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(start, stop + 1);
          if (withScores === "WITHSCORES") {
            return arr.flatMap(([k, v]) => [k, v.toString()]);
          }
          return arr.map(([k]) => k);
        },
      ),
    } as any;

    const llmService = {
      complete: jest.fn(async () => llmResponses.shift() as string),
    };

    const embeddingService = {
      generateEmbedding: jest.fn(async () => [0.1]),
    };

    const service = new GraphRAGService(
      neo4jDriver,
      llmService as any,
      embeddingService as any,
      redis,
    );
    return { service, neo4jSession, llmService };
  }

  beforeEach(() => {
    graphragSchemaFailuresTotal.reset();
    graphragCacheHitRatio.set(0);
  });

  test("returns valid response and uses cache", async () => {
    const valid = JSON.stringify({
      answer: "Test",
      confidence: 0.9,
      citations: { entityIds: ["e1"] },
      why_paths: [
        { from: "e1", to: "e1", relId: "r1", type: "REL" },
      ],
    });
    const { service, neo4jSession } = createService([valid, valid]);

    const first = await service.answer(baseRequest);
    expect(first.answer).toBe("Test");
    expect(graphragCacheHitRatio.get().values[0].value).toBe(0);

    const second = await service.answer(baseRequest);
    expect(second.answer).toBe("Test");
    expect(graphragCacheHitRatio.get().values[0].value).toBeCloseTo(0.5);
    expect(neo4jSession.run).toHaveBeenCalledTimes(1);
  });

  test("throws user-facing error with trace id on invalid output", async () => {
    const { service } = createService(["not-json", "not-json"]);
    await expect(service.answer(baseRequest)).rejects.toBeInstanceOf(UserFacingError);
    expect(graphragSchemaFailuresTotal.get().values[0].value).toBe(2);
  });

  test("reports popular subgraphs", async () => {
    const valid = JSON.stringify({
      answer: "Test",
      confidence: 0.9,
      citations: { entityIds: ["e1"] },
      why_paths: [
        { from: "e1", to: "e1", relId: "r1", type: "REL" },
      ],
    });
    const { service } = createService([valid]);
    await service.answer(baseRequest);
    const popular = await service.getPopularSubgraphs();
    expect(popular.length).toBeGreaterThan(0);
    expect(popular[0].count).toBeGreaterThan(0);
  });
});
