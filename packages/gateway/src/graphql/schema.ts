import { gql } from 'apollo-server-express'
import axios from 'axios'

export const typeDefs = gql`
  type Ontology {
    id: ID!
    name: String!
    version: String!
  }

  type Class {
    ontologyId: ID!
    key: String!
    label: String!
    extends: String
  }

  type Query {
    ontologies: [Ontology!]!
    classes(ontologyId: ID!): [Class!]!
  }

  input CreateOntologyInput {
    name: String!
  }

  type Mutation {
    createOntology(input: CreateOntologyInput!): Ontology!
    upsertClass(ontologyId: ID!, key: String!, label: String!): Class!
  }
`

export const resolvers = {
  Query: {
    ontologies: async () => {
      const res = await axios.get('http://ontology:8000/health')
      return res.data.ontologies || []
    },
    classes: async (_: unknown, args: { ontologyId: string }) => {
      const res = await axios.get(`http://ontology:8000/ontology/${args.ontologyId}/classes`)
      return res.data
    }
  },
  Mutation: {
    createOntology: async (_: unknown, args: { input: { name: string } }) => {
      const res = await axios.post('http://ontology:8000/ontology/create', { name: args.input.name })
      return res.data
    },
    upsertClass: async (_: unknown, args: { ontologyId: string; key: string; label: string }) => {
      const res = await axios.post('http://ontology:8000/class/upsert', {
        ontology_id: args.ontologyId,
        key: args.key,
        label: args.label
      })
      return res.data
    }
  }
}
