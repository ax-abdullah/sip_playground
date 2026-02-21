'use strict';

/**
 * Serialize a SipMessage to wire-format string (always uses \r\n).
 */
function serialize(msg) {
  const lines = [];

  // 1. Start line
  if (msg.isRequest()) {
    lines.push(`${msg.method} ${msg.requestUri.toString()} ${msg.version}`);
  } else {
    lines.push(`${msg.version} ${msg.statusCode} ${msg.reasonPhrase}`);
  }

  // 2. Headers in priority order
  const priorityOrder = ['Via', 'Max-Forwards', 'From', 'To', 'Call-ID', 'CSeq'];
  const written = new Set();

  for (const name of priorityOrder) {
    if (msg.headers.has(name)) {
      for (const value of msg.headers.get(name)) {
        lines.push(`${name}: ${value}`);
      }
      written.add(name);
    }
  }

  // 3. Remaining headers (except Content-Length, written last)
  for (const [name, values] of msg.headers) {
    if (written.has(name) || name === 'Content-Length') continue;
    for (const value of values) {
      lines.push(`${name}: ${value}`);
    }
  }

  // 4. Content-Length always last, always present
  const bodyLength = msg.body ? Buffer.byteLength(msg.body, 'utf8') : 0;
  lines.push(`Content-Length: ${bodyLength}`);

  // 5. Join with CRLF, add blank line, add body
  let result = lines.join('\r\n') + '\r\n\r\n';
  if (msg.body) {
    result += msg.body;
  }

  return result;
}

module.exports = { serialize };
