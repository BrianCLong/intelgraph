"use strict";
/**
 * Embedding Service for generating text embeddings
 * Supports multiple embedding providers (OpenAI, HuggingFace, local models)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../monitoring/metrics.js");
class EmbeddingService {
    constructor(config = {}) {
        this.config = {
            provider: process.env.EMBEDDING_PROVIDER || 'openai',
            apiKey: process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY,
            model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
            dimension: parseInt(process.env.EMBEDDING_DIMENSION) || 3072,
            batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE) || 10,
            timeout: parseInt(process.env.EMBEDDING_TIMEOUT) || 30000,
            maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES) || 3,
            ...config
        };
        this.logger = logger_js_1.default;
        this.metrics = {
            totalEmbeddings: 0,
            averageLatency: 0,
            errorCount: 0,
            batchCount: 0
        };
    }
    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(params) {
        const { text, model = this.config.model } = params;
        if (!text || typeof text !== 'string') {
            throw new Error('Valid text string is required');
        }
        const startTime = Date.now();
        try {
            let embedding;
            switch (this.config.provider) {
                case 'openai':
                    embedding = await this.generateOpenAIEmbedding(text, model);
                    break;
                case 'huggingface':
                    embedding = await this.generateHuggingFaceEmbedding(text, model);
                    break;
                case 'local':
                    embedding = await this.generateLocalEmbedding(text, model);
                    break;
                default:
                    throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
            }
            const latency = Date.now() - startTime;
            this.updateMetrics(latency);
            logger_js_1.default.debug('Embedding generated', {
                provider: this.config.provider,
                model,
                textLength: text.length,
                dimension: embedding.length,
                latency
            });
            return embedding;
        }
        catch (error) {
            this.metrics.errorCount++;
            metrics_js_1.applicationErrors.labels('embedding_service', 'GenerationError', 'error').inc();
            logger_js_1.default.error('Embedding generation failed', {
                provider: this.config.provider,
                model,
                textLength: text.length,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate embeddings for multiple texts in batch
     */
    async generateEmbeddings(texts, model = this.config.model) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Valid array of texts is required');
        }
        const batches = this.createBatches(texts, this.config.batchSize);
        const allEmbeddings = [];
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            try {
                const batchEmbeddings = await this.generateBatchEmbeddings(batch, model);
                allEmbeddings.push(...batchEmbeddings);
                this.metrics.batchCount++;
                logger_js_1.default.debug('Batch embeddings generated', {
                    batchIndex: i + 1,
                    totalBatches: batches.length,
                    batchSize: batch.length,
                    provider: this.config.provider
                });
            }
            catch (error) {
                logger_js_1.default.error('Batch embedding generation failed', {
                    batchIndex: i + 1,
                    batchSize: batch.length,
                    error: error.message
                });
                // Continue with individual processing for failed batch
                for (const text of batch) {
                    try {
                        const embedding = await this.generateEmbedding({ text, model });
                        allEmbeddings.push(embedding);
                    }
                    catch (individualError) {
                        logger_js_1.default.warn('Individual embedding failed, using zero vector', {
                            textLength: text.length,
                            error: individualError.message
                        });
                        // Use zero vector as fallback
                        allEmbeddings.push(new Array(this.config.dimension).fill(0));
                    }
                }
            }
        }
        return allEmbeddings;
    }
    /**
     * Generate OpenAI embeddings
     */
    async generateOpenAIEmbedding(text, model) {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                model: model,
                encoding_format: 'float'
            }),
            signal: AbortSignal.timeout(this.config.timeout)
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }
        const data = await response.json();
        if (!data.data || data.data.length === 0) {
            throw new Error('No embedding data returned from OpenAI');
        }
        return data.data[0].embedding;
    }
    /**
     * Generate batch OpenAI embeddings
     */
    async generateBatchEmbeddings(texts, model) {
        if (this.config.provider !== 'openai') {
            // For other providers, fall back to individual processing
            const embeddings = [];
            for (const text of texts) {
                const embedding = await this.generateEmbedding({ text, model });
                embeddings.push(embedding);
            }
            return embeddings;
        }
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: texts,
                model: model,
                encoding_format: 'float'
            }),
            signal: AbortSignal.timeout(this.config.timeout)
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI Batch API error: ${response.status} - ${errorData}`);
        }
        const data = await response.json();
        if (!data.data || data.data.length !== texts.length) {
            throw new Error('Batch embedding response length mismatch');
        }
        return data.data.map(item => item.embedding);
    }
    /**
     * Generate HuggingFace embeddings (placeholder)
     */
    async generateHuggingFaceEmbedding(text, model) {
        // Implementation for HuggingFace API
        throw new Error('HuggingFace provider not yet implemented');
    }
    /**
     * Generate local embeddings (placeholder)
     */
    async generateLocalEmbedding(text, model) {
        // Implementation for local model inference
        throw new Error('Local provider not yet implemented');
    }
    /**
     * Calculate semantic similarity between two texts
     */
    async calculateSimilarity(text1, text2, model) {
        const [embedding1, embedding2] = await Promise.all([
            this.generateEmbedding({ text: text1, model }),
            this.generateEmbedding({ text: text2, model })
        ]);
        return this.cosineSimilarity(embedding1, embedding2);
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('Vectors must have same dimensions');
        }
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        return dotProduct / (magnitude1 * magnitude2);
    }
    /**
     * Find most similar texts from a corpus
     */
    async findSimilar(queryText, corpusTexts, options = {}) {
        const { topK = 5, threshold = 0.0, model = this.config.model } = options;
        const queryEmbedding = await this.generateEmbedding({ text: queryText, model });
        const corpusEmbeddings = await this.generateEmbeddings(corpusTexts, model);
        const similarities = corpusEmbeddings.map((embedding, index) => ({
            index,
            text: corpusTexts[index],
            similarity: this.cosineSimilarity(queryEmbedding, embedding)
        }));
        return similarities
            .filter(item => item.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }
    /**
     * Utility methods
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    updateMetrics(latency) {
        this.metrics.totalEmbeddings++;
        const currentAvg = this.metrics.averageLatency;
        this.metrics.averageLatency = currentAvg
            ? (currentAvg + latency) / 2
            : latency;
    }
    /**
     * Health check
     */
    getHealth() {
        return {
            status: 'healthy',
            provider: this.config.provider,
            model: this.config.model,
            dimension: this.config.dimension,
            metrics: {
                totalEmbeddings: this.metrics.totalEmbeddings,
                averageLatency: Math.round(this.metrics.averageLatency),
                errorCount: this.metrics.errorCount,
                batchCount: this.metrics.batchCount,
                successRate: this.metrics.totalEmbeddings > 0
                    ? ((this.metrics.totalEmbeddings - this.metrics.errorCount) / this.metrics.totalEmbeddings * 100).toFixed(1) + '%'
                    : '100%'
            }
        };
    }
    /**
     * Test embedding generation
     */
    async test() {
        try {
            const testText = "This is a test sentence for embedding generation.";
            const embedding = await this.generateEmbedding({ text: testText });
            return {
                success: true,
                dimension: embedding.length,
                sampleValues: embedding.slice(0, 5)
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
exports.default = EmbeddingService;
//# sourceMappingURL=EmbeddingService.js.map