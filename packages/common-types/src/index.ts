export interface Device {
  id: string;
  tenantId: string;
  name: string;
  publicKey: string;
  status: 'ACTIVE' | 'SUSPENDED';
  enrolledAt: string;
  lastSeenAt?: string;
  capabilities: {
    camera: boolean;
    gps: boolean;
    mic: boolean;
  };
  wipeNonce: string;
}

export interface Assignment {
  id: string;
  deviceId: string;
  caseId: string;
  scopes: {
    graphDepth: number;
    labels: string[];
    bbox?: number[];
    timeRange?: [string, string];
  };
  syncMode: 'PULL' | 'PUSH' | 'BIDIR';
}

export interface BlobRef {
  id: string;
  size: number;
  mime: string;
  sha256: string;
}

export interface DeltaLog {
  id: string;
  deviceId?: string;
  caseId: string;
  seq: number;
  parent: string | null;
  ops: unknown;
  clock: Record<string, number>;
  policyLabels: string[];
  signature: string;
}

export interface EnrollmentTicket {
  code: string;
  expiresAt: string;
}

export interface SyncStatus {
  lastPull: string | null;
  lastPush: string | null;
  pendingCount: number;
}
