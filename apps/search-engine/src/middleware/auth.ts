import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header missing or invalid'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        error: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
      role: string;
      tenantId: string;
    };

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed'
    });
  }
};