export interface Person {
  id: string;
  names: string[];
  dob?: string;
  nationalIds?: string[];
  addresses?: string[];
  kycStatus?: string;
  riskFlags?: string[];
  policyLabels?: string[];
}

export interface ScreeningResult {
  subjectId: string;
  entryId: string;
  score: number;
  reasons: string[];
  matchedFields: string[];
  decision: 'CLEAR' | 'REVIEW' | 'HIT';
}
