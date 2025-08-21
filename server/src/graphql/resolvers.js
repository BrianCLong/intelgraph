// src/graphql/resolvers.js
const copilotResolvers = require('./resolvers.copilot');
const graphOpsResolvers = require('./resolvers.graphops');
const aiResolvers = require('./resolvers.ai');
const annotationsResolvers = require('./resolvers.annotations'); // My new resolvers
const ingestResolvers = require('./resolvers.ingest');

// Merge all resolvers
const resolvers = {
  Query: {
    ...(copilotResolvers.Query || {}),
    ...(graphOpsResolvers.Query || {}),
    ...(aiResolvers.Query || {}),
    ...(annotationsResolvers.Query || {}), // Add annotations queries if any
    ...(ingestResolvers.Query || {}),
  },
  Mutation: {
    ...(copilotResolvers.Mutation || {}),
    ...(graphOpsResolvers.Mutation || {}),
    ...(aiResolvers.Mutation || {}),
    ...(annotationsResolvers.Mutation || {}), // Add annotations mutations
    ...(ingestResolvers.Mutation || {}),
  },
  Subscription: {
    ...(copilotResolvers.Subscription || {}),
    ...(graphOpsResolvers.Subscription || {}),
    ...(aiResolvers.Subscription || {}),
    ...(annotationsResolvers.Subscription || {}), // Add annotations subscriptions if any
    ...(ingestResolvers.Subscription || {}),
  },
  // Custom types (like Entity, Edge, etc.)
  Entity: {
    ...(annotationsResolvers.Entity || {}), // Add Entity resolvers from annotations
  },
  Edge: {
    // Add Edge resolvers
    ...(annotationsResolvers.Edge || {}),
  },
  // Add other custom type resolvers as needed from other files
  // For example, if aiResolvers has a custom type resolver for 'AIResult':
  // AIResult: { ...aiResolvers.AIResult },
};

module.exports = resolvers;
