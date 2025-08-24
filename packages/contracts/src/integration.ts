export interface GeoInfo {
  region?: string;
  country?: string;
}

export interface FusionEntity {
  id: string;
  type: string;
  domain: 'cybersecurity' | 'intelligence' | 'military' | 'nation-state';
  phase: string;
  description: string;
  score?: number;
  linked_to?: string[];
  timestamp?: string;
  geo?: GeoInfo;
  tags?: string[];
}

export interface CorrelationAlert {
  message: string;
  source: string;
  target: string;
}
