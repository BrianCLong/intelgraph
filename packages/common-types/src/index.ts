export interface PolicyLabels {
  sensitivity?: string;
  legalBasis?: string;
  purpose?: string;
  licenseClass?: string;
  tenantId?: string;
  caseId?: string;
}

export interface TransformStep {
  type: string;
  checksum: string;
  timestamp: string; // ISO date
}

export interface Provenance {
  source: string;
  assertion: string;
  transforms: TransformStep[];
}

export interface EntityBase {
  id: string;
  name: string;
  policyLabels?: PolicyLabels;
  provenance?: Provenance;
}

export interface Person extends EntityBase {
  type: 'Person';
}

export interface Org extends EntityBase {
  type: 'Org';
}

export interface Location extends EntityBase {
  type: 'Location';
  coordinates?: [number, number]; // lon, lat
}

export interface Event extends EntityBase {
  type: 'Event';
  start?: string;
  end?: string;
}

export interface Document extends EntityBase {
  type: 'Document';
  url?: string;
}

export interface Indicator extends EntityBase {
  type: 'Indicator';
  value: string;
}

export interface Case extends EntityBase {
  type: 'Case';
  description?: string;
}

export interface Claim extends EntityBase {
  type: 'Claim';
  statement: string;
}

export type Entity =
  | Person
  | Org
  | Location
  | Event
  | Document
  | Indicator
  | Case
  | Claim;

export interface Edge {
  id: string;
  type:
    | 'relatesTo'
    | 'locatedAt'
    | 'participatesIn'
    | 'derivedFrom'
    | 'mentions'
    | 'contradicts'
    | 'supports';
  from: string;
  to: string;
  policyLabels?: PolicyLabels;
  provenance?: Provenance;
}
