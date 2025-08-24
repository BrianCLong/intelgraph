import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Stub JWT verification
  req.user = { id: 'demo', roles: ['ANALYST'] } as any;
  next();
}
