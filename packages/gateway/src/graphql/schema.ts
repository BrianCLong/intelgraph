import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type SearchResult {
    id: ID!
    type: String!
    title: String
    snippet: String
    score: Float!
    bm25: Float!
    vectorScore: Float!
    graphBoost: Float!
    explanation: [String!]!
  }

  type AskCitation {
    id: ID!
    spans: [String!]!
  }

  type AskDraft {
    question: String!
    answerDraft: [String!]!
    citations: [AskCitation!]!
  }

  type Query {
    search(query: String!, k: Int): [SearchResult!]!
    askPreview(question: String!): AskDraft!
  }
`;
