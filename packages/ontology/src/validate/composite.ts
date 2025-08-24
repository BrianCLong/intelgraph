import { ValidationResult } from '@intelgraph/common-types'
import { validateJsonSchema } from './jsonschema'
import { validateShacl } from './shacl'

export function validateComposite(schemas: Record<string, unknown>, ttl: string, entity: Record<string, unknown>): ValidationResult {
  const schema = schemas[entity['type'] as string]
  const jsonRes = schema ? validateJsonSchema(schema, entity) : { valid: true, errors: [] }
  const shaclRes = validateShacl(ttl, entity)
  return {
    valid: jsonRes.valid && shaclRes.valid,
    errors: [...jsonRes.errors, ...shaclRes.errors]
  }
}
