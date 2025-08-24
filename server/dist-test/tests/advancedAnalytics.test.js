/**
 * Advanced Analytics Service Tests - P1 Priority
 * Comprehensive test suite for ML analytics and predictions
 */
const AdvancedAnalyticsService = require('../services/AdvancedAnalyticsService');
describe('Advanced Analytics Service - P1 Priority', () => {
    let analyticsService;
    let mockNeo4jDriver;
    let mockMultimodalService;
    let mockSimulationService;
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
        mockMultimodalService = {
            createMultimodalEntity: jest.fn(),
            findSimilarEntities: jest.fn()
        };
        mockSimulationService = {
            runSimulation: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        analyticsService = new AdvancedAnalyticsService(mockNeo4jDriver, mockMultimodalService, mockSimulationService, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('ML Model Initialization', () => {
        test('should initialize all required ML models', () => {
            const models = analyticsService.getAvailableModels();
            expect(models).toHaveLength(6);
            expect(models.map(m => m.id)).toContain('LINK_PREDICTION');
            expect(models.map(m => m.id)).toContain('ENTITY_CLASSIFICATION');
            expect(models.map(m => m.id)).toContain('BEHAVIOR_PREDICTION');
            expect(models.map(m => m.id)).toContain('RISK_SCORING');
            expect(models.map(m => m.id)).toContain('COMMUNITY_DETECTION');
            expect(models.map(m => m.id)).toContain('INFLUENCE_PREDICTION');
        });
        test('should configure model parameters correctly', () => {
            const models = analyticsService.getAvailableModels();
            const linkModel = models.find(m => m.id === 'LINK_PREDICTION');
            expect(linkModel.type).toBe('supervised');
            expect(linkModel.accuracy).toBeGreaterThan(0.8);
            const entityModel = models.find(m => m.id === 'ENTITY_CLASSIFICATION');
            expect(entityModel.algorithm).toBe('gradient_boosting');
            expect(entityModel.features).toContain('text_features');
        });
    });
    describe('Anomaly Detection', () => {
        test('should initialize anomaly detectors', () => {
            const detectors = analyticsService.getAvailableDetectors();
            expect(detectors).toHaveLength(4);
            expect(detectors.map(d => d.id)).toContain('STRUCTURAL_ANOMALY');
            expect(detectors.map(d => d.id)).toContain('TEMPORAL_ANOMALY');
            expect(detectors.map(d => d.id)).toContain('BEHAVIORAL_ANOMALY');
            expect(detectors.map(d => d.id)).toContain('CONTENT_ANOMALY');
        });
        test('should configure detector thresholds', () => {
            const detectors = analyticsService.getAvailableDetectors();
            const structuralDetector = detectors.find(d => d.id === 'STRUCTURAL_ANOMALY');
            expect(structuralDetector.threshold).toBe(0.15);
            expect(structuralDetector.sensitivity).toBe('medium');
            const temporalDetector = detectors.find(d => d.id === 'TEMPORAL_ANOMALY');
            expect(temporalDetector.algorithm).toBe('autoencoder');
        });
    });
    describe('Link Prediction', () => {
        test('should perform link prediction analysis', async () => {
            // Mock graph data
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: '1', label: 'Node A', type: 'PERSON' } }) },
                    { get: () => ({ properties: { id: '2', label: 'Node B', type: 'PERSON' } }) }
                ]
            })
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (field) => {
                            if (field === 'a')
                                return { properties: { id: '1' } };
                            if (field === 'b')
                                return { properties: { id: '3' } };
                            if (field === 'r')
                                return { properties: { weight: 0.8 } };
                        }
                    }
                ]
            });
            const job = await analyticsService.submitAnalyticsJob({
                type: 'LINK_PREDICTION',
                parameters: {
                    investigationId: 'inv123',
                    confidenceThreshold: 0.7,
                    predictionHorizon: 30
                },
                userId: 'user456',
                investigationId: 'inv123'
            });
            expect(job).toBeDefined();
            expect(job.type).toBe('LINK_PREDICTION');
            expect(job.status).toBe('QUEUED');
            expect(analyticsService.metrics.totalAnalytics).toBe(1);
        });
        test('should calculate link prediction features', () => {
            const nodes = new Map([
                ['1', { id: '1', type: 'PERSON' }],
                ['2', { id: '2', type: 'PERSON' }],
                ['3', { id: '3', type: 'ORGANIZATION' }]
            ]);
            const edges = [
                { source: '1', target: '3', weight: 0.8 },
                { source: '2', target: '3', weight: 0.6 }
            ];
            const features = analyticsService.calculateLinkPredictionFeatures('1', '2', nodes, edges);
            expect(features).toBeDefined();
            expect(features.commonNeighbors).toBe(1);
            expect(features.jaccardCoefficient).toBeGreaterThan(0);
            expect(features.centralityProduct).toBeGreaterThan(0);
        });
        test('should predict link probability', () => {
            const features = {
                commonNeighbors: 3,
                jaccardCoefficient: 0.5,
                centralityProduct: 10,
                shortestPathLength: 2,
                degreeSum: 8,
                preferentialAttachment: 15
            };
            const probability = analyticsService.predictLinkProbability(features);
            expect(probability).toBeGreaterThan(0);
            expect(probability).toBeLessThanOrEqual(1);
        });
    });
    describe('Entity Classification', () => {
        test('should classify entities using ML features', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    { get: () => ({ properties: { id: '1', label: 'John Doe', type: 'PERSON' } }) }
                ]
            });
            const job = await analyticsService.submitAnalyticsJob({
                type: 'ENTITY_CLASSIFICATION',
                parameters: {
                    investigationId: 'inv123',
                    entityIds: ['1'],
                    classificationTypes: ['PERSON', 'ORGANIZATION']
                },
                userId: 'user456',
                investigationId: 'inv123'
            });
            expect(job.type).toBe('ENTITY_CLASSIFICATION');
            expect(job.parameters.classificationTypes).toContain('PERSON');
        });
        test('should extract entity features', async () => {
            const entityProps = {
                label: 'Dr. John Smith',
                type: 'PERSON',
                connectionCount: 15,
                centrality: 0.8,
                createdAt: new Date().toISOString()
            };
            const features = await analyticsService.extractEntityFeatures(entityProps);
            expect(features.textFeatures).toBeDefined();
            expect(features.textFeatures.containsTitle).toBe(true);
            expect(features.textFeatures.wordCount).toBe(3);
            expect(features.networkFeatures.connectionCount).toBe(15);
            expect(features.networkFeatures.centrality).toBe(0.8);
        });
        test('should classify entity based on features', () => {
            const features = {
                textFeatures: {
                    containsTitle: true,
                    wordCount: 2,
                    hasSpecialChars: false
                },
                networkFeatures: {
                    connectionCount: 5,
                    centrality: 0.3
                },
                multimodalFeatures: {
                    hasImageContent: true
                }
            };
            const classification = analyticsService.classifyEntity(features, ['PERSON', 'ORGANIZATION']);
            expect(classification.type).toBe('PERSON');
            expect(classification.confidence).toBeGreaterThan(0);
            expect(classification.reasoning).toContain('title');
        });
    });
    describe('Behavior Prediction', () => {
        test('should predict behavioral patterns', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: (field) => {
                            if (field === 'r')
                                return {
                                    properties: { timestamp: new Date().toISOString(), type: 'COMMUNICATION' }
                                };
                            return { properties: { id: 'related_entity' } };
                        }
                    }
                ]
            });
            const job = await analyticsService.submitAnalyticsJob({
                type: 'BEHAVIOR_PREDICTION',
                parameters: {
                    investigationId: 'inv123',
                    entityId: 'entity1',
                    predictionHorizon: 30,
                    behaviorTypes: ['ACTIVITY', 'COMMUNICATION']
                },
                userId: 'user456',
                investigationId: 'inv123'
            });
            expect(job.type).toBe('BEHAVIOR_PREDICTION');
            expect(job.parameters.behaviorTypes).toContain('ACTIVITY');
        });
        test('should analyze historical patterns', () => {
            const behaviorData = [
                { timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), type: 'COMMUNICATION' },
                { timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), type: 'COMMUNICATION' },
                { timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), type: 'COMMUNICATION' }
            ];
            const pattern = analyticsService.analyzeHistoricalPattern(behaviorData, 'COMMUNICATION');
            expect(pattern.pattern).toBe('PERIODIC');
            expect(pattern.frequency).toBeGreaterThan(0);
            expect(pattern.trend).toBeDefined();
        });
        test('should predict future behavior', () => {
            const historicalPattern = {
                pattern: 'PERIODIC',
                frequency: 2, // events per week
                trend: 'INCREASING',
                variance: 0.1
            };
            const prediction = analyticsService.predictBehavior(historicalPattern, 14); // 14 days
            expect(prediction.expectedEvents).toBeGreaterThan(0);
            expect(prediction.confidence).toBeGreaterThan(0);
            expect(prediction.factors).toContain('INCREASING trend');
        });
    });
    describe('Risk Scoring', () => {
        test('should calculate comprehensive risk scores', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: (field) => {
                            if (field === 'e')
                                return { properties: { id: '1', label: 'High Risk Entity' } };
                            if (field === 'connectionCount')
                                return { toNumber: () => 25 };
                            if (field === 'relationships')
                                return [];
                        }
                    }
                ]
            });
            const job = await analyticsService.submitAnalyticsJob({
                type: 'RISK_SCORING',
                parameters: {
                    investigationId: 'inv123',
                    entityIds: ['1'],
                    riskFactors: ['CONNECTIVITY', 'ACTIVITY', 'ASSOCIATIONS']
                },
                userId: 'user456',
                investigationId: 'inv123'
            });
            expect(job.type).toBe('RISK_SCORING');
            expect(job.parameters.riskFactors).toContain('CONNECTIVITY');
        });
        test('should calculate risk components', async () => {
            const entity = { id: '1', label: 'Test Entity' };
            const relationships = [
                { properties: { timestamp: new Date().toISOString(), riskFlag: 'SUSPICIOUS_ACTIVITY' } }
            ];
            const riskScore = await analyticsService.calculateRiskScore(entity, 10, relationships, ['CONNECTIVITY', 'ACTIVITY', 'ASSOCIATIONS']);
            expect(riskScore.totalRisk).toBeGreaterThan(0);
            expect(riskScore.riskLevel).toBeDefined();
            expect(riskScore.riskComponents).toBeDefined();
            expect(riskScore.recommendations).toBeInstanceOf(Array);
        });
    });
    describe('Community Detection', () => {
        test('should detect communities in networks', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    { get: (field) => field === 'nodeId' ? 'node1' : field === 'connectedNodeId' ? 'node2' : 0.8 }
                ]
            });
            const job = await analyticsService.submitAnalyticsJob({
                type: 'COMMUNITY_DETECTION',
                parameters: {
                    investigationId: 'inv123',
                    algorithm: 'LEIDEN',
                    resolution: 1.0,
                    minCommunitySize: 3
                },
                userId: 'user456',
                investigationId: 'inv123'
            });
            expect(job.type).toBe('COMMUNITY_DETECTION');
            expect(job.parameters.algorithm).toBe('LEIDEN');
        });
        test('should build adjacency list from edges', () => {
            const edges = [
                { source: 'A', target: 'B', weight: 1.0 },
                { source: 'B', target: 'C', weight: 0.8 }
            ];
            const graph = analyticsService.buildAdjacencyList(edges);
            expect(graph['A']).toHaveLength(1);
            expect(graph['A'][0].node).toBe('B');
            expect(graph['B']).toHaveLength(2);
            expect(graph['C']).toHaveLength(1);
        });
        test('should calculate community density', () => {
            const community = ['A', 'B', 'C'];
            const graph = {
                'A': [{ node: 'B', weight: 1 }],
                'B': [{ node: 'A', weight: 1 }, { node: 'C', weight: 1 }],
                'C': [{ node: 'B', weight: 1 }]
            };
            const density = analyticsService.calculateCommunityDensity(community, graph);
            expect(density).toBeGreaterThan(0);
            expect(density).toBeLessThanOrEqual(1);
        });
    });
    describe('Analytics Job Management', () => {
        test('should queue and track analytics jobs', async () => {
            const initialMetrics = analyticsService.getMetrics();
            const job = await analyticsService.submitAnalyticsJob({
                type: 'PATTERN_MINING',
                parameters: { investigationId: 'inv123' },
                userId: 'user456',
                investigationId: 'inv123'
            });
            const updatedMetrics = analyticsService.getMetrics();
            expect(job.id).toBeDefined();
            expect(job.status).toBe('QUEUED');
            expect(updatedMetrics.totalAnalytics).toBe(initialMetrics.totalAnalytics + 1);
        });
        test('should retrieve job status', async () => {
            const job = await analyticsService.submitAnalyticsJob({
                type: 'TREND_ANALYSIS',
                parameters: { investigationId: 'inv123' },
                userId: 'user456',
                investigationId: 'inv123'
            });
            const status = analyticsService.getJobStatus(job.id);
            expect(status).toBeDefined();
            expect(status.id).toBe(job.id);
            expect(status.type).toBe('TREND_ANALYSIS');
        });
        test('should get active jobs', async () => {
            await analyticsService.submitAnalyticsJob({
                type: 'INFLUENCE_ANALYSIS',
                parameters: { investigationId: 'inv123' },
                userId: 'user456',
                investigationId: 'inv123'
            });
            const activeJobs = analyticsService.getActiveJobs();
            expect(activeJobs.length).toBeGreaterThan(0);
            expect(activeJobs[0].status).toMatch(/QUEUED|PROCESSING/);
        });
    });
    describe('Metrics and Performance', () => {
        test('should track analytics metrics', () => {
            const metrics = analyticsService.getMetrics();
            expect(metrics.totalAnalytics).toBeGreaterThanOrEqual(0);
            expect(metrics.completedAnalytics).toBeGreaterThanOrEqual(0);
            expect(metrics.failedAnalytics).toBeGreaterThanOrEqual(0);
            expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
            expect(metrics.successRate).toBeDefined();
        });
        test('should calculate success rate correctly', () => {
            const metrics = analyticsService.getMetrics();
            if (metrics.totalAnalytics > 0) {
                const expectedRate = (metrics.completedAnalytics / metrics.totalAnalytics * 100).toFixed(2);
                expect(metrics.successRate).toBe(expectedRate);
            }
            else {
                expect(metrics.successRate).toBe('0');
            }
        });
    });
    describe('Utility Functions', () => {
        test('should calculate shortest path correctly', () => {
            const edges = [
                { source: 'A', target: 'B' },
                { source: 'B', target: 'C' },
                { source: 'C', target: 'D' }
            ];
            const pathLength = analyticsService.calculateShortestPath('A', 'D', edges);
            expect(pathLength).toBe(3);
        });
        test('should handle no path found', () => {
            const edges = [
                { source: 'A', target: 'B' }
            ];
            const pathLength = analyticsService.calculateShortestPath('A', 'C', edges);
            expect(pathLength).toBe(Infinity);
        });
        test('should check behavior type matching', () => {
            expect(analyticsService.isBehaviorTypeMatch('COMMUNICATION', 'COMMUNICATION')).toBe(true);
            expect(analyticsService.isBehaviorTypeMatch('CALLED', 'COMMUNICATION')).toBe(true);
            expect(analyticsService.isBehaviorTypeMatch('ACCESSED', 'ACTIVITY')).toBe(true);
            expect(analyticsService.isBehaviorTypeMatch('UNKNOWN', 'COMMUNICATION')).toBe(false);
        });
    });
});
// Performance tests
describe('Advanced Analytics Performance', () => {
    let analyticsService;
    beforeEach(() => {
        analyticsService = new AdvancedAnalyticsService({ session: () => ({ run: jest.fn(), close: jest.fn() }) }, null, null, { info: jest.fn(), error: jest.fn() });
    });
    test('should handle large datasets efficiently', async () => {
        const largeDataset = {
            nodes: Array(1000).fill().map((_, i) => ({ id: `node${i}` })),
            edges: Array(2000).fill().map((_, i) => ({
                source: `node${i % 1000}`,
                target: `node${(i + 1) % 1000}`
            }))
        };
        const start = Date.now();
        const layout = await analyticsService.calculateForceDirectedLayout(largeDataset);
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        expect(Object.keys(layout)).toHaveLength(1000);
    });
});
//# sourceMappingURL=advancedAnalytics.test.js.map