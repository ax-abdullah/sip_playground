const { Server } = require('socket.io');
const logger = require('../utils/logger');
const redisService = require('../services/redis');
const config = require('../config');

class SocketManager {
  constructor() {
    this.io = null;
    this.namespaces = new Map();
    this.middlewares = [];
  }

  /**
   * Initialize Socket.io with the HTTP server
   */
  init(httpServer, options = {}) {
    const defaultOptions = {
      cors: {
        origin: config.socket.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      perMessageDeflate: {
        threshold: 1024,
      },
      maxHttpBufferSize: 1e6, // 1MB
      connectTimeout: 45000,
    };

    this.io = new Server(httpServer, { ...defaultOptions, ...options });

    // Apply global middlewares
    this._applyMiddlewares();

    // Setup default namespace handlers
    this._setupDefaultNamespace();

    logger.info('Socket.io initialized');
    return this.io;
  }

  /**
   * Apply authentication and logging middlewares
   */
  _applyMiddlewares() {
    // Connection logging middleware
    this.io.use((socket, next) => {
      logger.info('Socket connection attempt', {
        socketId: socket.id,
        ip: socket.handshake.address,
        transport: socket.conn.transport.name,
      });
      next();
    });

    // Authentication middleware (customize as needed)
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token && config.socket.authRequired) {
          return next(new Error('Authentication required'));
        }

        // TODO: Implement your token validation logic here
        // const user = await validateToken(token);
        // socket.user = user;

        // For now, just store the token
        socket.token = token;
        next();
      } catch (error) {
        logger.error('Socket authentication failed', { 
          socketId: socket.id, 
          error: error.message 
        });
        next(new Error('Authentication failed'));
      }
    });

    // Apply custom middlewares
    this.middlewares.forEach(middleware => {
      this.io.use(middleware);
    });
  }

  /**
   * Wrap socket to log all events (incoming and outgoing)
   */
  _attachEventLogger(socket) {
    // Log all incoming events
    const originalOnEvent = socket.onevent;
    socket.onevent = function(packet) {
      const [event, ...args] = packet.data || [];
      
      // Skip internal events
      if (!event.startsWith('ping') && !event.startsWith('pong')) {
        logger.debug('Socket event received', {
          socketId: socket.id,
          event,
          payload: args.length === 1 ? args[0] : args,
          timestamp: new Date().toISOString(),
        });
      }
      
      originalOnEvent.call(this, packet);
    };

    // Log all outgoing events
    const originalEmit = socket.emit;
    socket.emit = function(event, ...args) {
      // Skip internal/ack events
      if (typeof event === 'string' && !event.startsWith('ping') && !event.startsWith('pong')) {
        logger.debug('Socket event emitted', {
          socketId: socket.id,
          event,
          payload: args.length === 1 ? args[0] : args,
          timestamp: new Date().toISOString(),
        });
      }
      
      return originalEmit.apply(this, [event, ...args]);
    };
  }

  /**
   * Setup default namespace event handlers
   */
  _setupDefaultNamespace() {
    this.io.on('connection', (socket) => {
      logger.info('Socket connected', { 
        socketId: socket.id,
        rooms: Array.from(socket.rooms),
      });

      // Attach event logger to this socket
      this._attachEventLogger(socket);

      // Track connected clients in Redis
      this._trackConnection(socket);

      // Handle room joining
      socket.on('join:room', async (roomName, callback) => {
        try {
          await socket.join(roomName);
          logger.info('Socket joined room', { socketId: socket.id, room: roomName });
          
          // Track room membership
          await this._trackRoomMembership(socket.id, roomName, 'join');

          // Emit room:joined event to the socket that joined
          socket.emit('room:joined', {
            room: roomName,
            socketId: socket.id,
            namespace: '/',
            timestamp: new Date().toISOString(),
          });

          // Notify other room members that someone joined
          socket.to(roomName).emit('room:user_joined', {
            room: roomName,
            socketId: socket.id,
            namespace: '/',
            timestamp: new Date().toISOString(),
          });
          
          if (callback) callback({ success: true, room: roomName });
        } catch (error) {
          logger.error('Join room error', { socketId: socket.id, room: roomName, error: error.message });
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Handle room leaving
      socket.on('leave:room', async (roomName, callback) => {
        try {
          // Notify room members before leaving
          socket.to(roomName).emit('room:user_left', {
            room: roomName,
            socketId: socket.id,
            namespace: '/',
            timestamp: new Date().toISOString(),
          });

          await socket.leave(roomName);
          logger.info('Socket left room', { socketId: socket.id, room: roomName });
          
          await this._trackRoomMembership(socket.id, roomName, 'leave');

          // Emit room:left event to the socket that left
          socket.emit('room:left', {
            room: roomName,
            socketId: socket.id,
            namespace: '/',
            timestamp: new Date().toISOString(),
          });
          
          if (callback) callback({ success: true, room: roomName });
        } catch (error) {
          logger.error('Leave room error', { socketId: socket.id, room: roomName, error: error.message });
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Handle private messages
      socket.on('message:private', async (data, callback) => {
        try {
          const { to, message, type = 'text' } = data;
          
          const payload = {
            from: socket.id,
            message,
            type,
            timestamp: new Date().toISOString(),
          };

          this.io.to(to).emit('message:receive', payload);
          logger.debug('Private message sent', { from: socket.id, to });
          
          if (callback) callback({ success: true, delivered: true });
        } catch (error) {
          logger.error('Private message error', { socketId: socket.id, error: error.message });
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Handle room messages
      socket.on('message:room', async (data, callback) => {
        try {
          const { room, message, type = 'text' } = data;
          
          const payload = {
            from: socket.id,
            room,
            message,
            type,
            timestamp: new Date().toISOString(),
          };

          socket.to(room).emit('message:receive', payload);
          logger.debug('Room message sent', { from: socket.id, room });
          
          if (callback) callback({ success: true });
        } catch (error) {
          logger.error('Room message error', { socketId: socket.id, error: error.message });
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Handle typing indicators
      socket.on('typing:start', (room) => {
        socket.to(room).emit('typing:update', { socketId: socket.id, isTyping: true });
      });

      socket.on('typing:stop', (room) => {
        socket.to(room).emit('typing:update', { socketId: socket.id, isTyping: false });
      });

      // Handle ping for latency measurement
      socket.on('ping:check', (callback) => {
        if (callback) callback({ timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        logger.info('Socket disconnected', { socketId: socket.id, reason });
        await this._untrackConnection(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error: error.message });
      });
    });
  }

  /**
   * Track socket connection in Redis
   */
  async _trackConnection(socket) {
    try {
      const connectionData = {
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
      };
      
      await redisService.set(`socket:${socket.id}`, connectionData, 86400); // 24h TTL
      await redisService.incr('stats:connections:total');
      await redisService.incr('stats:connections:active');
    } catch (error) {
      logger.error('Track connection error', { socketId: socket.id, error: error.message });
    }
  }

  /**
   * Untrack socket connection from Redis
   */
  async _untrackConnection(socket) {
    try {
      await redisService.del(`socket:${socket.id}`);
      const client = redisService.getClient();
      if (client) {
        await client.decr('stats:connections:active');
      }
    } catch (error) {
      logger.error('Untrack connection error', { socketId: socket.id, error: error.message });
    }
  }

  /**
   * Track room membership changes
   */
  async _trackRoomMembership(socketId, room, action) {
    try {
      const key = `room:${room}:members`;
      if (action === 'join') {
        await redisService.getClient()?.sadd(key, socketId);
      } else {
        await redisService.getClient()?.srem(key, socketId);
      }
    } catch (error) {
      logger.error('Track room membership error', { socketId, room, action, error: error.message });
    }
  }

  /**
   * Create a new namespace with custom handlers
   */
  createNamespace(name, handlers = {}) {
    const namespace = this.io.of(name);
    
    namespace.on('connection', (socket) => {
      logger.info('Socket connected to namespace', { namespace: name, socketId: socket.id });
      
      if (handlers.onConnection) {
        handlers.onConnection(socket, namespace);
      }

      socket.on('disconnect', (reason) => {
        logger.info('Socket disconnected from namespace', { namespace: name, socketId: socket.id, reason });
        if (handlers.onDisconnect) {
          handlers.onDisconnect(socket, reason, namespace);
        }
      });
    });

    this.namespaces.set(name, namespace);
    logger.info('Namespace created', { namespace: name });
    
    return namespace;
  }

  /**
   * Add a global middleware
   */
  addMiddleware(middleware) {
    this.middlewares.push(middleware);
    if (this.io) {
      this.io.use(middleware);
    }
  }

  /**
   * Emit to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
    logger.debug('Broadcast sent', { event });
  }

  /**
   * Emit to a specific room
   */
  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
    logger.debug('Room emit', { room, event });
  }

  /**
   * Emit to a specific socket
   */
  emitToSocket(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
    logger.debug('Socket emit', { socketId, event });
  }

  /**
   * Get all sockets in a room
   */
  async getSocketsInRoom(room) {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(s => ({
      id: s.id,
      rooms: Array.from(s.rooms),
    }));
  }

  /**
   * Get connection stats
   */
  async getStats() {
    const sockets = await this.io.fetchSockets();
    return {
      connectedClients: sockets.length,
      namespaces: Array.from(this.namespaces.keys()),
    };
  }

  /**
   * Get the Socket.io instance
   */
  getIO() {
    return this.io;
  }
}

// Export singleton instance
const socketManager = new SocketManager();
module.exports = socketManager;
