export interface PolicyInput {
  role: string;
  sensitivity: 'LOW' | 'MED' | 'HIGH';
}

export function canView(input: PolicyInput): boolean {
  if (input.role === 'OWNER' || input.role === 'LEAD') return true;
  if (input.role === 'ANALYST') return input.sensitivity !== 'HIGH';
  return input.sensitivity === 'LOW';
}
