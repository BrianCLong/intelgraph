export interface Presence {
  tenantId: string;
  caseId: string;
  userId: string;
  role: string;
  selections: string[];
  lastSeen: number;
}

export interface Annotation {
  id: string;
  caseId: string;
  targetId: string;
  targetType: 'node' | 'edge';
  range?: string;
  text: string;
  authorId: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CaseNoteSnapshot {
  caseId: string;
  content: string;
  updatedAt: string;
}
