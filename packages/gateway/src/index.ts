import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { typeDefs, resolvers } from './graphql/schema'

export async function createServer() {
  const app = express()
  const server = new ApolloServer({ typeDefs, resolvers })
  await server.start()
  server.applyMiddleware({ app })
  return app
}

if (require.main === module) {
  createServer().then(app => {
    app.listen(4000, () => {
      console.log('Gateway listening on 4000')
    })
  })
}
