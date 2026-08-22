// Application-level error carrying a stable error code, distinct from
// unexpected runtime exceptions (rules.md §29). Thrown by validation/auth/
// business logic and caught centrally by middleware/errorHandler.js.

export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

// Convenience constructors for common cases.
export const Unauthorized = (message = 'You must be signed in to do that.') =>
  new AppError('UNAUTHORIZED', message, 401);

export const Forbidden = (message = 'You are not authorised to perform this action.') =>
  new AppError('FORBIDDEN', message, 403);

export const NotFound = (message = 'Not found.') => new AppError('NOT_FOUND', message, 404);

export const ValidationError = (message) => new AppError('VALIDATION_ERROR', message, 400);
