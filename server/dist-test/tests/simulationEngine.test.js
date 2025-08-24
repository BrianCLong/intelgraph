/**
 * Simulation Engine Service Tests
 * P0 Critical - MVP1 requirement validation
 */
const SimulationEngineService = require("../services/SimulationEngineService");
describe("Simulation Engine Service - P0 Critical MVP1", () => {
    let simulationService;
    let mockNeo4jDriver;
    let mockCopilotService;
    let mockLogger;
    let mockSession;
    let mockThreatFeedService;
    beforeEach(() => {
        mockSession = {
            run: jest.fn(),
            close: jest.fn(),
        };
        mockNeo4jDriver = {
            session: jest.fn(() => mockSession),
        };
        mockCopilotService = {
            orchestrateQuery: jest.fn(),
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };
        mockThreatFeedService = {
            fetchLatestFeeds: jest.fn().mockResolvedValue([]),
            updateBehaviorModels: jest.fn(),
        };
        simulationService = new SimulationEngineService(mockNeo4jDriver, mockCopilotService, mockLogger, mockThreatFeedService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("Simulation Engine Initialization", () => {
        test("should initialize all required simulation engines", () => {
            const engines = simulationService.getAvailableEngines();
            expect(engines).toHaveLength(7);
            expect(engines.map((e) => e.type)).toContain("NETWORK_PROPAGATION");
            expect(engines.map((e) => e.type)).toContain("BEHAVIORAL_PREDICTION");
            expect(engines.map((e) => e.type)).toContain("RISK_ASSESSMENT");
            expect(engines.map((e) => e.type)).toContain("RESOURCE_ALLOCATION");
            expect(engines.map((e) => e.type)).toContain("EVENT_CASCADE");
            expect(engines.map((e) => e.type)).toContain("MONTE_CARLO");
            expect(engines.map((e) => e.type)).toContain("ADAPTIVE_BEHAVIOR");
        });
        test("should configure engine parameters correctly", () => {
            const engines = simulationService.getAvailableEngines();
            const networkEngine = engines.find((e) => e.type === "NETWORK_PROPAGATION");
            expect(networkEngine.parameters.some((p) => p.name === "propagationRate")).toBe(true);
            expect(networkEngine.parameters.some((p) => p.name === "decayFactor")).toBe(true);
            const behavioralEngine = engines.find((e) => e.type === "BEHAVIORAL_PREDICTION");
            expect(behavioralEngine.parameters.some((p) => p.name === "timeHorizon")).toBe(true);
            expect(behavioralEngine.parameters.some((p) => p.name === "confidenceThreshold")).toBe(true);
        });
        test("should load scenario templates", () => {
            const scenarios = simulationService.getScenarioLibrary();
            expect(scenarios.length).toBeGreaterThan(0);
            expect(scenarios.map((s) => s.type)).toContain("THREAT_PROPAGATION");
            expect(scenarios.map((s) => s.type)).toContain("INFLUENCE_MAPPING");
            expect(scenarios.map((s) => s.type)).toContain("OPERATIONAL_PLANNING");
            expect(scenarios.map((s) => s.type)).toContain("CRISIS_RESPONSE");
            expect(scenarios.map((s) => s.type)).toContain("PREDICTIVE_INTELLIGENCE");
            expect(scenarios.map((s) => s.type)).toContain("CYBER_PHYSICAL");
            expect(scenarios.map((s) => s.type)).toContain("SOCIO_COGNITIVE");
        });
    });
    describe("Simulation Configuration and Validation", () => {
        test("should validate simulation configuration", () => {
            const validSimulation = {
                engines: ["NETWORK_PROPAGATION"],
                graphData: {
                    nodes: [{ id: "1", label: "Node 1" }],
                    edges: [],
                },
            };
            expect(() => {
                simulationService.validateSimulationConfig(validSimulation);
            }).not.toThrow();
        });
        test("should reject unknown engines", () => {
            const invalidSimulation = {
                engines: ["UNKNOWN_ENGINE"],
                graphData: { nodes: [], edges: [] },
            };
            expect(() => {
                simulationService.validateSimulationConfig(invalidSimulation);
            }).toThrow("Unknown simulation engine: UNKNOWN_ENGINE");
        });
        test("should validate engine parameters", () => {
            const engineParams = {
                propagationRate: { type: "number", min: 0, max: 1 },
                maxIterations: { type: "integer", min: 1 },
            };
            // Valid parameters
            expect(() => {
                simulationService.validateEngineParameters({
                    propagationRate: 0.5,
                    maxIterations: 100,
                }, engineParams);
            }).not.toThrow();
            // Invalid type
            expect(() => {
                simulationService.validateEngineParameters({
                    propagationRate: "invalid",
                }, engineParams);
            }).toThrow("Parameter propagationRate must be a number");
            // Out of range
            expect(() => {
                simulationService.validateEngineParameters({
                    propagationRate: 1.5,
                }, engineParams);
            }).toThrow("Parameter propagationRate must be <= 1");
        });
        test("should reject simulations with no graph data", () => {
            const simulation = {
                engines: ["NETWORK_PROPAGATION"],
                graphData: { nodes: [], edges: [] },
            };
            expect(() => {
                simulationService.validateSimulationConfig(simulation);
            }).toThrow("No graph data available for simulation");
        });
    });
    describe("Graph Data Loading", () => {
        test("should load graph data from Neo4j", async () => {
            // Mock Neo4j responses
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    {
                        get: () => ({
                            properties: { id: "1", label: "Entity 1", type: "PERSON" },
                        }),
                    },
                    {
                        get: () => ({
                            properties: {
                                id: "2",
                                label: "Entity 2",
                                type: "ORGANIZATION",
                            },
                        }),
                    },
                ],
            })
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (field) => {
                            if (field === "a")
                                return { properties: { id: "1", label: "Entity 1" } };
                            if (field === "b")
                                return { properties: { id: "2", label: "Entity 2" } };
                            if (field === "r")
                                return {
                                    properties: { id: "rel1", type: "KNOWS", weight: 0.8 },
                                };
                        },
                    },
                ],
            });
            const graphData = await simulationService.loadGraphData("inv123");
            expect(graphData.nodes).toHaveLength(2);
            expect(graphData.edges).toHaveLength(1);
            expect(graphData.nodes[0].id).toBe("1");
            expect(graphData.edges[0].weight).toBe(0.8);
        });
        test("should handle database connection errors", async () => {
            mockSession.run.mockRejectedValue(new Error("Connection failed"));
            await expect(simulationService.loadGraphData("inv123")).rejects.toThrow("Connection failed");
        });
    });
    describe("Threat feed integration", () => {
        test("should update behaviors using threat feeds during initialization", async () => {
            const simulation = {
                engines: ["NETWORK_PROPAGATION"],
                investigationId: "inv1",
                graphData: { nodes: [{ id: "1", properties: {} }], edges: [] },
            };
            simulationService.loadGraphData = jest.fn().mockResolvedValue({
                nodes: [{ id: "1", properties: {} }],
                edges: [],
            });
            mockThreatFeedService.fetchLatestFeeds.mockResolvedValue([
                { targetId: "1", score: 0.9 },
            ]);
            await simulationService.initializeSimulation(simulation);
            expect(mockThreatFeedService.fetchLatestFeeds).toHaveBeenCalled();
            expect(simulation.environment.nodes[0].simulationData.liveThreatScore).toBe(0.9);
        });
    });
    describe("Simulation Execution", () => {
        test("should run complete simulation successfully", async () => {
            // Mock graph data loading
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    {
                        get: () => ({
                            properties: { id: "1", label: "Node 1", type: "PERSON" },
                        }),
                    },
                    {
                        get: () => ({
                            properties: { id: "2", label: "Node 2", type: "PERSON" },
                        }),
                    },
                ],
            })
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (field) => {
                            if (field === "a")
                                return { properties: { id: "1" } };
                            if (field === "b")
                                return { properties: { id: "2" } };
                            if (field === "r")
                                return {
                                    properties: { id: "rel1", type: "KNOWS", weight: 0.8 },
                                };
                        },
                    },
                ],
            });
            const config = {
                name: "Test Simulation",
                engines: ["NETWORK_PROPAGATION"],
                parameters: {
                    propagationRate: 0.3,
                    sourceNode: "1",
                },
                investigationId: "inv123",
                userId: "user456",
            };
            const simulation = await simulationService.runSimulation(config);
            expect(simulation.status).toBe("COMPLETED");
            expect(simulation.results).toBeDefined();
            expect(simulation.results.engineResults.NETWORK_PROPAGATION).toBeDefined();
            expect(simulation.executionTime).toBeGreaterThan(0);
        });
        test("should handle simulation initialization failure", async () => {
            mockSession.run.mockRejectedValue(new Error("Database error"));
            const config = {
                name: "Failed Simulation",
                engines: ["NETWORK_PROPAGATION"],
                investigationId: "inv123",
                userId: "user456",
            };
            await expect(simulationService.runSimulation(config)).rejects.toThrow("Database error");
        });
        test("should emit simulation lifecycle events", async () => {
            const startedHandler = jest.fn();
            const completedHandler = jest.fn();
            simulationService.on("simulationStarted", startedHandler);
            simulationService.on("simulationCompleted", completedHandler);
            // Mock successful data loading
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: "1", label: "Node 1" } }) },
                ],
            })
                .mockResolvedValueOnce({ records: [] });
            const config = {
                name: "Event Test",
                engines: ["NETWORK_PROPAGATION"],
                investigationId: "inv123",
                userId: "user456",
            };
            const simulation = await simulationService.runSimulation(config);
            expect(startedHandler).toHaveBeenCalledWith(expect.objectContaining({
                status: "LOADING_DATA",
            }));
            expect(completedHandler).toHaveBeenCalledWith(expect.objectContaining({
                status: "COMPLETED",
            }));
        });
    });
    describe("Network Propagation Engine", () => {
        test("should simulate network propagation correctly", async () => {
            const simulation = {
                environment: {
                    nodes: [
                        { id: "1", simulationData: {} },
                        { id: "2", simulationData: {} },
                        { id: "3", simulationData: {} },
                    ],
                    edges: [
                        { source: "1", target: "2", weight: 0.8 },
                        { source: "2", target: "3", weight: 0.6 },
                    ],
                },
            };
            const params = {
                propagationRate: 0.5,
                decayFactor: 0.1,
                sourceNode: "1",
                maxIterations: 10,
                threshold: 0.01,
            };
            const results = await simulationService.executeNetworkPropagation(simulation, params);
            expect(results.type).toBe("NETWORK_PROPAGATION");
            expect(results.timeline).toBeDefined();
            expect(results.timeline.length).toBeGreaterThan(0);
            expect(results.finalState).toBeDefined();
            expect(results.finalState.propagationDistribution).toHaveLength(3);
            expect(results.converged).toBeDefined();
        });
        test("should handle convergence detection", async () => {
            const simulation = {
                environment: {
                    nodes: [{ id: "1", simulationData: {} }],
                    edges: [],
                },
            };
            const params = {
                propagationRate: 0.0, // No propagation, should converge quickly
                sourceNode: "1",
                threshold: 0.01,
            };
            const results = await simulationService.executeNetworkPropagation(simulation, params);
            expect(results.converged).toBe(true);
            expect(results.iterations).toBeLessThan(10);
        });
    });
    describe("Behavioral Prediction Engine", () => {
        test("should generate behavioral predictions", async () => {
            const simulation = {
                environment: {
                    nodes: [
                        { id: "1", label: "Person A" },
                        { id: "2", label: "Person B" },
                    ],
                },
            };
            const params = {
                timeHorizon: 30,
                confidenceThreshold: 0.7,
                patternWeight: 0.8,
            };
            const results = await simulationService.executeBehavioralPrediction(simulation, params);
            expect(results.type).toBe("BEHAVIORAL_PREDICTION");
            expect(results.predictions).toHaveLength(2);
            expect(results.predictions[0].predictions).toHaveLength(30);
            expect(results.summary.averageConfidence).toBeGreaterThan(0);
            expect(results.summary.predictedEvents).toBeDefined();
        });
        test("should include temporal factors in predictions", async () => {
            const simulation = {
                environment: {
                    nodes: [{ id: "1", label: "Test Entity" }],
                },
            };
            const params = {
                timeHorizon: 7,
                includeSeasonality: true,
            };
            const results = await simulationService.executeBehavioralPrediction(simulation, params);
            const prediction = results.predictions[0];
            const dayPrediction = prediction.predictions[0];
            expect(dayPrediction.factors).toBeDefined();
            expect(dayPrediction.factors.baseline).toBeDefined();
            expect(dayPrediction.factors.seasonal).toBeDefined();
            expect(dayPrediction.factors.random).toBeDefined();
        });
    });
    describe("Risk Assessment Engine", () => {
        test("should assess risk for entities", async () => {
            const simulation = {
                environment: {
                    nodes: [
                        { id: "1", label: "High Risk Entity" },
                        { id: "2", label: "Low Risk Entity" },
                    ],
                    edges: [{ source: "1", target: "2", weight: 0.9 }],
                },
            };
            const params = {
                riskThreshold: 0.6,
                cascadeEffects: true,
                impactRadius: 2,
            };
            // Mock risk analysis
            simulationService.analyzeRiskFactors = jest.fn().mockResolvedValue({
                connectivityRisk: 0.8,
                historicalIncidents: 0.3,
                vulnerabilityScore: 0.6,
                threatLevel: 0.7,
            });
            const results = await simulationService.executeRiskAssessment(simulation, params);
            expect(results.type).toBe("RISK_ASSESSMENT");
            expect(results.assessments).toHaveLength(2);
            expect(results.assessments[0].totalRisk).toBeGreaterThan(0);
            expect(results.assessments[0].riskLevel).toBeDefined();
            expect(results.summary.averageRisk).toBeGreaterThan(0);
        });
        test("should identify risk clusters", async () => {
            const simulation = {
                environment: {
                    nodes: [
                        { id: "1", label: "Entity 1" },
                        { id: "2", label: "Entity 2" },
                    ],
                    edges: [{ source: "1", target: "2", weight: 1.0 }],
                },
            };
            simulationService.analyzeRiskFactors = jest.fn().mockResolvedValue({
                connectivityRisk: 0.9,
            });
            const results = await simulationService.executeRiskAssessment(simulation, {
                riskThreshold: 0.5,
            });
            expect(results.riskClusters).toBeDefined();
            expect(results.propagationPaths).toBeDefined();
        });
    });
    describe("Monte Carlo Engine", () => {
        test("should run Monte Carlo simulation", async () => {
            const simulation = {
                environment: {
                    nodes: [{ id: "1" }],
                    edges: [],
                },
            };
            const params = {
                iterations: 100,
                variability: 0.3,
                confidenceInterval: 0.95,
                parallelExecution: false, // For predictable testing
            };
            const results = await simulationService.executeMonteCarlo(simulation, params);
            expect(results.type).toBe("MONTE_CARLO");
            expect(results.iterations).toBe(100);
            expect(results.results).toHaveLength(100);
            expect(results.analysis.mean).toBeDefined();
            expect(results.analysis.standardDeviation).toBeDefined();
            expect(results.analysis.confidenceInterval).toBeDefined();
        });
        test("should calculate statistical measures correctly", () => {
            const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
            const analysis = simulationService.analyzeMonteCarloResults(values.map((v, i) => ({ iteration: i, outcome: v })), 0.95);
            expect(analysis.mean).toBeCloseTo(0.55, 1);
            expect(analysis.standardDeviation).toBeGreaterThan(0);
            expect(analysis.distribution).toBeDefined();
            expect(analysis.riskMetrics.valueAtRisk).toBeDefined();
        });
        test("should handle parallel execution", async () => {
            const simulation = {
                environment: { nodes: [{ id: "1" }], edges: [] },
            };
            const results = await simulationService.executeMonteCarlo(simulation, {
                iterations: 50,
                parallelExecution: true,
            });
            expect(results.iterations).toBe(50);
            expect(results.results).toHaveLength(50);
        });
    });
    describe("Event Cascade Engine", () => {
        test("should simulate event cascades", async () => {
            const simulation = {
                environment: {
                    nodes: [
                        { id: "1", label: "Trigger" },
                        { id: "2", label: "Target 1" },
                        { id: "3", label: "Target 2" },
                    ],
                    edges: [
                        { source: "1", target: "2", weight: 0.8 },
                        { source: "2", target: "3", weight: 0.6 },
                    ],
                },
            };
            // Mock trigger events and connected nodes
            simulationService.identifyTriggerEvents = jest
                .fn()
                .mockReturnValue([{ nodeId: "1", label: "Trigger" }]);
            simulationService.getConnectedNodes = jest
                .fn()
                .mockReturnValueOnce([
                { id: "2", label: "Target 1", edge: { weight: 0.8 } },
            ])
                .mockReturnValueOnce([
                { id: "3", label: "Target 2", edge: { weight: 0.6 } },
            ]);
            const params = {
                triggerProbability: 0.8,
                cascadeDepth: 3,
                timeDelay: 24,
            };
            const results = await simulationService.executeEventCascade(simulation, params);
            expect(results.type).toBe("EVENT_CASCADE");
            expect(results.cascades).toBeDefined();
            expect(results.summary.totalCascades).toBeGreaterThan(0);
            expect(results.summary.maxCascadeDepth).toBeGreaterThanOrEqual(0);
        });
        test("should respect cascade depth limits", async () => {
            const simulation = {
                environment: {
                    nodes: Array(10)
                        .fill(null)
                        .map((_, i) => ({ id: String(i) })),
                    edges: Array(9)
                        .fill(null)
                        .map((_, i) => ({
                        source: String(i),
                        target: String(i + 1),
                        weight: 1.0,
                    })),
                },
            };
            simulationService.identifyTriggerEvents = jest
                .fn()
                .mockReturnValue([{ nodeId: "0", label: "Start" }]);
            const maxDepth = 3;
            const results = await simulationService.executeEventCascade(simulation, {
                cascadeDepth: maxDepth,
                triggerProbability: 1.0, // Ensure cascading happens
            });
            const maxDepthReached = Math.max(...results.cascades.flatMap((c) => c.events.map((e) => e.depth)));
            expect(maxDepthReached).toBeLessThanOrEqual(maxDepth);
        });
    });
    describe("Resource Allocation Engine", () => {
        test("should optimize resource allocation", async () => {
            const simulation = {
                environment: {
                    nodes: [
                        { id: "1", label: "High Priority" },
                        { id: "2", label: "Medium Priority" },
                        { id: "3", label: "Low Priority" },
                    ],
                },
            };
            // Mock helper methods
            simulationService.initializeResourcePool = jest.fn().mockReturnValue({
                personnel: { available: 10, allocated: 0 },
                equipment: { available: 5, allocated: 0 },
            });
            simulationService.calculateNodePriority = jest
                .fn()
                .mockReturnValueOnce(0.9)
                .mockReturnValueOnce(0.6)
                .mockReturnValueOnce(0.3);
            const params = {
                resourceTypes: ["personnel", "equipment"],
                optimizationGoal: "maximize_coverage",
                timeframe: 7,
            };
            const results = await simulationService.executeResourceAllocation(simulation, params);
            expect(results.type).toBe("RESOURCE_ALLOCATION");
            expect(results.initialPlan).toBeDefined();
            expect(results.executionTimeline).toHaveLength(7);
            expect(results.summary.coverageAchieved).toBeGreaterThanOrEqual(0);
            expect(results.summary.efficiencyScore).toBeGreaterThanOrEqual(0);
        });
        test("should track resource utilization over time", async () => {
            const simulation = {
                environment: {
                    nodes: [{ id: "1", label: "Target" }],
                },
            };
            simulationService.initializeResourcePool = jest.fn().mockReturnValue({
                personnel: { available: 5 },
            });
            const results = await simulationService.executeResourceAllocation(simulation, {
                timeframe: 3,
            });
            expect(results.executionTimeline).toHaveLength(3);
            results.executionTimeline.forEach((day) => {
                expect(day.day).toBeGreaterThan(0);
                expect(day.date).toBeInstanceOf(Date);
                expect(day.utilization).toBeDefined();
                expect(day.coverage).toBeDefined();
            });
        });
    });
    describe("Simulation Management", () => {
        test("should track active simulations", () => {
            const activeSimulations = simulationService.getActiveSimulations();
            expect(Array.isArray(activeSimulations)).toBe(true);
        });
        test("should get simulation status", async () => {
            // Mock data loading
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: "1", label: "Node 1" } }) },
                ],
            })
                .mockResolvedValueOnce({ records: [] });
            const simulationPromise = simulationService.runSimulation({
                name: "Status Test",
                engines: ["NETWORK_PROPAGATION"],
                investigationId: "inv123",
                userId: "user456",
            });
            // Get status while running
            setTimeout(() => {
                const activeSimulations = simulationService.getActiveSimulations();
                if (activeSimulations.length > 0) {
                    const status = simulationService.getSimulationStatus(activeSimulations[0].id);
                    expect(status).toBeDefined();
                    expect(status.status).toBeDefined();
                }
            }, 100);
            await simulationPromise;
        });
        test("should cancel running simulation", async () => {
            // Start a simulation
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: "1", label: "Node 1" } }) },
                ],
            })
                .mockResolvedValueOnce({ records: [] });
            const simulationPromise = simulationService.runSimulation({
                name: "Cancel Test",
                engines: ["MONTE_CARLO"], // Longer running
                parameters: { iterations: 1000 },
                investigationId: "inv123",
                userId: "user456",
            });
            // Cancel after short delay
            setTimeout(async () => {
                const activeSimulations = simulationService.getActiveSimulations();
                if (activeSimulations.length > 0) {
                    const cancelled = await simulationService.cancelSimulation(activeSimulations[0].id);
                    expect(cancelled).toBe(true);
                }
            }, 100);
            await simulationPromise;
        });
    });
    describe("Performance Metrics", () => {
        test("should track simulation metrics", () => {
            const metrics = simulationService.getMetrics();
            expect(metrics.totalSimulations).toBeGreaterThanOrEqual(0);
            expect(metrics.completedSimulations).toBeGreaterThanOrEqual(0);
            expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
            expect(metrics.activeSimulations).toBeDefined();
        });
        test("should calculate success rate", () => {
            const metrics = simulationService.getMetrics();
            if (metrics.totalSimulations > 0) {
                const expectedRate = ((metrics.completedSimulations / metrics.totalSimulations) *
                    100).toFixed(2);
                expect(metrics.successRate).toBe(expectedRate);
            }
        });
    });
    describe("Error Handling", () => {
        test("should handle engine execution failures gracefully", async () => {
            // Mock data loading
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: "1", label: "Node 1" } }) },
                ],
            })
                .mockResolvedValueOnce({ records: [] });
            // Force engine failure
            simulationService.engines.set("FAILING_ENGINE", {
                name: "Failing Engine",
                execute: jest.fn().mockRejectedValue(new Error("Engine failed")),
            });
            const config = {
                name: "Error Test",
                engines: ["FAILING_ENGINE"],
                investigationId: "inv123",
                userId: "user456",
            };
            await expect(simulationService.runSimulation(config)).rejects.toThrow();
        });
        test("should validate parameter ranges", () => {
            const engineParams = {
                rate: { type: "number", min: 0, max: 1 },
            };
            expect(() => {
                simulationService.validateEngineParameters({ rate: -0.5 }, engineParams);
            }).toThrow("Parameter rate must be >= 0");
            expect(() => {
                simulationService.validateEngineParameters({ rate: 1.5 }, engineParams);
            }).toThrow("Parameter rate must be <= 1");
        });
    });
    describe("Utility Functions", () => {
        test("should calculate statistical measures correctly", () => {
            const distribution = simulationService.calculateDistribution([
                0.1, 0.2, 0.3, 0.4, 0.5,
            ]);
            expect(distribution).toBeDefined();
            expect(distribution.length).toBe(10); // Default bins
            expect(distribution.every((bin) => bin.probability >= 0)).toBe(true);
        });
        test("should calculate Value at Risk correctly", () => {
            const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
            const var95 = simulationService.calculateVaR(values, 0.05);
            expect(var95).toBe(0.1); // 5th percentile
        });
        test("should calculate Conditional Value at Risk correctly", () => {
            const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
            const cvar = simulationService.calculateCVaR(values, 0.05);
            expect(cvar).toBe(0.1); // Average of values <= VaR
        });
        test("should create proper delay promises", async () => {
            const start = Date.now();
            await simulationService.delay(100);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(95); // Allow some variance
            expect(elapsed).toBeLessThan(200);
        });
    });
    describe("Scenario Templates", () => {
        test("should provide threat propagation scenario", () => {
            const scenarios = simulationService.getScenarioLibrary();
            const threatScenario = scenarios.find((s) => s.type === "THREAT_PROPAGATION");
            expect(threatScenario).toBeDefined();
            expect(threatScenario.engines).toContain("NETWORK_PROPAGATION");
            expect(threatScenario.engines).toContain("RISK_ASSESSMENT");
            expect(threatScenario.outputMetrics).toContain("infected_nodes");
        });
        test("should provide operational planning scenario", () => {
            const scenarios = simulationService.getScenarioLibrary();
            const operationalScenario = scenarios.find((s) => s.type === "OPERATIONAL_PLANNING");
            expect(operationalScenario).toBeDefined();
            expect(operationalScenario.engines).toContain("RESOURCE_ALLOCATION");
            expect(operationalScenario.engines).toContain("MONTE_CARLO");
            expect(operationalScenario.outputMetrics).toContain("coverage_percentage");
        });
        test("should provide crisis response scenario", () => {
            const scenarios = simulationService.getScenarioLibrary();
            const crisisScenario = scenarios.find((s) => s.type === "CRISIS_RESPONSE");
            expect(crisisScenario).toBeDefined();
            expect(crisisScenario.engines).toContain("EVENT_CASCADE");
            expect(crisisScenario.engines).toContain("RISK_ASSESSMENT");
            expect(crisisScenario.engines).toContain("RESOURCE_ALLOCATION");
        });
    });
});
// Performance tests for simulation engine
describe("Simulation Engine Performance - P0 Critical", () => {
    let simulationService;
    let mockNeo4jDriver;
    let mockSession;
    beforeEach(() => {
        mockSession = {
            run: jest.fn(),
            close: jest.fn(),
        };
        mockNeo4jDriver = {
            session: jest.fn(() => mockSession),
        };
        simulationService = new SimulationEngineService(mockNeo4jDriver, null, {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        });
    });
    test("should complete network propagation simulation within reasonable time", async () => {
        const largeNetwork = {
            environment: {
                nodes: Array(100)
                    .fill(null)
                    .map((_, i) => ({
                    id: String(i),
                    simulationData: {},
                })),
                edges: Array(200)
                    .fill(null)
                    .map((_, i) => ({
                    source: String(Math.floor(i / 2)),
                    target: String(Math.floor(i / 2) + 1),
                    weight: Math.random(),
                })),
            },
        };
        const start = Date.now();
        const results = await simulationService.executeNetworkPropagation(largeNetwork, {
            propagationRate: 0.3,
            maxIterations: 50,
            sourceNode: "0",
        });
        const executionTime = Date.now() - start;
        expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(results.finalState.propagationDistribution).toHaveLength(100);
    });
    test("should handle Monte Carlo simulation with many iterations efficiently", async () => {
        const simulation = {
            environment: {
                nodes: [{ id: "1" }],
                edges: [],
            },
        };
        const start = Date.now();
        const results = await simulationService.executeMonteCarlo(simulation, {
            iterations: 1000,
            parallelExecution: true,
        });
        const executionTime = Date.now() - start;
        expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
        expect(results.iterations).toBe(1000);
    });
});
// Integration tests for simulation engine
if (process.env.TEST_MODE === "integration") {
    describe("Simulation Engine Integration Tests", () => {
        test("should integrate with real Neo4j database", async () => {
            // Test with actual database connection
        });
        test("should handle real-world graph sizes", async () => {
            // Test with large, realistic datasets
        });
        test("should integrate with copilot orchestration", async () => {
            // Test simulation triggering from natural language queries
        });
    });
}
//# sourceMappingURL=simulationEngine.test.js.map