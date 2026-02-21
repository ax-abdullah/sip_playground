'use strict';

const ClientTransaction = require('../../../src/sip/transaction/ClientTransaction');
const SipMessage = require('../../../src/sip/message/SipMessage');

function createMockTransport() {
  return { send: jest.fn() };
}

function createRegisterRequest() {
  return SipMessage.parse(
    'REGISTER sip:host SIP/2.0\r\n' +
    'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKclient1\r\n' +
    'From: <sip:1000@host>;tag=abc\r\n' +
    'To: <sip:1000@host>\r\n' +
    'Call-ID: call789\r\n' +
    'CSeq: 1 REGISTER\r\n' +
    'Content-Length: 0\r\n\r\n'
  );
}

describe('ClientTransaction', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe('NICT (Non-INVITE)', () => {
    test('starts in trying state and sends request', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const dest = { address: '192.168.1.2', port: 5060, transport: 'UDP' };
      const tx = new ClientTransaction(request, transport, dest);

      tx.start();

      expect(tx.state).toBe('trying');
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

    test('moves to proceeding on 1xx', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const dest = { address: '192.168.1.2', port: 5060, transport: 'UDP' };
      const tx = new ClientTransaction(request, transport, dest);
      const onResponse = jest.fn();
      tx.on('response', onResponse);

      tx.start();

      const trying = SipMessage.createResponse(100, request);
      tx.receiveResponse(trying);

      expect(tx.state).toBe('proceeding');
      expect(onResponse).toHaveBeenCalledWith(trying);
    });

    test('moves to completed on 200 OK', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const dest = { address: '192.168.1.2', port: 5060, transport: 'UDP' };
      const tx = new ClientTransaction(request, transport, dest);
      const onResponse = jest.fn();
      tx.on('response', onResponse);

      tx.start();

      const ok = SipMessage.createResponse(200, request);
      tx.receiveResponse(ok);

      expect(tx.state).toBe('completed');
      expect(onResponse).toHaveBeenCalledWith(ok);
    });

    test('retransmits over UDP via Timer E', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const dest = { address: '192.168.1.2', port: 5060, transport: 'UDP' };
      const tx = new ClientTransaction(request, transport, dest);

      tx.start();
      expect(transport.send).toHaveBeenCalledTimes(1);

      // Timer E fires at T1 (500ms)
      jest.advanceTimersByTime(500);
      expect(transport.send).toHaveBeenCalledTimes(2);

      // Timer E doubles to 1000ms
      jest.advanceTimersByTime(1000);
      expect(transport.send).toHaveBeenCalledTimes(3);
    });

    test('does not retransmit over TCP', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const dest = { address: '192.168.1.2', port: 5060, transport: 'TCP' };
      const tx = new ClientTransaction(request, transport, dest);

      tx.start();
      expect(transport.send).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000);
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

    test('times out via Timer F', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const dest = { address: '192.168.1.2', port: 5060, transport: 'TCP' };
      const tx = new ClientTransaction(request, transport, dest);
      const onTimeout = jest.fn();
      tx.on('timeout', onTimeout);

      tx.start();

      jest.advanceTimersByTime(32000); // Timer F = 64*T1
      expect(tx.state).toBe('terminated');
      expect(onTimeout).toHaveBeenCalled();
    });
  });

  describe('ICT (INVITE)', () => {
    test('starts in calling state', () => {
      const transport = createMockTransport();
      const request = SipMessage.parse(
        'INVITE sip:2000@host SIP/2.0\r\n' +
        'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKict1\r\n' +
        'From: <sip:1000@host>;tag=abc\r\n' +
        'To: <sip:2000@host>\r\n' +
        'Call-ID: callINV\r\n' +
        'CSeq: 1 INVITE\r\n' +
        'Content-Length: 0\r\n\r\n'
      );
      const dest = { address: '192.168.1.2', port: 5060, transport: 'UDP' };
      const tx = new ClientTransaction(request, transport, dest);

      tx.start();
      expect(tx.state).toBe('calling');
      expect(tx.isInvite).toBe(true);
    });
  });
});
