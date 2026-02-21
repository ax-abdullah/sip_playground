'use strict';

const dgram = require('dgram');
const UdpTransport = require('../../../src/sip/transport/UdpTransport');

describe('UdpTransport', () => {
  let transport;

  afterEach(async () => {
    if (transport) {
      await transport.stop();
      transport = null;
    }
  });

  test('receives a message and emits with source info', (done) => {
    transport = new UdpTransport({ port: 0 }); // port 0 = random available

    transport.start().then(() => {
      const addr = transport.socket.address();

      transport.on('message', (raw, source) => {
        expect(raw).toContain('REGISTER');
        expect(source.transport).toBe('UDP');
        expect(source.port).toBeGreaterThan(0);
        expect(source.connection).toBeNull();
        done();
      });

      // Send test message
      const client = dgram.createSocket('udp4');
      const msg = 'REGISTER sip:host SIP/2.0\r\nContent-Length: 0\r\n\r\n';
      client.send(msg, addr.port, '127.0.0.1', () => {
        client.close();
      });
    });
  });

  test('sends a message that can be received', (done) => {
    transport = new UdpTransport({ port: 0 });

    transport.start().then(() => {
      const addr = transport.socket.address();

      // Create a client to receive the response
      const client = dgram.createSocket('udp4');
      client.bind(0, '127.0.0.1', () => {
        const clientAddr = client.address();

        client.on('message', (buf) => {
          expect(buf.toString()).toContain('200 OK');
          client.close();
          done();
        });

        transport.send('SIP/2.0 200 OK\r\nContent-Length: 0\r\n\r\n', '127.0.0.1', clientAddr.port);
      });
    });
  });
});
