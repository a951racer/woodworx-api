import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';
import { UnauthorizedError, TokenExpiredError } from '../utils/errors';

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies signature and expiry,
 * and attaches userId to the request object.
 * Returns 401 for missing, malformed, or expired tokens.
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  // Check Authorization header first, then fall back to query string token
  // (needed for img src URLs that can't send headers)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    throw new UnauthorizedError();
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name: string }).name === 'TokenExpiredError'
    ) {
      throw new TokenExpiredError();
    }
    throw new UnauthorizedError();
  }
}
