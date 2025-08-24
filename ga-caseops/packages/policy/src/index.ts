export function hasAccess(userRole: string, required: string): boolean {
  return userRole === required;
}
