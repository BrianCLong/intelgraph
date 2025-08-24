import express from "express";
import request from "supertest";
import governanceRouter, { logAudit, auditEvents } from "../src/routes/governance.ts";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(governanceRouter);
  return app;
};

describe("governance routes", () => {
  beforeEach(() => {
    auditEvents.length = 0;
  });

  it("forbids cross-tenant reads", async () => {
    logAudit({ id: 1, tenant: "t1", action: "view" });
    const app = buildApp();
    const res = await request(app)
      .get("/audit/events?tenant=t2")
      .set("x-tenant-id", "t1")
      .set("x-reason", "test");
    expect(res.status).toBe(403);
  });

  it("rejects access without reason", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/audit/events")
      .set("x-tenant-id", "t1");
    expect(res.status).toBe(400);
  });

  it("policy simulation returns blocked calls", async () => {
    logAudit({ id: 1, tenant: "t1", action: "view" });
    logAudit({ id: 2, tenant: "t2", action: "view" });
    const app = buildApp();
    const res = await request(app)
      .post("/policy/simulate")
      .set("x-reason", "sim")
      .send({ blockedTenants: ["t1"] });
    expect(res.status).toBe(200);
    expect(res.body.blocked).toHaveLength(1);
    expect(res.body.blocked[0].tenant).toBe("t1");
  });
});
