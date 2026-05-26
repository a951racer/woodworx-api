/**
 * Custom error classes for consistent API error responses.
 * All application errors extend AppError and carry a machine-readable code.
 */

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTH_UNAUTHORIZED') {
    super(401, message, code);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(401, message, 'AUTH_TOKEN_EXPIRED');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(401, message, 'AUTH_INVALID_CREDENTIALS');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data', details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class DuplicateEmailError extends AppError {
  constructor(message = 'Email already registered') {
    super(409, message, 'DUPLICATE_EMAIL');
  }
}

export class InvalidResetTokenError extends AppError {
  constructor(message = 'Reset token is invalid or expired') {
    super(400, message, 'INVALID_RESET_TOKEN');
  }
}

export class FileTooLargeError extends AppError {
  constructor(message = 'File exceeds maximum size') {
    super(413, message, 'FILE_TOO_LARGE');
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(message = 'File type not supported') {
    super(400, message, 'UNSUPPORTED_FILE_TYPE');
  }
}

export class InvalidReferenceError extends AppError {
  constructor(message = 'Referenced resource does not exist') {
    super(400, message, 'INVALID_REFERENCE');
  }
}
