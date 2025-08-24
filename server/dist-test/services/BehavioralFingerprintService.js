"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralFingerprintService = void 0;
class BehavioralFingerprintService {
    computeFingerprint(events) {
        const totals = events.reduce((acc, e) => {
            acc.clicks += e.clicks;
            acc.time += e.timeInView;
            acc.edit += e.editRate;
            return acc;
        }, { clicks: 0, time: 0, edit: 0 });
        const minutes = totals.time / 60 || 1; // avoid divide by zero
        return {
            clicksPerMinute: totals.clicks / minutes,
            attentionSpan: totals.time / events.length || 0,
            editRate: totals.edit / events.length || 0,
        };
    }
    scoreFingerprint(fp) {
        return (fp.clicksPerMinute * 0.4 + fp.attentionSpan * 0.2 + fp.editRate * 0.4);
    }
    clusterFingerprints(items) {
        const clusters = new Map();
        let clusterIdx = 0;
        for (const item of items) {
            let assigned = false;
            for (const [clusterId, members] of clusters.entries()) {
                const rep = items.find((i) => i.id === members[0]).fingerprint;
                const dist = Math.abs(rep.clicksPerMinute - item.fingerprint.clicksPerMinute) +
                    Math.abs(rep.attentionSpan - item.fingerprint.attentionSpan) +
                    Math.abs(rep.editRate - item.fingerprint.editRate);
                if (dist < 50) {
                    members.push(item.id);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                clusterIdx += 1;
                clusters.set(`cluster-${clusterIdx}`, [item.id]);
            }
        }
        return clusters;
    }
}
exports.BehavioralFingerprintService = BehavioralFingerprintService;
//# sourceMappingURL=BehavioralFingerprintService.js.map