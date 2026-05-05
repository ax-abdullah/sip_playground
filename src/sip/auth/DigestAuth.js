'use strict';

const crypto = require('crypto');
const DigestParser = require('../message/DigestParser');
const SipMessage = require('../message/SipMessage');
const nonceStore = require('./NonceStore');
const userStore = require('./UserStore');
const config = require('../../config');
const logger = require('../../utils/logger');

class DigestAuth {
  constructor() {
    this.algorithm = 'md5';
    this.qop = 'auth';
  }

  get realm() {
    return config.sip.realm;
  }

  async createChallenge(request, transaction) {
    const { nonce, opaque } = await nonceStore.generate(this.realm);
    const response = SipMessage.createResponse(401, request);
    response.setHeader('WWW-Authenticate',
      `Digest realm="${this.realm}",nonce="${nonce}",opaque="${opaque}",algorithm=${this.algorithm},qop="${this.qop}"`
    );
    transaction.sendResponse(response);
  }

  async createProxyChallenge(request, transaction) {
    const { nonce, opaque } = await nonceStore.generate(this.realm);
    const response = SipMessage.createResponse(407, request);
    response.setHeader('Proxy-Authenticate',
      `Digest realm="${this.realm}",nonce="${nonce}",opaque="${opaque}",algorithm=${this.algorithm},qop="${this.qop}"`
    );
    transaction.sendResponse(response);
  }

  async validate(request, headerName = 'Authorization') {
    const authHeader = request.getHeader(headerName);
    if (!authHeader) return 'No authorization header';

    const params = DigestParser.parse(authHeader);
    if (!params) return 'Failed to parse authorization header';

    // Validate nonce
    const nonceData = await nonceStore.validate(params.nonce);
    if (!nonceData) return 'Invalid or expired nonce';

    // Lookup HA1
    const ha1 = await userStore.getHA1(params.username, params.realm);
    if (!ha1) return 'User not found';

    // Compute expected response
    const method = request.method;
    const ha2 = crypto.createHash('md5').update(`${method}:${params.uri}`).digest('hex');

    let expected;
    if (params.qop === 'auth') {
      expected = crypto.createHash('md5')
        .update(`${ha1}:${params.nonce}:${params.nc}:${params.cnonce}:${params.qop}:${ha2}`)
        .digest('hex');
    } else {
      expected = crypto.createHash('md5')
        .update(`${ha1}:${params.nonce}:${ha2}`)
        .digest('hex');
    }

    if (params.response !== expected) {
      logger.warn('Digest auth failed', { username: params.username });
      return 'Invalid credentials';
    }

    logger.info('Digest auth succeeded', { username: params.username });
    return true;
  }
}

module.exports = new DigestAuth();
