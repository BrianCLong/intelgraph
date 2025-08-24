"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GossipAuditor = void 0;
class GossipAuditor {
    constructor(fetcher, log) {
        this.fetcher = fetcher;
        this.log = log;
    }
    async auditOnce() {
        const sth = await this.fetcher.getSTH();
        const range = await this.fetcher.getRange(0, sth.size);
        const recomputed = range.join('');
        if (recomputed !== sth.root) {
            this.log.alert('transparency_log_mismatch');
            return { ok: false };
        }
        return { ok: true, size: sth.size };
    }
}
exports.GossipAuditor = GossipAuditor;
//# sourceMappingURL=GossipAuditor.js.map