"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CopilotOrchestrationService_js_1 = __importDefault(require("../../src/services/CopilotOrchestrationService.js")); // Note the .js extension
describe('CopilotOrchestrationService', () => {
    let service;
    let mockNeo4jDriver;
    let mockAIExtractionService;
    let mockFederatedSearchService;
    let mockLogger;
    beforeEach(() => {
        mockNeo4jDriver = {
            session: jest.fn(() => ({
                run: jest.fn(() => ({ records: [] })),
                close: jest.fn(),
            })),
        };
        mockAIExtractionService = {
            extractEntities: jest.fn(),
            extractRelationships: jest.fn(),
        };
        mockFederatedSearchService = {
            search: jest.fn(),
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };
        service = new CopilotOrchestrationService_js_1.default(mockNeo4jDriver, mockAIExtractionService, mockFederatedSearchService, mockLogger);
    });
    it('should initialize with correct properties', () => {
        expect(service.driver).toBe(mockNeo4jDriver);
        expect(service.aiExtraction).toBe(mockAIExtractionService);
        expect(service.federatedSearch).toBe(mockFederatedSearchService);
        expect(service.logger).toBe(mockLogger);
        expect(service.activeQueries).toBeInstanceOf(Map);
        expect(service.queryPlanners).toBeInstanceOf(Map);
        expect(service.executionStrategies).toBeInstanceOf(Map);
        expect(service.domainKnowledge).toBeInstanceOf(Map);
        expect(service.queryPatterns).toBeInstanceOf(Map);
        expect(service.metrics).toBeDefined();
    });
    it('should initialize query planners', () => {
        expect(service.queryPlanners.size).toBeGreaterThan(0);
        expect(service.logger.info).toHaveBeenCalledWith(expect.stringContaining('Initialized'), expect.any(Object));
    });
    it('should load domain knowledge', () => {
        expect(service.domainKnowledge.size).toBeGreaterThan(0);
        expect(service.logger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded domain knowledge'), expect.any(Object));
    });
    it('should orchestrate a simple query', async () => {
        const queryText = 'who is John Doe';
        const context = { userId: 'user1', investigationId: 'inv1' };
        // Mock analyzeQuery to return a simple analysis
        service.analyzeQuery = jest.fn().mockResolvedValue({
            originalText: queryText,
            intent: 'discovery',
            entities: [{ name: 'John Doe', type: 'PERSON' }],
            relationships: [],
            temporalScope: null,
            spatialScope: null,
            complexity: 0.2,
            confidence: 0.8,
            keywords: ['john', 'doe'],
            queryType: 'ENTITY_ANALYSIS',
        });
        // Mock generateExecutionPlan to return a simple plan
        service.generateExecutionPlan = jest.fn().mockResolvedValue({
            queryId: 'mock-query-id',
            strategy: 'ENTITY_ANALYSIS',
            steps: [{ id: 'step1', type: 'GRAPH_QUERY', operation: 'findEntity' }],
            estimatedTime: 1000,
            complexity: 0.2,
            dataSources: ['neo4j'],
            parallelizable: false,
        });
        // Mock executePlan to return simple results
        service.executePlan = jest.fn().mockResolvedValue({
            entities: [{ id: 'e1', label: 'John Doe' }],
            relationships: [],
            insights: [],
            visualizations: [],
            summary: 'Mock summary',
            confidence: 0.9,
            executionDetails: [],
        });
        const result = await service.orchestrateQuery(queryText, context);
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.text).toEqual(queryText);
        expect(result.status).toEqual('COMPLETED');
        expect(service.analyzeQuery).toHaveBeenCalledWith(queryText, context);
        expect(service.generateExecutionPlan).toHaveBeenCalled();
        expect(service.executePlan).toHaveBeenCalled();
        expect(service.metrics.totalQueries).toEqual(1);
        expect(service.metrics.successfulQueries).toEqual(1);
        expect(service.logger.info).toHaveBeenCalledWith(expect.stringContaining('Query orchestration completed'), expect.any(Object));
    });
    // Add more tests for other methods like analyzeQuery, generateExecutionPlan, executePlan, etc.
    // Test different query types and edge cases.
});
//# sourceMappingURL=CopilotOrchestrationService.test.js.map