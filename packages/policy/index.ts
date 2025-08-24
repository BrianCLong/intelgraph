export interface PolicyContext {
  role: string
  labels?: string[]
}

export function canViewExif(ctx: PolicyContext): boolean {
  return ctx.role === 'admin'
}
