export interface Investigation {
  id: string;
  title: string;
  sensitivity: 'LOW' | 'MED' | 'HIGH';
  status: 'OPEN' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
}

export interface Scene {
  id: string;
  investigationId: string;
  name: string;
  classification: 'LOW' | 'MED' | 'HIGH';
  updatedAt: string;
}
