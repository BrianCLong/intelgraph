import request from 'supertest'
import { createServer } from '../src/server'

describe('gateway GraphQL', () => {
  test('create and query ontology', async () => {
    const app = await createServer()
    const mutation = {
      query: `mutation { createOntology(name:"core", sdl:"type X", jsonSchemas:"{}") { id name status } }`
    }
    const res = await request(app).post('/graphql').send(mutation)
    expect(res.body.data.createOntology.name).toBe('core')
    const query = { query: '{ ontologies { name } }' }
    const res2 = await request(app).post('/graphql').send(query)
    expect(res2.body.data.ontologies.length).toBeGreaterThan(0)
  })
})
