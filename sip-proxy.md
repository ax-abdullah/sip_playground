# SIP Proxy Implementation Plan
 
## Context
 
The `sip_playground` project is a Node.js (>=22, CommonJS) application with Express (port 3000), Redis (ioredis with `app:` keyPrefix), Socket.io, and Winston logging. It contains a broken 45-line SIP parser (`src/services/SIP/parser.js`) with duplicate methods, no header parsing, and `JSON.parse` on SDP bodies. The goal is to build a **complete RFC 3261 SIP proxy from scratch** — a hybrid stateless proxy / B2BUA with registrar, Digest authentication, and all four transports (UDP, TCP, TLS, WSS).
 
### Key Constraints
- **Line endings**: Sample messages in `docs/assets/messages/` use `\n` (LF). Parser must accept both `\n` and `\r\n`. Serializer must always produce `\r\n`.
- **Redis**: SIP code uses `redisService.getClient()` for raw ioredis (bypassing `app:` prefix). All SIP keys use manual `sip:` prefix.
- **WebSocket**: Must use `ws` library (not Socket.io) for SIP subprotocol negotiation per RFC 7118.
- **CommonJS**: All modules use `require`/`module.exports`.
 
---
 
## Directory Structure
 
```
src/sip/
  index.js                         SipStack facade
  constants.js                     Methods, response codes, compact forms, timers
  errors.js                        SipError, SipParseError, SipTransportError
  message/
    index.js                       Re-exports
    SipMessage.js                  Core message class (request + response)
    SipUri.js                      SIP URI parser/serializer
    HeaderParser.js                Typed header parsers (Via, From/To, CSeq, etc.)
    DigestParser.js                Digest auth header parsing/serialization
    headers.js                     Header name normalization, compact-form map
    serializer.js                  Message-to-wire-format serializer
  transport/
    index.js                       TransportManager
    Connection.js                  TCP stream framing (Content-Length based)
    UdpTransport.js                UDP via dgram
    TcpTransport.js                TCP with Content-Length framing
    TlsTransport.js                TLS (same as TCP + tls module)
    WsTransport.js                 WebSocket via 'ws' library
  transaction/
    index.js                       TransactionManager
    ClientTransaction.js           ICT + NICT state machines
    ServerTransaction.js           IST + NIST state machines
    Timers.js                      Named timer utility
  proxy/
    index.js                       ProxyCore (central routing engine)
    RequestRouter.js               Routing decisions
    ViaHandler.js                  Via add/remove/rport
    RecordRouteHandler.js          Record-Route insertion
    LoopDetection.js               Loop detection via Via inspection
  registrar/
    index.js                       Module exports
    Registrar.js                   REGISTER handler (RFC 3261 §10)
    LocationService.js             Redis-backed AOR-to-Contact store
  auth/
    index.js                       Module exports
    DigestAuth.js                  Digest challenge/validate (RFC 2617)
    NonceStore.js                  Redis nonce lifecycle (TTL 300s)
    UserStore.js                   User credentials (HA1 hashes in Redis)
```
 
---
 
## Existing Code to Reuse
 
| File | Usage |
|------|-------|
| `src/services/redis.js` | `getClient()` for raw ioredis — location service, nonce store, user store |
| `src/utils/logger.js` | Winston logger — all SIP modules import directly |
| `src/config/index.js` | Extend Joi schema with SIP env vars |
| `src/middleware/errorHandler.js` | `asyncHandler` for REST API routes |
| `src/utils/response.js` | `ApiResponse` for management API responses |
 
## Existing Code to Delete (Phase 7)
 
| File | Reason |
|------|--------|
| `src/services/SIP/parser.js` | Replaced by `src/sip/message/` |
| `src/controllers/SIP/sipParserController.js` | No longer needed |
| `src/routes/sipParserRoutes.js` | Replaced by `src/routes/sipRoutes.js` |
 
---
 
## Phase 1: SIP Message Layer
 
**Goal**: RFC 3261 compliant SIP message parser and serializer.
**Milestone**: Parse all 11 messages in `docs/assets/messages/`, round-trip correctly.
 
### Files to Create
 
**`src/sip/constants.js`** — All 14 SIP methods, response codes (100-699), compact form map (`i`→`Call-ID`, `v`→`Via`, etc.), timer values (T1=500ms, T2=4s, T4=5s, all derived), transport enum.
 
**`src/sip/errors.js`** — `SipError(message, sipCode)`, `SipParseError(message, rawData)`, `SipTransportError(message)`, `SipTransactionError(message)`.
 
