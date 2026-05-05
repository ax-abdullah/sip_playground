'use strict';

class SipError extends Error {
  constructor(message, sipCode) {
    super(message);
    this.name = 'SipError';
    this.sipCode = sipCode || null;
  }
}

class SipParseError extends Error {
  constructor(message, rawData) {
    super(message);
    this.name = 'SipParseError';
    this.rawData = rawData || null;
  }
}

class SipTransportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SipTransportError';
  }
}

class SipTransactionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SipTransactionError';
  }
}

module.exports = {
  SipError,
  SipParseError,
  SipTransportError,
  SipTransactionError,
};
