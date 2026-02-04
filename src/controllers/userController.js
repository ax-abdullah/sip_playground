const redisService = require('../services/redis');
const logger = require('../utils/logger');
const { ApiResponse } = require('../utils/response');

// In-memory store for demo (replace with database service)
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date().toISOString() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date().toISOString() }
];

let nextId = 3;

const CACHE_TTL = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'users';

const userController = {
  // Get all users with caching
  getAll: async (req, res) => {
    const cacheKey = `${CACHE_KEY_PREFIX}:all`;
    
    // Try to get from cache
    const cached = await redisService.get(cacheKey);
    if (cached) {
      logger.info('Users fetched from cache');
      res.set('X-Cache', 'HIT');
      return ApiResponse.collection(res, cached, { cached: true });
    }

    // Cache miss - get from "database"
    await redisService.set(cacheKey, users, CACHE_TTL);
    logger.info('Users fetched from database and cached');
    
    res.set('X-Cache', 'MISS');
    return ApiResponse.collection(res, users, { cached: false });
  },

  // Get user by ID with caching
  getById: async (req, res) => {
    const id = parseInt(req.params.id);
    const cacheKey = `${CACHE_KEY_PREFIX}:${id}`;

    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
      logger.info('User fetched from cache', { userId: id });
      res.set('X-Cache', 'HIT');
      return ApiResponse.success(res, cached, 200, { cached: true });
    }

    // Find in "database"
    const user = users.find(u => u.id === id);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    // Cache the result
    await redisService.set(cacheKey, user, CACHE_TTL);
    logger.info('User fetched from database and cached', { userId: id });
    
    res.set('X-Cache', 'MISS');
    return ApiResponse.success(res, user, 200, { cached: false });
  },

  // Create new user and invalidate cache
  create: async (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return ApiResponse.validationError(res, [
        ...(!name ? [{ field: 'name', message: 'Name is required' }] : []),
        ...(!email ? [{ field: 'email', message: 'Email is required' }] : []),
      ]);
    }

    // Check for duplicate email
    const exists = users.find(u => u.email === email);
    if (exists) {
      return ApiResponse.conflict(res, 'User with this email already exists');
    }

    const newUser = { 
      id: nextId++, 
      name, 
      email, 
      createdAt: new Date().toISOString() 
    };
    users.push(newUser);

    // Invalidate list cache
    await redisService.del(`${CACHE_KEY_PREFIX}:all`);
    logger.info('User created and cache invalidated', { userId: newUser.id });
    
    return ApiResponse.created(res, newUser);
  },

  // Update user and invalidate cache
  update: async (req, res) => {
    const id = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const { name, email } = req.body;

    // Check for duplicate email (excluding current user)
    if (email) {
      const exists = users.find(u => u.email === email && u.id !== id);
      if (exists) {
        return ApiResponse.conflict(res, 'User with this email already exists');
      }
    }

    users[index] = { 
      ...users[index], 
      name: name || users[index].name, 
      email: email || users[index].email,
      updatedAt: new Date().toISOString()
    };

    // Invalidate caches
    await redisService.del(`${CACHE_KEY_PREFIX}:${id}`);
    await redisService.del(`${CACHE_KEY_PREFIX}:all`);
    logger.info('User updated and cache invalidated', { userId: id });
    
    return ApiResponse.success(res, users[index]);
  },

  // Delete user and invalidate cache
  remove: async (req, res) => {
    const id = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const deleted = users.splice(index, 1)[0];

    // Invalidate caches
    await redisService.del(`${CACHE_KEY_PREFIX}:${id}`);
    await redisService.del(`${CACHE_KEY_PREFIX}:all`);
    logger.info('User deleted and cache invalidated', { userId: id });
    
    return ApiResponse.success(res, deleted);
  }
};

module.exports = userController;
