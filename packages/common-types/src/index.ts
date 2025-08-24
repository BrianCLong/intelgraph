export interface Hypothesis {
  id: string;
  caseId: string;
  title: string;
  description: string;
  prior: number;
  status: 'OPEN' | 'IN_REVIEW' | 'ASSESSED' | 'RETIRED';
  createdAt: string;
  updatedAt: string;
  policyLabels: string[];
}

export interface Claim {
  id: string;
  hypothesisId?: string;
  text: string;
  polarity: 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL';
  createdAt: string;
}

export interface Source {
  id: string;
  name: string;
  type: 'OPEN' | 'CLOSED' | 'HUMINT' | 'SIGINT' | 'DOC' | 'MEDIA';
  reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  credibility: number;
  notes?: string;
  policyLabels?: string[];
}

export interface Evidence {
  id: string;
  claimId?: string;
  title: string;
  excerpt?: string;
  linkRef?: string;
  observedAt: string;
  strength: number;
  relevance: number;
  sourceId: string;
  confidence: number;
  policyLabels: string[];
}
