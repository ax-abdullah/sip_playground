const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize Redis connection with retry logic
   */
  async connect() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.prefix,
      retryStrategy: (times) => {
        if (times > this.maxReconnectAttempts) {
          logger.error('Redis max reconnection attempts reached');
          return null;
        }
        const delay = Math.min(times * 100, 3000);
        logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.client = new Redis(redisConfig);
    this._setupEventHandlers(this.client, 'main');

    try {
      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed', { error: error.message });
      throw error;
    }

    return this.client;
  }

  /**
   * Setup event handlers for Redis client
   */
  _setupEventHandlers(client, name) {
    client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info(`Redis ${name} client connected`);
    });

    client.on('ready', () => {
      logger.info(`Redis ${name} client ready`);
    });

    client.on('error', (error) => {
      logger.error(`Redis ${name} client error`, { error: error.message });
    });

    client.on('close', () => {
      this.isConnected = false;
      logger.warn(`Redis ${name} client connection closed`);
    });

    client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis ${name} client reconnecting`, { attempt: this.reconnectAttempts });
    });
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      logger.debug('Cache set', { key, ttl: ttlSeconds });
      return true;
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      await this.client.del(key);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        // Remove prefix for deletion since ioredis adds it automatically
        const keysWithoutPrefix = keys.map(k => k.replace(this.client.options.keyPrefix, ''));
        await this.client.del(...keysWithoutPrefix);
        logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      }
      return keys.length;
    } catch (error) {
      logger.error('Redis pattern DEL error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Set TTL on existing key
   */
  async expire(key, ttlSeconds) {
    try {
      await this.client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key, amount = 1) {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      logger.error('Redis INCR error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute callback and cache result
   */
  async remember(key, ttlSeconds, callback) {
    let value = await this.get(key);
    if (value !== null) {
      return value;
    }

    value = await callback();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Health check
   */
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING error', { error: error.message });
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis client disconnected');
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      logger.info('Redis subscriber disconnected');
    }
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient() {
    return this.client;
  }
}

// Export singleton instance
const redisService = new RedisService();
module.exports = redisService;
