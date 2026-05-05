'use strict';

const { EventEmitter } = require('events');

/**
 * Stream-oriented connection for TCP/TLS transports.
 * Handles SIP message framing via Content-Length.
 */
class Connection extends EventEmitter {
  constructor(id, socket, transportType) {
    super();
    this.id = id;
    this.socket = socket;
    this.transportType = transportType;
    this.remoteAddress = socket.remoteAddress || null;
    this.remotePort = socket.remotePort || null;
    this.buffer = '';
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.closed = false;

    socket.on('data', (data) => this.feed(data.toString('utf8')));
    socket.on('close', () => {
      this.closed = true;
      this.emit('close');
    });
    socket.on('error', (err) => this.emit('error', err));
  }

  /**
   * Feed raw data into the framing buffer.
   */
  feed(data) {
    this.buffer += data;
    this.lastActivity = Date.now();
    this._extractMessages();
  }

  /**
   * Extract complete SIP messages from the buffer.
   */
  _extractMessages() {
    while (true) {
      // Find header/body separator
      const sepIndex = this.buffer.indexOf('\r\n\r\n');
      if (sepIndex === -1) break;

      const headerSection = this.buffer.substring(0, sepIndex);

      // Extract Content-Length
      const clMatch = headerSection.match(/^Content-Length:\s*(\d+)/mi);
      const contentLength = clMatch ? parseInt(clMatch[1], 10) : 0;

      const messageEnd = sepIndex + 4 + contentLength;
      if (this.buffer.length < messageEnd) break;

      const rawMessage = this.buffer.substring(0, messageEnd);
      this.buffer = this.buffer.substring(messageEnd);

      this.emit('message', rawMessage);
    }
  }

  /**
   * Send data over the socket.
   */
  send(data) {
    if (!this.closed && this.socket.writable) {
      this.socket.write(data);
    }
  }

  /**
   * Close the connection.
   */
  close() {
    if (!this.closed) {
      this.closed = true;
      this.socket.destroy();
    }
  }

  get isAlive() {
    return !this.closed && this.socket.writable;
  }
}

module.exports = Connection;
