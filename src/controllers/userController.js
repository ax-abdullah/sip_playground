const redisService = require('../services/redis');
const logger = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

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
      return res.json({ data: cached, count: cached.length, cached: true });
    }

    // Cache miss - get from "database"
    await redisService.set(cacheKey, users, CACHE_TTL);
    logger.info('Users fetched from database and cached');
    
    res.set('X-Cache', 'MISS');
    res.json({ data: users, count: users.length, cached: false });
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
      return res.json({ data: cached, cached: true });
    }

    // Find in "database"
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Cache the result
    await redisService.set(cacheKey, user, CACHE_TTL);
    logger.info('User fetched from database and cached', { userId: id });
    
    res.set('X-Cache', 'MISS');
    res.json({ data: user, cached: false });
  },

  // Create new user and invalidate cache
  create: async (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
      throw new ApiError(400, 'Name and email are required');
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
    
    res.status(201).json({ data: newUser, message: 'User created successfully' });
  },

  // Update user and invalidate cache
  update: async (req, res) => {
    const id = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      throw new ApiError(404, 'User not found');
    }

    const { name, email } = req.body;
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
    
    res.json({ data: users[index], message: 'User updated successfully' });
  },

  // Delete user and invalidate cache
  remove: async (req, res) => {
    const id = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      throw new ApiError(404, 'User not found');
    }

    const deleted = users.splice(index, 1)[0];

    // Invalidate caches
    await redisService.del(`${CACHE_KEY_PREFIX}:${id}`);
    await redisService.del(`${CACHE_KEY_PREFIX}:all`);
    logger.info('User deleted and cache invalidated', { userId: id });
    
    res.json({ data: deleted, message: 'User deleted successfully' });
  }
};

module.exports = userController;
