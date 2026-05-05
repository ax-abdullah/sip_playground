'use strict';

const ServerTransaction = require('../../../src/sip/transaction/ServerTransaction');
const SipMessage = require('../../../src/sip/message/SipMessage');

function createMockTransport() {
  return { send: jest.fn() };
}

function createRegisterRequest() {
  return SipMessage.parse(
    'REGISTER sip:host SIP/2.0\r\n' +
    'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKtest123\r\n' +
    'From: <sip:1000@host>;tag=abc\r\n' +
    'To: <sip:1000@host>\r\n' +
    'Call-ID: call123\r\n' +
    'CSeq: 1 REGISTER\r\n' +
    'Content-Length: 0\r\n\r\n'
  );
}

function createInviteRequest() {
  return SipMessage.parse(
    'INVITE sip:2000@host SIP/2.0\r\n' +
    'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKinvite1\r\n' +
    'From: <sip:1000@host>;tag=abc\r\n' +
    'To: <sip:2000@host>\r\n' +
    'Call-ID: call456\r\n' +
    'CSeq: 1 INVITE\r\n' +
    'Content-Length: 0\r\n\r\n'
  );
}

describe('ServerTransaction', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe('NIST (Non-INVITE)', () => {
    test('starts in trying state', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);

      expect(tx.state).toBe('trying');
      expect(tx.isInvite).toBe(false);
    });

    test('transitions to completed on 200 OK', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);

      const response = SipMessage.createResponse(200, request);
      tx.sendResponse(response);

      expect(tx.state).toBe('completed');
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

    test('re-sends response on retransmission in completed state', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);

      const response = SipMessage.createResponse(200, request);
      tx.sendResponse(response);
      tx.handleRetransmission();

      expect(transport.send).toHaveBeenCalledTimes(2);
    });

    test('terminates after Timer J for UDP', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);
      const onTerminated = jest.fn();
      tx.on('terminated', onTerminated);

      tx.sendResponse(SipMessage.createResponse(200, request));
      expect(tx.state).toBe('completed');

      jest.advanceTimersByTime(32000); // Timer J = 64*T1
      expect(tx.state).toBe('terminated');
      expect(onTerminated).toHaveBeenCalled();
    });

    test('terminates immediately for TCP', () => {
      const transport = createMockTransport();
      const request = createRegisterRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'TCP' };
      const tx = new ServerTransaction(request, transport, source);
      const onTerminated = jest.fn();
      tx.on('terminated', onTerminated);

      tx.sendResponse(SipMessage.createResponse(200, request));
      expect(tx.state).toBe('terminated');
      expect(onTerminated).toHaveBeenCalled();
    });
  });

  describe('IST (INVITE)', () => {
    test('starts in proceeding state', () => {
      const transport = createMockTransport();
      const request = createInviteRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);

      expect(tx.state).toBe('proceeding');
      expect(tx.isInvite).toBe(true);
    });

    test('terminates on 2xx response', () => {
      const transport = createMockTransport();
      const request = createInviteRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);
      const onTerminated = jest.fn();
      tx.on('terminated', onTerminated);

      tx.sendResponse(SipMessage.createResponse(200, request));
      expect(tx.state).toBe('terminated');
      expect(onTerminated).toHaveBeenCalled();
    });

    test('goes to completed on non-2xx, starts Timer H', () => {
      const transport = createMockTransport();
      const request = createInviteRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);

      tx.sendResponse(SipMessage.createResponse(486, request));
      expect(tx.state).toBe('completed');

      // Timer H should fire and terminate
      jest.advanceTimersByTime(32000);
      expect(tx.state).toBe('terminated');
    });

    test('ACK transitions from completed to confirmed', () => {
      const transport = createMockTransport();
      const request = createInviteRequest();
      const source = { address: '192.168.1.1', port: 5060, transport: 'UDP' };
      const tx = new ServerTransaction(request, transport, source);

      tx.sendResponse(SipMessage.createResponse(486, request));
      expect(tx.state).toBe('completed');

      tx.handleAck(request);
      expect(tx.state).toBe('confirmed');

      // Timer I should terminate
      jest.advanceTimersByTime(5000);
      expect(tx.state).toBe('terminated');
    });
  });
});
