import { EventEmitter } from 'events';
import * as winston from 'winston';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Supported AI/ML model types
 */
export type ModelType = 'text-generation' | 'text-embedding' | 'image-analysis' | 
                        'speech-to-text' | 'text-to-speech' | 'multimodal' | 
                        'graph-neural-network' | 'time-series' | 'classification';

/**
 * Model provider configurations
 */
export type ModelProvider = 'openai' | 'anthropic' | 'huggingface' | 'local' | 
                           'azure' | 'google' | 'cohere' | 'custom';

/**
 * Model configuration interface
 */
export interface ModelConfig {
    id: string;
    name: string;
    type: ModelType;
    provider: ModelProvider;
    version: string;
    endpoint?: string;
    apiKey?: string;
    modelPath?: string;
    parameters: Record<string, any>;
    capabilities: string[];
    maxTokens?: number;
    contextWindow?: number;
    costPerToken?: number;
    latencyTarget?: number; // ms
    throughputTarget?: number; // requests/sec
    memoryRequirement?: number; // MB
    gpuRequired?: boolean;
    isActive: boolean;
    priority: number; // Higher number = higher priority
    healthCheckUrl?: string;
    retryPolicy: {
        maxRetries: number;
        backoffMs: number;
        timeoutMs: number;
    };
    rateLimits: {
        requestsPerMinute: number;
        tokensPerMinute: number;
        concurrentRequests: number;
    };
    metadata: Record<string, any>;
}

/**
 * Model inference request
 */
export interface InferenceRequest {
    modelId: string;
    input: any;
    parameters?: Record<string, any>;
    timeout?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    metadata?: Record<string, any>;
}

/**
 * Model inference response
 */
export interface InferenceResponse {
    modelId: string;
    output: any;
    metadata: {
        latency: number;
        tokens?: {
            input: number;
            output: number;
            total: number;
        };
        cost?: number;
        timestamp: Date;
        requestId: string;
    };
    error?: string;
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
    modelId: string;
    requests: {
        total: number;
        successful: number;
        failed: number;
        inFlight: number;
    };
    performance: {
        averageLatency: number;
        p95Latency: number;
        p99Latency: number;
        throughput: number;
        errorRate: number;
    };
    costs: {
        totalCost: number;
        averageCostPerRequest: number;
    };
    health: {
        isHealthy: boolean;
        lastHealthCheck: Date;
        consecutiveFailures: number;
    };
    resourceUsage: {
        memoryUsage?: number;
        gpuUtilization?: number;
        cpuUtilization?: number;
    };
}

/**
 * Load balancing strategy
 */
export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 
                                   'performance-based' | 'cost-optimized' | 'random';

/**
 * Model Manager Configuration
 */
export interface ModelManagerConfig {
    modelsDirectory: string;
    defaultTimeoutMs: number;
    healthCheckIntervalMs: number;
    metricsRetentionHours: number;
    loadBalancingStrategy: LoadBalancingStrategy;
    enableMetrics: boolean;
    enableCaching: boolean;
    cacheMaxSize: number;
    cacheTtlMs: number;
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    enableAutoScaling: boolean;
    maxConcurrentRequests: number;
}

/**
 * Circuit breaker for model reliability
 */
class CircuitBreaker {
    private isOpen: boolean = false;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private readonly threshold: number;
    private readonly timeout: number = 60000; // 1 minute

    constructor(threshold: number = 5) {
        this.threshold = threshold;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.isOpen) {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.isOpen = false;
                this.failureCount = 0;
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await fn();
            this.failureCount = 0;
            return result;
        } catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            
            if (this.failureCount >= this.threshold) {
                this.isOpen = true;
            }
            
            throw error;
        }
    }
}

/**
 * Enterprise-Grade AI/ML Model Manager
 * 
 * Features:
 * - Multi-provider support (OpenAI, Anthropic, HuggingFace, etc.)
 * - Load balancing and failover
 * - Performance monitoring and metrics
 * - Circuit breaker pattern for reliability
 * - Intelligent caching
 * - Cost optimization
 * - Auto-scaling capabilities
 * - Health monitoring
 * - Rate limiting and quota management
 */
