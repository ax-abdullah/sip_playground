'use strict';

const HeaderParser = require('../../../src/sip/message/HeaderParser');

describe('HeaderParser', () => {
  describe('parseVia', () => {
    test('parses UDP Via with branch and rport flag', () => {
      const raw = 'SIP/2.0/UDP 192.168.34.153:50820;branch=z9hG4bK-524287-1---082e49264cbfbf3a;rport';
      const via = HeaderParser.parseVia(raw);
      expect(via.protocol).toBe('SIP');
      expect(via.version).toBe('2.0');
      expect(via.transport).toBe('UDP');
      expect(via.host).toBe('192.168.34.153');
      expect(via.port).toBe(50820);
      expect(via.params.branch).toBe('z9hG4bK-524287-1---082e49264cbfbf3a');
      expect(via.params.rport).toBeNull(); // flag param
    });

    test('parses WSS Via without port', () => {
      const raw = 'SIP/2.0/WSS 192.0.2.13;branch=z9hG4bK7569671';
      const via = HeaderParser.parseVia(raw);
      expect(via.transport).toBe('WSS');
      expect(via.host).toBe('192.0.2.13');
      expect(via.port).toBeNull();
      expect(via.params.branch).toBe('z9hG4bK7569671');
    });

    test('parses Via with received and rport values', () => {
      const raw = 'SIP/2.0/UDP 192.168.34.153:50820;rport=50820;received=192.168.34.153;branch=z9hG4bK-524287-1---082e49264cbfbf3a';
      const via = HeaderParser.parseVia(raw);
      expect(via.params.rport).toBe('50820');
      expect(via.params.received).toBe('192.168.34.153');
      expect(via.params.branch).toBe('z9hG4bK-524287-1---082e49264cbfbf3a');
    });

    test('returns null for null input', () => {
      expect(HeaderParser.parseVia(null)).toBeNull();
    });
  });

  describe('parseNameAddr', () => {
    test('parses From with display name and tag', () => {
      const raw = '"Abdullah" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca';
      const result = HeaderParser.parseNameAddr(raw);
      expect(result.displayName).toBe('Abdullah');
      expect(result.uri.user).toBe('2022');
      expect(result.uri.host).toBe('hojuzat.bevatel.com');
      expect(result.params.tag).toBe('7flrfnjkca');
    });

    test('parses From without display name but with tag', () => {
      const raw = '<sip:1000@192.168.34.144>;tag=2eaa6b0f';
      const result = HeaderParser.parseNameAddr(raw);
      expect(result.displayName).toBeNull();
      expect(result.uri.user).toBe('1000');
      expect(result.uri.host).toBe('192.168.34.144');
      expect(result.params.tag).toBe('2eaa6b0f');
    });

    test('parses Contact with rinstance param', () => {
      const raw = '<sip:1000@192.168.34.153:50820;rinstance=2faa2f419739e433>';
      const result = HeaderParser.parseNameAddr(raw);
      expect(result.uri.user).toBe('1000');
      expect(result.uri.port).toBe(50820);
      expect(result.uri.params.rinstance).toBe('2faa2f419739e433');
    });

    test('parses Contact with transport=wss and ob flag', () => {
      const raw = '<sip:fm9ql4uu@192.0.2.13;transport=wss;ob>';
      const result = HeaderParser.parseNameAddr(raw);
      expect(result.uri.user).toBe('fm9ql4uu');
      expect(result.uri.params.transport).toBe('wss');
      expect(result.uri.params.ob).toBeNull();
    });

    test('parses To without display name and without tag', () => {
      const raw = '<sip:5701119694298@hojuzat.bevatel.com>';
      const result = HeaderParser.parseNameAddr(raw);
      expect(result.displayName).toBeNull();
      expect(result.uri.user).toBe('5701119694298');
      expect(Object.keys(result.params)).toHaveLength(0);
    });

    test('handles Contact wildcard', () => {
      const result = HeaderParser.parseNameAddr('*');
      expect(result.wildcard).toBe(true);
      expect(result.uri).toBeNull();
    });

    test('returns null for null input', () => {
      expect(HeaderParser.parseNameAddr(null)).toBeNull();
    });
  });

  describe('parseCSeq', () => {
    test('parses "1 REGISTER"', () => {
      const result = HeaderParser.parseCSeq('1 REGISTER');
      expect(result.seq).toBe(1);
      expect(result.method).toBe('REGISTER');
    });

    test('parses "2 INVITE"', () => {
      const result = HeaderParser.parseCSeq('2 INVITE');
      expect(result.seq).toBe(2);
      expect(result.method).toBe('INVITE');
    });

    test('parses "314159 INVITE"', () => {
      const result = HeaderParser.parseCSeq('314159 INVITE');
      expect(result.seq).toBe(314159);
      expect(result.method).toBe('INVITE');
    });
  });

  describe('parseContentLength', () => {
    test('parses "0"', () => {
      expect(HeaderParser.parseContentLength('0')).toBe(0);
    });

    test('parses " 0" (with leading space)', () => {
      expect(HeaderParser.parseContentLength(' 0')).toBe(0);
    });

    test('parses "1556"', () => {
      expect(HeaderParser.parseContentLength('1556')).toBe(1556);
    });

    test('returns 0 for null', () => {
      expect(HeaderParser.parseContentLength(null)).toBe(0);
    });
  });
});
