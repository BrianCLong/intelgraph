import express from 'express'
import { listOntologies } from './registry'

const app = express()
app.get('/ontologies', (_req, res) => {
  res.json(listOntologies())
})
app.get('/metrics', (_req, res) => res.send('ok'))

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = 3001
  app.listen(port, () => console.log(`ontology service on ${port}`))
}

export default app
