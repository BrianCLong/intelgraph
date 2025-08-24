import { Request, Response, NextFunction } from "express";

// Extend Express Request to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Ensures the tenant context from headers matches any tenant parameter on the request.
 * This very small example is used only for tests and does not perform JWT validation.
 */
export function tenantEnforcer(req: Request, res: Response, next: NextFunction) {
  const headerTenant = req.headers["x-tenant-id"] as string | undefined;
  const resourceTenant =
    (req.query.tenant as string | undefined) ||
    (req.body && (req.body.tenant as string | undefined));

  if (!headerTenant) {
    return res.status(401).json({ error: "tenant header required" });
  }
  if (resourceTenant && resourceTenant !== headerTenant) {
    return res.status(403).json({ error: "tenant forbidden" });
  }

  req.tenantId = headerTenant;
  next();
}

/**
 * Simple middleware that requires a reason for access. In a real system the reason
 * would be stored with the audit record.
 */
export function reasonRequired(req: Request, res: Response, next: NextFunction) {
  const reason = (req.headers["x-reason"] as string | undefined) ||
    (req.body && (req.body.reason as string | undefined));
  if (!reason) {
    return res.status(400).json({ error: "reason required" });
  }
  next();
}

