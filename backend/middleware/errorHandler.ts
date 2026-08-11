import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and sends a standardized JSON response.
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err.message || err);

  const statusCode = err.statusCode || 500;
  
  let message = err.message || 'Internal Server Error';
  // Sanitize message for unhandled 500 errors in production
  if (statusCode === 500 && process.env.NODE_ENV !== 'development') {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Custom AppError class for structured error handling.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
