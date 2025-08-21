#!/usr/bin/env node
import { Octokit } from '@octokit/rest';

const ok = new Octokit({ auth: process.env.GITHUB_TOKEN });
const repo = { owner: 'BrianCLong', repo: 'intelgraph' };

const risk = (files) => {
  let r = 0;
  if (files.some((f) => /graphql\/schema|intelgraph\/.*\.rego/.test(f.filename))) r += 3;
  if (files.some((f) => /package-lock\.json|pnpm-lock\.yaml/.test(f.filename))) r += 2;
  if (files.some((f) => /dockerfile|helm|k8s/.test(f.filename))) r += 2;
  if (files.some((f) => /src\/|server\//.test(f.filename))) r += 1;
  return r;
};

(async () => {
  const prs = (await ok.pulls.list({ ...repo, state: 'open', per_page: 100 })).data;
  const enriched = [];
  for (const pr of prs) {
    const files = (await ok.pulls.listFiles({ ...repo, pull_number: pr.number, per_page: 100 }))
      .data;
    enriched.push({ number: pr.number, updated: pr.updated_at, risk: risk(files) });
  }
  enriched
    .filter((x) => x.risk < 3) // keep low/med risk
    .sort((a, b) => a.risk - b.risk || new Date(a.updated) - new Date(b.updated))
    .forEach((x) => process.stdout.write(`${x.number}\n`));
})();
