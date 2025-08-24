const SimulationEngineService = require("../services/SimulationEngineService");
describe("Simulation validation framework", () => {
    let service;
    beforeEach(() => {
        const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
        service = new SimulationEngineService(null, null, mockLogger);
    });
    test("validateSimulationRealism flags invalid metrics", () => {
        const result = service.validateSimulationRealism({
            aggregatedMetrics: { a: 2 },
        });
        expect(result.realistic).toBe(false);
        expect(result.issues).toContain("out_of_bounds_a");
    });
    test("validateSimulationUtility detects missing data", () => {
        const result = service.validateSimulationUtility({
            insights: [],
            visualizations: [],
        });
        expect(result.useful).toBe(false);
        expect(result.issues).toContain("missing_insights");
        expect(result.issues).toContain("missing_visualizations");
    });
    test("validation passes for good results", () => {
        const result = service.validateSimulationRealism({
            aggregatedMetrics: { a: 0.4 },
        });
        expect(result.realistic).toBe(true);
        const util = service.validateSimulationUtility({
            insights: ["x"],
            visualizations: ["y"],
        });
        expect(util.useful).toBe(true);
    });
});
//# sourceMappingURL=simulationValidation.test.js.map