export class ModelManager extends EventEmitter {
    private logger: winston.Logger;
    private config: ModelManagerConfig;
    private models: Map<string, ModelConfig> = new Map();
    private metrics: Map<string, ModelMetrics> = new Map();
    private circuitBreakers: Map<string, CircuitBreaker> = new Map();
    private requestQueue: Map<string, InferenceRequest[]> = new Map();
    private activeRequests: Map<string, number> = new Map();
    private responseCache: Map<string, { response: InferenceResponse; timestamp: number }> = new Map();
    private httpClients: Map<string, AxiosInstance> = new Map();
    private healthCheckInterval?: NodeJS.Timeout;
    private metricsCleanupInterval?: NodeJS.Timeout;

    constructor(config: ModelManagerConfig) {
        super();
        this.config = config;
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'model-manager' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    /**
     * Initialize the model manager
     */
    public async initialize(): Promise<void> {
        this.logger.info('Initializing ModelManager...');

        try {
            // Create models directory if it doesn't exist
            await fs.mkdir(this.config.modelsDirectory, { recursive: true });

            // Load model configurations
            await this.loadModelConfigurations();

            // Start health checking
            if (this.config.healthCheckIntervalMs > 0) {
                this.startHealthChecking();
            }

            // Start metrics cleanup
            if (this.config.enableMetrics && this.config.metricsRetentionHours > 0) {
                this.startMetricsCleanup();
            }

            this.emit('initialized');
            this.logger.info('ModelManager initialized successfully', {
                modelCount: this.models.size
            });

        } catch (error) {
            this.logger.error('Failed to initialize ModelManager:', error);
            throw error;
        }
    }

    /**
     * Register a new model
     */
    public async registerModel(model: ModelConfig): Promise<void> {
        try {
            // Validate model configuration
            this.validateModelConfig(model);

            // Initialize HTTP client for remote models
            if (model.endpoint) {
                this.createHttpClient(model);
            }

            // Initialize metrics
            this.initializeModelMetrics(model.id);

            // Initialize circuit breaker
            if (this.config.enableCircuitBreaker) {
                this.circuitBreakers.set(model.id, new CircuitBreaker(this.config.circuitBreakerThreshold));
            }

            // Initialize request queue
            this.requestQueue.set(model.id, []);
            this.activeRequests.set(model.id, 0);

            // Store model configuration
            this.models.set(model.id, model);

            // Perform initial health check
            if (model.isActive) {
                await this.checkModelHealth(model.id);
            }

            this.emit('model_registered', { modelId: model.id });
            this.logger.info('Model registered successfully', { 
                modelId: model.id, 
                type: model.type, 
                provider: model.provider 
            });

        } catch (error) {
            this.logger.error('Failed to register model:', error);
            throw error;
        }
    }

    /**
     * Unregister a model
     */
    public async unregisterModel(modelId: string): Promise<void> {
        try {
            const model = this.models.get(modelId);
            if (!model) {
                throw new Error(`Model ${modelId} not found`);
            }

            // Wait for active requests to complete
            while (this.activeRequests.get(modelId)! > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Cleanup resources
            this.models.delete(modelId);
            this.metrics.delete(modelId);
            this.circuitBreakers.delete(modelId);
            this.requestQueue.delete(modelId);
            this.activeRequests.delete(modelId);
            this.httpClients.delete(modelId);

            // Clear cached responses
            for (const [key, value] of this.responseCache.entries()) {
                if (key.startsWith(`${modelId}:`)) {
                    this.responseCache.delete(key);
                }
            }

            this.emit('model_unregistered', { modelId });
            this.logger.info('Model unregistered successfully', { modelId });

        } catch (error) {
            this.logger.error('Failed to unregister model:', error);
            throw error;
        }
    }

    /**
     * Perform model inference with intelligent routing
     */
    public async infer(request: InferenceRequest): Promise<InferenceResponse> {
        const requestId = this.generateRequestId();
        const startTime = performance.now();

        try {
            // Select best model for request
            const modelId = await this.selectModel(request);
            const model = this.models.get(modelId);
            
            if (!model) {
                throw new Error(`Model ${modelId} not found`);
            }

            // Check cache if enabled
            if (this.config.enableCaching) {
                const cachedResponse = this.getCachedResponse(request);
                if (cachedResponse) {
                    this.logger.debug('Returning cached response', { modelId, requestId });
                    return cachedResponse;
                }
            }

            // Check rate limits
            await this.checkRateLimits(model);

            // Check circuit breaker
            const circuitBreaker = this.circuitBreakers.get(modelId);
            if (circuitBreaker) {
                return await circuitBreaker.execute(() => this.executeInference(model, request, requestId));
            } else {
                return await this.executeInference(model, request, requestId);
            }

        } catch (error) {
            const latency = performance.now() - startTime;
            this.recordFailedRequest(request.modelId, latency, error as Error);
            
            this.logger.error('Model inference failed:', {
                requestId,
                modelId: request.modelId,
                error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
        }
    }

    /**
     * Get model by ID
     */
    public getModel(modelId: string): ModelConfig | undefined {
        return this.models.get(modelId);
    }

    /**
     * List all models
     */
    public listModels(type?: ModelType, provider?: ModelProvider): ModelConfig[] {
        const models = Array.from(this.models.values());
        
        return models.filter(model => {
            if (type && model.type !== type) return false;
            if (provider && model.provider !== provider) return false;
            return true;
        });
    }

    /**
     * Get model metrics
     */
    public getModelMetrics(modelId: string): ModelMetrics | undefined {
        return this.metrics.get(modelId);
    }

    /**
     * Get all metrics
     */
    public getAllMetrics(): Record<string, ModelMetrics> {
        const result: Record<string, ModelMetrics> = {};
        for (const [modelId, metrics] of this.metrics.entries()) {
            result[modelId] = metrics;
        }
        return result;
    }

    /**
     * Update model configuration
     */
    public async updateModel(modelId: string, updates: Partial<ModelConfig>): Promise<void> {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        const updatedModel = { ...model, ...updates, id: modelId };
        this.validateModelConfig(updatedModel);

        // Update HTTP client if endpoint changed
        if (updates.endpoint || updates.apiKey) {
            this.createHttpClient(updatedModel);
        }

        this.models.set(modelId, updatedModel);
        
        this.emit('model_updated', { modelId });
        this.logger.info('Model updated successfully', { modelId });
    }

    /**
     * Check model health
     */
    public async checkModelHealth(modelId: string): Promise<boolean> {
        const model = this.models.get(modelId);
        if (!model) {
            return false;
        }

        try {
            let isHealthy = false;

            if (model.healthCheckUrl && model.endpoint) {
                // HTTP health check
                const client = this.httpClients.get(modelId);
                if (client) {
                    const response = await client.get(model.healthCheckUrl, { timeout: 5000 });
                    isHealthy = response.status === 200;
                }
            } else if (model.provider === 'local' && model.modelPath) {
                // Local model health check
                try {
                    await fs.access(model.modelPath);
                    isHealthy = true;
                } catch {
                    isHealthy = false;
                }
            } else {
                // Basic inference health check
                try {
                    await this.executeInference(model, {
                        modelId,
                        input: 'health check',
                        timeout: 5000
                    } as InferenceRequest, 'health-check');
                    isHealthy = true;
                } catch {
                    isHealthy = false;
                }
            }

            // Update metrics
            const metrics = this.metrics.get(modelId);
            if (metrics) {
                metrics.health.isHealthy = isHealthy;
                metrics.health.lastHealthCheck = new Date();
                
                if (isHealthy) {
                    metrics.health.consecutiveFailures = 0;
                } else {
                    metrics.health.consecutiveFailures++;
                }
            }

            this.emit('health_check_completed', { modelId, isHealthy });
            return isHealthy;

        } catch (error) {
            this.logger.warn('Health check failed', { modelId, error });
            return false;
        }
    }

    // Private helper methods

    private async loadModelConfigurations(): Promise<void> {
        try {
            const configFiles = await fs.readdir(this.config.modelsDirectory);
            
            for (const file of configFiles) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.config.modelsDirectory, file);
                    const configData = await fs.readFile(filePath, 'utf-8');
                    const modelConfig: ModelConfig = JSON.parse(configData);
                    
                    await this.registerModel(modelConfig);
                }
            }
        } catch (error) {
            this.logger.warn('Failed to load model configurations:', error);
        }
    }

    private validateModelConfig(model: ModelConfig): void {
        if (!model.id || !model.name || !model.type || !model.provider) {
            throw new Error('Model configuration missing required fields');
        }

        if (model.provider !== 'local' && !model.endpoint && !model.apiKey) {
            throw new Error('Remote models require endpoint and API key');
        }

        if (model.provider === 'local' && !model.modelPath) {
            throw new Error('Local models require model path');
        }
    }

    private createHttpClient(model: ModelConfig): void {
        if (!model.endpoint) return;

        const client = axios.create({
            baseURL: model.endpoint,
            timeout: model.retryPolicy.timeoutMs || this.config.defaultTimeoutMs,
            headers: {
                'Authorization': model.apiKey ? `Bearer ${model.apiKey}` : undefined,
                'Content-Type': 'application/json',
                'User-Agent': 'IntelGraph-ModelManager/1.0'
            }
        });

        // Add retry interceptor
        client.interceptors.response.use(
            response => response,
            async error => {
                const config = error.config;
                const retryCount = config.__retryCount || 0;
                
                if (retryCount < model.retryPolicy.maxRetries) {
                    config.__retryCount = retryCount + 1;
                    
                    await new Promise(resolve => 
                        setTimeout(resolve, model.retryPolicy.backoffMs * Math.pow(2, retryCount))
                    );
                    
                    return client.request(config);
                }
                
                return Promise.reject(error);
            }
        );

        this.httpClients.set(model.id, client);
    }

    private initializeModelMetrics(modelId: string): void {
        const metrics: ModelMetrics = {
            modelId,
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                inFlight: 0
            },
            performance: {
                averageLatency: 0,
                p95Latency: 0,
                p99Latency: 0,
                throughput: 0,
                errorRate: 0
            },
            costs: {
                totalCost: 0,
                averageCostPerRequest: 0
            },
            health: {
                isHealthy: false,
                lastHealthCheck: new Date(),
                consecutiveFailures: 0
            },
            resourceUsage: {}
        };

        this.metrics.set(modelId, metrics);
    }

