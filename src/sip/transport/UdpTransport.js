'use strict';

const dgram = require('dgram');
const { EventEmitter } = require('events');
const logger = require('../../utils/logger');

class UdpTransport extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 5060;
    this.host = options.host || '0.0.0.0';
    this.socket = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket('udp4');

      this.socket.on('message', (buf, rinfo) => {
        const raw = buf.toString('utf8');
        this.emit('message', raw, {
          address: rinfo.address,
          port: rinfo.port,
          transport: 'UDP',
          connection: null,
        });
      });

      this.socket.on('error', (err) => {
        logger.error('UDP transport error', { error: err.message });
        this.emit('error', err);
      });

      this.socket.bind(this.port, this.host, () => {
        const addr = this.socket.address();
        logger.info('UDP transport listening', { address: addr.address, port: addr.port });
        resolve();
      });
    });
  }

  send(data, address, port) {
    if (!this.socket) return;
    const buf = Buffer.from(data, 'utf8');
    this.socket.send(buf, 0, buf.length, port, address, (err) => {
      if (err) {
        logger.error('UDP send error', { error: err.message, address, port });
      }
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.close(() => {
          logger.info('UDP transport stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = UdpTransport;
