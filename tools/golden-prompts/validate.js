#!/usr/bin/env node
// Golden Prompts validity gate (parser-backed)
// Validates Cypher syntax by running EXPLAIN via cypher-shell against a local Neo4j service.
// Optional: NL prompts -> Cypher via external MODEL_CMD (stdout), separated by newlines.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = process.env.PROMPTS_DIR || 'samples/golden-prompts/cypher';
const nlPrompts = process.env.NL_PROMPTS || '';
const modelCmd = process.env.MODEL_CMD || '';
const threshold = parseFloat(process.env.THRESHOLD || '0.95');
const minCount = parseInt(process.env.MIN_COUNT || '50', 10);

const NEO4J_HOST = process.env.NEO4J_HOST || 'localhost';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASS = process.env.NEO4J_PASS || 'test';

function explain(query) {
  const cmd = 'cypher-shell';
  const args = ['-a', `bolt://${NEO4J_HOST}:7687`, '-u', NEO4J_USER, '-p', NEO4J_PASS, `EXPLAIN ${query}`];
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  return res.status === 0;
}

let queries = [];
if (nlPrompts && modelCmd) {
  const nl = fs.readFileSync(nlPrompts, 'utf8').trim().split(/\n+/);
  for (const line of nl) {
    const out = spawnSync('bash', ['-lc', `${modelCmd} ${JSON.stringify(line)}`], { encoding: 'utf8' });
    if (out.status === 0 && out.stdout.trim()) queries.push(out.stdout.trim());
  }
} else {
  if (!fs.existsSync(dir)) {
    console.error(`[golden] prompts dir missing: ${dir}`);
    process.exit(2);
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.cql'));
  if (files.length < minCount) {
    console.error(`[golden] insufficient prompts: have=${files.length} need>=${minCount}`);
    process.exit(3);
  }
  for (const f of files) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8').trim().replace(/;\s*$/, '');
    queries.push(s);
  }
}

let okCount = 0;
for (const q of queries) {
  if (explain(q)) okCount++;
}
const ratio = okCount / queries.length;
console.log(`[golden] valid=${okCount} total=${queries.length} ratio=${ratio.toFixed(3)} (threshold=${threshold})`);
if (ratio < threshold) {
  console.error('[golden] FAIL: validity ratio below threshold');
  process.exit(1);
}
console.log('[golden] PASS');
