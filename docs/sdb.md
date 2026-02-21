# SDP Payload

## What is SDP?

**SIP** does not carry audio. SIP is just the signaling protocol - it rings the phone. The actual media is carried by **RTP** (Real-time Transport Protocol).
**SDP** (Session Description Protocol) is the brigde between SIP and RTP. It is a text-based protocol used to describe multimedia sessions. It is used to convey information about the media types, codecs, and other parameters of a session.

It is the payload inside the SIP message that says, "Hey, while we are talking over SIP on port 5060, I want you to send the actual audio to this specific IP and port, using these specific codecs."

## SDP Payload Structure

```text
Session description
    v=  (protocol version)
    o=  (origin and session identifier)
    s=  (session name)
    i=  (session information)
    u=  (URI of more information)
    e=  (email address)
    p=  (phone number)
    c=  (connection information)
    t=  (time the session is active)
    z=  (time zone adjustments)
    k=  (encryption key)
Media descriptions
    m=  (media name and transport address)
    a=  (media attributes)
```
## The Session Lines

- **o=** (origin and session identifier)
- **s=** (session name)
- **i=** (session information)
- **u=** (URI of more information)
- **e=** (email address)
- **p=** (phone number)
- **c=** (connection information)
- **t=** (time the session is active)
- **z=** (time zone adjustments)
- **k=** (encryption key)

## The Media Lines

- **m=** (media name and transport address)
- **a=** (media attributes)

## The `c=` Line (Connection Data)

- `c=IN IP4 10.1.3.33` (connection information)
- **The Concept**: This tells the receiving party exactly which IP address to send the RTP audio stream to. (`IN` means Internet, `IP4` means IPv4, `10.1.3.33` is the IP address)
- **The Value**: This line is the **#1 cause of "One-Way-Audio" bugs** in VoIP. If user A s sitting behind a home router, his SIP client might put his local, private IP (10.1.3.33) in the `c=` line. When the SIP packet goes out over the public internet to your Asterisk Server, Asterisk tries to send the RTP audio stream to 10.1.3.33, but the traffic will never reach User A. Asterisk can hear user A but user A cannot hear Asterisk.  (This will be fixed with NAT Traversal tools like STUN/TURN servers, and Kamailio's NAT/RTP proxy modules).

## The `m=` Line (Media Announcement)

- `m=audio 5004 RTP/AVP 0 8 101` (media information)
- **The Concept**: This tells the receiving party exactly which port to send the RTP audio stream to. (`audio` means the media type, `5004` is the port, `RTP/AVP` means the protocol, `0 8 101` are the codecs)
- **The Breakdown**:
  - `m=audio`: The media type is audio.
  - `5004`: The UDP port number user A is listenting on to receive the RTP audio stream from user B.
  - `RTP/AVP`: The protocol to use for the RTP audio stream. AVP stands for Audio/Video Profile.
  - `0 8 101`: The numeric IDs of the codecs to use for the RTP audio stream. (You can list multiple codecs in order of preference, and the receiving party will choose the one they support).

## The `a=` Line (Media Attributes)

- `a=rtpmap:0 PCMU/8000` (media attribute)
- **The Concept**: This tells the receiving party exactly which codec to use. (`rtpmap` means the codec, `0` is the codec ID, `PCMU/8000` is the codec name and rate). This maps the numeric IDs from the `m=` line to the actual codec names and rates.
- **The Value**: `0` maps to `PCMU/8000`, which is `G.711 u-law` (the standard uncompressed audio codec used by the tradidtional phone network, sampled at 8000Hz). when you configure `pjsip.conf` in asterisk, you will explicitly allow codecs (eg. `allow=ulaw`, `allow=alaw`, `allow=g729`, etc.) in the `[general]` section. This means that the Asterisk server is configured to support the `G.711 u-law` codec.

  - This means if the user A SDP asks for `PCMU` but you asterisk server only allows `opus`, then the Asterisk server will reject the call with a `488 Not Acceptable Here` SIP response.

## SDP Payload Example

```text
v=0
o=2890844526 2890844526 IN IP4 [IP_ADDRESS]
s=-
c=IN IP4 [IP_ADDRESS]
t=0 0
m=audio 5004 RTP/AVP 0 8 101
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:101 telephone-event/8000
a=fmtp:101 0-16
a=sendrecv
```

## SDP Parser

```text
class SDPParser {
    constructor() {
        this.media = [];
    }

    parse(sdp) {
        const lines = sdp.split('\r\n');
        this.media = [];
        let currentMedia = null;

        lines.forEach(line => {
            if (!line.trim()) return;

            const type = line[0];
            const value = line.substring(2).trim();

            switch (type) {
                case 'v':
                    this.version = value;
                    break;
                case 'o':
                    const [username, sessionId, sessionVersion, netType, addrType, address] = value.split(' ');
                    this.origin = { username, sessionId, sessionVersion, netType, addrType, address };
                    break;
                case 's':
                    this.sessionName = value;
                    break;
                case 'c':
                    const [netTypeC, addrTypeC, addressC] = value.split(' ');
                    this.connection = { netType: netTypeC, addrType: addrTypeC, address: addressC };
                    break;
                case 't':
                    const [start, end] = value.split(' ');
                    this.timing = { start, end };
                    break;
                case 'm':
                    const [mediaType, port, proto, ...formats] = value.split(' ');
                    currentMedia = {
                        type: mediaType,
                        port: parseInt(port),
                        protocol: proto,
                        formats: formats.map(Number),
                        attributes: []
                    };
                    this.media.push(currentMedia);
                    break;
                case 'a':
                    if (currentMedia) {
                        // Parse attribute: "a=key:value" or "a=key"
                        const [key, ...valParts] = value.split(':');
                        const val = valParts.join(':');
                        currentMedia.attributes.push({ key, value: val || null });
                    }
                    break;
            }
        });
    }

    getMedia(type) {
        return this.media.find(m => m.type === type);
    }

    getAttributes(key) {
        return this.media.flatMap(m => m.attributes.filter(a => a.key === key));
    }
}
```

## SDP Parser Usage

```text
const sdpParser = new SDPParser();
sdpParser.parse(sdp);

console.log(sdpParser.getMedia('audio'));
console.log(sdpParser.getAttributes('rtpmap'));
```

## SDP Parser Output

```text
{
  "version": "0",
  "origin": {
    "username": "2890844526",
    "sessionId": "2890844526",
    "sessionVersion": "2890844526",
    "netType": "IN",
    "addrType": "IP4",
    "address": "[IP_ADDRESS]"
  },
  "sessionName": "-",
  "connection": {
    "netType": "IN",
    "addrType": "IP4",
    "address": "[IP_ADDRESS]"
  },
  "timing": {
    "start": "0",
    "end": "0"
  },
  "media": [
    {
      "type": "audio",
      "port": 5004,
      "protocol": "RTP/AVP",
      "formats": [
        0,
        8,
        101
      ],
      "attributes": [
        {
          "key": "rtpmap",
          "value": "0 PCMU/8000"
        },
        {
          "key": "rtpmap",
          "value": "8 PCMA/8000"
        },
        {
          "key": "rtpmap",
          "value": "101 telephone-event/8000"
        },
        {
          "key": "fmtp",
          "value": "101 0-16"
        },
        {
          "key": "sendrecv",
          "value": null
        }
      ]
    }
  ]
}
```
