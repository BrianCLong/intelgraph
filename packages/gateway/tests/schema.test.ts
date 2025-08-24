import { graphql } from 'graphql'
import { buildSchema } from '../src/graphql/schema'

test('health query', async () => {
  const schema = buildSchema()
  const res = await graphql({ schema, source: '{ health }' })
  expect(res.data?.health).toBe('ok')
})
