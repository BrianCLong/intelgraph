import { Request, Response, NextFunction } from 'express';

// Simple in-memory token bucket per tenant
const tenantBudgets: Map<string, number> = new Map();
const DEFAULT_BUDGET = Number(process.env.QUERY_TOKEN_BUDGET || 100);

export function queryBudgeter(req: Request, res: Response, next: NextFunction) {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'anonymous';
  const remaining = tenantBudgets.get(tenantId) ?? DEFAULT_BUDGET;

  if (remaining <= 0) {
    return res.status(429).json({
      error: 'Query budget exceeded',
      hint: 'Reduce query rate or request a higher plan',
    });
  }

  tenantBudgets.set(tenantId, remaining - 1);
  res.on('finish', () => {
    // Simple token replenish each response for demo purposes
    const current = tenantBudgets.get(tenantId) ?? 0;
    tenantBudgets.set(tenantId, Math.min(current + 1, DEFAULT_BUDGET));
  });
  next();
}
