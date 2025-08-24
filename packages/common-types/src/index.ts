export type OntologyStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED'

export interface Ontology {
  id: string
  name: string
  version: string
  status: OntologyStatus
  graphqlSDL: string
  shaclTTL: string
  jsonSchemas: Record<string, unknown>
  changeNotes?: string
  createdAt: string
  activatedAt?: string
  deprecatedAt?: string
}

export interface Taxon {
  id: string
  versionRef: string
  path: string
  label: string
  synonyms: string[]
  parent?: string
}

export interface ValidationError {
  message: string
  path?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface InferenceRule {
  id: string
  versionRef: string
  name: string
  priority: number
  enabled: boolean
  reteDsl: unknown
}

export interface MigrationPlan {
  steps: string[]
}

export interface Migration {
  id: string
  fromVersion: string
  toVersion: string
  status: 'PENDING' | 'APPLIED' | 'ROLLED_BACK'
  plan: MigrationPlan
  dryRunReport?: unknown
}
