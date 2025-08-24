import { createOntology, upsertTaxon } from '@intelgraph/ontology'

const schema = {
  type: 'object',
  properties: { name: { type: 'string' }, type: { type: 'string' } },
  required: ['name', 'type']
}

const shacl = `
:PersonShape a sh:NodeShape ;
  sh:property [ sh:path :name ; sh:minCount 1 ] .
`

const o1 = createOntology({ name: 'core', sdl: 'type Document { title: String }', shacl, jsonSchemas: { Person: schema }, changeNotes: 'seed' })
upsertTaxon({ versionRef: o1.version, path: 'intel', label: 'Intel', synonyms: [] })
console.log('seeded ontology', o1)
