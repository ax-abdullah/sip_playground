'use strict';

const { EventEmitter } = require('events');
const Connection = require('../../../src/sip/transport/Connection');

// Create a mock socket
function createMockSocket() {
  const socket = new EventEmitter();
  socket.remoteAddress = '127.0.0.1';
  socket.remotePort = 5060;
  socket.writable = true;
  socket.write = jest.fn();
  socket.destroy = jest.fn();
  return socket;
}

describe('Connection', () => {
  test('extracts a complete message in one chunk', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-1', socket, 'TCP');
    const messages = [];
    conn.on('message', (msg) => messages.push(msg));

    const msg = 'REGISTER sip:host SIP/2.0\r\nContent-Length: 0\r\n\r\n';
    socket.emit('data', Buffer.from(msg));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe(msg);
  });

  test('handles message split across multiple chunks', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-2', socket, 'TCP');
    const messages = [];
    conn.on('message', (msg) => messages.push(msg));

    const fullMsg = 'REGISTER sip:host SIP/2.0\r\nContent-Length: 5\r\n\r\nhello';

    // Split into three chunks
    socket.emit('data', Buffer.from('REGISTER sip:host SIP'));
    expect(messages).toHaveLength(0);

    socket.emit('data', Buffer.from('/2.0\r\nContent-Length: 5\r\n\r\nhel'));
    expect(messages).toHaveLength(0);

    socket.emit('data', Buffer.from('lo'));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe(fullMsg);
  });

  test('extracts two complete messages in one chunk', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-3', socket, 'TCP');
    const messages = [];
    conn.on('message', (msg) => messages.push(msg));

    const msg1 = 'SIP/2.0 200 OK\r\nContent-Length: 0\r\n\r\n';
    const msg2 = 'SIP/2.0 100 Trying\r\nContent-Length: 0\r\n\r\n';

    socket.emit('data', Buffer.from(msg1 + msg2));

    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe(msg1);
    expect(messages[1]).toBe(msg2);
  });

  test('handles Content-Length: 0 correctly', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-4', socket, 'TCP');
    const messages = [];
    conn.on('message', (msg) => messages.push(msg));

    socket.emit('data', Buffer.from('SIP/2.0 401 Unauthorized\r\nContent-Length: 0\r\n\r\n'));

    expect(messages).toHaveLength(1);
  });

  test('handles message with large SDP body', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-5', socket, 'TCP');
    const messages = [];
    conn.on('message', (msg) => messages.push(msg));

    const body = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\n' + 'a=test\r\n'.repeat(100);
    const bodyLen = Buffer.byteLength(body, 'utf8');
    const msg = `INVITE sip:bob@host SIP/2.0\r\nContent-Length: ${bodyLen}\r\n\r\n${body}`;

    socket.emit('data', Buffer.from(msg));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe(msg);
  });

  test('send writes data to socket', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-6', socket, 'TCP');

    conn.send('test data');
    expect(socket.write).toHaveBeenCalledWith('test data');
  });

  test('close destroys socket', () => {
    const socket = createMockSocket();
    const conn = new Connection('test-7', socket, 'TCP');

    conn.close();
    expect(socket.destroy).toHaveBeenCalled();
    expect(conn.isAlive).toBe(false);
  });
});
