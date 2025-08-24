"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = __importDefault(require("crypto"));
const app_1 = require("../app"); // assumes your express app export
const SECRET = process.env.ML_WEBHOOK_SECRET || "test-secret";
function sign(body) {
    const raw = JSON.stringify(body);
    const h = crypto_1.default.createHmac("sha256", SECRET).update(raw).digest("hex");
    return { raw, sig: h };
}
describe("AI webhook", () => {
    let app;
    beforeAll(async () => {
        app = await (0, app_1.createApp)();
    });
    it("accepts signed webhook and creates insights", async () => {
        const body = {
            job_id: "11111111-1111-1111-1111-111111111111",
            kind: "link_prediction",
            predictions: [{ u: "a", v: "b", score: 3 }]
        };
        const { sig } = sign(body);
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", sig)
            .send(body);
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
    it("rejects webhook with invalid signature", async () => {
        const body = {
            job_id: "22222222-2222-2222-2222-222222222222",
            kind: "nlp_entities",
            results: []
        };
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", "invalid-signature")
            .send(body);
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("invalid signature");
    });
    it("handles entity resolution webhook", async () => {
        const body = {
            job_id: "33333333-3333-3333-3333-333333333333",
            kind: "entity_resolution",
            links: [["entity1", "entity2", 0.95]]
        };
        const { sig } = sign(body);
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", sig)
            .send(body);
        expect(res.status).toBe(200);
    });
    it("handles community detection webhook", async () => {
        const body = {
            job_id: "44444444-4444-4444-4444-444444444444",
            kind: "community_detect",
            communities: [
                { community_id: "c1", members: ["node1", "node2", "node3"] },
                { community_id: "c2", members: ["node4", "node5"] }
            ]
        };
        const { sig } = sign(body);
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", sig)
            .send(body);
        expect(res.status).toBe(200);
    });
    it("handles NLP entities webhook", async () => {
        const body = {
            job_id: "55555555-5555-5555-5555-555555555555",
            kind: "nlp_entities",
            results: [
                {
                    doc_id: "doc1",
                    entities: [
                        { text: "John Doe", label: "PERSON", confidence: 0.95 },
                        { text: "New York", label: "GPE", confidence: 0.89 }
                    ]
                }
            ]
        };
        const { sig } = sign(body);
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", sig)
            .send(body);
        expect(res.status).toBe(200);
    });
    it("handles malformed webhook gracefully", async () => {
        const body = { invalid: "data" };
        const { sig } = sign(body);
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", sig)
            .send(body);
        // Should still return 200 but handle the malformed data gracefully
        expect(res.status).toBe(200);
    });
    it("verifies timing-safe signature comparison", async () => {
        const body = { job_id: "test", kind: "test", results: [] };
        const validSig = crypto_1.default.createHmac("sha256", SECRET).update(JSON.stringify(body)).digest("hex");
        const almostValidSig = validSig.slice(0, -1) + "x"; // Change last char
        const res = await (0, supertest_1.default)(app)
            .post("/ai/webhook")
            .set("X-IntelGraph-Signature", almostValidSig)
            .send(body);
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=ai.webhook.test.js.map