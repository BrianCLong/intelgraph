import { Request, Response, NextFunction } from 'express'

interface Bucket { count: number; expires: number }
const buckets = new Map<string, Bucket>()
const WINDOW = 60_000
const MAX = 100

export function rateLimiting(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user?.id || req.ip
  const now = Date.now()
  const bucket = buckets.get(user)
  if (!bucket || bucket.expires < now) {
    buckets.set(user, { count: 1, expires: now + WINDOW })
    return next()
  }
  if (bucket.count >= MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded' })
  }
  bucket.count++
  next()
}
