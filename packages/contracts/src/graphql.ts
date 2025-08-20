// Stable v1 contracts used by server & web
export type EntityID = string;
export type InvestigationID = string;

export interface Entity {
  id: EntityID;
  type: string;        // e.g., Person, Org, Domain
  value: string;       // display label / canonical value
  confidence?: number; // 0..1
  source?: string;
  firstSeen?: string;  // ISO
  lastSeen?: string;   // ISO
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Relationship {
  id: string;
  source: EntityID;
  target: EntityID;
  type: string;        // e.g., COMMUNICATES_WITH
  label?: string;
  confidence?: number; // 0..1
  properties?: Record<string, unknown>;
}