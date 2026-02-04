const logger = require('../utils/logger');
const { ApiResponse } = require('../utils/response');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  // Factory methods for common errors
  static badRequest(message, details = null) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message, 'CONFLICT');
  }

  static validationError(details) {
    return new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', details);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR', null, false);
  }
}

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    requestId: res.locals.requestId,
    userId: req.user?.id,
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';
  const details = err.details || (process.env.NODE_ENV === 'development' ? err.stack : null);

  return ApiResponse.error(res, statusCode, message, code, details);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res, next) => {
  return ApiResponse.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = errorHandler;
module.exports.ApiError = ApiError;
module.exports.notFoundHandler = notFoundHandler;
module.exports.asyncHandler = asyncHandler;
