'use strict';

const SipMessage = require('../message/SipMessage');
const { serialize } = require('../message/serializer');
const ViaHandler = require('./ViaHandler');
const RecordRouteHandler = require('./RecordRouteHandler');
const LoopDetection = require('./LoopDetection');
const RequestRouter = require('./RequestRouter');
const registrar = require('../registrar/Registrar');
const digestAuth = require('../auth/DigestAuth');
const config = require('../../config');
const logger = require('../../utils/logger');

class ProxyCore {
  constructor(transactionManager) {
    this.txManager = transactionManager;
    this.txManager.on('request', (request, serverTx) => {
      this._handleRequest(request, serverTx).catch(err => {
        logger.error('ProxyCore request error', { error: err.message, stack: err.stack });
        if (serverTx) {
          try {
            const errResp = SipMessage.createResponse(500, request);
            serverTx.sendResponse(errResp);
          } catch (e) {
            // best effort
          }
        }
      });
    });
  }

  async _handleRequest(request, serverTx) {
    // 1. Validate Max-Forwards
    const mf = request.maxForwards;
    if (mf !== null && mf <= 0) {
      serverTx.sendResponse(SipMessage.createResponse(483, request));
      return;
    }

    // 2. Loop detection
    if (LoopDetection.check(request)) {
      serverTx.sendResponse(SipMessage.createResponse(482, request));
      return;
    }

    // 3. Process rport/received on incoming Via
    ViaHandler.processReceivedRport(request);

    // 4. Route
    const routeResult = await RequestRouter.route(request);

    switch (routeResult.action) {
      case 'registrar':
        await this._handleRegister(request, serverTx);
        break;

      case 'local':
        this._handleLocal(request, serverTx);
        break;

      case 'reject':
        serverTx.sendResponse(
          SipMessage.createResponse(routeResult.statusCode, request)
        );
        break;

      case 'proxy':
        await this._proxyRequest(request, serverTx, routeResult.targets);
        break;

      case 'cancel':
        this._handleCancel(request, serverTx);
        break;
    }
  }

  async _handleRegister(request, serverTx) {
    // Auth gate
    const authHeader = request.getHeader('Authorization');
    if (!authHeader) {
      await digestAuth.createChallenge(request, serverTx);
      return;
    }
    const authResult = await digestAuth.validate(request, 'Authorization');
    if (authResult !== true) {
      logger.warn('REGISTER auth failed', { reason: authResult });
      await digestAuth.createChallenge(request, serverTx);
      return;
    }
    await registrar.handleRegister(request, serverTx);
  }

  async _proxyRequest(request, serverTx, targets) {
    const target = targets[0]; // First target

    // Clone for forwarding
    const fwd = request.clone();

    // Decrement Max-Forwards
    fwd.setHeader('Max-Forwards', String((fwd.maxForwards || 70) - 1));

    // Update Request-URI to target contact
    fwd.requestUri = target.uri;

    // Determine outbound transport
    const outTransport = target.transport || 'UDP';

    // Add our Via
    ViaHandler.addVia(fwd, outTransport);

    // Add Record-Route for dialog-creating requests
    if (['INVITE', 'SUBSCRIBE'].includes(request.method)) {
      RecordRouteHandler.addRecordRoute(fwd, outTransport);
    }

    // Build destination
    const destination = {
      address: target.source.address,
      port: target.source.port,
      transport: outTransport,
      connection: target.source.connection || null,
    };

    // Send 100 Trying immediately for INVITE
    if (request.method === 'INVITE' && serverTx) {
      const trying = SipMessage.createResponse(100, request);
      // Don't add tag to 100 Trying
      const toValues = trying.headers.get('To');
      if (toValues && toValues[0]) {
        toValues[0] = toValues[0].replace(/;tag=[^;]+$/, '');
      }
      this.txManager.transport.send(serialize(trying), request.source);
    }

    // Create client transaction
    const clientTx = this.txManager.createClientTransaction(fwd, destination);

    // Relay responses
    clientTx.on('response', (response) => {
      ViaHandler.removeTopVia(response);

      if (serverTx) {
        serverTx.sendResponse(response);
      }
    });
  }

  _handleLocal(request, serverTx) {
    const response = SipMessage.createResponse(200, request);
    response.setHeader('Allow', 'INVITE, ACK, CANCEL, OPTIONS, BYE, REGISTER, SUBSCRIBE, NOTIFY, INFO, MESSAGE');
    response.setHeader('Accept', 'application/sdp');
    response.setHeader('Supported', 'replaces');
    response.setHeader('Server', config.sip.serverName);
    serverTx.sendResponse(response);
  }

  _handleCancel(request, serverTx) {
    const via = request.via;
    const branch = via && via[0] ? via[0].params.branch : null;
    const inviteTxId = `${branch}-INVITE`;
    const inviteTx = this.txManager.serverTransactions.get(inviteTxId);

    if (inviteTx) {
      serverTx.sendResponse(SipMessage.createResponse(200, request));
      inviteTx.sendResponse(SipMessage.createResponse(487, inviteTx.request));
    } else {
      serverTx.sendResponse(SipMessage.createResponse(481, request));
    }
  }
}

module.exports = ProxyCore;
