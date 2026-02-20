const express = require('express');
const router = express.Router();
const sipParserController = require('../controllers/SIP/sipParserController')
const {asyncHandler} = require('../middleware/errorHandler');

router.post('/parse-message', asyncHandler(sipParserController.parse));

module.exports = router;