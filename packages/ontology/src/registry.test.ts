import { createOntology, activateOntology, listOntologies, upsertTaxon, listTaxonomy } from './registry'
import { validateComposite } from './validate/composite'
import { runRules, Fact, Rule } from './inference/rete'
import { planMigration } from './migration/planner'
import { compile } from './mapping/compiler'
import { score } from './dq/scorer'

const schema = {
  type: 'object',
  properties: { name: { type: 'string' }, type: { type: 'string' } },
  required: ['name', 'type']
}

const shacl = `
:PersonShape a sh:NodeShape ;
  sh:property [ sh:path :name ; sh:minCount 1 ] .
`

describe('ontology workflow', () => {
  test('versioning and taxonomy', () => {
    const o1 = createOntology({ name: 'core', sdl: 'type Document { title: String }', shacl, jsonSchemas: { Person: schema } })
    expect(o1.status).toBe('DRAFT')
    upsertTaxon({ versionRef: o1.version, path: 'intel', label: 'Intel', synonyms: [] })
    const active = activateOntology(o1.id)
    expect(active?.status).toBe('ACTIVE')
    const o2 = createOntology({ name: 'core', sdl: 'type Document { headline: String }', shacl, jsonSchemas: { Person: schema } })
    expect(listOntologies('DEPRECATED').length).toBe(1)
    expect(listTaxonomy(o1.version).length).toBe(1)
  })

  test('validation', () => {
    const o = createOntology({ name: 'val', sdl: '', shacl, jsonSchemas: { Person: schema } })
    const res = validateComposite(o.jsonSchemas as any, o.shaclTTL, { type: 'Person' })
    expect(res.valid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  test('inference rules', () => {
    const facts: Fact[] = [
      { subject: 'a', predicate: 'mentions', object: 'x', asserted: true },
      { subject: 'b', predicate: 'mentions', object: 'x', asserted: true }
    ]
    const rules: Rule[] = [
      {
        name: 'co-mention',
        priority: 1,
        when(existing) {
          const result: Fact[] = []
          const mentions = existing.filter(f => f.predicate === 'mentions')
          for (const m1 of mentions) {
            for (const m2 of mentions) {
              if (m1.subject !== m2.subject && m1.object === m2.object) {
                result.push({ subject: m1.subject, predicate: 'relatesTo', object: m2.subject })
              }
            }
          }
          return result
        }
      }
    ]
    const out = runRules(facts, rules)
    expect(out.some(f => f.predicate === 'relatesTo')).toBe(true)
  })

  test('migration planner', () => {
    const plan = planMigration('type Document { title: String }', 'type Document { headline: String }')
    expect(plan.steps[0]).toMatch('rename')
  })

  test('mapping compiler and dq scorer', () => {
    const fn = compile('name: source.name')
    const out = fn({ source: { name: 'Alice' } })
    expect(out.name).toBe('Alice')
    const dq = score([out, {}], ['name'])
    expect(dq.scores.completeness).toBeLessThan(1)
  })
})
