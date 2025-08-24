"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GossipAuditor_1 = require("../transparency/GossipAuditor");
describe('GossipAuditor', () => {
    it('alerts on fork', async () => {
        const alerts = [];
        const auditor = new GossipAuditor_1.GossipAuditor({
            getSTH: async () => ({ size: 1, root: 'a' }),
            getRange: async () => ['b'],
        }, { alert: (m) => alerts.push(m) });
        const res = await auditor.auditOnce();
        expect(res.ok).toBe(false);
        expect(alerts).toEqual(['transparency_log_mismatch']);
    });
});
//# sourceMappingURL=gossip_auditor.test.js.map