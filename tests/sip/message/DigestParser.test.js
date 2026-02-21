'use strict';

const DigestParser = require('../../../src/sip/message/DigestParser');

describe('DigestParser', () => {
  describe('parse', () => {
    test('parses Authorization from register_auth.txt (qop, cnonce, nc)', () => {
      const raw = 'Digest username="1000",realm="asterisk",nonce="1471955086/5e8a879717e9231143a0160a5355daaf",uri="sip:192.168.34.144",response="83a86c149feb04598895876a9109c901",cnonce="a6fb2b60f655eb7743403c650fd74cb8",nc=00000001,qop=auth,algorithm=md5,opaque="6e81bca34e2cab98"';
      const result = DigestParser.parse(raw);

      expect(result.username).toBe('1000');
      expect(result.realm).toBe('asterisk');
      expect(result.nonce).toBe('1471955086/5e8a879717e9231143a0160a5355daaf');
      expect(result.uri).toBe('sip:192.168.34.144');
      expect(result.response).toBe('83a86c149feb04598895876a9109c901');
      expect(result.cnonce).toBe('a6fb2b60f655eb7743403c650fd74cb8');
      expect(result.nc).toBe('00000001');
      expect(result.qop).toBe('auth');
      expect(result.algorithm).toBe('md5');
      expect(result.opaque).toBe('6e81bca34e2cab98');
    });

    test('parses Authorization from invite_sdb.txt (different order, spacing)', () => {
      const raw = 'Digest algorithm=MD5, username="2022", realm="asterisk", nonce="0f475b76", uri="sip:5701119694298@hojuzat.bevatel.com", response="af17033e33324fed8721fde740e502c1"';
      const result = DigestParser.parse(raw);

      expect(result.algorithm).toBe('MD5');
      expect(result.username).toBe('2022');
      expect(result.realm).toBe('asterisk');
      expect(result.nonce).toBe('0f475b76');
      expect(result.uri).toBe('sip:5701119694298@hojuzat.bevatel.com');
      expect(result.response).toBe('af17033e33324fed8721fde740e502c1');
    });

    test('parses WWW-Authenticate from unauthorized.txt', () => {
      const raw = 'Digest  realm="asterisk",nonce="1471955086/5e8a879717e9231143a0160a5355daaf",opaque="6e81bca34e2cab98",algorithm=md5,qop="auth"';
      const result = DigestParser.parse(raw);

      expect(result.realm).toBe('asterisk');
      expect(result.nonce).toBe('1471955086/5e8a879717e9231143a0160a5355daaf');
      expect(result.opaque).toBe('6e81bca34e2cab98');
      expect(result.algorithm).toBe('md5');
      expect(result.qop).toBe('auth');
    });

    test('returns null for null input', () => {
      expect(DigestParser.parse(null)).toBeNull();
    });
  });

  describe('serialize', () => {
    test('serialize and re-parse produces identical params', () => {
      const original = {
        username: '1000',
        realm: 'asterisk',
        nonce: 'abc123',
        uri: 'sip:192.168.34.144',
        response: 'deadbeef',
        algorithm: 'md5',
        qop: 'auth',
        nc: '00000001',
        cnonce: 'xyz789',
      };

      const serialized = DigestParser.serialize(original);
      expect(serialized).toMatch(/^Digest /);

      const reparsed = DigestParser.parse(serialized);
      expect(reparsed.username).toBe(original.username);
      expect(reparsed.realm).toBe(original.realm);
      expect(reparsed.nonce).toBe(original.nonce);
      expect(reparsed.uri).toBe(original.uri);
      expect(reparsed.response).toBe(original.response);
      expect(reparsed.algorithm).toBe(original.algorithm);
      expect(reparsed.qop).toBe(original.qop);
      expect(reparsed.nc).toBe(original.nc);
      expect(reparsed.cnonce).toBe(original.cnonce);
    });
  });
});
