import { writeFileSync } from 'fs';
import { Hypothesis, Evidence, Source } from '../packages/common-types/src';

// Simple seed data for demo purposes
const sources: Source[] = [
  { id: 's1', name: 'News', type: 'OPEN', reliability: 'B', credibility: 0.8 },
  { id: 's2', name: 'HUMINT A', type: 'HUMINT', reliability: 'A', credibility: 0.9 }
];

const hypotheses: Hypothesis[] = [
  { id: 'h1', caseId: 'c1', title: 'Alpha', description: 'Alpha hypothesis', prior: 0.4, status: 'OPEN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), policyLabels: [] },
  { id: 'h2', caseId: 'c1', title: 'Beta', description: 'Beta hypothesis', prior: 0.6, status: 'OPEN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), policyLabels: [] }
];

const evidence: Evidence[] = [
  { id: 'e1', title: 'Alpha evidence', claimId: undefined, observedAt: new Date().toISOString(), strength: 0.7, relevance: 0.6, sourceId: 's1', confidence: 0.8, policyLabels: [] },
  { id: 'e2', title: 'Beta evidence', claimId: undefined, observedAt: new Date().toISOString(), strength: 0.5, relevance: 0.7, sourceId: 's2', confidence: 0.9, policyLabels: [] }
];

writeFileSync('seed.json', JSON.stringify({ sources, hypotheses, evidence }, null, 2));
console.log('Seed data written to seed.json');
