const fs = require("fs");
const path = require("path");
const ExternalAPIService = require("./ExternalAPIService");
const KeyVaultService = require("./KeyVaultService");
const MultimodalSentimentService = require("./MultimodalSentimentService");
const logger = require("../utils/logger");
class OSINTFeedService {
    constructor({ sourcesFile, configFile } = {}) {
        this.sourcesFile =
            sourcesFile || path.join(process.cwd(), "osint-sources.md");
        this.configFile =
            configFile || path.join(__dirname, "../../config/osint-feed-config.json");
        this.externalApi = new ExternalAPIService(logger);
        this.keyVault = new KeyVaultService();
        this.sentiment = new MultimodalSentimentService();
        this._sources = null;
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            const txt = fs.readFileSync(this.configFile, "utf8");
            return JSON.parse(txt);
        }
        catch (err) {
            logger.warn("Failed to load OSINT feed config", err);
            return {
                qualityWeight: 0.4,
                recencyWeight: 0.3,
                semanticDensityWeight: 0.3,
            };
        }
    }
    loadSources() {
        if (this._sources)
            return this._sources;
        try {
            const md = fs.readFileSync(this.sourcesFile, "utf8");
            const match = md.match(/```json\n([\s\S]*?)```/);
            if (!match)
                return [];
            this._sources = JSON.parse(match[1]);
            return this._sources;
        }
        catch (err) {
            logger.warn("Failed to load sources", err);
            return [];
        }
    }
    async acquireApiKey(provider) {
        // Placeholder for automated key acquisition.
        // In a full implementation, this would contact the provider's API.
        return process.env[`${provider.toUpperCase()}_API_KEY`] || null;
    }
    async getApiKey(provider) {
        let entry = await this.keyVault.getActiveKey(provider);
        if (!entry) {
            const key = await this.acquireApiKey(provider);
            if (key) {
                await this.keyVault.addKey(provider, key);
                entry = { key };
            }
        }
        return entry ? entry.key : null;
    }
    calculateSourceWeights(subject) {
        const base = this.loadSources().map((s) => ({ ...s }));
        const sentiment = this.sentiment.analyzeText(subject || "");
        this.config = this.loadConfig();
        const cfg = this.config || {};
        const results = base.map((s) => {
            const quality = typeof s.quality === "number" ? s.quality : 0.5;
            const recency = s.lastUpdated
                ? 1 / (1 + (Date.now() - new Date(s.lastUpdated).getTime()) / 86400000)
                : 0.5;
            const density = typeof s.semanticDensity === "number" ? s.semanticDensity : 0.5;
            let weight = quality * (cfg.qualityWeight || 0) +
                recency * (cfg.recencyWeight || 0) +
                density * (cfg.semanticDensityWeight || 0);
            weight = weight * (1 + sentiment.comparative);
            return {
                name: s.name,
                provider: s.provider,
                weight: Math.max(0.0001, weight),
            };
        });
        const total = results.reduce((a, b) => a + b.weight, 0) || 1;
        return results.map((r) => ({ ...r, weight: r.weight / total }));
    }
    async fetchSource(source, params = {}) {
        const providers = this.externalApi.providers();
        const handler = providers[source.provider];
        if (!handler)
            throw new Error(`Provider ${source.provider} not found`);
        if (source.requiresApiKey) {
            const key = await this.getApiKey(source.provider);
            if (!key)
                throw new Error(`API key for ${source.provider} not available`);
            params.apiKey = key;
        }
        return handler.handler(params);
    }
    async poll(subject, topN = 3) {
        const weights = this.calculateSourceWeights(subject)
            .sort((a, b) => b.weight - a.weight)
            .slice(0, topN);
        const results = [];
        for (const src of weights) {
            try {
                const data = await this.fetchSource(src, { q: subject });
                results.push({ source: src.name, data });
            }
            catch (err) {
                results.push({ source: src.name, error: err.message });
            }
        }
        return results;
    }
}
module.exports = OSINTFeedService;
//# sourceMappingURL=OSINTFeedService.js.map