    private async selectModel(request: InferenceRequest): Promise<string> {
        // If specific model requested, return it
        if (request.modelId && this.models.has(request.modelId)) {
            const model = this.models.get(request.modelId)!;
            if (model.isActive) {
                return request.modelId;
            }
        }

        // Find suitable models based on request type
        const suitableModels = Array.from(this.models.values()).filter(model => 
            model.isActive && 
            this.isModelSuitableForRequest(model, request) &&
            this.metrics.get(model.id)?.health.isHealthy !== false
        );

        if (suitableModels.length === 0) {
            throw new Error('No suitable models available');
        }

        // Apply load balancing strategy
        switch (this.config.loadBalancingStrategy) {
            case 'round-robin':
                return this.selectRoundRobin(suitableModels);
            case 'least-connections':
                return this.selectLeastConnections(suitableModels);
            case 'performance-based':
                return this.selectPerformanceBased(suitableModels);
            case 'cost-optimized':
                return this.selectCostOptimized(suitableModels);
            case 'random':
            default:
                return suitableModels[Math.floor(Math.random() * suitableModels.length)].id;
        }
    }

    private isModelSuitableForRequest(model: ModelConfig, request: InferenceRequest): boolean {
        // Check if model type matches request requirements
        // This is a simplified check - in practice, you'd have more sophisticated matching
        return true;
    }

