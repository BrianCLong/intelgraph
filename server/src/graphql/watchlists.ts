import { Watchlist, Rule, Alert } from '../../packages/shared/rules-schema.js';

export const typeDefs = `#graphql
  type Watchlist { id: ID!, name: String!, items: [String!]!, owners: [String!]! }
  type Rule { id: ID!, watchlistId: ID!, name: String!, enabled: Boolean!, threshold: Int! }
  type Alert { id: ID!, ruleId: ID!, entityId: ID, score: Int!, status: String!, reason: [String!]!, createdAt: String! }

  type Query {
    watchlists: [Watchlist!]!
    alerts: [Alert!]!
  }

  input WatchlistInput { name: String!, items: [String!]!, owners: [String!]! }
  input RuleInput { watchlistId: ID!, name: String!, enabled: Boolean!, threshold: Int! }

  type Mutation {
    createWatchlist(input: WatchlistInput!): Watchlist!
    upsertRule(input: RuleInput!): Rule!
    ackAlert(id: ID!): Alert
    closeAlert(id: ID!): Alert
  }
`;

const watchlists: Watchlist[] = [];
const rules: Rule[] = [];
const alerts: Alert[] = [];

export const resolvers = {
  Query: {
    watchlists: () => watchlists,
    alerts: () => alerts,
  },
  Mutation: {
    createWatchlist: (_: unknown, { input }: { input: any }): Watchlist => {
      const watchlist: Watchlist = {
        id: `w${watchlists.length + 1}`,
        name: input.name,
        scope: { tenantId: 'demo' },
        items: input.items.map((value: string) => ({ value })),
        owners: input.owners,
        severityWeights: {},
        createdAt: new Date(),
      };
      watchlists.push(watchlist);
      return watchlist;
    },
    upsertRule: (_: unknown, { input }: { input: any }): Rule => {
      const existing = rules.find((r) => r.id === input.id);
      if (existing) {
        Object.assign(existing, input);
        return existing;
      }
      const rule: Rule = {
        id: `r${rules.length + 1}`,
        watchlistId: input.watchlistId,
        name: input.name,
        enabled: input.enabled,
        trigger: 'INGEST',
        selector: {},
        window: 60 * 1000,
        threshold: input.threshold,
      };
      rules.push(rule);
      return rule;
    },
    ackAlert: (_: unknown, { id }: { id: string }) => {
      const alert = alerts.find((a) => a.id === id);
      if (alert) {
        alert.status = 'ACK';
      }
      return alert;
    },
    closeAlert: (_: unknown, { id }: { id: string }) => {
      const alert = alerts.find((a) => a.id === id);
      if (alert) {
        alert.status = 'CLOSED';
      }
      return alert;
    },
  },
};
