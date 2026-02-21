const redisService = require('../../services/redis');
const logger = require('../../utils/logger');
const { ApiResponse } = require('../../utils/response');
const SIPParser = require('../../services/SIP/parser');

class SipParserController {
    constructor() {
        this.redisService = redisService;
        this.logger = logger;
        this.ApiResponse = ApiResponse;
    }

    parse = async (req, res) => {
        try {
            const { rawMessage } = req.body;
            const parser = new SIPParser();
            parser.parse(rawMessage);
            this.ApiResponse.success(res, parser);
        } catch (error) {
            this.ApiResponse.error(res, error);
        }
    }
}

module.exports = new SipParserController();
