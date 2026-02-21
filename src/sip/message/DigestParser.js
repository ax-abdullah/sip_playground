'use strict';

class DigestParser {
  /**
   * Parse a Digest authentication header value.
   * Handles both quoted and unquoted values, varying spacing.
   *
   * Example inputs:
   *   Digest username="1000",realm="asterisk",nonce="abc",uri="sip:host",response="def",algorithm=md5,qop=auth
   *   Digest algorithm=MD5, username="2022", realm="asterisk", nonce="0f475b76", uri="sip:host", response="abc"
   */
  static parse(headerValue) {
    if (!headerValue) return null;

    let str = headerValue.trim();

    // Remove "Digest " prefix (case-insensitive)
    if (str.toLowerCase().startsWith('digest')) {
      str = str.substring(6).trim();
    }

    const params = {};

    // State machine parser to handle quoted values with commas inside
    let i = 0;
    while (i < str.length) {
      // Skip whitespace and commas
      while (i < str.length && (str[i] === ' ' || str[i] === ',' || str[i] === '\t')) {
        i++;
      }
      if (i >= str.length) break;

      // Read key
      const eqIdx = str.indexOf('=', i);
      if (eqIdx === -1) break;

      const key = str.substring(i, eqIdx).trim().toLowerCase();
      i = eqIdx + 1;

      // Skip whitespace after =
      while (i < str.length && str[i] === ' ') i++;

      // Read value (quoted or unquoted)
      let value;
      if (str[i] === '"') {
        // Quoted value — find matching close quote
        i++; // skip opening quote
        let end = i;
        while (end < str.length && str[end] !== '"') {
          if (str[end] === '\\') end++; // skip escaped char
          end++;
        }
        value = str.substring(i, end);
        i = end + 1; // skip closing quote
      } else {
        // Unquoted value — ends at comma or end of string
        let end = i;
        while (end < str.length && str[end] !== ',' && str[end] !== ' ') {
          end++;
        }
        value = str.substring(i, end);
        i = end;
      }

      params[key] = value;
    }

    return params;
  }

  /**
   * Serialize digest parameters back to a header value string.
   */
  static serialize(params) {
    if (!params) return '';

    const quotedParams = new Set([
      'username', 'realm', 'nonce', 'uri', 'response',
      'cnonce', 'opaque', 'domain',
    ]);

    const parts = [];
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      if (quotedParams.has(key)) {
        parts.push(`${key}="${value}"`);
      } else {
        parts.push(`${key}=${value}`);
      }
    }

    return 'Digest ' + parts.join(',');
  }
}

module.exports = DigestParser;