**`src/sip/message/headers.js`** — `CANONICAL_NAMES` map (lowercase→canonical), `MULTI_VALUE_HEADERS` set, `CompactForms` map. Functions: `normalize(rawName)`, `isMultiValue(canonicalName)`.
 
**`src/sip/message/SipUri.js`** — Class with `scheme`, `user`, `password`, `host`, `port`, `params`, `headers`. Static `parse(uriString)`, `toString()`, `clone()`, getter `aor` (returns `user@host`). Must handle all URI patterns from sample messages:
- `sip:192.168.34.144` (no user)
- `sip:1000@192.168.34.153:50820;rinstance=2faa2f419739e433`
- `sip:fm9ql4uu@192.0.2.13;transport=wss;ob` (flag param)
 
**`src/sip/message/HeaderParser.js`** — Static methods:
- `parseVia(raw)` → `{ protocol, version, transport, host, port, params }` — handles `rport` flag param
- `parseNameAddr(raw)` → `{ displayName, uri: SipUri, params }` — handles quoted display names, angle brackets
- `parseCSeq(raw)` → `{ seq, method }`
- `parseContentLength(raw)` → number (trims whitespace)
 
**`src/sip/message/DigestParser.js`** — `static parse(headerValue)` → object with all digest params (handles both quoted/unquoted values, varying spacing). `static serialize(params)`.
 
**`src/sip/message/SipMessage.js`** — Core class:
- Properties: `type`, `method`, `requestUri`, `statusCode`, `reasonPhrase`, `version`, `headers` (Map<string, string[]>), `body`, `source`
- `static parse(rawString)` — Normalize `\r\n` to `\n`, split on `\n\n`, parse start line (request or response), parse headers with folding support, extract body
- `static createResponse(statusCode, request, extraHeaders)` — Copy Via/From/To/Call-ID/CSeq from request, generate To-tag for dialog-creating responses
- `static createRequest(method, requestUri, headers)`
- Instance: `getHeader(name)`, `getHeaders(name)`, `setHeader(name, value)`, `addHeader(name, value)`, `addHeaderTop(name, value)`, `removeHeader(name)`, `hasHeader(name)`
- Typed getters (lazy parsing): `via`, `from`, `to`, `callId`, `cseq`, `contact`, `maxForwards`, `contentLength`, `expires`
- `clone()`, `toString()`, `isRequest()`, `isResponse()`
 
**`src/sip/message/serializer.js`** — `serialize(msg)` → wire-format string with `\r\n`, priority header ordering (Via, Max-Forwards, From, To, Call-ID, CSeq), Content-Length always last and auto-calculated.
 
**`src/sip/message/index.js`** — Re-exports all message classes.
 
### Config Modification
 
**`src/config/index.js`** — Add to Joi schema: `SIP_DOMAIN`, `SIP_UDP_PORT`, `SIP_TCP_PORT`, `SIP_TLS_PORT`, `SIP_WSS_PORT`, `SIP_TLS_CERT`, `SIP_TLS_KEY`, `SIP_REALM`, `SIP_SERVER_NAME`, `SIP_LOG_MESSAGES`. Add `sip` section to config object.
 
### Tests
 
- `tests/sip/message/SipUri.test.js` — Parse all URI patterns from samples, round-trip, clone
- `tests/sip/message/HeaderParser.test.js` — Via (UDP/WSS/with rport flag), From/To, Contact, CSeq
- `tests/sip/message/DigestParser.test.js` — Parse auth headers from `register_auth.txt` and `invite_sdb.txt`
- `tests/sip/message/SipMessage.test.js` — Parse all 11 sample messages, verify fields, createResponse, serialization with `\r\n`
 
---
 
## Phase 2: Transport Layer
 
**Goal**: Accept/send SIP messages over UDP, TCP, TLS, and WSS.
**Milestone**: Receive a REGISTER over UDP, send back a hardcoded 200 OK.
**New dependency**: `ws@^8.18.0`
 
### Files to Create
 
**`src/sip/transport/Connection.js`** — TCP/TLS stream framing: buffers data, extracts complete messages via `\r\n\r\n` + Content-Length. Handles partial headers, partial bodies, multiple messages per TCP segment.
 
**`src/sip/transport/UdpTransport.js`** — `dgram.createSocket('udp4')`, emits `('message', rawString, { address, port, transport: 'UDP' })`.
 
**`src/sip/transport/TcpTransport.js`** — `net.createServer()`, creates `Connection` per client, tracks connections by UUID.
 
**`src/sip/transport/TlsTransport.js`** — Same as TCP but `tls.createServer()`, only started if certs configured.
 
**`src/sip/transport/WsTransport.js`** — `ws.WebSocketServer` with `'sip'` subprotocol negotiation. Each WebSocket frame = one SIP message (no Content-Length framing needed).
 
