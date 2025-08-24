import { performance } from 'node:perf_hooks';

const REQUIRED_HEADERS = [
  'x-tenant',
  'x-user',
  'x-legal-basis',
  'x-reason',
  'x-operation'
];

const SNIPPETS = [
  {
    manifestId: 'm1',
    title: 'IntelGraph Handbook',
    text: 'IntelGraph uses graph-aware retrieval augmented generation.'
  }
];

function policyGate(headers) {
  for (const key of REQUIRED_HEADERS) {
    if (!headers[key]) {
      throw new Error('missing required header');
    }
  }
  if (headers['x-operation'] !== 'AskCopilot') {
    throw new Error('unknown operation');
  }
}

function retrieve(question) {
  if (question.toLowerCase().includes('intelgraph')) {
    return SNIPPETS;
  }
  return [];
}

function synthesize(question, snippets) {
  const start = performance.now();
  if (snippets.length === 0) {
    return {
      answer: 'insufficient evidence',
      citations: [],
      coverage: 0,
      faithfulness: 0,
      latencyMs: Math.round(performance.now() - start)
    };
  }

  const citation = {
    manifestId: snippets[0].manifestId,
    title: snippets[0].title,
    span: snippets[0].text
  };
  const response = {
    answer: snippets[0].text,
    citations: [citation],
    coverage: 1,
    faithfulness: 1,
    latencyMs: Math.round(performance.now() - start)
  };

  if (response.coverage < 0.9 || response.faithfulness < 0.85) {
    return {
      answer: 'insufficient evidence',
      citations: [citation],
      coverage: response.coverage,
      faithfulness: response.faithfulness,
      latencyMs: response.latencyMs
    };
  }

  return response;
}

export function ask(headers, question) {
  policyGate(headers);
  const snippets = retrieve(question);
  return synthesize(question, snippets);
}
