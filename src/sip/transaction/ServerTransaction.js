'use strict';

const { EventEmitter } = require('events');
const TransactionTimers = require('./Timers');
const { TimerValues } = require('../constants');
const { serialize } = require('../message/serializer');

/**
 * Server Transaction (both IST and NIST).
 * Selected by this.isInvite.
 */
class ServerTransaction extends EventEmitter {
  constructor(request, transportManager, source) {
    super();
    this.isInvite = request.method === 'INVITE';
    this.id = this._computeId(request);
    this.request = request;
    this.transport = transportManager;
    this.source = source;
    this.state = this.isInvite ? 'proceeding' : 'trying';
    this.timers = new TransactionTimers();
    this.isReliable = ['TCP', 'TLS', 'WS', 'WSS'].includes(source.transport);
    this.lastResponse = null;
    this._lastResponseMsg = null;
  }

  _computeId(request) {
    const via = request.via;
    const branch = via && via[0] ? via[0].params.branch : 'unknown';
    return `${branch}-${request.method}`;
  }

  sendResponse(response) {
    const serialized = serialize(response);
    this.lastResponse = serialized;
    this._lastResponseMsg = response;
    const code = response.statusCode;

    if (code >= 100 && code < 200) {
      // Provisional
      this.state = 'proceeding';
    } else if (code >= 200 && code < 300) {
      if (this.isInvite) {
        // 2xx for INVITE: transaction terminates, TU handles retransmissions
        this._terminate();
      } else {
        this.state = 'completed';
        this._startNistCompletedTimers();
      }
    } else {
      // 3xx-6xx
      this.state = 'completed';
      if (this.isInvite) {
        this._startIstCompletedTimers();
      } else {
        this._startNistCompletedTimers();
      }
    }

    this.transport.send(serialized, this.source);
  }

  /**
   * Handle a retransmission of the original request.
   */
  handleRetransmission() {
    if (this.lastResponse) {
      this.transport.send(this.lastResponse, this.source);
    }
  }

  /**
   * Handle an ACK for an INVITE server transaction.
   */
  handleAck(ackRequest) {
    if (this.isInvite && this.state === 'completed') {
      this.state = 'confirmed';
      this.timers.clear('G');
      this.timers.clear('H');

      const timerI = this.isReliable ? 0 : TimerValues.TIMER_I_UDP;
      if (timerI === 0) {
        this._terminate();
      } else {
        this.timers.set('I', timerI, () => this._terminate());
      }
    }
  }

  _startNistCompletedTimers() {
    const timerJ = this.isReliable ? TimerValues.TIMER_J_TCP : TimerValues.TIMER_J_UDP;
    if (timerJ === 0) {
      this._terminate();
    } else {
      this.timers.set('J', timerJ, () => this._terminate());
    }
  }

  _startIstCompletedTimers() {
    // Timer G: retransmit final response (UDP only)
    if (!this.isReliable) {
      let interval = TimerValues.T1;
      const retransmit = () => {
        if (this.state !== 'completed') return;
        this.transport.send(this.lastResponse, this.source);
        interval = Math.min(interval * 2, TimerValues.T2);
        this.timers.set('G', interval, retransmit);
      };
      this.timers.set('G', interval, retransmit);
    }

    // Timer H: timeout waiting for ACK
    this.timers.set('H', TimerValues.TIMER_H, () => {
      this.timers.clearAll();
      this._terminate();
    });
  }

  _terminate() {
    this.state = 'terminated';
    this.timers.clearAll();
    this.emit('terminated');
  }
}

module.exports = ServerTransaction;
