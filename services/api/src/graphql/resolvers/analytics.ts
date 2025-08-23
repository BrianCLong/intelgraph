/**
 * Analytics GraphQL Resolvers
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { GraphQLContext } from '../context.js';

export const analyticsResolvers = {
  Query: {
    temporalAnalysis: async (
      _: unknown,
      { entityIds, timeWindow }: { entityIds: string[]; timeWindow: string },
      context: GraphQLContext
    ) => {
      try {
        const query = `
          SELECT time_bucket($2::interval, ts) AS bucket, AVG(value) AS avg_value
          FROM temporal_metrics
          WHERE entity_id = ANY($1)
          GROUP BY bucket
          ORDER BY bucket;
        `;
        const result = await context.dataSources.timescale.query(query, [
          entityIds,
          timeWindow
        ]);
        return result.rows;
      } catch (error) {
        context.logger.error({
          message: 'Temporal analysis query failed',
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  }
};

