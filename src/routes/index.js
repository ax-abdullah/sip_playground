const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiResponse } = require('../utils/response');

const userRoutes = require('./userRoutes');
const sipParseRoutes = require('./sipParserRoutes');

// Mount route modules
router.use('/users', userRoutes);

router.use('/parser', sipParseRoutes);

// API info endpoint
router.get('/', asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    name: 'Express Starter Kit API',
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
