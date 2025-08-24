"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBehavioralFingerprintJob = runBehavioralFingerprintJob;
const EntityResolutionService_js_1 = require("../services/EntityResolutionService.js");
async function runBehavioralFingerprintJob(identities) {
    const er = new EntityResolutionService_js_1.EntityResolutionService();
    const fingerprints = identities.map((i) => {
        const { fingerprint, score } = er.fuseBehavioralFingerprint(i.telemetry);
        return { id: i.id, projectId: i.projectId, fingerprint, score };
    });
    const clusters = er.clusterIdentitiesAcrossProjects(identities);
    return { fingerprints, clusters };
}
//# sourceMappingURL=behavioralFingerprintWorker.js.map