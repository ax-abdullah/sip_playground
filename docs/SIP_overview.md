# SIP Foundations

## Overview of SIP Functionality

### There are five facets of establishing and terminating multimedia sessions

1. User Location: determination of the end system to be used for communiation
2. User Availability: determination of the willingness of the called party to engage in communication
3. User Capabilities: determination of the media and media parameters to be used
4. Session Setup: "ringing", establishment of session parameters at both called and calling party
5. Session Management: including transfer, and termination of sessions, modifying session parameters, and invoking services.

- **SIP** alone does not provide the media services. It relies on other protocols for that. If you are interacting with SS7 networks, the MEGACO protocol is used. In terms of IP networks SIP will rely on the Real Time Protocol, or RTP for transport of the media
- **SIP** is a text-based protocol, similar to HTTP. It uses a request/response model, where the client sends a request to the server, and the server sends a response to the client.

### SIP Clients and Servers

- **UAC** User Agent Client: The client that initiates the request
- **UAS** User Agent Server: The server that responds to the request
- **B2BUA** is a special device that acts as a UAC and UAS. A session border controller (such as Acme Packet, Oracle SBC, AudioCodes) is a B2BUA.
- **Softswitch** such as Asterisk, FreeSWITCH, OpenSIPS, Kamailio are also B2BUAs.
- **Proxy Server**: A server that forwards requests to other servers
- A **Proxy** does not need to be involved for requests after a dialog has been created.

## Current Implementation Details & Limitations

The repository includes a foundational baseline for parsing SIP messages and integrating them into an Express.js environment:

### API & Routing

- **Endpoint**: The application exposes a `POST /parse` route (handled in `src/routes/sipParserRoutes.js` and mounted in `src/routes/index.js`).
- **Controller**: `src/controllers/SIP/sipParserController.js` processes requests by extracting `rawMessage` from the JSON body and passing it to the `SIPParser` service.

### Service Layer (`SIPParser`)

The logic inside `src/services/SIP/parser.js` currently acts as a text parser for incoming SIP messages. It correctly splits headers by the first colon (preserving complex URIs) and attempts to parse the body as JSON, gracefully falling back to raw text for SDP payloads.
