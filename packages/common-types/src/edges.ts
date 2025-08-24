export type EdgeType =
  | 'relatesTo'
  | 'locatedAt'
  | 'participatesIn'
  | 'derivedFrom'
  | 'mentions'
  | 'contradicts'
  | 'supports'
  | 'mergedInto';

export interface Edge {
  id: string;
  type: EdgeType;
  from: string;
  to: string;
  properties?: Record<string, unknown>;
}
