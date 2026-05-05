'use strict';

const fs = require('fs');
const path = require('path');
const SipMessage = require('../../../src/sip/message/SipMessage');
const DigestParser = require('../../../src/sip/message/DigestParser');

const MESSAGES_DIR = path.join(__dirname, '../../../docs/assets/messages');

function loadMessage(filename) {
  return fs.readFileSync(path.join(MESSAGES_DIR, filename), 'utf8');
}

describe('SipMessage', () => {
  describe('parse requests', () => {
    test('register.txt: REGISTER with Contact, Expires, Allow', () => {
      const raw = loadMessage('register.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isRequest()).toBe(true);
      expect(msg.method).toBe('REGISTER');
      expect(msg.requestUri.host).toBe('192.168.34.144');

      // Via
      expect(msg.via).toHaveLength(1);
      expect(msg.via[0].transport).toBe('UDP');
      expect(msg.via[0].host).toBe('192.168.34.153');
      expect(msg.via[0].port).toBe(50820);
      expect(msg.via[0].params.branch).toBe('z9hG4bK-524287-1---082e49264cbfbf3a');
      expect(msg.via[0].params.rport).toBeNull();

      // From/To
      expect(msg.from.uri.user).toBe('1000');
      expect(msg.from.params.tag).toBe('2eaa6b0f');
      expect(msg.to.uri.user).toBe('1000');

      // Contact
      expect(msg.contact).toHaveLength(1);
      expect(msg.contact[0].uri.user).toBe('1000');
      expect(msg.contact[0].uri.port).toBe(50820);
      expect(msg.contact[0].uri.params.rinstance).toBe('2faa2f419739e433');

      // Other headers
      expect(msg.callId).toBe('80103NTAyMTdhZjg2ZTc5MTdhMDRjZmNiZWI4Y2VkNDNlMDI');
      expect(msg.cseq.seq).toBe(1);
      expect(msg.cseq.method).toBe('REGISTER');
      expect(msg.expires).toBe(3600);
      expect(msg.maxForwards).toBe(70);
      expect(msg.contentLength).toBe(0);

      // Allow (multi-value)
      const allow = msg.getHeaders('Allow');
      expect(allow.length).toBeGreaterThan(0);

      expect(msg.body).toBeNull();
    });

    test('register_auth.txt: REGISTER with Authorization (Digest)', () => {
      const raw = loadMessage('register_auth.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isRequest()).toBe(true);
      expect(msg.method).toBe('REGISTER');

      const authHeader = msg.getHeader('Authorization');
      expect(authHeader).toBeTruthy();

      const digest = DigestParser.parse(authHeader);
      expect(digest.username).toBe('1000');
      expect(digest.realm).toBe('asterisk');
      expect(digest.qop).toBe('auth');
      expect(digest.nc).toBe('00000001');
    });

    test('invite_sdb.txt: INVITE with SDP body', () => {
      const raw = loadMessage('invite_sdb.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isRequest()).toBe(true);
      expect(msg.method).toBe('INVITE');
      expect(msg.requestUri.user).toBe('5701119694298');
      expect(msg.requestUri.host).toBe('hojuzat.bevatel.com');

      // From with display name
      expect(msg.from.displayName).toBe('Abdullah');
      expect(msg.from.uri.user).toBe('2022');
      expect(msg.from.params.tag).toBe('7flrfnjkca');

      // Via
      expect(msg.via[0].transport).toBe('WSS');

      // Contact
      expect(msg.contact[0].uri.user).toBe('fm9ql4uu');
      expect(msg.contact[0].uri.params.transport).toBe('wss');

      // Body
      expect(msg.body).toBeTruthy();
      expect(msg.body).toContain('v=0');
      expect(msg.body).toContain('m=audio');

      // Content-Type
      expect(msg.getHeader('Content-Type')).toBe('application/sdp');
    });

    test('ack.txt: ACK with transport=ws in URI', () => {
      const raw = loadMessage('ack.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isRequest()).toBe(true);
      expect(msg.method).toBe('ACK');
    });

    test('bye.txt: BYE with Proxy-Authorization and X-Asterisk headers', () => {
      const raw = loadMessage('bye.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isRequest()).toBe(true);
      expect(msg.method).toBe('BYE');

      expect(msg.hasHeader('Proxy-Authorization')).toBe(true);
    });
  });

  describe('parse responses', () => {
    test('unauthorized.txt: 401 with WWW-Authenticate', () => {
      const raw = loadMessage('unauthorized.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isResponse()).toBe(true);
      expect(msg.statusCode).toBe(401);
      expect(msg.reasonPhrase).toBe('Unauthorized');

      // Via with received and rport
      expect(msg.via[0].params.received).toBe('192.168.34.153');
      expect(msg.via[0].params.rport).toBe('50820');

      // WWW-Authenticate
      const wwwAuth = msg.getHeader('WWW-Authenticate');
      expect(wwwAuth).toBeTruthy();
      const digest = DigestParser.parse(wwwAuth);
      expect(digest.realm).toBe('asterisk');

      // Content-Length with extra space
      expect(msg.contentLength).toBe(0);
    });

    test('trying.txt: 100 Trying with Via params', () => {
      const raw = loadMessage('trying.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isResponse()).toBe(true);
      expect(msg.statusCode).toBe(100);
      expect(msg.reasonPhrase).toBe('Trying');
    });

    test('200_OK.txt: 200 OK with Allow', () => {
      const raw = loadMessage('200_OK.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isResponse()).toBe(true);
      expect(msg.statusCode).toBe(200);
      expect(msg.reasonPhrase).toBe('OK');
    });

    test('ok_sdb.txt: 200 OK with SDP body', () => {
      const raw = loadMessage('ok_sdb.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isResponse()).toBe(true);
      expect(msg.statusCode).toBe(200);
      expect(msg.body).toBeTruthy();
      expect(msg.body).toContain('v=0');
    });

    test('ok_after_bye.txt: 200 OK for BYE', () => {
      const raw = loadMessage('ok_after_bye.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isResponse()).toBe(true);
      expect(msg.statusCode).toBe(200);
    });

    test('ok_after_trying.txt: 200 OK with Allow methods', () => {
      const raw = loadMessage('ok_after_trying.txt');
      const msg = SipMessage.parse(raw);

      expect(msg.isResponse()).toBe(true);
      expect(msg.statusCode).toBe(200);
    });
  });

  describe('createResponse', () => {
    test('creates 401 from REGISTER request with correct headers', () => {
      const raw = loadMessage('register.txt');
      const request = SipMessage.parse(raw);

      const response = SipMessage.createResponse(401, request);

      expect(response.isResponse()).toBe(true);
      expect(response.statusCode).toBe(401);
      expect(response.reasonPhrase).toBe('Unauthorized');

      // Verify mandatory headers are copied
      expect(response.callId).toBe(request.callId);
      expect(response.cseq.seq).toBe(request.cseq.seq);
      expect(response.cseq.method).toBe(request.cseq.method);
      expect(response.getHeaders('Via')).toEqual(request.getHeaders('Via'));
      expect(response.getHeader('From')).toBe(request.getHeader('From'));

      // To should have a tag added
      expect(response.getHeader('To')).toContain('tag=');
    });

    test('creates 200 from REGISTER request', () => {
      const raw = loadMessage('register.txt');
      const request = SipMessage.parse(raw);

      const response = SipMessage.createResponse(200, request);

      expect(response.statusCode).toBe(200);
      expect(response.reasonPhrase).toBe('OK');
    });
  });

  describe('serialization', () => {
    test('serialized output uses \\r\\n line endings', () => {
      const raw = loadMessage('register.txt');
      const msg = SipMessage.parse(raw);
      const serialized = msg.toString();

      // Must contain \r\n
      expect(serialized).toContain('\r\n');

      // Must have blank line separating headers from body
      expect(serialized).toContain('\r\n\r\n');
    });

    test('Content-Length is accurate after serialization', () => {
      const raw = loadMessage('invite_sdb.txt');
      const msg = SipMessage.parse(raw);
      const serialized = msg.toString();

      // Extract Content-Length from serialized output
      const clMatch = serialized.match(/Content-Length: (\d+)/);
      expect(clMatch).toBeTruthy();
      const cl = parseInt(clMatch[1], 10);

      // Extract body from serialized
      const bodyStart = serialized.indexOf('\r\n\r\n') + 4;
      const body = serialized.substring(bodyStart);
      expect(Buffer.byteLength(body, 'utf8')).toBe(cl);
    });
  });

  describe('header methods', () => {
    test('getHeader returns first value', () => {
      const msg = new SipMessage();
      msg.headers.set('Via', ['first', 'second']);
      expect(msg.getHeader('Via')).toBe('first');
    });

    test('getHeaders returns all values', () => {
      const msg = new SipMessage();
      msg.headers.set('Via', ['first', 'second']);
      expect(msg.getHeaders('Via')).toEqual(['first', 'second']);
    });

    test('setHeader replaces existing', () => {
      const msg = new SipMessage();
      msg.setHeader('Via', 'value1');
      msg.setHeader('Via', 'value2');
      expect(msg.getHeaders('Via')).toEqual(['value2']);
    });

    test('addHeader appends', () => {
      const msg = new SipMessage();
      msg.addHeader('Via', 'first');
      msg.addHeader('Via', 'second');
      expect(msg.getHeaders('Via')).toEqual(['first', 'second']);
    });

    test('addHeaderTop prepends', () => {
      const msg = new SipMessage();
      msg.addHeader('Via', 'first');
      msg.addHeaderTop('Via', 'top');
      expect(msg.getHeaders('Via')).toEqual(['top', 'first']);
    });

    test('removeHeader deletes all values', () => {
      const msg = new SipMessage();
      msg.addHeader('Via', 'value');
      msg.removeHeader('Via');
      expect(msg.hasHeader('Via')).toBe(false);
    });

    test('hasHeader returns correct boolean', () => {
      const msg = new SipMessage();
      expect(msg.hasHeader('Via')).toBe(false);
      msg.addHeader('Via', 'value');
      expect(msg.hasHeader('Via')).toBe(true);
    });
  });

  describe('clone', () => {
    test('produces independent copy', () => {
      const raw = loadMessage('register.txt');
      const msg = SipMessage.parse(raw);
      const cloned = msg.clone();

      expect(cloned.method).toBe(msg.method);
      expect(cloned.callId).toBe(msg.callId);

      // Mutate original
      msg.setHeader('Call-ID', 'changed');
      expect(cloned.callId).not.toBe('changed');
    });
  });
});
