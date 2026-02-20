const { randomUUID } = require('crypto');

/**
 * Standardized API Response Wrapper
 * 
 * Best Practices Implemented:
 * 1. Consistent response envelope (success, data, meta, error)
 * 2. Request ID for tracing/debugging
 * 3. Timestamp for audit trails
 * 4. Pagination metadata for collections
 * 5. Structured error format with codes
 * 6. HTTP status codes aligned with REST standards
 */

class ApiResponse {
  /**
   * Success response for single resource
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {Object} meta - Additional metadata
   */
  static success(res, data, statusCode = 200, meta = {}) {
    return res.status(statusCode).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || randomUUID(),
        ...meta,
      },
    });
  }

  /**
   * Success response for created resource (201)
   */
  static created(res, data, meta = {}) {
    return this.success(res, data, 201, meta);
  }

  /**
   * Success response for collections with pagination
   * @param {Object} res - Express response object
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination info { page, limit, total }
   * @param {Object} meta - Additional metadata
   */
  static paginated(res, data, pagination, meta = {}) {
    const { page = 1, limit = 10, total = 0 } = pagination;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || randomUUID(),
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        ...meta,
      },
    });
  }

  /**
   * Success response for collections (non-paginated)
   */
  static collection(res, data, meta = {}) {
    return res.status(200).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || randomUUID(),
        count: Array.isArray(data) ? data.length : 0,
        ...meta,
      },
    });
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {string} code - Error code for client handling
   * @param {Array|Object} details - Validation errors or additional details
   */
  static error(res, statusCode, message, code = null, details = null) {
    const errorResponse = {
      success: false,
      error: {
        code: code || this._getErrorCode(statusCode),
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || randomUUID(),
      },
    };

    return res.status(statusCode).json(errorResponse);
  }

  /**
   * Common error shortcuts
   */
  static badRequest(res, message = 'Bad Request', details = null) {
    return this.error(res, 400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, 401, message, 'UNAUTHORIZED');
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, 403, message, 'FORBIDDEN');
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, 404, message, 'NOT_FOUND');
  }

  static conflict(res, message = 'Resource already exists') {
    return this.error(res, 409, message, 'CONFLICT');
  }

  static validationError(res, errors) {
    return this.error(res, 422, 'Validation failed', 'VALIDATION_ERROR', errors);
  }

  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, 429, message, 'RATE_LIMIT_EXCEEDED');
  }

  static internalError(res, message = 'Internal server error') {
    return this.error(res, 500, message, 'INTERNAL_ERROR');
  }

  /**
   * Map HTTP status code to error code
   */
  static _getErrorCode(statusCode) {
    const codes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[statusCode] || 'ERROR';
  }
}

/**
 * Middleware to attach request ID to response
 */
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = { ApiResponse, requestIdMiddleware };
