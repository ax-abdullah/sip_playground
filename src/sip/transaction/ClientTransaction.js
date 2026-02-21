'use strict';

const { EventEmitter } = require('events');
const TransactionTimers = require('./Timers');
const { TimerValues } = require('../constants');
const { serialize } = require('../message/serializer');

/**
 * Client Transaction (both ICT and NICT).
 * Selected by this.isInvite.
 */
class ClientTransaction extends EventEmitter {
  constructor(request, transportManager, destination) {
    super();
    this.isInvite = request.method === 'INVITE';
    this.request = request;
    this.transport = transportManager;
    this.destination = destination;
    this.isReliable = ['TCP', 'TLS', 'WS', 'WSS'].includes(destination.transport);
    this.state = this.isInvite ? 'calling' : 'trying';
    this.timers = new TransactionTimers();
    this.serializedRequest = serialize(request);
    this.lastResponse = null;

    // Transaction ID = branch from our Via
    const via = request.via;
    this.id = via && via[0] ? via[0].params.branch : null;
  }

  start() {
    this.transport.send(this.serializedRequest, this.destination);
    this._startInitialTimers();
  }

  receiveResponse(response) {
    const code = response.statusCode;
    this.lastResponse = response;

    if (this.isInvite) {
      this._handleInviteResponse(code, response);
    } else {
      this._handleNonInviteResponse(code, response);
    }
  }

  _handleInviteResponse(code, response) {
    if (this.state === 'calling') {
      if (code >= 100 && code < 200) {
        this.state = 'proceeding';
        this.timers.clear('A');
        this.timers.clear('B');
        this.emit('response', response);
      } else if (code >= 200 && code < 300) {
        // 2xx: TU handles ACK
        this.state = 'terminated';
        this.timers.clearAll();
        this.emit('response', response);
        this.emit('terminated');
      } else {
        // 3xx-6xx
        this.state = 'completed';
        this.timers.clearAll();
        this.emit('response', response);
        this._startCompletedTimerD();
      }
    } else if (this.state === 'proceeding') {
      if (code >= 100 && code < 200) {
        this.emit('response', response);
      } else if (code >= 200 && code < 300) {
        this.state = 'terminated';
        this.timers.clearAll();
        this.emit('response', response);
        this.emit('terminated');
      } else {
        this.state = 'completed';
        this.timers.clearAll();
        this.emit('response', response);
        this._startCompletedTimerD();
      }
    }
  }

  _handleNonInviteResponse(code, response) {
    if (this.state === 'trying') {
      if (code >= 100 && code < 200) {
        this.state = 'proceeding';
        this.emit('response', response);
      } else {
        // 2xx-6xx
        this.state = 'completed';
        this.timers.clearAll();
        this.emit('response', response);
        this._startCompletedTimerK();
      }
    } else if (this.state === 'proceeding') {
      if (code >= 100 && code < 200) {
        this.emit('response', response);
      } else {
        this.state = 'completed';
        this.timers.clearAll();
        this.emit('response', response);
        this._startCompletedTimerK();
      }
    }
  }

  _startInitialTimers() {
    if (this.isInvite) {
      // Timer B: INVITE transaction timeout
      this.timers.set('B', TimerValues.TIMER_B, () => {
        this.timers.clearAll();
        this.state = 'terminated';
        this.emit('timeout');
        this.emit('terminated');
      });

      // Timer A: retransmit INVITE (UDP only)
      if (!this.isReliable) {
        let interval = TimerValues.T1;
        const retransmit = () => {
          if (this.state !== 'calling') return;
          this.transport.send(this.serializedRequest, this.destination);
          interval = interval * 2;
          this.timers.set('A', interval, retransmit);
        };
        this.timers.set('A', interval, retransmit);
      }
    } else {
      // Timer F: non-INVITE transaction timeout
      this.timers.set('F', TimerValues.TIMER_F, () => {
        this.timers.clearAll();
        this.state = 'terminated';
        this.emit('timeout');
        this.emit('terminated');
      });

      // Timer E: retransmit non-INVITE (UDP only)
      if (!this.isReliable) {
        let interval = TimerValues.T1;
        const retransmit = () => {
          if (this.state === 'trying' || this.state === 'proceeding') {
            this.transport.send(this.serializedRequest, this.destination);
            interval = Math.min(interval * 2, TimerValues.T2);
            this.timers.set('E', interval, retransmit);
          }
        };
        this.timers.set('E', interval, retransmit);
      }
    }
  }

  _startCompletedTimerD() {
    const timerD = this.isReliable ? 0 : TimerValues.TIMER_D_UDP;
    if (timerD === 0) {
      this._terminate();
    } else {
      this.timers.set('D', timerD, () => this._terminate());
    }
  }

  _startCompletedTimerK() {
    const timerK = this.isReliable ? TimerValues.TIMER_K_TCP : TimerValues.TIMER_K_UDP;
    if (timerK === 0) {
      this._terminate();
    } else {
      this.timers.set('K', timerK, () => this._terminate());
    }
  }

  _terminate() {
    this.state = 'terminated';
    this.timers.clearAll();
    this.emit('terminated');
  }
}

module.exports = ClientTransaction;
