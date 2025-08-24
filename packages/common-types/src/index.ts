export interface Case {
  id: string;
  name: string;
  description?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED';
  ownerId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  caseId: string;
  title: string;
  ydocId: string;
  createdBy: string;
  updatedAt: string;
}
