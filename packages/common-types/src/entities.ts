export type EntityType =
  | 'Person'
  | 'Org'
  | 'Location'
  | 'Event'
  | 'Document'
  | 'Indicator'
  | 'Case'
  | 'Claim';

export interface Entity {
  id: string;
  type: EntityType;
  properties: Record<string, unknown>;
}
