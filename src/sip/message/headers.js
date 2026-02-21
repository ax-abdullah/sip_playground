'use strict';

const { CompactForms } = require('../constants');

/**
 * Canonical header names (lowercase → canonical form)
 */
const CANONICAL_NAMES = {
  'via': 'Via',
  'from': 'From',
  'to': 'To',
  'call-id': 'Call-ID',
  'cseq': 'CSeq',
  'contact': 'Contact',
  'max-forwards': 'Max-Forwards',
  'content-length': 'Content-Length',
  'content-type': 'Content-Type',
  'content-encoding': 'Content-Encoding',
  'content-disposition': 'Content-Disposition',
  'expires': 'Expires',
  'allow': 'Allow',
  'user-agent': 'User-Agent',
  'server': 'Server',
  'supported': 'Supported',
  'authorization': 'Authorization',
  'www-authenticate': 'WWW-Authenticate',
  'proxy-authorization': 'Proxy-Authorization',
  'proxy-authenticate': 'Proxy-Authenticate',
  'record-route': 'Record-Route',
  'route': 'Route',
  'accept': 'Accept',
  'accept-encoding': 'Accept-Encoding',
  'accept-language': 'Accept-Language',
  'allow-events': 'Allow-Events',
  'date': 'Date',
  'event': 'Event',
  'min-expires': 'Min-Expires',
  'min-se': 'Min-SE',
  'session-expires': 'Session-Expires',
  'refer-to': 'Refer-To',
  'referred-by': 'Referred-By',
  'replaces': 'Replaces',
  'subject': 'Subject',
  'subscription-state': 'Subscription-State',
  'timestamp': 'Timestamp',
  'warning': 'Warning',
  'require': 'Require',
  'proxy-require': 'Proxy-Require',
  'unsupported': 'Unsupported',
  'retry-after': 'Retry-After',
  'reason': 'Reason',
  'p-asserted-identity': 'P-Asserted-Identity',
  'p-preferred-identity': 'P-Preferred-Identity',
  'privacy': 'Privacy',
};

/**
 * Headers that can appear multiple times or contain comma-separated values
 */
const MULTI_VALUE_HEADERS = new Set([
  'Via',
  'Contact',
  'Route',
  'Record-Route',
  'Allow',
  'Supported',
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Allow-Events',
  'Require',
  'Proxy-Require',
  'Unsupported',
  'Warning',
  'P-Asserted-Identity',
]);

/**
 * Build reverse compact form map: full name (lowercase) → compact char
 */
const REVERSE_COMPACT = {};
for (const [compact, full] of Object.entries(CompactForms)) {
  REVERSE_COMPACT[full.toLowerCase()] = compact;
}

/**
 * Normalize a header name to its canonical form.
 * Handles compact forms, known headers, and falls back to title-casing.
 */
function normalize(rawName) {
  if (!rawName) return rawName;

  const trimmed = rawName.trim();

  // Check compact form (single character)
  if (trimmed.length === 1) {
    const expanded = CompactForms[trimmed.toLowerCase()];
    if (expanded) return expanded;
  }

  // Check known canonical names
  const lower = trimmed.toLowerCase();
  const canonical = CANONICAL_NAMES[lower];
  if (canonical) return canonical;

  // Fall back to title-casing
  return trimmed.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Check if a canonical header name is a multi-value header
 */
function isMultiValue(canonicalName) {
  return MULTI_VALUE_HEADERS.has(canonicalName);
}

module.exports = {
  CANONICAL_NAMES,
  MULTI_VALUE_HEADERS,
  REVERSE_COMPACT,
  normalize,
  isMultiValue,
};
