import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        roleId: number;
        roleName: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches decoded user data to req.user.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      roleId: decoded.roleId,
      roleName: decoded.roleName,
    };
    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
    return;
  }
};

/**
 * Middleware factory to authorize based on user roles.
 * @param roles - Array of allowed role names (e.g., ['Admin', 'Merchant'])
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.roleName)) {
      res.status(403).json({ status: 'error', message: 'Access denied. Insufficient permissions.' });
      return;
    }

    next();
  };
};
