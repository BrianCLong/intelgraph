"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralDnaNetwork = void 0;
exports.correlateBehavioralDna = correlateBehavioralDna;
const events_1 = require("events");
/**
 * Maps behavioral events into a continuously updated vector space.
 * Emits `update` events whenever an entity's embedding changes.
 */
class BehavioralDnaNetwork extends events_1.EventEmitter {
    constructor(anomalyThreshold = 3) {
        super();
        this.anomalyThreshold = anomalyThreshold;
        this.history = new Map();
        this.embeddings = new Map();
    }
    /**
     * Ingest a behavior event, update embeddings and perform anomaly detection.
     */
    ingest(event) {
        const normalized = this.normalize(event.vector);
        const history = this.history.get(event.entityId) ?? [];
        const anomaly = this.detectAnomaly(event.entityId, normalized, history);
        history.push(normalized);
        this.history.set(event.entityId, history);
        this.embeddings.set(event.entityId, this.mean(history));
        this.emit("update", {
            entityId: event.entityId,
            embedding: this.embeddings.get(event.entityId),
            anomaly,
        });
        return anomaly;
    }
    /**
     * Retrieve the latest embedding for an entity.
     */
    getEmbedding(entityId) {
        return this.embeddings.get(entityId);
    }
    /**
     * Predict the next behavior vector based on recent trend.
     */
    predictNext(entityId) {
        const history = this.history.get(entityId);
        if (!history || history.length < 2)
            return undefined;
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        const trend = last.map((v, i) => v - prev[i]);
        return last.map((v, i) => v + trend[i]);
    }
    /**
     * Normalize a raw vector.
     */
    normalize(vector) {
        const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
        if (magnitude === 0)
            return vector.map(() => 0);
        return vector.map((v) => v / magnitude);
    }
    mean(vectors) {
        const length = vectors[0]?.length ?? 0;
        const sum = new Array(length).fill(0);
        vectors.forEach((vec) => {
            for (let i = 0; i < length; i++) {
                sum[i] += vec[i];
            }
        });
        return sum.map((v) => v / vectors.length);
    }
    detectAnomaly(entityId, vector, history) {
        if (history.length === 0) {
            return { entityId, isAnomaly: false, score: 0 };
        }
        const meanVec = this.mean(history);
        const distance = this.distance(vector, meanVec);
        const stdDev = this.stdDev(history, meanVec);
        const isAnomaly = stdDev === 0 ? distance > 0 : distance > this.anomalyThreshold * stdDev;
        const score = stdDev === 0 ? distance : distance / stdDev;
        return { entityId, isAnomaly, score };
    }
    stdDev(history, meanVec) {
        const distances = history.map((vec) => this.distance(vec, meanVec));
        const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((a, b) => a + (b - avg) ** 2, 0) / distances.length;
        return Math.sqrt(variance);
    }
    distance(a, b) {
        return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
    }
}
exports.BehavioralDnaNetwork = BehavioralDnaNetwork;
// Legacy placeholder to maintain backward compatibility with existing tests.
function correlateBehavioralDna() {
    return 0;
}
//# sourceMappingURL=behavioralDnaNetwork.js.map