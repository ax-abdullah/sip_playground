const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiResponse } = require('../utils/response');

const userRoutes = require('./userRoutes');
const sipRoutes = require('./sipRoutes');

// Mount route modules
router.use('/users', userRoutes);
router.use('/sip', sipRoutes);

// API info endpoint
router.get('/', asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    name: 'Express Starter Kit API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      sip: '/api/sip',
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
