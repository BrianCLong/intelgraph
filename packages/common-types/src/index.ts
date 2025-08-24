export interface SLI {
  name: string;
  value: number;
  target: number;
  window: string;
}

export interface SLO {
  name: string;
  objective: number;
  windows: { duration: string }[];
  errorBudgetRemaining: number;
}

export interface Rollout {
  service: string;
  strategy: string;
  phase: string;
  canPromote: boolean;
  canAbort: boolean;
}

export interface Backup {
  id: string;
  target: string;
  takenAt: string;
  sizeBytes: number;
  checksum: string;
  region: string;
}

export interface DRStatus {
  primaryRegion: string;
  secondaryRegion: string;
  healthy: boolean;
  lastFailoverAt?: string;
  drills: string[];
}
