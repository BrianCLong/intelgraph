import type { ApolloServerPlugin } from '@apollo/server';
import { getComplexity, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';
import { parse, GraphQLSchema, visit, type ASTNode } from 'graphql';

function calculateDepth(doc: any): number {
  let depth = 0;
  let maxDepth = 0;
  visit(doc, {
    enter(node: ASTNode) {
      if ((node as any).selectionSet) {
        depth++;
        if (depth > maxDepth) maxDepth = depth;
      }
    },
    leave(node: ASTNode) {
      if ((node as any).selectionSet) depth--;
    },
  });
  return maxDepth;
}

export const makeDepthCostPlugin = ({
  maxDepth,
  maxCost,
}: {
  maxDepth: number;
  maxCost: number;
}): ApolloServerPlugin => ({
  async requestDidStart({ schema, request }) {
    const doc = parse(request.query!);
    const cost = getComplexity({
      schema: schema as GraphQLSchema,
      query: doc,
      estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
      variables: request.variables,
    });
    const depth = calculateDepth(doc);
    if (depth > maxDepth || cost > maxCost) {
      throw Object.assign(new Error(`Query exceeds limits (depth=${depth}, cost=${cost})`), {
        code: 'QUERY_OVER_BUDGET',
      });
    }
    return {};
  },
});
