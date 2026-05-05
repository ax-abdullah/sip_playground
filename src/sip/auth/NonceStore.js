'use strict';

const crypto = require('crypto');
const redisService = require('../../services/redis');

class NonceStore {
  constructor() {
    this.ttl = 300; // 5 minutes
  }

  async generate(realm) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const opaque = crypto.randomBytes(8).toString('hex');
    const redis = redisService.getClient();
    await redis.setex(`sip:nonce:${nonce}`, this.ttl,
      JSON.stringify({ realm, opaque, createdAt: Date.now() })
    );
    return { nonce, opaque };
  }

  async validate(nonce) {
    const redis = redisService.getClient();
    const data = await redis.get(`sip:nonce:${nonce}`);
    return data ? JSON.parse(data) : null;
  }

  async remove(nonce) {
    const redis = redisService.getClient();
    await redis.del(`sip:nonce:${nonce}`);
  }
}

module.exports = new NonceStore();
