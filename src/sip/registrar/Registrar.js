'use strict';

const SipMessage = require('../message/SipMessage');
const HeaderParser = require('../message/HeaderParser');
const locationService = require('./LocationService');
const logger = require('../../utils/logger');

class Registrar {
  /**
   * Handle a REGISTER request.
   * Authentication is added in Phase 5 via auth gate.
   */
  async handleRegister(request, transaction) {
    // 1. Extract AOR from To header
    const to = request.to;
    if (!to || !to.uri) {
      const resp = SipMessage.createResponse(400, request);
      transaction.sendResponse(resp);
      return;
    }
    const aor = to.uri.aor;

    // 2. Parse Contact and Expires
    const contactHeaders = request.getHeaders('Contact');
    const globalExpires = request.expires;
    const defaultExpires = globalExpires !== null ? globalExpires : 3600;

    // 3. Handle Contact: * (wildcard)
    if (contactHeaders.length === 1 && contactHeaders[0].trim() === '*') {
      if (defaultExpires !== 0) {
        // Contact: * with non-zero Expires is invalid
        const resp = SipMessage.createResponse(400, request);
        transaction.sendResponse(resp);
        return;
      }
      await locationService.removeAllBindings(aor);
      const resp = SipMessage.createResponse(200, request);
      resp.setHeader('Date', new Date().toUTCString());
      transaction.sendResponse(resp);
      return;
    }

    // 4. Process each Contact binding
    for (const contactRaw of contactHeaders) {
      const parsed = HeaderParser.parseNameAddr(contactRaw);
      if (!parsed || !parsed.uri) continue;

      const contactUri = parsed.uri.toString();

      // Per-contact expires overrides global
      const contactExpires = parsed.params && parsed.params.expires !== undefined
        ? parseInt(parsed.params.expires, 10)
        : defaultExpires;

      if (contactExpires === 0) {
        await locationService.removeBinding(aor, contactUri);
      } else {
        const cseq = request.cseq;
        await locationService.addBinding(aor, {
          contactUri,
          expires: contactExpires,
          callId: request.callId,
          cSeq: cseq ? cseq.seq : 0,
          userAgent: request.getHeader('User-Agent'),
          source: request.source ? {
            address: request.source.address,
            port: request.source.port,
            transport: request.source.transport,
          } : null,
        });
      }
    }

    // 5. Build 200 OK with current bindings
    const response = SipMessage.createResponse(200, request);
    response.setHeader('Date', new Date().toUTCString());

    const bindings = await locationService.lookup(aor);
    for (const binding of bindings) {
      const expires = binding.remainingExpiry || defaultExpires;
      response.addHeader('Contact', `<${binding.contactUri}>;expires=${expires}`);
    }

    transaction.sendResponse(response);
  }
}

module.exports = new Registrar();
