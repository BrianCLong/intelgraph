/**
 * IntelGraph GraphQL Resolvers
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { entityResolvers } from './entity.js';
import { relationshipResolvers } from './relationship.js';
import { investigationResolvers } from './investigation.js';
import { analyticsResolvers } from './analytics.js';
import { copilotResolvers } from './copilot.js';
import { userResolvers } from './user.js';

export const resolvers = {
  // Scalar types
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  // Core queries
  Query: {
    ...entityResolvers.Query,
    ...relationshipResolvers.Query,
    ...investigationResolvers.Query,
    ...analyticsResolvers.Query,
    ...copilotResolvers.Query,
    ...userResolvers.Query,
    
    // Global search across all types
    globalSearch: async (_, { query, types }, context) => {
      const results = {
        entities: [],
        relationships: [],
        investigations: [],
        documents: []
      };

      try {
        // Parallel search across different types
        const searchPromises = [];

        if (!types || types.includes('entities')) {
          searchPromises.push(
            entityResolvers.Query.searchEntities(_, { query }, context)
              .then(entities => { results.entities = entities; })
          );
        }

        if (!types || types.includes('investigations')) {
          searchPromises.push(
            investigationResolvers.Query.investigations(_, { query }, context)
              .then(investigations => { results.investigations = investigations; })
          );
        }

        await Promise.all(searchPromises);

        context.logger.info({
          message: 'Global search completed',
          query,
          types,
          resultsCount: {
            entities: results.entities.length,
            relationships: results.relationships.length,
            investigations: results.investigations.length,
            documents: results.documents.length
          }
        });

        return results;

      } catch (error) {
        context.logger.error({
          message: 'Global search failed',
          error: error instanceof Error ? error.message : String(error),
          query,
          types
        });
        throw error;
      }
    }
  },

  // Core mutations
  Mutation: {
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...userResolvers.Mutation
  },

  // Subscriptions for real-time updates
  Subscription: {
    entityUpdated: {
      subscribe: async function* (_, { investigationId }, context) {
        const { redis } = context.dataSources;
        const channel = investigationId 
          ? `entity:updated:${investigationId}` 
          : 'entity:updated';
        
        // Subscribe to Redis channel for entity updates
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { entityUpdated: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    },

    relationshipUpdated: {
      subscribe: async function* (_, { investigationId }, context) {
        const { redis } = context.dataSources;
        const channel = investigationId 
          ? `relationship:updated:${investigationId}` 
          : 'relationship:updated';
        
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { relationshipUpdated: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    },

    investigationUpdated: {
      subscribe: async function* (_, { id }, context) {
        const { redis } = context.dataSources;
        const channel = `investigation:updated:${id}`;
        
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { investigationUpdated: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    },

    analysisCompleted: {
      subscribe: async function* (_, { jobId }, context) {
        const { redis } = context.dataSources;
        const channel = `analysis:completed:${jobId}`;
        
        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);
        
        try {
          for await (const message of subscriber.scanStream()) {
            yield { analysisCompleted: JSON.parse(message.message) };
          }
        } finally {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      }
    }
  },

  // Type resolvers for nested fields
  Entity: {
    ...entityResolvers.Entity
  },

  Relationship: {
    ...relationshipResolvers.Relationship
  },

  Investigation: {
    ...investigationResolvers.Investigation
  },

  User: {
    ...userResolvers.User
  }
};