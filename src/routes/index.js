const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

const userRoutes = require('./userRoutes');

// Mount route modules
router.use('/users', userRoutes);

// API info endpoint
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    message: 'Welcome to the Express API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      health: '/health',
      socket: '/socket/stats'
    },
    features: {
      logging: 'Winston with daily rotation',
      caching: 'Redis',
      realtime: 'Socket.io'
    }
  });
}));

module.exports = router;
