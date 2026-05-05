'use strict';

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiResponse } = require('../utils/response');
const sipStack = require('../sip');
const LocationService = require('../sip/registrar/LocationService');
const UserStore = require('../sip/auth/UserStore');
const config = require('../config');

// GET /api/sip/stats
router.get('/stats', asyncHandler(async (req, res) => {
  return ApiResponse.success(res, sipStack.getStats());
}));

// GET /api/sip/registrations
router.get('/registrations', asyncHandler(async (req, res) => {
  const registrations = await LocationService.getAllRegistrations();
  return ApiResponse.success(res, registrations);
}));

// GET /api/sip/registrations/:aor
router.get('/registrations/:aor', asyncHandler(async (req, res) => {
  const aor = req.params.aor;
  const bindings = await LocationService.lookup(aor);
  if (bindings.length === 0) {
    return res.status(404).json({ success: false, message: 'AOR not registered' });
  }
  return ApiResponse.success(res, { aor, bindings });
}));

// DELETE /api/sip/registrations/:aor
router.delete('/registrations/:aor', asyncHandler(async (req, res) => {
  await LocationService.removeAllBindings(req.params.aor);
  return ApiResponse.success(res, { message: 'Unregistered', aor: req.params.aor });
}));

// POST /api/sip/users
router.post('/users', asyncHandler(async (req, res) => {
  const { username, password, realm } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'username and password are required',
    });
  }
  await UserStore.addUser(username, realm || config.sip.realm, password);
  return res.status(201).json({
    success: true,
    data: { username, realm: realm || config.sip.realm },
  });
}));

// GET /api/sip/users
router.get('/users', asyncHandler(async (req, res) => {
  const users = await UserStore.listUsers();
  return ApiResponse.success(res, users);
}));

// DELETE /api/sip/users/:username
router.delete('/users/:username', asyncHandler(async (req, res) => {
  await UserStore.deleteUser(req.params.username, req.query.realm || config.sip.realm);
  return ApiResponse.success(res, { message: 'Deleted' });
}));

module.exports = router;
