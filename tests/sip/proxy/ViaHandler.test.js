'use strict';

const ViaHandler = require('../../../src/sip/proxy/ViaHandler');
const SipMessage = require('../../../src/sip/message/SipMessage');

describe('ViaHandler', () => {
  test('addVia adds Via to top of stack with valid branch', () => {
    const request = SipMessage.parse(
      'REGISTER sip:host SIP/2.0\r\n' +
      'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKoriginal\r\n' +
      'From: <sip:1000@host>;tag=abc\r\n' +
      'To: <sip:1000@host>\r\n' +
      'Call-ID: call1\r\n' +
      'CSeq: 1 REGISTER\r\n' +
      'Content-Length: 0\r\n\r\n'
    );

    const branch = ViaHandler.addVia(request, 'UDP');

    const vias = request.getHeaders('Via');
    expect(vias).toHaveLength(2);
    expect(vias[0]).toContain('branch=');
    expect(branch).toMatch(/^z9hG4bK/);
    // Original Via is now second
    expect(vias[1]).toContain('z9hG4bKoriginal');
  });

  test('removeTopVia removes first Via, leaves remaining', () => {
    const response = SipMessage.parse(
      'SIP/2.0 200 OK\r\n' +
      'Via: SIP/2.0/UDP proxy:5060;branch=z9hG4bKours\r\n' +
      'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKoriginal\r\n' +
      'From: <sip:1000@host>;tag=abc\r\n' +
      'To: <sip:1000@host>;tag=def\r\n' +
      'Call-ID: call1\r\n' +
      'CSeq: 1 REGISTER\r\n' +
      'Content-Length: 0\r\n\r\n'
    );

    ViaHandler.removeTopVia(response);

    const vias = response.getHeaders('Via');
    expect(vias).toHaveLength(1);
    expect(vias[0]).toContain('z9hG4bKoriginal');
  });

  test('processReceivedRport adds rport value', () => {
    const request = SipMessage.parse(
      'REGISTER sip:host SIP/2.0\r\n' +
      'Via: SIP/2.0/UDP 192.168.1.1:5060;branch=z9hG4bKtest;rport\r\n' +
      'From: <sip:1000@host>;tag=abc\r\n' +
      'To: <sip:1000@host>\r\n' +
      'Call-ID: call1\r\n' +
      'CSeq: 1 REGISTER\r\n' +
      'Content-Length: 0\r\n\r\n'
    );

    request.source = { address: '192.168.1.1', port: 50820, transport: 'UDP' };
    ViaHandler.processReceivedRport(request);

    const vias = request.getHeaders('Via');
    expect(vias[0]).toContain('rport=50820');
  });
});
