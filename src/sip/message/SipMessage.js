'use strict';

const SipUri = require('./SipUri');
const HeaderParser = require('./HeaderParser');
const { normalize, isMultiValue } = require('./headers');
const { ResponseCodes } = require('../constants');
const { SipParseError } = require('../errors');
const crypto = require('crypto');

class SipMessage {
  constructor() {
    this.type = null;           // 'request' or 'response'

    // Request-specific
    this.method = null;
    this.requestUri = null;     // SipUri instance

    // Response-specific
    this.statusCode = null;
    this.reasonPhrase = null;

    // Common
    this.version = 'SIP/2.0';
    this.headers = new Map();   // Map<string, string[]> (canonical name -> raw values array)
    this.body = null;

    // Transport metadata (not serialized)
    this.source = null;

    // Lazy-parsed cache
    this._parsedCache = {};
  }

  /**
   * Parse a raw SIP message string into a SipMessage.
   */
  static parse(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      throw new SipParseError('Empty or invalid message', rawString);
    }

    // Normalize line endings: \r\n -> \n
    let normalized = rawString.replace(/\r\n/g, '\n');

    // Find header/body separator
    const sepIdx = normalized.indexOf('\n\n');
    let headerSection, body;

    if (sepIdx !== -1) {
      headerSection = normalized.substring(0, sepIdx);
      body = normalized.substring(sepIdx + 2);
    } else {
      headerSection = normalized;
      body = '';
    }

    // Handle header folding: lines starting with SP or TAB are continuations
    headerSection = headerSection.replace(/\n[ \t]+/g, ' ');

    const lines = headerSection.split('\n');
    if (lines.length === 0) {
      throw new SipParseError('No start line found', rawString);
    }

    const msg = new SipMessage();

    // Parse start line
    const startLine = lines[0];
    if (startLine.startsWith('SIP/')) {
      // Response: SIP/2.0 200 OK
      msg.type = 'response';
      const firstSpace = startLine.indexOf(' ');
      if (firstSpace === -1) throw new SipParseError('Invalid status line', startLine);
      msg.version = startLine.substring(0, firstSpace);
      const rest = startLine.substring(firstSpace + 1);
      const secondSpace = rest.indexOf(' ');
      if (secondSpace !== -1) {
        msg.statusCode = parseInt(rest.substring(0, secondSpace), 10);
        msg.reasonPhrase = rest.substring(secondSpace + 1);
      } else {
        msg.statusCode = parseInt(rest, 10);
        msg.reasonPhrase = ResponseCodes[msg.statusCode] || '';
      }
    } else {
      // Request: METHOD sip:uri SIP/2.0
      msg.type = 'request';
      const parts = startLine.split(' ');
      if (parts.length < 3) throw new SipParseError('Invalid request line', startLine);
      msg.method = parts[0];
      try {
        msg.requestUri = SipUri.parse(parts[1]);
      } catch (e) {
        throw new SipParseError(`Invalid Request-URI: ${e.message}`, parts[1]);
      }
      msg.version = parts[2];
    }

    // Parse headers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const rawName = line.substring(0, colonIdx);
      const rawValue = line.substring(colonIdx + 1).trim();
      const canonName = normalize(rawName);

