'use strict';

const { EventEmitter } = require('events');
const config = require('../../config');
const logger = require('../../utils/logger');
const UdpTransport = require('./UdpTransport');
const TcpTransport = require('./TcpTransport');
const TlsTransport = require('./TlsTransport');
const WsTransport = require('./WsTransport');

class TransportManager extends EventEmitter {
  constructor() {
    super();
    this.udp = null;
    this.tcp = null;
    this.tls = null;
    this.ws = null;
  }

  async start() {
    // Always start UDP and TCP
    this.udp = new UdpTransport({ port: config.sip.udpPort });
    this.udp.on('message', (raw, source) => this.emit('message', raw, source));
    await this.udp.start();

    this.tcp = new TcpTransport({ port: config.sip.tcpPort });
    this.tcp.on('message', (raw, source) => this.emit('message', raw, source));
    await this.tcp.start();

    // Start TLS only if certificates are configured
    if (config.sip.tls.cert && config.sip.tls.key) {
      this.tls = new TlsTransport({
        port: config.sip.tlsPort,
        cert: config.sip.tls.cert,
        key: config.sip.tls.key,
      });
      this.tls.on('message', (raw, source) => this.emit('message', raw, source));
      await this.tls.start();

      // WSS with TLS
      this.ws = new WsTransport({
        port: config.sip.wssPort,
        tlsCert: config.sip.tls.cert,
        tlsKey: config.sip.tls.key,
      });
    } else {
      // WS without TLS for development
      this.ws = new WsTransport({ port: config.sip.wssPort });
    }

    this.ws.on('message', (raw, source) => this.emit('message', raw, source));
    await this.ws.start();

    logger.info('All SIP transports started');
  }

  async send(messageString, destination) {
    const { transport, address, port, connection } = destination;
    switch (transport) {
      case 'UDP':
        return this.udp.send(messageString, address, port);
      case 'TCP':
        return this.tcp.send(messageString, address, port, connection);
      case 'TLS':
        if (this.tls) return this.tls.send(messageString, address, port, connection);
        throw new Error('TLS transport not available');
      case 'WS':
      case 'WSS':
        return this.ws.send(messageString, connection);
      default:
        throw new Error(`Unknown transport: ${transport}`);
    }
  }

  async stop() {
    const stops = [];
    if (this.udp) stops.push(this.udp.stop());
    if (this.tcp) stops.push(this.tcp.stop());
    if (this.tls) stops.push(this.tls.stop());
    if (this.ws) stops.push(this.ws.stop());
    await Promise.all(stops);
    logger.info('All SIP transports stopped');
  }
}

module.exports = TransportManager;
