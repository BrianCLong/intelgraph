"use strict";
/**
 * Large Language Model Service
 * Supports multiple LLM providers for text generation and completion
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../monitoring/metrics.js");
const opentelemetry_js_1 = require("../monitoring/opentelemetry.js");
class LLMService {
    constructor(config = {}) {
        this.config = {
            provider: process.env.LLM_PROVIDER || "openai",
            apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
            model: process.env.LLM_MODEL || "gpt-3.5-turbo",
            maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 2000,
            temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.3,
            timeout: parseInt(process.env.LLM_TIMEOUT) || 60000,
            maxRetries: parseInt(process.env.LLM_MAX_RETRIES) || 3,
            ...config,
        };
        this.logger = logger_js_1.default;
        this.metrics = {
            totalCompletions: 0,
            averageLatency: 0,
            errorCount: 0,
            totalTokensGenerated: 0,
            averageTokensPerCompletion: 0,
        };
    }
    /**
     * Generate text completion
     */
    async complete(params) {
        const { prompt, model = this.config.model, maxTokens = this.config.maxTokens, temperature = this.config.temperature, systemMessage, stream = false, } = params;
        if (!prompt) {
            throw new Error("Prompt is required");
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.config.maxRetries) {
            try {
                let response;
                switch (this.config.provider) {
                    case "openai":
                        response = await this.openAICompletion({
                            prompt,
                            model,
                            maxTokens,
                            temperature,
                            systemMessage,
                            stream,
                        });
                        break;
                    case "anthropic":
                        response = await this.anthropicCompletion(params);
                        break;
                    case "local":
                        response = await this.localCompletion(params);
                        break;
                    default:
                        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
                }
                const latency = Date.now() - startTime;
                this.updateMetrics(latency, response.usage);
                logger_js_1.default.debug("LLM completion successful", {
                    provider: this.config.provider,
                    model,
                    promptLength: prompt.length,
                    responseLength: response.content.length,
                    latency,
                    tokensUsed: response.usage,
                });
                return response.content;
            }
            catch (error) {
                attempt++;
                if (attempt >= this.config.maxRetries) {
                    this.metrics.errorCount++;
                    metrics_js_1.applicationErrors
                        .labels("llm_service", "CompletionError", "error")
                        .inc();
                    logger_js_1.default.error("LLM completion failed after retries", {
                        provider: this.config.provider,
                        model,
                        attempt,
                        error: error.message,
                    });
                    throw error;
                }
                logger_js_1.default.warn("LLM completion failed, retrying", {
                    provider: this.config.provider,
                    attempt,
                    error: error.message,
                });
                // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    /**
     * Generate chat completion (multi-turn conversation)
     */
    async chat(messages, options = {}) {
        const { model = this.config.model, maxTokens = this.config.maxTokens, temperature = this.config.temperature, } = options;
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages array is required");
        }
        const startTime = Date.now();
        try {
            let response;
            switch (this.config.provider) {
                case "openai":
                    response = await this.openAIChat(messages, {
                        model,
                        maxTokens,
                        temperature,
                    });
                    break;
                default:
                    throw new Error(`Chat not supported for provider: ${this.config.provider}`);
            }
            const latency = Date.now() - startTime;
            this.updateMetrics(latency, response.usage);
            return response.content;
        }
        catch (error) {
            this.metrics.errorCount++;
            metrics_js_1.applicationErrors.labels("llm_service", "ChatError", "error").inc();
            logger_js_1.default.error("LLM chat failed", {
                provider: this.config.provider,
                messageCount: messages.length,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * OpenAI completion implementation
     */
    async openAICompletion(params) {
        const { prompt, model, maxTokens, temperature, systemMessage } = params;
        if (!this.config.apiKey) {
            throw new Error("OpenAI API key not configured");
        }
        const messages = [];
        if (systemMessage) {
            messages.push({ role: "system", content: systemMessage });
        }
        messages.push({ role: "user", content: prompt });
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
                ...(opentelemetry_js_1.otelService.getCurrentTraceContext()
                    ? { traceparent: opentelemetry_js_1.otelService.getCurrentTraceContext() }
                    : {}),
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: temperature,
                stream: false,
            }),
            signal: AbortSignal.timeout(this.config.timeout),
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }
        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error("No completion returned from OpenAI");
        }
        return {
            content: data.choices[0].message.content,
            usage: data.usage,
        };
    }
    /**
     * OpenAI chat implementation
     */
    async openAIChat(messages, options) {
        const { model, maxTokens, temperature } = options;
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
                ...(opentelemetry_js_1.otelService.getCurrentTraceContext()
                    ? { traceparent: opentelemetry_js_1.otelService.getCurrentTraceContext() }
                    : {}),
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: temperature,
            }),
            signal: AbortSignal.timeout(this.config.timeout),
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI Chat API error: ${response.status} - ${errorData}`);
        }
        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            usage: data.usage,
        };
    }
    /**
     * Anthropic completion (placeholder)
     */
    async anthropicCompletion(params) {
        throw new Error("Anthropic provider not yet implemented");
    }
    /**
     * Local completion (placeholder)
     */
    async localCompletion(params) {
        throw new Error("Local provider not yet implemented");
    }
    /**
     * Summarize text
     */
    async summarize(text, options = {}) {
        const { maxLength = 100, style = "concise", model = this.config.model, } = options;
        const prompt = `Please provide a ${style} summary of the following text in no more than ${maxLength} words:

${text}

Summary:`;
        return this.complete({
            prompt,
            model,
            maxTokens: Math.min(maxLength * 2, 500), // Rough token estimation
            temperature: 0.3,
        });
    }
    /**
     * Extract key information
     */
    async extract(text, entities, options = {}) {
        const { model = this.config.model } = options;
        const entityList = Array.isArray(entities) ? entities.join(", ") : entities;
        const prompt = `Extract the following types of information from the text: ${entityList}

Text: ${text}

Please format your response as JSON with the entity types as keys and extracted values as arrays.

Response:`;
        const response = await this.complete({
            prompt,
            model,
            temperature: 0.1,
        });
        try {
            return JSON.parse(response);
        }
        catch (error) {
            logger_js_1.default.warn("Failed to parse extraction response as JSON", {
                response,
                error: error.message,
            });
            return { raw_response: response };
        }
    }
    /**
     * Answer questions about text
     */
    async questionAnswer(context, question, options = {}) {
        const { model = this.config.model } = options;
        const prompt = `Context: ${context}

Question: ${question}

Based on the context provided above, please answer the question. If the context doesn't contain enough information to answer the question, please state that clearly.

Answer:`;
        return this.complete({
            prompt,
            model,
            temperature: 0.2,
        });
    }
    /**
     * Update metrics
     */
    updateMetrics(latency, usage = {}) {
        this.metrics.totalCompletions++;
        const currentLatency = this.metrics.averageLatency;
        this.metrics.averageLatency = currentLatency
            ? (currentLatency + latency) / 2
            : latency;
        if (usage.total_tokens) {
            this.metrics.totalTokensGenerated += usage.total_tokens;
            const currentAvgTokens = this.metrics.averageTokensPerCompletion;
            this.metrics.averageTokensPerCompletion = currentAvgTokens
                ? (currentAvgTokens + usage.total_tokens) / 2
                : usage.total_tokens;
        }
    }
    /**
     * Health check
     */
    getHealth() {
        return {
            status: "healthy",
            provider: this.config.provider,
            model: this.config.model,
            metrics: {
                totalCompletions: this.metrics.totalCompletions,
                averageLatency: Math.round(this.metrics.averageLatency),
                errorCount: this.metrics.errorCount,
                totalTokensGenerated: this.metrics.totalTokensGenerated,
                averageTokensPerCompletion: Math.round(this.metrics.averageTokensPerCompletion),
                successRate: this.metrics.totalCompletions > 0
                    ? (((this.metrics.totalCompletions - this.metrics.errorCount) /
                        this.metrics.totalCompletions) *
                        100).toFixed(1) + "%"
                    : "100%",
            },
        };
    }
    /**
     * Test completion
     */
    async test() {
        try {
            const response = await this.complete({
                prompt: "What is 2+2?",
                maxTokens: 50,
            });
            return {
                success: true,
                response: response.substring(0, 100), // Truncate for logging
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
exports.default = LLMService;
//# sourceMappingURL=LLMService.js.map