      // For multi-value headers, split on comma (but not within angle brackets or quotes)
      if (isMultiValue(canonName) && canonName !== 'WWW-Authenticate' && canonName !== 'Authorization' && canonName !== 'Proxy-Authenticate' && canonName !== 'Proxy-Authorization') {
        const values = splitMultiValue(rawValue);
        for (const v of values) {
          const trimmed = v.trim();
          if (trimmed) {
            if (!msg.headers.has(canonName)) {
              msg.headers.set(canonName, []);
            }
            msg.headers.get(canonName).push(trimmed);
          }
        }
      } else {
        if (!msg.headers.has(canonName)) {
          msg.headers.set(canonName, []);
        }
        msg.headers.get(canonName).push(rawValue);
      }
    }

    // Set body
    msg.body = body || null;

    return msg;
  }

  /**
   * Create a response from a request.
   */
  static createResponse(statusCode, request, extraHeaders) {
    const msg = new SipMessage();
    msg.type = 'response';
    msg.statusCode = statusCode;
    msg.reasonPhrase = ResponseCodes[statusCode] || 'Unknown';

    // Copy mandatory headers from request (RFC 3261 §8.2.6.2)
    const copyHeaders = ['Via', 'From', 'To', 'Call-ID', 'CSeq'];
    for (const name of copyHeaders) {
      if (request.headers.has(name)) {
        msg.headers.set(name, [...request.headers.get(name)]);
      }
    }

    // Add To-tag if not present (for non-100 responses)
    if (statusCode > 100) {
      const toValues = msg.headers.get('To');
      if (toValues && toValues.length > 0 && !toValues[0].includes('tag=')) {
        const tag = crypto.randomBytes(6).toString('hex');
        toValues[0] = toValues[0] + `;tag=${tag}`;
      }
    }

    // Apply extra headers
    if (extraHeaders) {
      for (const [name, value] of Object.entries(extraHeaders)) {
        const canonName = normalize(name);
        msg.headers.set(canonName, Array.isArray(value) ? value : [value]);
      }
    }

    return msg;
  }

  /**
   * Create a new request.
   */
  static createRequest(method, requestUri, headers) {
    const msg = new SipMessage();
    msg.type = 'request';
    msg.method = method;
    msg.requestUri = typeof requestUri === 'string' ? SipUri.parse(requestUri) : requestUri;

    if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        const canonName = normalize(name);
        msg.headers.set(canonName, Array.isArray(value) ? value : [value]);
      }
    }

    return msg;
  }

  // ---- Header accessor methods ----

  getHeader(name) {
    const canonName = normalize(name);
    const values = this.headers.get(canonName);
    return values && values.length > 0 ? values[0] : null;
  }

  getHeaders(name) {
    const canonName = normalize(name);
    return this.headers.get(canonName) || [];
  }

  setHeader(name, value) {
    const canonName = normalize(name);
    this.headers.set(canonName, [value]);
    this._invalidateCache(canonName);
  }

  addHeader(name, value) {
    const canonName = normalize(name);
    if (!this.headers.has(canonName)) {
      this.headers.set(canonName, []);
    }
    this.headers.get(canonName).push(value);
    this._invalidateCache(canonName);
  }

  addHeaderTop(name, value) {
    const canonName = normalize(name);
    if (!this.headers.has(canonName)) {
      this.headers.set(canonName, []);
    }
    this.headers.get(canonName).unshift(value);
    this._invalidateCache(canonName);
  }

  removeHeader(name) {
    const canonName = normalize(name);
    this.headers.delete(canonName);
    this._invalidateCache(canonName);
  }

  hasHeader(name) {
    const canonName = normalize(name);
    return this.headers.has(canonName) && this.headers.get(canonName).length > 0;
  }

  _invalidateCache(canonName) {
    const cacheKeyMap = {
      'Via': 'via', 'From': 'from', 'To': 'to',
      'Contact': 'contact', 'CSeq': 'cseq',
    };
    const key = cacheKeyMap[canonName];
    if (key) delete this._parsedCache[key];
  }

  // ---- Typed getter properties ----

  get via() {
    if (!this._parsedCache.via) {
      const raw = this.getHeaders('Via');
      this._parsedCache.via = raw.map(v => HeaderParser.parseVia(v)).filter(Boolean);
    }
    return this._parsedCache.via;
  }

  get from() {
    if (!this._parsedCache.from) {
      this._parsedCache.from = HeaderParser.parseNameAddr(this.getHeader('From'));
    }
    return this._parsedCache.from;
  }

  get to() {
    if (!this._parsedCache.to) {
      this._parsedCache.to = HeaderParser.parseNameAddr(this.getHeader('To'));
    }
    return this._parsedCache.to;
  }

  get callId() {
    return this.getHeader('Call-ID');
  }

  get cseq() {
    if (!this._parsedCache.cseq) {
      this._parsedCache.cseq = HeaderParser.parseCSeq(this.getHeader('CSeq'));
    }
    return this._parsedCache.cseq;
  }

  get contact() {
    if (!this._parsedCache.contact) {
      const raw = this.getHeaders('Contact');
      this._parsedCache.contact = raw.map(v => HeaderParser.parseNameAddr(v)).filter(Boolean);
    }
    return this._parsedCache.contact;
  }

  get maxForwards() {
    const val = this.getHeader('Max-Forwards');
    return val !== null ? parseInt(val, 10) : null;
  }

  get contentLength() {
    return HeaderParser.parseContentLength(this.getHeader('Content-Length'));
  }

  get expires() {
    const val = this.getHeader('Expires');
    return val !== null ? parseInt(val.trim(), 10) : null;
  }

  // ---- Utility methods ----

  isRequest() {
    return this.type === 'request';
  }

  isResponse() {
    return this.type === 'response';
  }

  clone() {
    const c = new SipMessage();
    c.type = this.type;
    c.method = this.method;
    c.requestUri = this.requestUri ? this.requestUri.clone() : null;
    c.statusCode = this.statusCode;
    c.reasonPhrase = this.reasonPhrase;
    c.version = this.version;
    c.body = this.body;

    for (const [name, values] of this.headers) {
      c.headers.set(name, [...values]);
    }

    return c;
  }

  toString() {
    const { serialize } = require('./serializer');
    return serialize(this);
  }
}

/**
 * Split a multi-value header by commas, respecting angle brackets and quotes.
 */
function splitMultiValue(value) {
  const results = [];
  let current = '';
  let inQuote = false;
  let angleBracketDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];

    if (ch === '"' && (i === 0 || value[i - 1] !== '\\')) {
      inQuote = !inQuote;
      current += ch;
    } else if (!inQuote && ch === '<') {
      angleBracketDepth++;
      current += ch;
    } else if (!inQuote && ch === '>') {
      angleBracketDepth--;
      current += ch;
    } else if (!inQuote && angleBracketDepth === 0 && ch === ',') {
      results.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}

module.exports = SipMessage;
