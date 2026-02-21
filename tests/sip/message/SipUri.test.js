'use strict';

const SipUri = require('../../../src/sip/message/SipUri');

describe('SipUri', () => {
  describe('parse', () => {
    test('parses simple URI with no user and no port', () => {
      const uri = SipUri.parse('sip:192.168.34.144');
      expect(uri.scheme).toBe('sip');
      expect(uri.user).toBeNull();
      expect(uri.host).toBe('192.168.34.144');
      expect(uri.port).toBeNull();
      expect(uri.aor).toBe('192.168.34.144');
    });

    test('parses URI with user, port, and params', () => {
      const uri = SipUri.parse('sip:1000@192.168.34.153:50820;rinstance=2faa2f419739e433');
      expect(uri.scheme).toBe('sip');
      expect(uri.user).toBe('1000');
      expect(uri.host).toBe('192.168.34.153');
      expect(uri.port).toBe(50820);
      expect(uri.params.rinstance).toBe('2faa2f419739e433');
      expect(uri.aor).toBe('1000@192.168.34.153');
    });

    test('parses URI with user and hostname (no port)', () => {
      const uri = SipUri.parse('sip:5701119694298@hojuzat.bevatel.com');
      expect(uri.user).toBe('5701119694298');
      expect(uri.host).toBe('hojuzat.bevatel.com');
      expect(uri.port).toBeNull();
    });

    test('parses URI with transport param and flag param (ob)', () => {
      const uri = SipUri.parse('sip:fm9ql4uu@192.0.2.13;transport=wss;ob');
      expect(uri.user).toBe('fm9ql4uu');
      expect(uri.host).toBe('192.0.2.13');
      expect(uri.params.transport).toBe('wss');
      expect(uri.params.ob).toBeNull(); // flag param
    });

    test('parses URI with port 0', () => {
      const uri = SipUri.parse('sip:5701119694298@15.188.152.201:0;transport=ws');
      expect(uri.port).toBe(0);
      expect(uri.params.transport).toBe('ws');
    });

    test('parses simple user@host URI', () => {
      const uri = SipUri.parse('sip:bob@biloxi.com');
      expect(uri.user).toBe('bob');
      expect(uri.host).toBe('biloxi.com');
    });

    test('parses sips scheme', () => {
      const uri = SipUri.parse('sips:alice@atlanta.com');
      expect(uri.scheme).toBe('sips');
      expect(uri.user).toBe('alice');
      expect(uri.host).toBe('atlanta.com');
    });

    test('parses URI wrapped in angle brackets', () => {
      const uri = SipUri.parse('<sip:1000@192.168.34.153:50820>');
      expect(uri.user).toBe('1000');
      expect(uri.host).toBe('192.168.34.153');
      expect(uri.port).toBe(50820);
    });

    test('throws on empty string', () => {
      expect(() => SipUri.parse('')).toThrow();
    });

    test('throws on unsupported scheme', () => {
      expect(() => SipUri.parse('tel:+1234567890')).toThrow('Unsupported URI scheme');
    });
  });

  describe('toString', () => {
    test('round-trips a simple URI', () => {
      const original = 'sip:1000@192.168.34.153:50820';
      const uri = SipUri.parse(original);
      expect(uri.toString()).toBe(original);
    });

    test('round-trips URI with params', () => {
      const original = 'sip:fm9ql4uu@192.0.2.13;transport=wss;ob';
      const uri = SipUri.parse(original);
      expect(uri.toString()).toBe(original);
    });

    test('round-trips URI with no user', () => {
      const original = 'sip:192.168.34.144';
      const uri = SipUri.parse(original);
      expect(uri.toString()).toBe(original);
    });
  });

  describe('clone', () => {
    test('produces an independent copy', () => {
      const uri = SipUri.parse('sip:1000@host:5060;transport=tcp');
      const cloned = uri.clone();

      expect(cloned.user).toBe('1000');
      expect(cloned.host).toBe('host');
      expect(cloned.port).toBe(5060);
      expect(cloned.params.transport).toBe('tcp');

      // Mutate original, verify clone is unaffected
      uri.user = 'changed';
      uri.params.transport = 'udp';
      expect(cloned.user).toBe('1000');
      expect(cloned.params.transport).toBe('tcp');
    });
  });
});
