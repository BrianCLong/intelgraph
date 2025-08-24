import Ajv, { ErrorObject } from 'ajv';
import schema from './schema.json';

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export function validateMapping(mapping: unknown): ValidationResult {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(mapping) as boolean;
  return { valid, errors: validate.errors || [] };
}

export { schema };
