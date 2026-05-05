'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class WsTransport extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8443;
    this.host = options.host || '0.0.0.0';
    this.tlsCert = options.tlsCert;
    this.tlsKey = options.tlsKey;
    this.httpServer = null;
    this.wss = null;
    this.connections = new Map(); // id -> ws
  }

  async start() {
    // Create HTTP(S) server
    if (this.tlsCert && this.tlsKey) {
      let cert, key;
      try {
        cert = fs.readFileSync(this.tlsCert);
        key = fs.readFileSync(this.tlsKey);
      } catch (err) {
        throw new Error(`WS transport: failed to read TLS files: ${err.message}`);
      }
      this.httpServer = https.createServer({ cert, key });
    } else {
      this.httpServer = http.createServer();
    }

    // Create WebSocket server with SIP subprotocol
    this.wss = new WebSocketServer({
      server: this.httpServer,
      handleProtocols: (protocols) => {
        if (protocols.has('sip')) return 'sip';
        return false;
      },
    });

    this.wss.on('connection', (ws, req) => {
      this._onNewConnection(ws, req);
    });

    return new Promise((resolve) => {
      this.httpServer.listen(this.port, this.host, () => {
        const proto = this.tlsCert ? 'WSS' : 'WS';
        logger.info(`${proto} transport listening`, { port: this.port });
        resolve();
      });
    });
  }

  _onNewConnection(ws, req) {
    const id = uuidv4();
    const address = req.socket.remoteAddress;
    const port = req.socket.remotePort;
    const transport = this.tlsCert ? 'WSS' : 'WS';

    this.connections.set(id, { ws, address, port });

    ws.on('message', (data) => {
      const raw = data.toString('utf8');
      this.emit('message', raw, {
        address,
        port,
        transport,
        connection: { id, ws },
      });
    });

    ws.on('close', () => {
      this.connections.delete(id);
    });

    ws.on('error', (err) => {
      logger.debug('WebSocket connection error', { id, error: err.message });
      this.connections.delete(id);
    });
  }

  send(data, connectionInfo) {
    if (!connectionInfo) return;

    // connectionInfo can be { id, ws } or a direct ws instance
    const ws = connectionInfo.ws || connectionInfo;
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(data);
    }
  }

  async stop() {
    // Close all WebSocket connections
    for (const { ws } of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          if (this.httpServer) {
            this.httpServer.close(() => {
              logger.info('WS transport stopped');
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = WsTransport;
