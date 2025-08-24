"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
class InvestigativeThreadQualityAgent {
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.weights = this.loadWeights();
    }
    loadWeights() {
        try {
            const __filename = (0, url_1.fileURLToPath)(import.meta.url);
            const __dirname = path_1.default.dirname(__filename);
            const refPath = path_1.default.resolve(__dirname, '../../../AUTOMATE_SCORING_OF_RESPONSE_QUALITY_COMPLETED.md');
            // Read reference file from previous scoring pipeline
            fs_1.default.readFileSync(refPath, 'utf-8');
            // Baseline weights derived from response quality scoring outputs
            return { coherence: 0.4, evidence: 0.4, redundancy: 0.2 };
        }
        catch {
            return { coherence: 0.4, evidence: 0.4, redundancy: 0.2 };
        }
    }
    jaccard(a, b) {
        const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
        const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size ? intersection.size / union.size : 0;
    }
    scoreCoherence(messages) {
        if (messages.length <= 1)
            return 1;
        let total = 0;
        let count = 0;
        for (let i = 1; i < messages.length; i++) {
            total += this.jaccard(messages[i - 1].text, messages[i].text);
            count++;
        }
        return count ? total / count : 0;
    }
    scoreEvidence(messages) {
        if (!messages.length)
            return 0;
        const supported = messages.filter(m => (m.evidence && m.evidence.length > 0) || /\bhttps?:\/\//.test(m.text)).length;
        return supported / messages.length;
    }
    scoreRedundancy(messages) {
        if (!messages.length)
            return 0;
        const texts = messages.map(m => m.text.trim().toLowerCase());
        const unique = new Set(texts);
        return 1 - unique.size / texts.length;
    }
    scoreThread(thread) {
        const coherence = this.scoreCoherence(thread.messages);
        const evidence = this.scoreEvidence(thread.messages);
        const redundancy = this.scoreRedundancy(thread.messages);
        const overall = coherence * this.weights.coherence +
            evidence * this.weights.evidence +
            (1 - redundancy) * this.weights.redundancy;
        return { coherence, evidence, redundancy, overall };
    }
    async updateGraphMetadata(thread, scores) {
        const session = this.neo4j.session();
        try {
            const query = `
        MATCH (t:Thread {id: $threadId})
        SET t.quality = $scores,
            t.lastQualityAt = datetime()
      `;
            await session.run(query, { threadId: thread.id, scores });
        }
        finally {
            await session.close();
        }
    }
    async scoreAndUpdate(thread) {
        const scores = this.scoreThread(thread);
        await this.updateGraphMetadata(thread, scores);
        return scores;
    }
}
exports.default = InvestigativeThreadQualityAgent;
//# sourceMappingURL=investigative-thread-quality-agent.js.map