'use strict';

const config = require('../../config');

class RecordRouteHandler {
  /**
   * Add Record-Route header for dialog-creating requests.
   * The ;lr param indicates loose routing per RFC 3261.
   */
  static addRecordRoute(request, transport) {
    const portMap = {
      UDP: config.sip.udpPort,
      TCP: config.sip.tcpPort,
      TLS: config.sip.tlsPort,
      WS: config.sip.wssPort,
      WSS: config.sip.wssPort,
    };
    const port = portMap[transport] || 5060;
    const rr = `<sip:${config.sip.domain}:${port};lr;transport=${transport.toLowerCase()}>`;
    request.addHeaderTop('Record-Route', rr);
  }
}

module.exports = RecordRouteHandler;
