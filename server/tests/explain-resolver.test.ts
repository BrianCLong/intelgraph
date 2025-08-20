import request from 'supertest'
import { createApp } from '../src/app'
import { advancedMLService } from '../src/services/AdvancedMLService'

jest.spyOn(advancedMLService, 'getExplanations').mockResolvedValue({
  paths: [{ nodes: ['a', 'b'], edges: [] }],
  featureAttributions: [{ feature: 'f', importance: 0.9 }],
  fairnessFlags: [],
  limitations: [],
  traceId: 'test-trace'
})

describe('explainConnection resolver', () => {
  let server: any
  beforeAll(async () => {
    const app = await createApp()
    server = app.listen(0)
  })
  afterAll(async () => {
    await server.close()
  })

  it('returns explanation data', async () => {
    const res = await request(server)
      .post('/graphql')
      .set('Authorization', 'Bearer dev-token')
      .send({
        query: `
          query($s: ID!, $t: ID!) {
            explainConnection(sourceId: $s, targetId: $t) {
              traceId
              paths { nodes }
              featureAttributions { feature importance }
            }
          }
        `,
        variables: { s: 'a', t: 'b' }
      })
    expect(res.status).toBe(200)
    expect(res.body.data.explainConnection.traceId).toBe('test-trace')
  })
})
