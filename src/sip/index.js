'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const TransportManager = require('./transport');
const TransactionManager = require('./transaction');
const ProxyCore = require('./proxy');

class SipStack {
  constructor() {
    this.transportManager = null;
    this.transactionManager = null;
    this.proxyCore = null;
    this.running = false;
  }

  async start() {
    logger.info('Starting SIP stack');

    this.transportManager = new TransportManager();
    await this.transportManager.start();

    this.transactionManager = new TransactionManager(this.transportManager);
    this.proxyCore = new ProxyCore(this.transactionManager);

    this.running = true;
    logger.info('SIP stack started', {
      domain: config.sip.domain,
      realm: config.sip.realm,
      transports: {
        udp: config.sip.udpPort,
        tcp: config.sip.tcpPort,
        tls: config.sip.tls.cert ? config.sip.tlsPort : 'disabled',
        wss: config.sip.wssPort,
      },
    });
  }

  async stop() {
    logger.info('Stopping SIP stack');
    if (this.transportManager) {
      await this.transportManager.stop();
    }
    this.running = false;
    logger.info('SIP stack stopped');
  }

  getStats() {
    return {
      running: this.running,
      domain: config.sip.domain,
      realm: config.sip.realm,
      activeTransactions: {
        server: this.transactionManager ? this.transactionManager.serverTransactions.size : 0,
        client: this.transactionManager ? this.transactionManager.clientTransactions.size : 0,
      },
      transports: {
        udp: this.transportManager && this.transportManager.udp ? `listening:${config.sip.udpPort}` : 'disabled',
        tcp: this.transportManager && this.transportManager.tcp ? `listening:${config.sip.tcpPort}` : 'disabled',
        tls: this.transportManager && this.transportManager.tls ? `listening:${config.sip.tlsPort}` : 'disabled',
        wss: this.transportManager && this.transportManager.ws ? `listening:${config.sip.wssPort}` : 'disabled',
      },
    };
  }
}

module.exports = new SipStack();
