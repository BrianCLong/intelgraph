export interface FederationPlan {
  enclaves: string[];
  subqueries: Record<string, string>;
}

/**
 * planFederatedQuery creates a simple plan that maps each enclave
 * to the provided query. This is a placeholder for the future planner
 * that will push down policies and compile subqueries per enclave.
 */
export function planFederatedQuery(query: string, enclaves: string[]): FederationPlan {
  return {
    enclaves,
    subqueries: enclaves.reduce<Record<string, string>>((acc, id) => {
      acc[id] = query;
      return acc;
    }, {}),
  };
}
