"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Production Core Resolvers (replaces demo resolvers)
const core_js_1 = require("./core.js");
// Legacy resolvers (kept for backward compatibility during migration)
const entity_1 = __importDefault(require("./entity"));
const relationship_1 = __importDefault(require("./relationship"));
const user_1 = __importDefault(require("./user"));
const investigation_1 = __importDefault(require("./investigation"));
const WargameResolver_js_1 = require("../../resolvers/WargameResolver.js"); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
// Instantiate the WargameResolver
const wargameResolver = new WargameResolver_js_1.WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
const resolvers = {
    // Core scalars from production resolvers
    DateTime: core_js_1.coreResolvers.DateTime,
    JSON: core_js_1.coreResolvers.JSON,
    Query: {
        // Production core resolvers (PostgreSQL + Neo4j)
        ...core_js_1.coreResolvers.Query,
        // Legacy resolvers (will be phased out)
        ...entity_1.default.Query,
        ...user_1.default.Query,
        ...investigation_1.default.Query,
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        getCrisisTelemetry: wargameResolver.getCrisisTelemetry.bind(wargameResolver),
        getAdversaryIntentEstimates: wargameResolver.getAdversaryIntentEstimates.bind(wargameResolver),
        getNarrativeHeatmapData: wargameResolver.getNarrativeHeatmapData.bind(wargameResolver),
        getStrategicResponsePlaybooks: wargameResolver.getStrategicResponsePlaybooks.bind(wargameResolver),
        getCrisisScenario: wargameResolver.getCrisisScenario.bind(wargameResolver),
        getAllCrisisScenarios: wargameResolver.getAllCrisisScenarios.bind(wargameResolver),
    },
    Mutation: {
        // Production core resolvers
        ...core_js_1.coreResolvers.Mutation,
        // Legacy resolvers (will be phased out)
        ...entity_1.default.Mutation,
        ...relationship_1.default.Mutation,
        ...user_1.default.Mutation,
        ...investigation_1.default.Mutation,
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
        updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
        deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
    },
    // Field resolvers from production core
    Entity: core_js_1.coreResolvers.Entity,
    Relationship: core_js_1.coreResolvers.Relationship,
    Investigation: core_js_1.coreResolvers.Investigation,
};
exports.default = resolvers;
//# sourceMappingURL=index.js.map