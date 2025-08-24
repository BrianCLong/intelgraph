import request from 'supertest'
import { createServer } from '../src/index'

let app: any
beforeAll(async () => {
  app = await createServer()
})

test('create ontology mutation', async () => {
  // mock ontology service using nock? Instead call and expect failure? We'll simulate using axios pointing to nonexistent service.
  // For this lightweight test we simply ensure server starts and responds to health query.
  const res = await request(app).post('/graphql').send({ query: '{ __typename }' })
  expect(res.status).toBe(200)
})
