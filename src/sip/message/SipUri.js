'use strict';

const { SipParseError } = require('../errors');

class SipUri {
  constructor() {
    this.scheme = 'sip';
    this.user = null;
    this.password = null;
    this.host = null;
    this.port = null;
    this.params = {};
    this.headers = {};
  }

  /**
   * Parse a SIP URI string into a SipUri instance.
   * Handles: sip:user@host:port;param=val?header=val
   * Also handles angle bracket wrapping: <sip:...>
   */
  static parse(uriString) {
    if (!uriString || typeof uriString !== 'string') {
      throw new SipParseError('Invalid URI string', uriString);
    }

    let str = uriString.trim();

    // Strip angle brackets
    if (str.startsWith('<')) {
      const end = str.indexOf('>');
      str = end !== -1 ? str.substring(1, end) : str.substring(1);
    }

    const uri = new SipUri();

    // Extract scheme
    const colonIdx = str.indexOf(':');
    if (colonIdx === -1) {
      throw new SipParseError('Missing scheme in URI', uriString);
    }

    const scheme = str.substring(0, colonIdx).toLowerCase();
    if (scheme !== 'sip' && scheme !== 'sips') {
      throw new SipParseError(`Unsupported URI scheme: ${scheme}`, uriString);
    }
    uri.scheme = scheme;

    let remainder = str.substring(colonIdx + 1);

    // Split off URI headers (after '?')
    const qIdx = remainder.indexOf('?');
    if (qIdx !== -1) {
      const headerStr = remainder.substring(qIdx + 1);
      remainder = remainder.substring(0, qIdx);
      for (const part of headerStr.split('&')) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          uri.headers[part.substring(0, eqIdx)] = decodeURIComponent(part.substring(eqIdx + 1));
        }
      }
    }

    // Split off parameters (after ';')
    // Need to find the first ';' that is part of URI params, not part of user info
    // The user-host portion is everything before the first ';'
    const semiIdx = remainder.indexOf(';');
    let userHostPort;
    if (semiIdx !== -1) {
      userHostPort = remainder.substring(0, semiIdx);
      const paramStr = remainder.substring(semiIdx + 1);
      for (const part of paramStr.split(';')) {
        if (!part) continue;
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          uri.params[part.substring(0, eqIdx).trim()] = part.substring(eqIdx + 1).trim();
        } else {
          // Flag parameter (no value)
          uri.params[part.trim()] = null;
        }
      }
    } else {
      userHostPort = remainder;
    }

    // Parse user@host:port
    const atIdx = userHostPort.lastIndexOf('@');
    let hostPort;
    if (atIdx !== -1) {
      const userPart = userHostPort.substring(0, atIdx);
      hostPort = userHostPort.substring(atIdx + 1);

      // Check for user:password
      const passIdx = userPart.indexOf(':');
      if (passIdx !== -1) {
        uri.user = userPart.substring(0, passIdx);
        uri.password = userPart.substring(passIdx + 1);
      } else {
        uri.user = userPart;
      }
    } else {
      hostPort = userHostPort;
    }

    // Parse host:port — handle IPv6 [host]:port
    if (hostPort.startsWith('[')) {
      const bracketEnd = hostPort.indexOf(']');
      if (bracketEnd !== -1) {
        uri.host = hostPort.substring(1, bracketEnd);
        const afterBracket = hostPort.substring(bracketEnd + 1);
        if (afterBracket.startsWith(':')) {
          uri.port = parseInt(afterBracket.substring(1), 10);
        }
      } else {
        uri.host = hostPort;
      }
    } else {
      const colonPortIdx = hostPort.lastIndexOf(':');
      if (colonPortIdx !== -1) {
        const possiblePort = hostPort.substring(colonPortIdx + 1);
        if (/^\d+$/.test(possiblePort)) {
          uri.host = hostPort.substring(0, colonPortIdx);
          uri.port = parseInt(possiblePort, 10);
        } else {
          uri.host = hostPort;
        }
      } else {
        uri.host = hostPort;
      }
    }

    if (!uri.host) {
      throw new SipParseError('Missing host in URI', uriString);
    }

    return uri;
  }

  /**
   * Serialize back to a URI string.
   */
  toString() {
    let str = `${this.scheme}:`;

    if (this.user) {
      str += this.user;
      if (this.password) {
        str += `:${this.password}`;
      }
      str += '@';
    }

    str += this.host;

    if (this.port !== null && this.port !== undefined) {
      str += `:${this.port}`;
    }

    for (const [key, value] of Object.entries(this.params)) {
      if (value === null) {
        str += `;${key}`;
      } else {
        str += `;${key}=${value}`;
      }
    }

    const headerParts = Object.entries(this.headers);
    if (headerParts.length > 0) {
      str += '?' + headerParts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    }

    return str;
  }

  /**
   * Deep clone this URI.
   */
  clone() {
    const c = new SipUri();
    c.scheme = this.scheme;
    c.user = this.user;
    c.password = this.password;
    c.host = this.host;
    c.port = this.port;
    c.params = { ...this.params };
    c.headers = { ...this.headers };
    return c;
  }

  /**
   * Get the Address of Record (user@host).
   */
  get aor() {
    if (this.user) {
      return `${this.user}@${this.host}`;
    }
    return this.host;
  }
}

module.exports = SipUri;
