// Production Core Resolvers (replaces demo resolvers)
import { coreResolvers } from './core.js';

// Legacy resolvers (kept for backward compatibility during migration)
import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  // Core scalars from production resolvers
  DateTime: coreResolvers.DateTime,
  JSON: coreResolvers.JSON,

  Query: {
    // Production core resolvers (PostgreSQL + Neo4j)
    ...coreResolvers.Query,
    
    // Legacy resolvers (will be phased out)
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
    
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
    ...coreResolvers.Mutation,
    
    // Legacy resolvers (will be phased out)
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,
    
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
    updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
    deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
  },

  // Field resolvers from production core
  Entity: coreResolvers.Entity,
  Relationship: coreResolvers.Relationship,
  Investigation: coreResolvers.Investigation,
};

export default resolvers;

