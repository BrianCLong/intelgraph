import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import schema from '../schema.json';

export interface Property {
  name: string;
  type: string;
  required?: boolean;
  tags?: string[];
  values?: string[];
  [key: string]: unknown;
}

export interface SchemaDoc {
  version: string;
  entity: string;
  props?: Property[];
  [key: string]: unknown;
}

export interface LoadOptions {
  baseDir?: string;
}

export function loadSchema(filePath: string, opts: LoadOptions = {}): SchemaDoc {
  const abs = path.resolve(opts.baseDir || process.cwd(), filePath);
  const raw = readFileSync(abs, 'utf8');
  const data = parse(raw, abs);
  return resolveIncludes(data, path.dirname(abs)) as SchemaDoc;
}

function parse(raw: string, filename: string): unknown {
  if (filename.endsWith('.json')) {
    return JSON.parse(raw);
  }
  return yaml.load(raw);
}

function resolveIncludes(obj: unknown, baseDir: string): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveIncludes(item, baseDir));
  }
  if (isObject(obj)) {
    const record = obj as Record<string, unknown> & { $include?: unknown };
    if (record.$include) {
      const includes = Array.isArray(record.$include)
        ? (record.$include as unknown[])
        : [record.$include];
      let merged: unknown = {};
      for (const inc of includes as string[]) {
        const included = loadSchema(inc, { baseDir });
        merged = deepMerge(merged, included);
      }
      const { $include, ...rest } = record;
      return resolveIncludes(deepMerge(merged, rest), baseDir);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      result[k] = resolveIncludes(v, baseDir);
    }
    return result;
  }
  return obj;
}

function deepMerge(target: unknown, source: unknown): unknown {
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source];
  }
  if (isObject(target) && isObject(source)) {
    const result: Record<string, unknown> = {
      ...(target as Record<string, unknown>),
    };
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (key in result) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return source;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const ajv = new Ajv({ allErrors: true });
const validateFn = ajv.compile(schema);

export function validate(doc: unknown): { valid: boolean; errors?: string[] } {
  const valid = validateFn(doc) as boolean;
  return { valid, errors: validateFn.errors?.map((e) => `${e.instancePath} ${e.message}`) };
}
