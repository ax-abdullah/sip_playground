'use strict';

const { EventEmitter } = require('events');
const SipMessage = require('../message/SipMessage');
const ServerTransaction = require('./ServerTransaction');
const ClientTransaction = require('./ClientTransaction');
const { serialize } = require('../message/serializer');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * TransactionManager: maps incoming messages to transactions.
 */
class TransactionManager extends EventEmitter {
  constructor(transportManager) {
    super();
    this.transport = transportManager;
    this.serverTransactions = new Map();
    this.clientTransactions = new Map();

    this.transport.on('message', (raw, source) => this._onRawMessage(raw, source));
  }

  _onRawMessage(raw, source) {
    let msg;
    try {
      msg = SipMessage.parse(raw);
    } catch (err) {
      logger.warn('SIP parse error', { error: err.message, from: source.address });
      return;
    }
    msg.source = source;

    if (config.sip.logMessages) {
      logger.debug('SIP message received', {
        type: msg.type,
        method: msg.method || (msg.cseq ? msg.cseq.method : undefined),
        status: msg.statusCode,
        callId: msg.callId,
        from: `${source.address}:${source.port}/${source.transport}`,
      });
    }

    if (msg.isRequest()) {
      this._handleIncomingRequest(msg);
    } else {
      this._handleIncomingResponse(msg);
    }
  }

  _handleIncomingRequest(request) {
    const via = request.via;
    const branch = via && via[0] ? via[0].params.branch : null;

    if (!branch) {
      logger.warn('Request missing Via branch', { method: request.method });
      return;
    }

    const txId = `${branch}-${request.method}`;

    // Check for retransmission
    const existingTx = this.serverTransactions.get(txId);
    if (existingTx) {
      existingTx.handleRetransmission();
      return;
    }

    // ACK matches the INVITE server transaction
    if (request.method === 'ACK') {
      const inviteTxId = `${branch}-INVITE`;
      const inviteTx = this.serverTransactions.get(inviteTxId);
      if (inviteTx) {
        inviteTx.handleAck(request);
        return;
      }
      // ACK for 2xx is end-to-end
      this.emit('request', request, null);
      return;
    }

    // Create new server transaction
    const tx = new ServerTransaction(request, this.transport, request.source);
    this.serverTransactions.set(txId, tx);
    tx.on('terminated', () => this.serverTransactions.delete(txId));

    this.emit('request', request, tx);
  }

  _handleIncomingResponse(response) {
    const via = response.via;
    const branch = via && via[0] ? via[0].params.branch : null;
    if (!branch) return;

    const tx = this.clientTransactions.get(branch);
    if (tx) {
      tx.receiveResponse(response);
    } else {
      this.emit('strayResponse', response);
    }
  }

  createClientTransaction(request, destination) {
    const tx = new ClientTransaction(request, this.transport, destination);
    this.clientTransactions.set(tx.id, tx);
    tx.on('terminated', () => this.clientTransactions.delete(tx.id));
    tx.start();
    return tx;
  }
}

module.exports = TransactionManager;
