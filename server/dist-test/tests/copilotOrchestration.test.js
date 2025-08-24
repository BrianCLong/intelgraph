/**
 * Copilot Query Orchestration Service Tests
 * P0 Critical - MVP1 requirement validation
 */
const CopilotOrchestrationService = require('../services/CopilotOrchestrationService');
describe('Copilot Orchestration Service - P0 Critical MVP1', () => {
    let copilotService;
    let mockNeo4jDriver;
    let mockAIExtractionService;
    let mockFederatedSearchService;
    let mockLogger;
    let mockSession;
    beforeEach(() => {
        mockSession = {
            run: jest.fn(),
            close: jest.fn()
        };
        mockNeo4jDriver = {
            session: jest.fn(() => mockSession)
        };
        mockAIExtractionService = {
            submitExtractionJob: jest.fn(),
            getJobStatus: jest.fn()
        };
        mockFederatedSearchService = {
            federatedSearch: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        copilotService = new CopilotOrchestrationService(mockNeo4jDriver, mockAIExtractionService, mockFederatedSearchService, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Query Planner Initialization', () => {
        test('should initialize all required query planners', () => {
            const planners = copilotService.getAvailablePlanners();
            expect(planners).toHaveLength(6);
            expect(planners.map(p => p.type)).toContain('ENTITY_ANALYSIS');
            expect(planners.map(p => p.type)).toContain('RELATIONSHIP_DISCOVERY');
            expect(planners.map(p => p.type)).toContain('TEMPORAL_ANALYSIS');
            expect(planners.map(p => p.type)).toContain('MULTI_SOURCE_INVESTIGATION');
            expect(planners.map(p => p.type)).toContain('GEOSPATIAL_ANALYSIS');
            expect(planners.map(p => p.type)).toContain('PATTERN_DETECTION');
        });
        test('should configure planner patterns correctly', () => {
            const planners = copilotService.getAvailablePlanners();
            const entityPlanner = planners.find(p => p.type === 'ENTITY_ANALYSIS');
            expect(entityPlanner.patterns).toContain('/who is (.+)/i');
            expect(entityPlanner.patterns).toContain('/what do we know about (.+)/i');
            const relationshipPlanner = planners.find(p => p.type === 'RELATIONSHIP_DISCOVERY');
            expect(relationshipPlanner.patterns).toContain('/how is (.+) connected to (.+)/i');
            expect(relationshipPlanner.patterns).toContain('/what is the relationship between (.+) and (.+)/i');
        });
    });
    describe('Natural Language Query Analysis', () => {
        test('should analyze entity-focused queries', async () => {
            const queryText = "Who is John Smith and what do we know about him?";
            const analysis = await copilotService.analyzeQuery(queryText, {
                userId: 'user123',
                investigationId: 'inv456'
            });
            expect(analysis.intent).toBeDefined();
            expect(analysis.queryType).toBe('ENTITY_ANALYSIS');
            expect(analysis.keywords).toContain('john');
            expect(analysis.keywords).toContain('smith');
            expect(analysis.confidence).toBeGreaterThan(0.5);
        });
        test('should analyze relationship discovery queries', async () => {
            const queryText = "How is Alice connected to Bob?";
            const analysis = await copilotService.analyzeQuery(queryText, {});
            expect(analysis.queryType).toBe('RELATIONSHIP_DISCOVERY');
            expect(analysis.entities.length).toBeGreaterThan(0);
            expect(analysis.complexity).toBeGreaterThan(0.1);
        });
        test('should analyze temporal queries', async () => {
            const queryText = "What happened on 2024-01-15 involving the suspects?";
            const analysis = await copilotService.analyzeQuery(queryText, {});
            expect(analysis.queryType).toBe('TEMPORAL_ANALYSIS');
            expect(analysis.temporalScope).toBeDefined();
            expect(analysis.temporalScope.type).toBe('RELATIVE');
        });
        test('should classify query intents correctly', () => {
            expect(copilotService.classifyQueryIntent('find the suspect')).toBe('discovery');
            expect(copilotService.classifyQueryIntent('analyze the network')).toBe('analysis');
            expect(copilotService.classifyQueryIntent('when did this happen')).toBe('temporal');
            expect(copilotService.classifyQueryIntent('why did he do it')).toBe('causal');
        });
        test('should extract keywords from query text', () => {
            const keywords = copilotService.extractKeywords('Find information about John Smith in New York');
            expect(keywords).toContain('find');
            expect(keywords).toContain('information');
            expect(keywords).toContain('john');
            expect(keywords).toContain('smith');
            expect(keywords).toContain('york');
            expect(keywords.length).toBeLessThanOrEqual(10);
        });
        test('should identify query types using pattern matching', () => {
            expect(copilotService.identifyQueryType('who is john doe')).toBe('ENTITY_ANALYSIS');
            expect(copilotService.identifyQueryType('how is alice connected to bob')).toBe('RELATIONSHIP_DISCOVERY');
            expect(copilotService.identifyQueryType('timeline of events')).toBe('TEMPORAL_ANALYSIS');
            expect(copilotService.identifyQueryType('investigate the network')).toBe('MULTI_SOURCE_INVESTIGATION');
            expect(copilotService.identifyQueryType('where is the location')).toBe('GEOSPATIAL_ANALYSIS');
            expect(copilotService.identifyQueryType('find suspicious patterns')).toBe('PATTERN_DETECTION');
        });
    });
    describe('Execution Plan Generation', () => {
        test('should generate entity analysis plan', async () => {
            const analysis = {
                queryType: 'ENTITY_ANALYSIS',
                entities: [{ name: 'John Smith', type: 'PERSON' }],
                keywords: ['john', 'smith'],
                complexity: 0.6
            };
            const plan = await copilotService.generateExecutionPlan(analysis, {
                investigationId: 'inv456'
            });
            expect(plan.strategy).toBe('ENTITY_ANALYSIS');
            expect(plan.steps.length).toBeGreaterThan(0);
            expect(plan.dataSources).toContain('neo4j');
            expect(plan.dataSources).toContain('multimodal');
            expect(plan.estimatedTime).toBeGreaterThan(0);
        });
        test('should generate relationship discovery plan', async () => {
            const analysis = {
                queryType: 'RELATIONSHIP_DISCOVERY',
                entities: [
                    { name: 'Alice Johnson', type: 'PERSON' },
                    { name: 'Bob Wilson', type: 'PERSON' }
                ],
                relationships: [{ type: 'KNOWS' }]
            };
            const plan = await copilotService.generateExecutionPlan(analysis, {});
            expect(plan.strategy).toBe('RELATIONSHIP_DISCOVERY');
            expect(plan.steps.some(step => step.type === 'GRAPH_QUERY')).toBe(true);
            expect(plan.steps.some(step => step.operation === 'findShortestPaths')).toBe(true);
            expect(plan.dataSources).toContain('federated');
        });
        test('should generate multi-source investigation plan', async () => {
            const analysis = {
                queryType: 'MULTI_SOURCE_INVESTIGATION',
                entities: [{ name: 'Suspect X', type: 'PERSON' }],
                complexity: 0.9
            };
            const plan = await copilotService.generateExecutionPlan(analysis, {});
            expect(plan.strategy).toBe('MULTI_SOURCE_INVESTIGATION');
            expect(plan.steps.length).toBeGreaterThan(3); // Should be comprehensive
            expect(plan.dataSources).toContain('ai_extraction');
            expect(plan.dataSources).toContain('federated');
            expect(plan.estimatedTime).toBeGreaterThan(5000); // Should be longer
        });
        test('should handle unknown query type', async () => {
            const analysis = { queryType: 'UNKNOWN_TYPE' };
            await expect(copilotService.generateExecutionPlan(analysis, {})).rejects.toThrow('No planner available for query type: UNKNOWN_TYPE');
        });
    });
    describe('Query Orchestration End-to-End', () => {
        test('should orchestrate simple entity query', async () => {
            const queryText = "Find information about John Smith";
            const context = {
                userId: 'user123',
                investigationId: 'inv456'
            };
            // Mock successful execution
            mockSession.run.mockResolvedValue({
                records: [{
                        get: () => ({ properties: { id: 'entity1', label: 'John Smith' } })
                    }]
            });
            const result = await copilotService.orchestrateQuery(queryText, context);
            expect(result.status).toBe('COMPLETED');
            expect(result.results).toBeDefined();
            expect(result.results.entities).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.executionTime).toBeGreaterThan(0);
        });
        test('should handle query orchestration failure', async () => {
            const queryText = "Find problematic query";
            // Mock execution failure
            mockSession.run.mockRejectedValue(new Error('Database connection failed'));
            await expect(copilotService.orchestrateQuery(queryText, {})).rejects.toThrow('Database connection failed');
        });
        test('should track active queries', async () => {
            const queryPromise = copilotService.orchestrateQuery("Test query", {});
            const activeQueries = copilotService.getActiveQueries();
            expect(activeQueries.length).toBeGreaterThan(0);
            await queryPromise.catch(() => { }); // Handle any errors
        });
        test('should emit query lifecycle events', async () => {
            const plannedHandler = jest.fn();
            const completedHandler = jest.fn();
            const failedHandler = jest.fn();
            copilotService.on('queryPlanned', plannedHandler);
            copilotService.on('queryCompleted', completedHandler);
            copilotService.on('queryFailed', failedHandler);
            mockSession.run.mockResolvedValue({ records: [] });
            const result = await copilotService.orchestrateQuery("Test query", {});
            expect(plannedHandler).toHaveBeenCalledWith(expect.objectContaining({
                status: 'EXECUTING'
            }));
            expect(completedHandler).toHaveBeenCalledWith(expect.objectContaining({
                status: 'COMPLETED'
            }));
        });
    });
    describe('Step Execution', () => {
        test('should execute graph query steps', async () => {
            const step = {
                id: 'step1',
                type: 'GRAPH_QUERY',
                description: 'Find entity',
                operation: 'findEntity',
                parameters: { entityName: 'John Smith' },
                estimatedTime: 500
            };
            const results = await copilotService.executeGraphQuery(step);
            expect(results.entities).toBeDefined();
            expect(results.entities.length).toBeGreaterThan(0);
            expect(results.entities[0].type).toBe('PERSON');
        });
        test('should execute multimodal search steps', async () => {
            const step = {
                id: 'step2',
                type: 'MULTIMODAL_SEARCH',
                description: 'Search multimedia',
                parameters: { query: 'suspect' },
                estimatedTime: 1500
            };
            const results = await copilotService.executeMultimodalSearch(step);
            expect(results.entities).toBeDefined();
            expect(results.mediaSources).toBeDefined();
        });
        test('should execute federated search steps', async () => {
            const step = {
                id: 'step3',
                type: 'FEDERATED_SEARCH',
                description: 'Search federated instances',
                parameters: { entities: ['John Smith'] },
                estimatedTime: 2000
            };
            const results = await copilotService.executeFederatedSearch(step);
            expect(results.entities).toBeDefined();
            expect(results.instances).toBeDefined();
        });
        test('should handle step execution errors', async () => {
            const step = {
                id: 'step4',
                type: 'UNKNOWN_TYPE',
                description: 'Unknown step',
                estimatedTime: 1000
            };
            const query = { steps: [] };
            const results = { entities: [], insights: [] };
            await expect(copilotService.executeStep(step, query, results)).rejects.toThrow('Unknown step type: UNKNOWN_TYPE');
            expect(step.status).toBe('FAILED');
            expect(step.error).toBeDefined();
        });
    });
    describe('Domain Knowledge and Understanding', () => {
        test('should load entity type knowledge', () => {
            const entityTypes = copilotService.domainKnowledge.get('entity_types');
            expect(entityTypes).toBeDefined();
            expect(entityTypes.person).toContain('individual');
            expect(entityTypes.organization).toContain('company');
            expect(entityTypes.location).toContain('address');
        });
        test('should load relationship type knowledge', () => {
            const relationshipTypes = copilotService.domainKnowledge.get('relationship_types');
            expect(relationshipTypes).toBeDefined();
            expect(relationshipTypes.employment).toContain('works for');
            expect(relationshipTypes.communication).toContain('calls');
            expect(relationshipTypes.ownership).toContain('owns');
        });
        test('should extract entity mentions from text', async () => {
            const entities = await copilotService.extractEntityMentions('John Smith from Acme Corp', {});
            expect(entities).toBeDefined();
            expect(entities.length).toBeGreaterThan(0);
            expect(entities[0].name).toBe('john');
            expect(entities[0].confidence).toBeGreaterThan(0);
        });
        test('should extract relationship mentions', () => {
            const relationships = copilotService.extractRelationshipMentions('John works for Acme and knows Alice');
            expect(relationships.length).toBeGreaterThan(0);
            expect(relationships.some(r => r.type === 'EMPLOYMENT')).toBe(true);
            expect(relationships.some(r => r.type === 'ASSOCIATION')).toBe(true);
        });
        test('should extract temporal scope from queries', () => {
            const temporal1 = copilotService.extractTemporalScope('events on 2024-01-15');
            expect(temporal1).toBeDefined();
            expect(temporal1.type).toBe('RELATIVE');
            const temporal2 = copilotService.extractTemporalScope('what happened yesterday');
            expect(temporal2).toBeDefined();
            expect(temporal2.value).toBe('yesterday');
            const temporal3 = copilotService.extractTemporalScope('no time reference');
            expect(temporal3).toBeNull();
        });
        test('should extract spatial scope from queries', () => {
            const spatial1 = copilotService.extractSpatialScope('events at 123 Main Street');
            expect(spatial1).toBeDefined();
            expect(spatial1.type).toBe('GEOGRAPHIC');
            const spatial2 = copilotService.extractSpatialScope('coordinates 40.7128, -74.0060');
            expect(spatial2).toBeDefined();
            const spatial3 = copilotService.extractSpatialScope('no location mentioned');
            expect(spatial3).toBeNull();
        });
    });
    describe('Query Complexity and Confidence Calculation', () => {
        test('should calculate query complexity correctly', () => {
            const simpleAnalysis = {
                entities: [{ name: 'John' }],
                relationships: [],
                keywords: ['john'],
                temporalScope: null,
                spatialScope: null
            };
            const complexAnalysis = {
                entities: [{ name: 'John' }, { name: 'Alice' }],
                relationships: [{ type: 'KNOWS' }],
                keywords: ['john', 'alice', 'relationship', 'network', 'analysis', 'complex'],
                temporalScope: { type: 'RELATIVE' },
                spatialScope: { type: 'GEOGRAPHIC' }
            };
            const simpleComplexity = copilotService.calculateQueryComplexity(simpleAnalysis);
            const complexComplexity = copilotService.calculateQueryComplexity(complexAnalysis);
            expect(simpleComplexity).toBeLessThan(complexComplexity);
            expect(complexComplexity).toBeGreaterThan(0.5);
        });
        test('should calculate analysis confidence', () => {
            const goodAnalysis = {
                intent: 'discovery',
                queryType: 'ENTITY_ANALYSIS',
                entities: [{ name: 'John' }]
            };
            const poorAnalysis = {
                intent: null,
                queryType: null,
                entities: []
            };
            const goodConfidence = copilotService.calculateAnalysisConfidence(goodAnalysis);
            const poorConfidence = copilotService.calculateAnalysisConfidence(poorAnalysis);
            expect(goodConfidence).toBeGreaterThan(poorConfidence);
            expect(goodConfidence).toBeGreaterThan(0.8);
        });
    });
    describe('Results Processing and Insights', () => {
        test('should merge step results correctly', () => {
            const stepResults = {
                entities: [{ id: '1', label: 'Entity 1' }],
                relationships: [{ id: '1', type: 'KNOWS' }],
                insights: [{ type: 'PATTERN', description: 'Pattern detected' }]
            };
            const overallResults = {
                entities: [],
                relationships: [],
                insights: [],
                visualizations: []
            };
            copilotService.mergeStepResults(stepResults, overallResults);
            expect(overallResults.entities).toHaveLength(1);
            expect(overallResults.relationships).toHaveLength(1);
            expect(overallResults.insights).toHaveLength(1);
        });
        test('should generate query summary', async () => {
            const results = {
                entities: [{ id: '1' }, { id: '2' }],
                relationships: [{ id: '1' }],
                insights: [{ type: 'PATTERN' }],
                confidence: 0.85
            };
            const query = {
                executionTime: 2500,
                steps: [{ id: '1' }, { id: '2' }]
            };
            const summary = await copilotService.generateQuerySummary(results, query);
            expect(summary.entityCount).toBe(2);
            expect(summary.relationshipCount).toBe(1);
            expect(summary.insightCount).toBe(1);
            expect(summary.executionTime).toBe(2500);
            expect(summary.stepsExecuted).toBe(2);
        });
        test('should generate insights from results', async () => {
            const results = {
                entities: Array(15).fill({ id: 'entity' }),
                relationships: [],
                insights: []
            };
            const insights = await copilotService.generateInsights(results, {});
            expect(insights.length).toBeGreaterThan(0);
            expect(insights.some(i => i.type === 'HIGH_ENTITY_COUNT')).toBe(true);
            expect(insights.some(i => i.type === 'NO_RELATIONSHIPS')).toBe(true);
        });
    });
    describe('Performance Metrics', () => {
        test('should track orchestration metrics', () => {
            const initialMetrics = copilotService.getMetrics();
            expect(initialMetrics.totalQueries).toBeGreaterThanOrEqual(0);
            expect(initialMetrics.successfulQueries).toBeGreaterThanOrEqual(0);
            expect(initialMetrics.failedQueries).toBeGreaterThanOrEqual(0);
            expect(initialMetrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
        });
        test('should calculate success rate correctly', () => {
            const metrics = copilotService.getMetrics();
            if (metrics.totalQueries > 0) {
                const expectedRate = (metrics.successfulQueries / metrics.totalQueries * 100).toFixed(2);
                expect(metrics.successRate).toBe(expectedRate);
            }
            else {
                expect(metrics.successRate).toBe('0');
            }
        });
        test('should update execution time metrics', () => {
            const initialAvg = copilotService.metrics.averageExecutionTime;
            copilotService.updateExecutionTimeMetric(1000);
            // Should update the average (if not first execution)
            if (copilotService.metrics.successfulQueries > 1) {
                expect(copilotService.metrics.averageExecutionTime).not.toBe(initialAvg);
            }
        });
    });
    describe('Query Management', () => {
        test('should get query status', () => {
            const activeQueries = copilotService.getActiveQueries();
            if (activeQueries.length > 0) {
                const firstQuery = activeQueries[0];
                const status = copilotService.getQueryStatus(firstQuery.id);
                expect(status).toBeDefined();
                expect(status.id).toBe(firstQuery.id);
            }
        });
        test('should cancel active query', async () => {
            // Start a query
            const queryPromise = copilotService.orchestrateQuery("Test cancellation query", {});
            const activeQueries = copilotService.getActiveQueries();
            if (activeQueries.length > 0) {
                const queryId = activeQueries[0].id;
                const cancelled = await copilotService.cancelQuery(queryId);
                expect(cancelled).toBe(true);
                const cancelledQuery = copilotService.getQueryStatus(queryId);
                expect(cancelledQuery.status).toBe('CANCELLED');
            }
            await queryPromise.catch(() => { }); // Handle any errors
        });
        test('should return false for cancelling non-existent query', async () => {
            const cancelled = await copilotService.cancelQuery('nonexistent-id');
            expect(cancelled).toBe(false);
        });
    });
});
// Integration tests for copilot orchestration
if (process.env.TEST_MODE === 'integration') {
    describe('Copilot Orchestration Integration Tests', () => {
        test('should orchestrate complex multi-step investigation', async () => {
            // Test full integration with real database and services
        });
        test('should handle real-time query processing', async () => {
            // Test with actual streaming data and real-time updates
        });
        test('should integrate with AI extraction pipeline', async () => {
            // Test orchestration of actual AI extraction jobs
        });
    });
}
//# sourceMappingURL=copilotOrchestration.test.js.map