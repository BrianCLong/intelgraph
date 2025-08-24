import { randomUUID } from 'node:crypto'
import { Ontology, OntologyStatus, Taxon, InferenceRule, Migration } from '@intelgraph/common-types'

const ontologies: Ontology[] = []
const taxonomy: Record<string, Taxon> = {}
const rules: InferenceRule[] = []
const migrations: Migration[] = []

export function createOntology(input: {
  name: string
  sdl: string
  shacl: string
  jsonSchemas: Record<string, unknown>
  changeNotes?: string
}): Ontology {
  const ontology: Ontology = {
    id: randomUUID(),
    name: input.name,
    version: `v${ontologies.length + 1}`,
    status: 'DRAFT',
    graphqlSDL: input.sdl,
    shaclTTL: input.shacl,
    jsonSchemas: input.jsonSchemas,
    changeNotes: input.changeNotes,
    createdAt: new Date().toISOString()
  }
  ontologies.push(ontology)
  return ontology
}

export function activateOntology(id: string): Ontology | undefined {
  const o = ontologies.find(o => o.id === id)
  if (!o) return undefined
  ontologies.forEach(x => {
    if (x.name === o.name && x.status === 'ACTIVE') {
      x.status = 'DEPRECATED'
      x.deprecatedAt = new Date().toISOString()
    }
  })
  o.status = 'ACTIVE'
  o.activatedAt = new Date().toISOString()
  return o
}

export function getOntology(id: string): Ontology | undefined {
  return ontologies.find(o => o.id === id)
}

export function listOntologies(status?: OntologyStatus): Ontology[] {
  return status ? ontologies.filter(o => o.status === status) : [...ontologies]
}

export function upsertTaxon(t: Omit<Taxon, 'id'>): Taxon {
  const existing = Object.values(taxonomy).find(x => x.path === t.path && x.versionRef === t.versionRef)
  if (existing) {
    taxonomy[existing.id] = { ...existing, ...t }
    return taxonomy[existing.id]
  }
  const taxon: Taxon = { ...t, id: randomUUID() }
  taxonomy[taxon.id] = taxon
  return taxon
}

export function listTaxonomy(versionRef: string): Taxon[] {
  return Object.values(taxonomy).filter(t => t.versionRef === versionRef)
}

export function upsertInferenceRule(r: Omit<InferenceRule, 'id'>): InferenceRule {
  const existing = rules.find(x => x.versionRef === r.versionRef && x.name === r.name)
  if (existing) {
    Object.assign(existing, r)
    return existing
  }
  const rule: InferenceRule = { ...r, id: randomUUID() }
  rules.push(rule)
  return rule
}

export function listInferenceRules(versionRef: string): InferenceRule[] {
  return rules.filter(r => r.versionRef === versionRef)
}

export function addMigration(m: Omit<Migration, 'id'>): Migration {
  const migration: Migration = { ...m, id: randomUUID() }
  migrations.push(migration)
  return migration
}

export function listMigrations(): Migration[] {
  return [...migrations]
}
