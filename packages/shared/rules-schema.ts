export interface WatchlistItem {
  value: string;
  type?: 'entity' | 'term' | 'relation';
}

export interface Watchlist {
  id: string;
  name: string;
  scope: { tenantId: string; caseId?: string };
  items: WatchlistItem[];
  owners: string[];
  severityWeights: Record<string, number>;
  createdAt: Date;
}

export type RuleTrigger = 'INGEST' | 'MUTATION' | 'SCHEDULED';

export interface Rule {
  id: string;
  watchlistId: string;
  name: string;
  enabled: boolean;
  trigger: RuleTrigger;
  selector: Record<string, unknown>;
  window: number; // milliseconds
  threshold: number;
}

export type AlertStatus = 'OPEN' | 'ACK' | 'CLOSED';

export interface Alert {
  id: string;
  ruleId: string;
  entityId?: string;
  edgeId?: string;
  score: number;
  reason: string[];
  status: AlertStatus;
  assignee?: string;
  createdAt: Date;
}
