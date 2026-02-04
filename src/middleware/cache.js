const redisService = require('../services/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware factory
 * Creates middleware that caches responses in Redis
 * 
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.condition - Condition to check before caching
 */
const cache = (options = {}) => {
  const {
    ttl = 300,
    keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`,
    condition = (req, res) => res.statusCode === 200,
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Check cache
      const cachedResponse = await redisService.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Serving from cache', { key: cacheKey });
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = async (body) => {
        res.set('X-Cache', 'MISS');
        
        // Cache the response if condition is met
        if (condition(req, res)) {
          await redisService.set(cacheKey, body, ttl);
          logger.debug('Response cached', { key: cacheKey, ttl });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache for specific patterns after mutations
 * 
 * @param {string|string[]} patterns - Cache key patterns to invalidate
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Invalidate cache after successful mutation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
        
        for (const pattern of patternsArray) {
          const resolvedPattern = typeof pattern === 'function' 
            ? pattern(req, res) 
            : pattern;
          
          const count = await redisService.delByPattern(resolvedPattern);
          logger.debug('Cache invalidated', { pattern: resolvedPattern, count });
        }
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = { cache, invalidateCache };
