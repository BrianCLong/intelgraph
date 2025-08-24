import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from './graphql/schema'

const app = express()

async function start() {
  const schema = buildSchema()
  const server = new ApolloServer({ schema })
  await server.start()
  server.applyMiddleware({ app })
  app.listen(3000, () => console.log('gateway running'))
}

start()
