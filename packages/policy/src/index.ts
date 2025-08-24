const roles = ['VIEWER', 'ANALYST', 'ADMIN', 'OWNER'] as const;
type Role = typeof roles[number];

type Sensitivity = 'LOW' | 'MED' | 'HIGH';

export function canAccess(role: Role, sensitivity: Sensitivity): boolean {
  const required: Record<Sensitivity, Role> = {
    LOW: 'VIEWER',
    MED: 'ANALYST',
    HIGH: 'ADMIN'
  };
  return roles.indexOf(role) >= roles.indexOf(required[sensitivity]);
}
