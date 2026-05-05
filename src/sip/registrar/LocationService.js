'use strict';

const redisService = require('../../services/redis');
const logger = require('../../utils/logger');

class LocationService {
  _getRedis() {
    return redisService.getClient();
  }

  async addBinding(aor, binding) {
    const key = `sip:aor:${aor}`;
    const field = binding.contactUri;
    const data = JSON.stringify({
      contactUri: binding.contactUri,
      expires: binding.expires,
      callId: binding.callId,
      cSeq: binding.cSeq,
      userAgent: binding.userAgent || null,
      registeredAt: Date.now(),
      source: binding.source || null,
    });
    const redis = this._getRedis();
    await redis.hset(key, field, data);
    await redis.expire(key, binding.expires + 60);
    logger.info('Registration binding added', { aor, contact: binding.contactUri, expires: binding.expires });
  }

  async removeBinding(aor, contactUri) {
    const key = `sip:aor:${aor}`;
    const redis = this._getRedis();
    await redis.hdel(key, contactUri);
    logger.info('Registration binding removed', { aor, contact: contactUri });
  }

  async removeAllBindings(aor) {
    const key = `sip:aor:${aor}`;
    const redis = this._getRedis();
    await redis.del(key);
    logger.info('All registration bindings removed', { aor });
  }

  async lookup(aor) {
    const key = `sip:aor:${aor}`;
    const redis = this._getRedis();
    const allBindings = await redis.hgetall(key);
    const now = Date.now();
    const active = [];

    for (const [contactUri, json] of Object.entries(allBindings)) {
      const binding = JSON.parse(json);
      const expiresAt = binding.registeredAt + (binding.expires * 1000);
      if (expiresAt > now) {
        binding.remainingExpiry = Math.ceil((expiresAt - now) / 1000);
        active.push(binding);
      } else {
        // Clean expired binding
        await redis.hdel(key, contactUri);
      }
    }

    return active;
  }

  async getAllRegistrations() {
    const redis = this._getRedis();
    const keys = await redis.keys('sip:aor:*');
    const result = [];

    for (const key of keys) {
      const aor = key.replace('sip:aor:', '');
      const bindings = await this.lookup(aor);
      if (bindings.length > 0) {
        result.push({ aor, bindings });
      }
    }

    return result;
  }
}

module.exports = new LocationService();
