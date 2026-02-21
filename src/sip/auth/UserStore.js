'use strict';

const crypto = require('crypto');
const redisService = require('../../services/redis');

class UserStore {
  async addUser(username, realm, password) {
    const ha1 = crypto.createHash('md5')
      .update(`${username}:${realm}:${password}`)
      .digest('hex');
    const redis = redisService.getClient();
    await redis.hset(`sip:user:${username}@${realm}`, {
      username,
      realm,
      ha1,
    });
  }

  async getHA1(username, realm) {
    const redis = redisService.getClient();
    const data = await redis.hgetall(`sip:user:${username}@${realm}`);
    return data && data.ha1 ? data.ha1 : null;
  }

  async userExists(username, realm) {
    const redis = redisService.getClient();
    return (await redis.exists(`sip:user:${username}@${realm}`)) === 1;
  }

  async deleteUser(username, realm) {
    const redis = redisService.getClient();
    await redis.del(`sip:user:${username}@${realm}`);
  }

  async listUsers() {
    const redis = redisService.getClient();
    const keys = await redis.keys('sip:user:*');
    const users = [];
    for (const key of keys) {
      const data = await redis.hgetall(key);
      if (data && data.username) {
        users.push({ username: data.username, realm: data.realm });
      }
    }
    return users;
  }
}

module.exports = new UserStore();
