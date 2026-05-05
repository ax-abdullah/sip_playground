'use strict';

const LoopDetection = require('../../../src/sip/proxy/LoopDetection');
const SipMessage = require('../../../src/sip/message/SipMessage');

describe('LoopDetection', () => {
  test('returns false when no Via matches our domain', () => {
    const request = SipMessage.parse(
      'INVITE sip:2000@host SIP/2.0\r\n' +
      'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKtest\r\n' +
      'From: <sip:1000@host>;tag=abc\r\n' +
      'To: <sip:2000@host>\r\n' +
      'Call-ID: call1\r\n' +
      'CSeq: 1 INVITE\r\n' +
      'Content-Length: 0\r\n\r\n'
    );

    expect(LoopDetection.check(request)).toBe(false);
  });

  test('returns true when Via matches our domain and port', () => {
    const request = SipMessage.parse(
      'INVITE sip:2000@host SIP/2.0\r\n' +
      'Via: SIP/2.0/UDP localhost:5060;branch=z9hG4bKtest\r\n' +
      'From: <sip:1000@host>;tag=abc\r\n' +
      'To: <sip:2000@host>\r\n' +
      'Call-ID: call1\r\n' +
      'CSeq: 1 INVITE\r\n' +
      'Content-Length: 0\r\n\r\n'
    );

    expect(LoopDetection.check(request)).toBe(true);
  });
});
