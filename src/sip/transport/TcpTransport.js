'use strict';

const net = require('net');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Connection = require('./Connection');
const logger = require('../../utils/logger');

class TcpTransport extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 5060;
    this.host = options.host || '0.0.0.0';
    this.server = null;
    this.connections = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this._onNewConnection(socket);
      });

      this.server.on('error', (err) => {
        logger.error('TCP transport error', { error: err.message });
        this.emit('error', err);
      });

      this.server.listen(this.port, this.host, () => {
        logger.info('TCP transport listening', { port: this.port });
        resolve();
      });
    });
  }

  _onNewConnection(socket) {
    const id = uuidv4();
    const conn = new Connection(id, socket, 'TCP');
    this.connections.set(id, conn);

    conn.on('message', (rawMessage) => {
      this.emit('message', rawMessage, {
        address: conn.remoteAddress,
        port: conn.remotePort,
        transport: 'TCP',
        connection: conn,
      });
    });

    conn.on('close', () => {
      this.connections.delete(id);
    });

    conn.on('error', (err) => {
      logger.debug('TCP connection error', { id, error: err.message });
      this.connections.delete(id);
    });
  }

  send(data, address, port, existingConnection) {
    if (existingConnection && existingConnection.isAlive) {
      existingConnection.send(data);
      return;
    }

    // Open a new outbound connection
    const socket = net.connect(port, address, () => {
      socket.write(data);
    });

    socket.on('error', (err) => {
      logger.error('TCP outbound send error', { error: err.message, address, port });
    });

    // Close after send for outbound (no persistent outbound pooling yet)
    socket.once('finish', () => socket.destroy());
    socket.end();
  }

  async stop() {
    // Close all connections
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('TCP transport stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = TcpTransport;