**`src/sip/transport/index.js`** — `TransportManager` extends EventEmitter. Starts all transports, unifies `send(messageString, destination)`, emits `('message', raw, source)`.
 
### Tests
 
- `tests/sip/transport/Connection.test.js` — Complete message, partial chunks, two-in-one, Content-Length: 0, large SDP body
- `tests/sip/transport/UdpTransport.test.js` — Send/receive via dgram client
- `tests/sip/transport/TransportManager.test.js` — Start/stop, multi-transport message routing
 
---
 
## Phase 3: Transaction Layer
 
**Goal**: RFC 3261 §17 state machines with timer-driven retransmissions.
**Milestone**: Server transaction correctly handles REGISTER retransmissions.
 
### Files to Create
 
**`src/sip/transaction/Timers.js`** — Named timer management: `set(name, delay, cb)`, `clear(name)`, `clearAll()`.
 
**`src/sip/transaction/ServerTransaction.js`** — NIST states: `trying→proceeding→completed→terminated`. IST states: `proceeding→completed→confirmed→terminated`. Timer G (retransmit final response over UDP), Timer H (ACK wait), Timer I (post-ACK wait), Timer J (post-response wait).
 
**`src/sip/transaction/ClientTransaction.js`** — NICT states: `trying→proceeding→completed→terminated`. ICT states: `calling→proceeding→completed→terminated`. Timer A/E (retransmit over UDP), Timer B/F (timeout), Timer D/K (post-response wait).
 
**`src/sip/transaction/index.js`** — `TransactionManager`: maps incoming messages to transactions by Via branch + method. Creates server transactions for new requests, provides `createClientTransaction()` factory. Emits `('request', msg, serverTx)` for new requests.
 
### Tests (all use `jest.useFakeTimers()`)
 
- `tests/sip/transaction/Timers.test.js`
- `tests/sip/transaction/ServerTransaction.test.js` — State transitions, retransmission handling, timer expiry
- `tests/sip/transaction/ClientTransaction.test.js` — State transitions, UDP retransmissions, TCP no-retransmit
- `tests/sip/transaction/TransactionManager.test.js` — Transaction matching, retransmission detection
 
---
 
## Phase 4: Registrar & Location Service
 
**Goal**: Handle REGISTER, store AOR-to-Contact bindings in Redis.
**Milestone**: Softphone registers (no auth yet), proxy responds 200 OK.
 
### Redis Key Schema
 
```
sip:aor:<user@host>     Hash — field: <contact-uri>, value: JSON binding
sip:nonce:<hex>         String with TTL 300s
sip:user:<user>@<realm> Hash — username, realm, ha1
```
 
### Files to Create
 
**`src/sip/registrar/LocationService.js`** — `addBinding(aor, binding)`, `removeBinding(aor, contactUri)`, `removeAllBindings(aor)`, `lookup(aor)` (filters expired at read time), `getAllRegistrations()`.
 
**`src/sip/registrar/Registrar.js`** — Extract AOR from To, parse Contact/Expires, handle `Contact: *` with Expires: 0, per-contact expires override, CSeq ordering check, build 200 OK with current bindings.
 
### Tests
 
- `tests/sip/registrar/LocationService.test.js` — CRUD, multiple contacts, expiry filtering (requires Redis)
- `tests/sip/registrar/Registrar.test.js` — Register, unregister all, unregister specific, 400 on invalid
 
---
 
## Phase 5: Digest Authentication
 
**Goal**: 401 challenge/response flow for REGISTER.
**Milestone**: Full REGISTER auth flow: REGISTER → 401 → REGISTER+Auth → 200 OK.
 
### Files to Create
 
**`src/sip/auth/NonceStore.js`** — Generate nonce+opaque in Redis with TTL, validate nonce existence.
 
**`src/sip/auth/UserStore.js`** — Store HA1 = MD5(username:realm:password), never plaintext. CRUD operations.
 
**`src/sip/auth/DigestAuth.js`** — `createChallenge(request, transaction)` → sends 401 with WWW-Authenticate. `createProxyChallenge()` → 407. `validate(request, headerName)` — verifies Digest response using HA1 from UserStore, supports qop=auth.
 
### Modification
 
**`src/sip/registrar/Registrar.js`** — Add auth gate: if no Authorization header → challenge; if invalid → challenge; if valid → proceed with registration.
 
### Tests
 
- `tests/sip/auth/DigestAuth.test.js` — Compute/validate digest, wrong password, expired nonce, challenge generation
- `tests/sip/auth/NonceStore.test.js` — Generate, validate, expiry
- `tests/sip/auth/UserStore.test.js` — Add, lookup, delete
- `tests/sip/integration/register-flow.test.js` — Full challenge/response over UDP
 
