import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  entitySchema,
  edgeSchema,
  connectorSchema,
  runSchema,
  secretSchema,
  envelopeSchema,
} from '../dist/types.js';

const schemas = {
  entity: entitySchema,
  edge: edgeSchema,
  connector: connectorSchema,
  run: runSchema,
  secret: secretSchema,
  envelope: envelopeSchema,
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
mkdirSync(outDir, { recursive: true });

for (const [name, schema] of Object.entries(schemas)) {
  const jsonSchema = zodToJsonSchema(schema, { name });
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(jsonSchema, null, 2));
}
