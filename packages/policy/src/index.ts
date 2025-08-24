export function canAccess(role: string, sensitivity: string): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'ANALYST' && sensitivity !== 'HIGH') return true;
  return false;
}
