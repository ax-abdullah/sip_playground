require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const redisService = require('./services/redis');
const socketManager = require('./socket');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const sipStack = require('./sip');

const app = express();
const server = http.createServer(app);

const PORT = config.server.port;

/**
 * Initialize all services
 */
async function initializeServices() {
  try {
    // Connect to Redis
    await redisService.connect();
    logger.info('Redis service initialized');

    // Initialize Socket.io
    socketManager.init(server);
    logger.info('Socket.io service initialized');

    // Create example namespaces
    socketManager.createNamespace('/notifications', {
      onConnection: (socket, namespace) => {
        socket.on('subscribe', (channel) => {
          socket.join(channel);
          socket.emit('subscribed', { channel });
        });
      },
    });

    socketManager.createNamespace('/chat', {
      onConnection: (socket, namespace) => {
        socket.on('message', (data) => {
          namespace.to(data.room).emit('message', {
            from: socket.id,
            ...data,
            timestamp: new Date().toISOString(),
          });
        });
      },
    });

    // Initialize SIP stack
    await sipStack.start();
    logger.info('SIP stack initialized');

  } catch (error) {
    logger.error('Service initialization failed', { error: error.message });
    throw error;
  }
}

// Security middleware
app.use(helmet());
app.use(cors());

// Request ID middleware - must be early in the chain
const { requestIdMiddleware } = require('./utils/response');
const { ApiResponse } = require('./utils/response');
app.use(requestIdMiddleware);

// Request logging with Winston stream
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request context middleware - attach logger to request
app.use((req, res, next) => {
  req.logger = logger;
  req.startTime = Date.now();
  next();
});

// Response time tracking
app.use((req, res, next) => {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.logResponse(req, res, duration);
  });
  next();
});

// API routes
app.use('/api', routes);

// Health check endpoint with service status
app.get('/health', async (req, res) => {
  const redisHealthy = await redisService.ping();
  const socketStats = await socketManager.getStats();

  const sipStats = sipStack.getStats();
  const healthData = {
    status: redisHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    services: {
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      socket: {
        status: 'healthy',
        ...socketStats,
      },
      sip: sipStats,
    },
  };

  if (!redisHealthy) {
    return ApiResponse.error(res, 503, 'Service degraded', 'SERVICE_DEGRADED', healthData);
  }

  return ApiResponse.success(res, healthData);
});

// Socket.io status endpoint
app.get('/socket/stats', async (req, res) => {
  const stats = await socketManager.getStats();
  return ApiResponse.success(res, stats);
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });
  return ApiResponse.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
});

// Global error handler
app.use(errorHandler);

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Force exit after 3 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 3000).unref();

  try {
    // Stop SIP stack
    await sipStack.stop();

    // Close socket.io connections to ensure clean disconnect
    if (socketManager && socketManager.io) {
      socketManager.io.close();
    }

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Disconnect Redis
    await redisService.disconnect();
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
  }

  // Always forcefully exit to release the port immediately.
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise }); 
});

// Start server
initializeServices()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📍 Environment: ${config.env}`);
      logger.info(`🔌 Socket.io ready for connections`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });

module.exports = { app, server };
