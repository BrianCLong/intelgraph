const fs = require("fs");
const path = require("path");
const PROTOCOL_PATH = path.resolve(__dirname, "../../../CROSS_DOMAIN_FUSION_PROTOCOL_COMPLETED.md");
let PROTOCOL_DOC = "";
try {
    PROTOCOL_DOC = fs.readFileSync(PROTOCOL_PATH, "utf8");
}
catch (err) {
    // If the protocol document is missing we still allow the engine to function.
}
/**
 * EntityCorrelationEngine
 *
 * Implements cross-domain entity fusion using the standardized schemas and
 * transformation rules described in CROSS_DOMAIN_FUSION_PROTOCOL_COMPLETED.md.
 * Provides heuristics for disambiguation/scoring and an extensible pipeline for
 * cross-source conflict resolution.
 */
class EntityCorrelationEngine {
    constructor(resolvers = []) {
        // Conflict resolution pipeline. Each resolver receives (base, incoming)
        // and should return the merged record or undefined to skip.
        this.resolvers = Array.isArray(resolvers) ? resolvers : [];
        // expose protocol doc for consumers that need to introspect.
        this.protocol = PROTOCOL_DOC;
    }
    registerResolver(resolver) {
        if (typeof resolver === "function")
            this.resolvers.push(resolver);
    }
    // Normalise according to protocol schemas
    normalize(entity = {}) {
        const normalized = {
            id: entity.id,
            type: entity.type ? String(entity.type).toUpperCase().trim() : undefined,
            label: entity.label ? String(entity.label).trim() : undefined,
            source: entity.source || "unknown",
            attributes: { ...(entity.attributes || {}) },
            confidence: entity.confidence ?? 0.5,
        };
        return normalized;
    }
    // Simple Levenshtein distance for string similarity
    calculateStringSimilarity(str1 = "", str2 = "") {
        const a = str1.toLowerCase();
        const b = str2.toLowerCase();
        const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
        for (let j = 0; j <= a.length; j++)
            matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        const distance = matrix[b.length][a.length];
        const maxLen = Math.max(a.length, b.length) || 1;
        return 1 - distance / maxLen;
    }
    // Heuristic scoring for disambiguation
    getDisambiguationScore(e1, e2) {
        const n1 = this.normalize(e1);
        const n2 = this.normalize(e2);
        if (n1.type !== n2.type)
            return 0;
        const nameScore = this.calculateStringSimilarity(n1.label, n2.label);
        const attrs1 = n1.attributes;
        const attrs2 = n2.attributes;
        const keys = new Set([...Object.keys(attrs1), ...Object.keys(attrs2)]);
        let matches = 0;
        for (const k of keys) {
            if (attrs1[k] && attrs2[k] && attrs1[k] === attrs2[k])
                matches++;
        }
        const attrScore = keys.size ? matches / keys.size : 0;
        const sourceBonus = n1.source === n2.source ? 0.05 : 0;
        return 0.7 * nameScore + 0.25 * attrScore + sourceBonus;
    }
    entitiesAreSimilar(e1, e2) {
        return this.getDisambiguationScore(e1, e2) > 0.8;
    }
    groupSimilarEntities(entities = []) {
        const groups = [];
        const used = new Set();
        for (let i = 0; i < entities.length; i++) {
            if (used.has(i))
                continue;
            const group = [entities[i]];
            used.add(i);
            for (let j = i + 1; j < entities.length; j++) {
                if (used.has(j))
                    continue;
                if (this.entitiesAreSimilar(entities[i], entities[j])) {
                    group.push(entities[j]);
                    used.add(j);
                }
            }
            groups.push(group);
        }
        return groups;
    }
    // Default conflict resolution uses resolver pipeline
    resolveConflicts(base, incoming) {
        let result = { ...base };
        for (const resolver of this.resolvers) {
            const out = resolver(result, incoming);
            if (out)
                result = out;
        }
        // fallback: prefer higher confidence values
        const chosen = (incoming.confidence || 0) > (result.confidence || 0) ? incoming : result;
        return { ...result, ...incoming, confidence: chosen.confidence };
    }
    mergeEntities(entities = []) {
        if (!entities.length)
            return null;
        let merged = this.normalize(entities[0]);
        merged.sources = [merged.source];
        for (let i = 1; i < entities.length; i++) {
            const normalized = this.normalize(entities[i]);
            merged.sources.push(normalized.source);
            merged = this.resolveConflicts(merged, normalized);
        }
        // score based on average confidence
        const avgConfidence = entities.reduce((sum, e) => sum + (e.confidence ?? 0.5), 0) /
            entities.length;
        merged.confidence = Math.min(0.99, avgConfidence);
        return merged;
    }
    fuseEntities(entities = []) {
        return this.groupSimilarEntities(entities).map((g) => this.mergeEntities(g));
    }
}
module.exports = EntityCorrelationEngine;
//# sourceMappingURL=EntityCorrelationEngine.js.map