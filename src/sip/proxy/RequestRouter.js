'use strict';

const locationService = require('../registrar/LocationService');
const SipUri = require('../message/SipUri');
const config = require('../../config');
const logger = require('../../utils/logger');

class RequestRouter {
  async route(request) {
    const method = request.method;

    if (method === 'REGISTER') {
      return { action: 'registrar' };
    }

    if (method === 'CANCEL') {
      return { action: 'cancel' };
    }

    if (method === 'OPTIONS' && this._isTargetUs(request.requestUri)) {
      return { action: 'local' };
    }

    // Check for Route header (in-dialog request)
    if (request.hasHeader('Route')) {
      return this._routeWithRouteHeader(request);
    }

    // Lookup target in location service
    const aor = request.requestUri.aor;
    const bindings = await locationService.lookup(aor);

    if (bindings.length === 0) {
      return { action: 'reject', statusCode: 404, reason: 'User Not Found' };
    }

    return {
      action: 'proxy',
      targets: bindings.map(b => ({
        uri: SipUri.parse(b.contactUri),
        source: b.source,
        transport: b.source ? b.source.transport : 'UDP',
      })),
    };
  }

  _isTargetUs(uri) {
    if (!uri) return false;
    return uri.host === config.sip.domain ||
           uri.host === 'localhost' ||
           uri.host === '127.0.0.1';
  }

  _routeWithRouteHeader(request) {
    // In-dialog routing: remove top Route if it points to us
    const routes = request.getHeaders('Route');
    if (routes && routes.length > 0) {
      const topRoute = routes[0];
      // Check if top Route points to us (contains ;lr)
      if (topRoute.includes(config.sip.domain) && topRoute.includes(';lr')) {
        // Remove our Route header, route based on Request-URI
        routes.shift();
        if (routes.length > 0) {
          request.headers.set('Route', routes);
        } else {
          request.headers.delete('Route');
        }
      }
    }

    // Route based on Request-URI after removing our Route
    const aor = request.requestUri.aor;
    return {
      action: 'proxy',
      targets: [{
        uri: request.requestUri,
        source: { address: request.requestUri.host, port: request.requestUri.port || 5060, transport: 'UDP' },
        transport: 'UDP',
      }],
    };
  }
}

module.exports = new RequestRouter();
