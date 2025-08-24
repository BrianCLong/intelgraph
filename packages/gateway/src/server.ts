import express from 'express'
import { json } from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { gql } from 'graphql-tag'
import {
  createOntology,
  activateOntology,
  listOntologies
} from '@intelgraph/ontology'

const typeDefs = gql`
  type Ontology {
    id: ID!
    name: String!
    version: String!
    status: String!
    changeNotes: String
    createdAt: String!
    activatedAt: String
  }
  type Query {
    ontologies(status: String): [Ontology!]!
  }
  type Mutation {
    createOntology(name: String!, sdl: String!, shacl: String, jsonSchemas: String, changeNotes: String): Ontology!
    activateOntology(id: ID!): Ontology
  }
`

const resolvers = {
  Query: {
    ontologies: (_: any, args: { status?: string }) => listOntologies(args.status as any)
  },
  Mutation: {
    createOntology: (_: any, args: any) =>
      createOntology({ name: args.name, sdl: args.sdl, shacl: args.shacl || '', jsonSchemas: JSON.parse(args.jsonSchemas || '{}'), changeNotes: args.changeNotes }),
    activateOntology: (_: any, args: { id: string }) => activateOntology(args.id)
  }
}

export async function createServer() {
  const app = express()
  const server = new ApolloServer({ typeDefs, resolvers })
  await server.start()
  app.use('/graphql', json(), expressMiddleware(server))
  return app
}