    private selectRoundRobin(models: ModelConfig[]): string {
        // Simplified round-robin - in practice, you'd maintain state
        return models[Date.now() % models.length].id;
    }

    private selectLeastConnections(models: ModelConfig[]): string {
        let bestModel = models[0];
        let minConnections = this.activeRequests.get(bestModel.id) || 0;

        for (const model of models.slice(1)) {
            const connections = this.activeRequests.get(model.id) || 0;
            if (connections < minConnections) {
                bestModel = model;
                minConnections = connections;
            }
        }

        return bestModel.id;
    }

    private selectPerformanceBased(models: ModelConfig[]): string {
        let bestModel = models[0];
        let bestLatency = this.metrics.get(bestModel.id)?.performance.averageLatency || Infinity;

        for (const model of models.slice(1)) {
            const latency = this.metrics.get(model.id)?.performance.averageLatency || Infinity;
            if (latency < bestLatency) {
                bestModel = model;
                bestLatency = latency;
            }
        }

        return bestModel.id;
    }

    private selectCostOptimized(models: ModelConfig[]): string {
        let bestModel = models[0];
        let bestCost = this.metrics.get(bestModel.id)?.costs.averageCostPerRequest || Infinity;

        for (const model of models.slice(1)) {
            const cost = this.metrics.get(model.id)?.costs.averageCostPerRequest || Infinity;
            if (cost < bestCost) {
                bestModel = model;
                bestCost = cost;
            }
        }

        return bestModel.id;
    }

