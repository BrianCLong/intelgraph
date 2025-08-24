export interface Ontology {
  id: string
  name: string
  version: string
}

export interface Class {
  ontologyId: string
  key: string
  label: string
  extends?: string
}

export const ontologySchema = {
  type: 'object',
  required: ['id', 'name', 'version'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    version: { type: 'string' }
  }
} as const

export const classSchema = {
  type: 'object',
  required: ['ontologyId', 'key', 'label'],
  properties: {
    ontologyId: { type: 'string' },
    key: { type: 'string' },
    label: { type: 'string' },
    extends: { type: 'string' }
  }
} as const
