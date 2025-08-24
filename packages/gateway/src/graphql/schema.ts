import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLNonNull } from 'graphql'

export function buildSchema(): GraphQLSchema {
  const EvidenceType = new GraphQLObjectType({
    name: 'Evidence',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      sha256: { type: new GraphQLNonNull(GraphQLString) }
    }
  })

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: {
      health: {
        type: GraphQLString,
        resolve: () => 'ok'
      }
    }
  })

  const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      ingestEvidence: {
        type: EvidenceType,
        args: { name: { type: new GraphQLNonNull(GraphQLString) } },
        async resolve(_, { name }) {
          const res = await fetch('http://forensics:8000/ingest', {
            method: 'POST'
          })
          const data: any = await res.json()
          return { id: name, sha256: data.sha256 }
        }
      }
    }
  })

  return new GraphQLSchema({ query, mutation })
}