    private getCachedResponse(request: InferenceRequest): InferenceResponse | null {
        if (!this.config.enableCaching) return null;

        const cacheKey = this.generateCacheKey(request);
        const cached = this.responseCache.get(cacheKey);

        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < this.config.cacheTtlMs) {
                return cached.response;
            } else {
                this.responseCache.delete(cacheKey);
            }
        }

        return null;
    }

    private generateCacheKey(request: InferenceRequest): string {
        const hash = createHash('sha256');
        hash.update(JSON.stringify({
            modelId: request.modelId,
            input: request.input,
            parameters: request.parameters
        }));
        return `${request.modelId}:${hash.digest('hex')}`;
    }

    private async checkRateLimits(model: ModelConfig): Promise<void> {
        // Simplified rate limiting - in practice, you'd use a more sophisticated implementation
        const currentRequests = this.activeRequests.get(model.id) || 0;
        
        if (currentRequests >= model.rateLimits.concurrentRequests) {
            throw new Error(`Rate limit exceeded for model ${model.id}`);
        }
    }

    private async executeInference(model: ModelConfig, request: InferenceRequest, requestId: string): Promise<InferenceResponse> {
        const startTime = performance.now();
        
        // Increment active requests
        this.activeRequests.set(model.id, (this.activeRequests.get(model.id) || 0) + 1);

        try {
            let output: any;

            switch (model.provider) {
                case 'openai':
                    output = await this.executeOpenAI(model, request);
                    break;
                case 'anthropic':
                    output = await this.executeAnthropic(model, request);
                    break;
                case 'huggingface':
                    output = await this.executeHuggingFace(model, request);
                    break;
                case 'local':
                    output = await this.executeLocal(model, request);
                    break;
                default:
                    output = await this.executeGeneric(model, request);
            }

            const latency = performance.now() - startTime;
            const response: InferenceResponse = {
                modelId: model.id,
                output,
                metadata: {
                    latency,
                    timestamp: new Date(),
                    requestId
                }
            };

            // Update metrics
            this.recordSuccessfulRequest(model.id, latency, response);

            // Cache response if enabled
            if (this.config.enableCaching) {
                const cacheKey = this.generateCacheKey(request);
                this.responseCache.set(cacheKey, {
                    response,
                    timestamp: Date.now()
                });
                
                // Clean cache if too large
                if (this.responseCache.size > this.config.cacheMaxSize) {
                    this.cleanResponseCache();
                }
            }

            return response;

        } finally {
            // Decrement active requests
            this.activeRequests.set(model.id, (this.activeRequests.get(model.id) || 1) - 1);
        }
    }

    private async executeOpenAI(model: ModelConfig, request: InferenceRequest): Promise<any> {
        const client = this.httpClients.get(model.id);
        if (!client) throw new Error('HTTP client not initialized');

        const response = await client.post('/v1/completions', {
            model: model.name,
            prompt: request.input,
            ...request.parameters
        });

        return response.data;
    }

    private async executeAnthropic(model: ModelConfig, request: InferenceRequest): Promise<any> {
        const client = this.httpClients.get(model.id);
        if (!client) throw new Error('HTTP client not initialized');

        const response = await client.post('/v1/messages', {
            model: model.name,
            messages: [{ role: 'user', content: request.input }],
            ...request.parameters
        });

        return response.data;
    }

    private async executeHuggingFace(model: ModelConfig, request: InferenceRequest): Promise<any> {
        const client = this.httpClients.get(model.id);
        if (!client) throw new Error('HTTP client not initialized');

        const response = await client.post('', {
            inputs: request.input,
            parameters: request.parameters
        });

        return response.data;
    }

    private async executeLocal(model: ModelConfig, request: InferenceRequest): Promise<any> {
        // Placeholder for local model execution
        // In practice, this would load and execute a local model
        throw new Error('Local model execution not implemented');
    }

    private async executeGeneric(model: ModelConfig, request: InferenceRequest): Promise<any> {
        const client = this.httpClients.get(model.id);
        if (!client) throw new Error('HTTP client not initialized');

        const response = await client.post('/infer', {
            input: request.input,
            parameters: request.parameters
        });

        return response.data;
    }

    private recordSuccessfulRequest(modelId: string, latency: number, response: InferenceResponse): void {
        const metrics = this.metrics.get(modelId);
        if (!metrics) return;

        metrics.requests.total++;
        metrics.requests.successful++;
        
        // Update latency metrics (simplified - in practice, use a proper histogram)
        metrics.performance.averageLatency = (metrics.performance.averageLatency + latency) / 2;
        
        // Update cost if available
        if (response.metadata.cost) {
            metrics.costs.totalCost += response.metadata.cost;
            metrics.costs.averageCostPerRequest = metrics.costs.totalCost / metrics.requests.successful;
        }

        this.emit('request_completed', { modelId, latency, success: true });
    }

    private recordFailedRequest(modelId: string, latency: number, error: Error): void {
        const metrics = this.metrics.get(modelId);
        if (!metrics) return;

        metrics.requests.total++;
        metrics.requests.failed++;
        metrics.performance.errorRate = metrics.requests.failed / metrics.requests.total;

        this.emit('request_completed', { modelId, latency, success: false, error: error.message });
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private cleanResponseCache(): void {
        const entries = Array.from(this.responseCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = Math.floor(this.responseCache.size * 0.2); // Remove 20%
        for (let i = 0; i < toRemove; i++) {
            this.responseCache.delete(entries[i][0]);
        }
    }

    private startHealthChecking(): void {
        this.healthCheckInterval = setInterval(async () => {
            const models = Array.from(this.models.keys());
            for (const modelId of models) {
                try {
                    await this.checkModelHealth(modelId);
                } catch (error) {
                    this.logger.warn('Health check error', { modelId, error });
                }
            }
        }, this.config.healthCheckIntervalMs);
    }

    private startMetricsCleanup(): void {
        this.metricsCleanupInterval = setInterval(() => {
            // Clean old cache entries
            const cutoff = Date.now() - (this.config.cacheTtlMs * 2);
            for (const [key, value] of this.responseCache.entries()) {
                if (value.timestamp < cutoff) {
                    this.responseCache.delete(key);
                }
            }
        }, 300000); // Every 5 minutes
    }

    /**
     * Shutdown the model manager
     */
    public async shutdown(): Promise<void> {
        this.logger.info('Shutting down ModelManager...');

        // Clear intervals
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.metricsCleanupInterval) {
            clearInterval(this.metricsCleanupInterval);
        }

        // Wait for active requests to complete
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const totalActiveRequests = Array.from(this.activeRequests.values())
                .reduce((sum, count) => sum + count, 0);
            
            if (totalActiveRequests === 0) break;
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Cleanup resources
        this.models.clear();
        this.metrics.clear();
        this.circuitBreakers.clear();
        this.requestQueue.clear();
        this.activeRequests.clear();
        this.responseCache.clear();
        this.httpClients.clear();

        this.emit('shutdown');
        this.logger.info('ModelManager shutdown complete');
    }
}