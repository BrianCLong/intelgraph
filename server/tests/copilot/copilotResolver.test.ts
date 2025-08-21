import { CopilotResolvers } from "../../src/resolvers/copilot";
import { evaluateCopilotPolicy } from "../../src/policy/copilot";

describe("copilotQuery resolver", () => {
  it("returns preview with policy decision", async () => {
    const res = await (CopilotResolvers.Query as any).copilotQuery(
      null,
      { question: "list nodes", caseId: "1", preview: true },
      { tenant: { id: "t1" } },
    );
    expect(res.preview).toMatch(/tenantId/);
    expect(res.policy.allowed).toBe(true);
    expect(res.cypher).toBeNull();
  });

  it("policy denies destructive queries", () => {
    const decision = evaluateCopilotPolicy("MATCH (n) DELETE n", "t1");
    expect(decision.allowed).toBe(false);
    expect(decision.deniedRules).toContain("no_destructive_ops");
  });
});
