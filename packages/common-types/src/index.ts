export interface RawEntity {
  id: string;
  tenantId: string;
  type: 'PERSON' | 'ORG' | 'LOCATION' | 'DOCUMENT';
  names: string[];
  emails_hash: string[];
  phones_hash: string[];
}

export interface CanonicalEntity {
  id: string;
  tenantId: string;
  type: RawEntity['type'];
  primaryName: string;
  names: string[];
  emails_hash: string[];
  phones_hash: string[];
}

export interface MatchPair {
  id: string;
  a_id: string;
  b_id: string;
  score: number;
  decision: 'AUTO_LINK' | 'AUTO_NO' | 'REVIEW';
}

export interface Cluster {
  id: string;
  canonicalId: string;
  memberIds: string[];
  frozen: boolean;
}
