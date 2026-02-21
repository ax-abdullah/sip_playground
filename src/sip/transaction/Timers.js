'use strict';

/**
 * Named timer management utility for SIP transactions.
 */
class TransactionTimers {
  constructor() {
    this._timers = {};
  }

  set(name, delayMs, callback) {
    this.clear(name);
    this._timers[name] = setTimeout(() => {
      delete this._timers[name];
      callback();
    }, delayMs);
  }

  clear(name) {
    if (this._timers[name]) {
      clearTimeout(this._timers[name]);
      delete this._timers[name];
    }
  }

  clearAll() {
    for (const name of Object.keys(this._timers)) {
      clearTimeout(this._timers[name]);
    }
    this._timers = {};
  }

  has(name) {
    return name in this._timers;
  }

  get activeCount() {
    return Object.keys(this._timers).length;
  }
}

module.exports = TransactionTimers;
