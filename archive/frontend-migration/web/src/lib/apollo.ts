import { ApolloClient, InMemoryCache, HttpLink, split, from } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { setContext } from '@apollo/client/link/context'

// HTTP Link for queries and mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:4001/graphql',
})

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4001/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('auth_token')
      return {
        authorization: token ? `Bearer ${token}` : '',
      }
    },
  })
)

// Auth link to add JWT token to requests
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth_token')
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Split link to use HTTP for queries/mutations and WebSocket for subscriptions
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  from([authLink, httpLink])
)

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Entity: {
        fields: {
          relationships: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            },
          },
        },
      },
      Investigation: {
        fields: {
          entities: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
  },
})

// Helper function to update cache after mutations
export const updateCache = (cache: any, query: any, data: any) => {
  try {
    const existingData = cache.readQuery(query)
    if (existingData) {
      cache.writeQuery({
        ...query,
        data: {
          ...existingData,
          ...data,
        },
      })
    }
  } catch (error) {
    // Query not in cache yet, ignore
  }
}