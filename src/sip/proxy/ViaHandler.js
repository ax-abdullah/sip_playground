'use strict';

const crypto = require('crypto');
const config = require('../../config');
const HeaderParser = require('../message/HeaderParser');

class ViaHandler {
  /**
   * Add our Via to the top of the Via stack.
   * Returns the generated branch parameter.
   */
  static addVia(request, transport) {
    const branch = 'z9hG4bK' + crypto.randomBytes(12).toString('hex');
    const portMap = {
      UDP: config.sip.udpPort,
      TCP: config.sip.tcpPort,
      TLS: config.sip.tlsPort,
      WS: config.sip.wssPort,
      WSS: config.sip.wssPort,
    };
    const port = portMap[transport] || 5060;
    const via = `SIP/2.0/${transport} ${config.sip.domain}:${port};branch=${branch};rport`;
    request.addHeaderTop('Via', via);
    return branch;
  }

  /**
   * Remove the top Via from a response (should be ours).
   */
  static removeTopVia(response) {
    const vias = response.getHeaders('Via');
    if (vias && vias.length > 1) {
      vias.shift();
      response.headers.set('Via', vias);
    } else if (vias && vias.length === 1) {
      response.headers.delete('Via');
    }
  }

  /**
   * Process received/rport on an incoming request's top Via.
   * Adds received=<source-ip> and rport=<source-port> per RFC 3581.
   */
  static processReceivedRport(request) {
    const vias = request.getHeaders('Via');
    if (!vias || vias.length === 0) return;

    const topVia = vias[0];
    const source = request.source;
    if (!source) return;

    const parsedVia = HeaderParser.parseVia(topVia);
    if (!parsedVia) return;

    let modified = topVia;

    // Add received= if source IP differs from Via host
    if (parsedVia.host !== source.address) {
      if (!modified.includes('received=')) {
        modified += `;received=${source.address}`;
      }
    }

    // Replace rport flag with rport=<port>
    if (modified.match(/;rport(?!=)/)) {
      modified = modified.replace(/;rport(?!=)/, `;rport=${source.port}`);
    } else if (!modified.includes('rport=')) {
      modified += `;rport=${source.port}`;
    }

    vias[0] = modified;
    request.headers.set('Via', vias);
  }
}

module.exports = ViaHandler;
