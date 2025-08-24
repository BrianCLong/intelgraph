"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const behavioralFingerprintWorker_1 = require("../workers/behavioralFingerprintWorker");
describe("behavioral fingerprint job", () => {
    it("scores and clusters identities across projects", async () => {
        const data = [
            {
                id: "alice",
                projectId: "A",
                telemetry: [
                    { clicks: 10, timeInView: 120, editRate: 2 },
                    { clicks: 5, timeInView: 60, editRate: 1 },
                ],
            },
            {
                id: "bob",
                projectId: "B",
                telemetry: [
                    { clicks: 11, timeInView: 118, editRate: 2 },
                    { clicks: 4, timeInView: 70, editRate: 1 },
                ],
            },
            {
                id: "charlie",
                projectId: "C",
                telemetry: [{ clicks: 1, timeInView: 10, editRate: 0.5 }],
            },
        ];
        const result = await (0, behavioralFingerprintWorker_1.runBehavioralFingerprintJob)(data);
        expect(result.fingerprints.length).toBe(3);
        const clusters = Array.from(result.clusters.values());
        const clusterWithAlice = clusters.find((c) => c.includes("alice"));
        expect(clusterWithAlice).toBeDefined();
        expect(clusterWithAlice).toContain("bob");
    });
});
//# sourceMappingURL=behavioralFingerprintWorker.test.js.map