import fs from 'fs';
import path from 'path';

export interface SafeList {
  labels: string[];
  properties: string[];
  forbiddenPatterns: string[];
}

let cachedSafe: SafeList | null = null;

export function loadSafeList(): SafeList {
  if (cachedSafe) return cachedSafe;
  const file = path.join(process.cwd(), 'schema', 'safe.json');
  const raw = fs.readFileSync(file, 'utf-8');
  cachedSafe = JSON.parse(raw) as SafeList;
  return cachedSafe;
}

export function validateQuery(query: string, safe: SafeList): string[] {
  const warnings: string[] = [];
  const forbidden = safe.forbiddenPatterns.map((p) => new RegExp(p, 'i'));
  forbidden.forEach((re) => {
    if (re.test(query)) {
      warnings.push('forbidden pattern');
    }
  });
  const labelRe = /:([A-Za-z0-9_]+)/g;
  const labels = Array.from(query.matchAll(labelRe)).map((m) => m[1]);
  labels.forEach((l) => {
    if (!safe.labels.includes(l)) warnings.push(`label ${l} not allowed`);
  });
  const propRe = /\.([A-Za-z0-9_]+)/g;
  const props = Array.from(query.matchAll(propRe)).map((m) => m[1]);
  props.forEach((p) => {
    if (!safe.properties.includes(p)) warnings.push(`property ${p} not allowed`);
  });
  const matchVarPath = /MATCH\s*\([^\)]*\)\s*-\s*\[\*\s*(\d+)\s*\]->/i;
  const m = query.match(matchVarPath);
  if (m && Number(m[1]) > 5) warnings.push('path length over 5');
  return warnings;
}
