const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Environment variables schema
 * All config values are validated at startup
 */
const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number()
    .port()
    .default(3000),

  // Redis
  REDIS_HOST: Joi.string()
    .hostname()
    .default('localhost'),
  REDIS_PORT: Joi.number()
    .port()
    .default(6379),
  REDIS_PASSWORD: Joi.string()
    .allow('')
    .default(''),
  REDIS_DB: Joi.number()
    .min(0)
    .max(15)
    .default(0),
  REDIS_PREFIX: Joi.string()
    .default('app:'),

  // Socket.io
  SOCKET_CORS_ORIGIN: Joi.string()
    .default('*'),
  SOCKET_AUTH_REQUIRED: Joi.boolean()
    .truthy('true', '1')
    .falsy('false', '0')
    .default(false),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
}).unknown(true); // Allow other env vars

/**
 * Validate and parse environment variables
 */
const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const errorMessages = error.details.map(d => `  - ${d.message}`).join('\n');
  logger.error(`Config validation failed:\n${errorMessages}`);
  throw new Error(`Config validation failed:\n${errorMessages}`);
}

/**
 * Application configuration
 * Validated and typed from environment variables
 */
const config = {
  env: envVars.NODE_ENV,
  isDev: envVars.NODE_ENV === 'development',
  isProd: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  server: {
    port: envVars.PORT,
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
    prefix: envVars.REDIS_PREFIX,
  },

  socket: {
    corsOrigin: envVars.SOCKET_CORS_ORIGIN,
    authRequired: envVars.SOCKET_AUTH_REQUIRED,
  },

  logging: {
    level: envVars.LOG_LEVEL,
  },
};

// Log config on startup (hide sensitive values)
logger.info('Configuration loaded', {
  env: config.env,
  port: config.server.port,
  redisHost: config.redis.host,
  redisPort: config.redis.port,
});

module.exports = config;
