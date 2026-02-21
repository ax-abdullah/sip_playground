'use strict';

const SipUri = require('./SipUri');

class HeaderParser {
  /**
   * Parse a Via header value.
   * Example: "SIP/2.0/UDP 192.168.34.153:50820;branch=z9hG4bK-524287-1---082e49264cbfbf3a;rport"
   */
  static parseVia(rawValue) {
    if (!rawValue) return null;

    const str = rawValue.trim();

    // Split protocol/transport from host and params
    // Format: SIP/2.0/TRANSPORT host:port;params
    const spaceIdx = str.indexOf(' ');
    if (spaceIdx === -1) return null;

    const protocolPart = str.substring(0, spaceIdx);
    const rest = str.substring(spaceIdx + 1);

    // Parse protocol: SIP/2.0/UDP
    const protoParts = protocolPart.split('/');
    const protocol = protoParts[0] || 'SIP';
    const version = protoParts[1] || '2.0';
    const transport = protoParts[2] || 'UDP';

    // Parse host:port and params
    const params = {};
    let hostPort;

    const semiIdx = rest.indexOf(';');
    if (semiIdx !== -1) {
      hostPort = rest.substring(0, semiIdx);
      const paramStr = rest.substring(semiIdx + 1);
      for (const part of paramStr.split(';')) {
        if (!part) continue;
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          params[part.substring(0, eqIdx).trim()] = part.substring(eqIdx + 1).trim();
        } else {
          params[part.trim()] = null;
        }
      }
    } else {
      hostPort = rest;
    }

    // Parse host and port
    hostPort = hostPort.trim();
    let host, port = null;

    const colonIdx = hostPort.lastIndexOf(':');
    if (colonIdx !== -1) {
      const possiblePort = hostPort.substring(colonIdx + 1);
      if (/^\d+$/.test(possiblePort)) {
        host = hostPort.substring(0, colonIdx);
        port = parseInt(possiblePort, 10);
      } else {
        host = hostPort;
      }
    } else {
      host = hostPort;
    }

    return { protocol, version, transport, host, port, params };
  }

  /**
   * Parse a name-addr header value (From, To, Contact).
   * Handles:
   *   "Display Name" <sip:user@host>;tag=abc
   *   <sip:user@host>;tag=abc
   *   sip:user@host;tag=abc
   *   * (Contact wildcard)
   */
  static parseNameAddr(rawValue) {
    if (!rawValue) return null;

    const str = rawValue.trim();

    // Handle Contact wildcard
    if (str === '*') {
      return { displayName: null, uri: null, params: {}, raw: str, wildcard: true };
    }

    let displayName = null;
    let uriStr;
    let paramStr = '';

    // Check for quoted display name: "Name" <uri>;params
    const quoteMatch = str.match(/^"([^"]*)"[\s]*<([^>]+)>(.*)/);
    if (quoteMatch) {
      displayName = quoteMatch[1];
      uriStr = quoteMatch[2];
      paramStr = quoteMatch[3].trim();
    } else {
      // Check for angle brackets without quotes: <uri>;params or Name <uri>;params
      const angleBracketIdx = str.indexOf('<');
      if (angleBracketIdx !== -1) {
        const closeIdx = str.indexOf('>', angleBracketIdx);
        if (closeIdx !== -1) {
          // Check for unquoted display name before <
          const before = str.substring(0, angleBracketIdx).trim();
          if (before) {
            displayName = before;
          }
          uriStr = str.substring(angleBracketIdx + 1, closeIdx);
          paramStr = str.substring(closeIdx + 1).trim();
        } else {
          uriStr = str.substring(angleBracketIdx + 1);
        }
      } else {
        // No angle brackets: sip:user@host;tag=abc
        // Tricky: need to distinguish URI params from header params
        // Without angle brackets, all params are ambiguous
        // RFC 3261: header params are after the URI (URI ends at the first ; for name-addr without <>)
        // In practice, tag is always a header param
        // We parse the whole thing and then extract tag/params
        uriStr = str;
      }
    }

    // Parse params from paramStr (;key=value;key)
    const params = {};
    if (paramStr && paramStr.startsWith(';')) {
      const parts = paramStr.substring(1).split(';');
      for (const part of parts) {
        if (!part) continue;
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          params[part.substring(0, eqIdx).trim()] = part.substring(eqIdx + 1).trim();
        } else {
          params[part.trim()] = null;
        }
      }
    }

    // If no angle brackets were used, we need to separate tag from URI params
    if (!str.includes('<') && !str.includes('>')) {
      // Find 'tag=' in the string — it's a header param, not a URI param
      const tagMatch = uriStr.match(/;tag=([^\s;]+)/);
      if (tagMatch) {
        params.tag = tagMatch[1];
        uriStr = uriStr.replace(/;tag=[^\s;]+/, '');
      }
    }

    let uri = null;
    try {
      uri = SipUri.parse(uriStr);
    } catch (e) {
      // If we can't parse as URI, store raw
    }

    return { displayName, uri, params, raw: str };
  }

  /**
   * Parse a CSeq header value.
   * Example: "2 REGISTER" -> { seq: 2, method: 'REGISTER' }
   */
  static parseCSeq(rawValue) {
    if (!rawValue) return null;
    const parts = rawValue.trim().split(/\s+/);
    if (parts.length < 2) return null;
    return {
      seq: parseInt(parts[0], 10),
      method: parts[1],
    };
  }

  /**
   * Parse a Content-Length header value (handles extra whitespace).
   */
  static parseContentLength(rawValue) {
    if (rawValue === null || rawValue === undefined) return 0;
    return parseInt(String(rawValue).trim(), 10) || 0;
  }
}

module.exports = HeaderParser;
