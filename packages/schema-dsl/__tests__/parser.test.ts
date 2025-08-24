import path from 'path';
import { loadSchema, validate } from '../src/index';

describe('schema-dsl', () => {
  it('loads schema with multiple $include entries and validates', () => {
    const schemaPath = path.join(__dirname, 'fixtures', 'person.yml');
    const doc = loadSchema(schemaPath);
    expect(doc.entity).toBe('Person');
    expect(doc.props).toHaveLength(3);
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('reports validation errors for invalid schema', () => {
    const badPath = path.join(__dirname, 'fixtures', 'invalid.yml');
    const doc = loadSchema(badPath);
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('rejects non-semver version strings', () => {
    const badPath = path.join(__dirname, 'fixtures', 'bad-version.yml');
    const doc = loadSchema(badPath);
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
