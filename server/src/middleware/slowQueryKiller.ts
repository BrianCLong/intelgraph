import { Request, Response, NextFunction } from 'express';

const THRESHOLD = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 1500);

export function slowQueryKiller(req: Request, res: Response, next: NextFunction) {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Query time exceeded limit',
        hint: 'Simplify the query or request indexing support',
      });
    }
    req.socket.destroy();
  }, THRESHOLD);

  res.on('finish', () => clearTimeout(timer));
  next();
}
