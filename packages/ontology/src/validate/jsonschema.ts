import { ValidationResult, ValidationError } from '@intelgraph/common-types'

export function validateJsonSchema(schema: any, data: any): ValidationResult {
  const errors: ValidationError[] = []
  if (schema.required) {
    for (const prop of schema.required) {
      if (data[prop] === undefined) {
        errors.push({ message: `must have required property '${prop}'`, path: prop })
      }
    }
  }
  if (schema.properties) {
    for (const [prop, rules] of Object.entries<any>(schema.properties)) {
      if (rules.type === 'string' && data[prop] !== undefined && typeof data[prop] !== 'string') {
        errors.push({ message: `${prop} must be string`, path: prop })
      }
    }
  }
  return { valid: errors.length === 0, errors }
}
