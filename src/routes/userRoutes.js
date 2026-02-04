const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/users - Get all users
router.get('/', asyncHandler(userController.getAll));

// GET /api/users/:id - Get user by ID
router.get('/:id', asyncHandler(userController.getById));

// POST /api/users - Create new user
router.post('/', asyncHandler(userController.create));

// PUT /api/users/:id - Update user
router.put('/:id', asyncHandler(userController.update));

// DELETE /api/users/:id - Delete user
router.delete('/:id', asyncHandler(userController.remove));

module.exports = router;