---
 
## Phase 6: Proxy/Routing Core
 
**Goal**: Forward non-REGISTER requests with Via, Record-Route, Max-Forwards, loop detection.
**Milestone**: Two registered UAs can call each other through the proxy.
 
### Files to Create
 
**`src/sip/proxy/ViaHandler.js`** — `addVia(request, transport)` (generates `z9hG4bK` + random branch), `removeTopVia(response)`, `processReceivedRport(request)` (adds received= and rport= per RFC 3581).
 
**`src/sip/proxy/RecordRouteHandler.js`** — `addRecordRoute(request, transport)` with `;lr` param for INVITE/SUBSCRIBE.
 
**`src/sip/proxy/LoopDetection.js`** — Check if any Via matches our domain:port.
 
**`src/sip/proxy/RequestRouter.js`** — REGISTER→registrar, OPTIONS to us→local, CANCEL→cancel handler, default→lookup location service, 404 if not found.
 
**`src/sip/proxy/index.js`** — `ProxyCore`: validates Max-Forwards, checks loops, processes rport, routes request. For proxied requests: clones, decrements Max-Forwards, sets Request-URI to target contact, adds Via + Record-Route, creates client transaction, relays responses (removing our Via). Sends 100 Trying for INVITE. Handles CANCEL by matching INVITE server transaction.
 
### Tests
 
- `tests/sip/proxy/ViaHandler.test.js` — Add/remove Via, rport processing
- `tests/sip/proxy/LoopDetection.test.js` — Detect/no-detect
- `tests/sip/proxy/RequestRouter.test.js` — All routing paths
- `tests/sip/proxy/ProxyCore.test.js` — Max-Forwards 0→483, loop→482, INVITE forwarding with Via/Record-Route
 
---
 
## Phase 7: Integration & Management
 
**Goal**: Wire everything together, REST API, Docker, cleanup.
**Milestone**: Full end-to-end system. Docker starts with SIP ports. Two softphones register and call.
 
### Files to Create
 
**`src/sip/index.js`** — `SipStack` facade: `start()` (creates TransportManager→TransactionManager→ProxyCore), `stop()`, `getStats()`.
 
**`src/routes/sipRoutes.js`** — REST API:
- `GET /api/sip/stats` — SIP stack stats
- `GET /api/sip/registrations` — All registrations
- `GET /api/sip/registrations/:aor` — Specific AOR bindings
- `DELETE /api/sip/registrations/:aor` — Force-unregister
- `POST /api/sip/users` — Create user (username, password, realm)
- `GET /api/sip/users` — List users
- `DELETE /api/sip/users/:username` — Delete user
 
### Files to Modify
 
| File | Changes |
|------|---------|
| `src/index.js` | Add `sipStack.start()` in init, `sipStack.stop()` in shutdown, SIP stats in `/health` |
| `src/routes/index.js` | Mount `/api/sip` routes, remove `/api/parser` |
| `docker-compose.yml` | Expose ports 5060/udp, 5060/tcp, 5061/tcp, 8443/tcp |
| `.env.example` | Add all SIP_* env vars |
| `Dockerfile` | `EXPOSE 3000 5060/udp 5060/tcp 5061/tcp 8443/tcp` |
 
### Tests
 
- `tests/sip/integration/full-flow.test.js` — Register two UAs, INVITE, 200 OK relay, BYE
- `tests/sip/routes/sipRoutes.test.js` — REST API endpoints via supertest
 
---
 
## File Inventory
 
**33 new files**, **7 modified files**, **3 deleted files**, **23 test files**.
 
## Dependency Graph
 
```
Phase 1: Message Layer
    ↓
Phase 2: Transport Layer
    ↓
Phase 3: Transaction Layer
    ↓ ↘
Phase 4: Registrar    Phase 6: Proxy Core (needs 4+5)
    ↓
Phase 5: Authentication
    ↓
Phase 7: Integration (needs all)
```
 
## Verification
 
1. `npm test` — All unit + integration tests pass
2. `docker compose up` — App starts with SIP transports on 5060/5061/8443
3. `curl http://localhost:3000/api/sip/stats` — Shows running transports
4. `curl -X POST http://localhost:3000/api/sip/users -d '{"username":"1000","password":"pass"}'` — Creates user
5. Register a softphone to port 5060 — 401 challenge → 200 OK flow
6. `curl http://localhost:3000/api/sip/registrations` — Shows active registration
7. Two softphones can call each other through the proxy
 