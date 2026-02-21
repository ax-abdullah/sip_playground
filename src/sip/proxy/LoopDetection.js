'use strict';

const config = require('../../config');

class LoopDetection {
  /**
   * Returns true if this request has already passed through us.
   * Checks Via headers for our domain:port.
   */
  static check(request) {
    const vias = request.via;
    if (!vias) return false;

    const ourDomain = config.sip.domain;
    const ourPorts = new Set([
      config.sip.udpPort,
      config.sip.tcpPort,
      config.sip.tlsPort,
      config.sip.wssPort,
    ]);

    for (const via of vias) {
      if (via.host === ourDomain && ourPorts.has(via.port)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = LoopDetection;
