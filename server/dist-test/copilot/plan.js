const { v4: uuid } = require('uuid');
/**
 * Generate a deterministic plan from a goal text.
 * Later: swap `generatePlanForGoal()` with LLM while keeping same output schema.
 */
function generatePlanForGoal(goalId, goalText) {
    const createdAt = new Date().toISOString();
    const steps = [];
    // Example rules: look for keywords to create tasks
    steps.push({
        id: uuid(),
        kind: "NEO4J_QUERY",
        input: JSON.stringify({ cypher: "MATCH (p:Person)-[r:COMMUNICATED]->(p2:Person) RETURN p,p2,r LIMIT 100" }),
        status: "PENDING"
    });
    if (/\bcommunity|cluster|coordinator\b/i.test(goalText)) {
        steps.push({
            id: uuid(),
            kind: "GRAPH_ANALYTICS",
            input: JSON.stringify({ algo: "pagerank", limit: 50 }),
            status: "PENDING"
        });
    }
    steps.push({
        id: uuid(),
        kind: "SUMMARIZE",
        input: JSON.stringify({ fields: ["top_entities", "key_links"], audience: "analyst" }),
        status: "PENDING"
    });
    return {
        id: uuid(),
        goalId,
        steps,
        createdAt
    };
}
module.exports = { generatePlanForGoal };
//# sourceMappingURL=plan.js.map