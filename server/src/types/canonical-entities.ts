export type EntityType =
  | 'person'
  | 'organization'
  | 'asset'
  | 'account'
  | 'location'
  | 'event'
  | 'document';

export interface ERConfidence {
  /** Deterministic score between 0 and 1 */
  deterministic?: number;
  /** Probabilistic confidence between 0 and 1 */
  probability?: number;
  /** Optional explanation or scorecard reference */
  explanation?: string;
}

export interface GeoTemporal {
  /** Start of validity window */
  validFrom?: Date;
  /** End of validity window */
  validTo?: Date;
  /** Optional geographic coordinates */
  location?: {
    lat: number;
    lon: number;
  };
}

export interface BaseEntity extends GeoTemporal {
  id: string;
  type: EntityType;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  confidence?: ERConfidence;
}

export interface Person extends BaseEntity {
  type: 'person';
  firstName?: string;
  lastName?: string;
}

export interface Organization extends BaseEntity {
  type: 'organization';
  name: string;
}

export interface Asset extends BaseEntity {
  type: 'asset';
  name: string;
}

export interface Account extends BaseEntity {
  type: 'account';
  provider?: string;
}

export interface Location extends BaseEntity {
  type: 'location';
  address?: string;
}

export interface Event extends BaseEntity {
  type: 'event';
  description?: string;
}

export interface Document extends BaseEntity {
  type: 'document';
  title?: string;
}
