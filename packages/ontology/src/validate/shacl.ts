import { ValidationResult, ValidationError } from '@intelgraph/common-types'

export function validateShacl(ttl: string, data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []
  const required = Array.from(ttl.matchAll(/sh:path\s+:([\w-]+);[^.]*sh:minCount\s+1/gi))
  for (const m of required) {
    const prop = m[1]
    if (data[prop] === undefined) {
      errors.push({ message: `Missing required property ${prop}`, path: prop })
    }
  }
  return { valid: errors.length === 0, errors }
}
