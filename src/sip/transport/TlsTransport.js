'use strict';

const tls = require('tls');
const fs = require('fs');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Connection = require('./Connection');
const logger = require('../../utils/logger');

class TlsTransport extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 5061;
    this.host = options.host || '0.0.0.0';
    this.certPath = options.cert;
    this.keyPath = options.key;
    this.server = null;
    this.connections = new Map();
  }

  async start() {
    let cert, key;
    try {
      cert = fs.readFileSync(this.certPath);
      key = fs.readFileSync(this.keyPath);
    } catch (err) {
      throw new Error(`TLS transport: failed to read cert/key: ${err.message}`);
    }

    return new Promise((resolve, reject) => {
      this.server = tls.createServer({ cert, key }, (socket) => {
        this._onNewConnection(socket);
      });

      this.server.on('error', (err) => {
        logger.error('TLS transport error', { error: err.message });
        this.emit('error', err);
      });

      this.server.listen(this.port, this.host, () => {
        logger.info('TLS transport listening', { port: this.port });
        resolve();
      });
    });
  }

  _onNewConnection(socket) {
    const id = uuidv4();
    const conn = new Connection(id, socket, 'TLS');
    this.connections.set(id, conn);

    conn.on('message', (rawMessage) => {
      this.emit('message', rawMessage, {
        address: conn.remoteAddress,
        port: conn.remotePort,
        transport: 'TLS',
        connection: conn,
      });
    });

    conn.on('close', () => {
      this.connections.delete(id);
    });

    conn.on('error', (err) => {
      logger.debug('TLS connection error', { id, error: err.message });
      this.connections.delete(id);
    });
  }

  send(data, address, port, existingConnection) {
    if (existingConnection && existingConnection.isAlive) {
      existingConnection.send(data);
      return;
    }

    const socket = tls.connect(port, address, { rejectUnauthorized: false }, () => {
      socket.write(data);
    });

    socket.on('error', (err) => {
      logger.error('TLS outbound send error', { error: err.message, address, port });
    });

    socket.once('finish', () => socket.destroy());
    socket.end();
  }

  async stop() {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('TLS transport stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = TlsTransport;
