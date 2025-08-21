import { EntityResolutionService } from "../src/services/EntityResolutionService";

describe("EntityResolutionService", () => {
  it("computes similarity features with fuzzy and embedding", async () => {
    const service: any = new EntityResolutionService();
    service.embeddingService.calculateSimilarity = jest.fn().mockResolvedValue(0.9);
    const left = { name: "Alice", email: "alice@example.com" };
    const right = { name: "Alicia", email: "alice@example.com" };
    const explanation = await service.generateExplanation(left, right);
    expect(explanation.features.email_exact).toBe(1);
    expect(explanation.features.name_fuzzy).toBeGreaterThan(0.7);
    expect(explanation.features.name_embedding).toBe(0.9);
    expect(explanation.score).toBeGreaterThan(0);
  });
});
