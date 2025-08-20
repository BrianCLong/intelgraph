const gql = require('graphql-tag');

const watchlistTypeDefs = gql`
  type WatchlistRule {
    id: ID!
    spec: JSON
  }

  type Watchlist {
    id: ID!
    name: String!
    rules: [WatchlistRule!]!
  }

  input CreateWatchlistInput {
    name: String!
  }

  input AddWatchlistRuleInput {
    watchlistId: ID!
    spec: JSON
  }

  extend type Query {
    watchlists: [Watchlist!]!
  }

  extend type Mutation {
    createWatchlist(input: CreateWatchlistInput!): Watchlist!
    addWatchlistRule(input: AddWatchlistRuleInput!): WatchlistRule
  }
`;

module.exports = { watchlistTypeDefs };
