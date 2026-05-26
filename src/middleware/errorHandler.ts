import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Global error handling middleware.
 * Returns consistent JSON error responses: { status, message, code, details }
 * Stack traces are only included in development mode.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      status: err.status,
      message: err.message,
      code: err.code,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // Unhandled errors — do not expose internals in production
  const isProduction = process.env.NODE_ENV === 'production';

  console.error('Unhandled error:', err);

  res.status(500).json({
    status: 500,
    message: isProduction ? 'An unexpected error occurred' : err.message,
    code: 'INTERNAL_ERROR',
    ...(!isProduction && { details: err.stack }),
  });
}
