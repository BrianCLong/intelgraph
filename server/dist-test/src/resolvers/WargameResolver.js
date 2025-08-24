"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WargameResolver = void 0;
const neo4j_1 = require("../db/neo4j");
const uuid_1 = require("uuid");
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8001';
const PYTHON_API_KEY = process.env.PYTHON_API_KEY || 'default-api-key';
class WargameResolver {
    constructor() {
        this.driver = (0, neo4j_1.getNeo4jDriver)();
    }
    async getCrisisTelemetry(_parent, { scenarioId, limit, offset }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        // Ethics Compliance: Data is simulated and anonymized for training purposes.
        console.log('Fetching telemetry for scenario:', scenarioId, 'from Neo4j');
        const session = this.driver.session();
        try {
            const query = 'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_TELEMETRY]->(t:SocialMediaPost) RETURN t SKIP $offset LIMIT $limit';
            const result = await session.run(query, { scenarioId, offset: offset || 0, limit: limit || 1000 });
            return result.records.map(record => record.get('t').properties);
        }
        finally {
            await session.close();
        }
    }
    async getAdversaryIntentEstimates(_parent, { scenarioId }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        // Ethics Compliance: Estimates are hypothetical and for simulation only.
        console.log('Fetching adversary intent estimates for scenario:', scenarioId, 'from Neo4j');
        const session = this.driver.session();
        try {
            const query = 'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_INTENT_ESTIMATE]->(i:AdversaryIntent) RETURN i';
            const result = await session.run(query, { scenarioId });
            return result.records.map(record => record.get('i').properties);
        }
        finally {
            await session.close();
        }
    }
    async getNarrativeHeatmapData(_parent, { scenarioId }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        // Ethics Compliance: Visualizations are based on simulated data.
        console.log('Fetching narrative heatmap data for scenario:', scenarioId, 'from Neo4j');
        const session = this.driver.session();
        try {
            const query = 'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap) RETURN h';
            const result = await session.run(query, { scenarioId });
            return result.records.map(record => record.get('h').properties);
        }
        finally {
            await session.close();
        }
    }
    async getStrategicResponsePlaybooks(_parent, { scenarioId }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        // Ethics Compliance: Playbooks are theoretical and for training/simulation.
        console.log('Fetching strategic response playbooks for scenario:', scenarioId, 'from Neo4j');
        const session = this.driver.session();
        try {
            const query = 'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_PLAYBOOK]->(p:StrategicPlaybook) RETURN p';
            const result = await session.run(query, { scenarioId });
            return result.records.map(record => record.get('p').properties);
        }
        finally {
            await session.close();
        }
    }
    async getCrisisScenario(_parent, { id }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        console.log('Fetching crisis scenario:', id, 'from Neo4j');
        const session = this.driver.session();
        try {
            const query = 'MATCH (s:CrisisScenario {id: $id}) RETURN s';
            const result = await session.run(query, { id });
            if (result.records.length > 0) {
                return result.records[0].get('s').properties;
            }
            return undefined;
        }
        finally {
            await session.close();
        }
    }
    async getAllCrisisScenarios(_parent, _args, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        console.log('Fetching all crisis scenarios from Neo4j');
        const session = this.driver.session();
        try {
            const query = 'MATCH (s:CrisisScenario) RETURN s ORDER BY s.createdAt DESC';
            const result = await session.run(query);
            return result.records.map(record => record.get('s').properties);
        }
        finally {
            await session.close();
        }
    }
    async runWarGameSimulation(_parent, { input }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        // Ethics Compliance: This simulation is hypothetical and for training purposes.
        console.log('Running war-game simulation with input:', input);
        const session = this.driver.session();
        try {
            const scenarioId = (0, uuid_1.v4)();
            const createdAt = new Date().toISOString();
            const updatedAt = createdAt;
            const createScenarioResult = await session.run(`CREATE (s:CrisisScenario {
          id: $scenarioId,
          crisisType: $crisisType,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          simulationParameters: $simulationParameters
        }) RETURN s`, {
                scenarioId,
                crisisType: input.crisisType,
                createdAt,
                updatedAt,
                simulationParameters: input.simulationParameters,
            });
            const newScenario = createScenarioResult.records[0].get('s').properties;
            return newScenario;
        }
        finally {
            await session.close();
        }
    }
    async deleteCrisisScenario(_parent, { id }, _context) {
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        console.log('Deleting crisis scenario:', id, 'from Neo4j');
        const session = this.driver.session();
        try {
            const result = await session.run('MATCH (s:CrisisScenario {id: $id}) DETACH DELETE s', { id });
            return result.summary.counters.nodesDeleted > 0;
        }
        finally {
            await session.close();
        }
    }
}
exports.WargameResolver = WargameResolver;
//# sourceMappingURL=WargameResolver.js.map