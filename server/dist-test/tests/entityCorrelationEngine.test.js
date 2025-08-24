const EntityCorrelationEngine = require("../services/EntityCorrelationEngine");
describe("EntityCorrelationEngine", () => {
    test("fuses similar entities with conflict resolution", () => {
        const engine = new EntityCorrelationEngine([
            (base, incoming) => {
                // prefer age from higher confidence source
                if (base.attributes?.age && incoming.attributes?.age) {
                    if ((incoming.confidence || 0) > (base.confidence || 0)) {
                        return {
                            ...base,
                            attributes: { ...base.attributes, age: incoming.attributes.age },
                        };
                    }
                }
            },
        ]);
        const entities = [
            {
                label: "Alice",
                type: "PERSON",
                source: "osint",
                confidence: 0.8,
                attributes: { age: 30 },
            },
            {
                label: "Alice",
                type: "PERSON",
                source: "signals",
                confidence: 0.9,
                attributes: { age: 31 },
            },
        ];
        const fused = engine.fuseEntities(entities);
        expect(fused).toHaveLength(1);
        const result = fused[0];
        expect(result.label).toBe("Alice");
        expect(result.sources).toContain("osint");
        expect(result.sources).toContain("signals");
        expect(result.attributes.age).toBe(31);
        expect(result.confidence).toBeGreaterThan(0.8);
    });
    test("separates distinct entities", () => {
        const engine = new EntityCorrelationEngine();
        const entities = [
            { label: "Alice", type: "PERSON", source: "osint" },
            { label: "Bob", type: "PERSON", source: "signals" },
        ];
        const groups = engine.groupSimilarEntities(entities);
        expect(groups).toHaveLength(2);
    });
});
//# sourceMappingURL=entityCorrelationEngine.test.js.map