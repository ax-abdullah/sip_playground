# SIP Message Examples for Postman

All examples use `POST /api/parser/parse-message` with `Content-Type: application/json`.

---

## 1. REGISTER (Initial)
```json
{
  "rawMessage": "REGISTER sip:192.168.34.144 SIP/2.0\r\nVia: SIP/2.0/UDP 192.168.34.153:50820;branch=z9hG4bK-524287-1---082e49264cbfbf3a;rport\r\nMax-Forwards: 70\r\nContact: <sip:1000@192.168.34.153:50820;rinstance=2faa2f419739e433>\r\nTo: <sip:1000@192.168.34.144>\r\nFrom: <sip:1000@192.168.34.144>;tag=2eaa6b0f\r\nCall-ID: 80103NTAyMTdhZjg2ZTc5MTdhMDRjZmNiZWI4Y2VkNDNlMDI\r\nCSeq: 1 REGISTER\r\nExpires: 3600\r\nAllow: SUBSCRIBE, NOTIFY, INVITE, ACK, CANCEL, BYE, REFER, INFO, OPTIONS, MESSAGE\r\nUser-Agent: X-Lite release 4.9.4 stamp 80103\r\nContent-Length: 0\r\n\r\n"
}
```

## 2. 401 Unauthorized (Challenge)
```json
{
  "rawMessage": "SIP/2.0 401 Unauthorized\r\nVia: SIP/2.0/UDP 192.168.34.153:50820;rport=50820;received=192.168.34.153;branch=z9hG4bK-524287-1---082e49264cbfbf3a\r\nCall-ID: 80103NTAyMTdhZjg2ZTc5MTdhMDRjZmNiZWI4Y2VkNDNlMDI\r\nFrom: <sip:1000@192.168.34.144>;tag=2eaa6b0f\r\nTo: <sip:1000@192.168.34.144>;tag=z9hG4bK-524287-1---082e49264cbfbf3a\r\nCSeq: 1 REGISTER\r\nWWW-Authenticate: Digest  realm=\"asterisk\",nonce=\"1471955086/5e8a879717e9231143a0160a5355daaf\",opaque=\"6e81bca34e2cab98\",algorithm=md5,qop=\"auth\"\r\nServer: FPBX-13.0.163(13.9.1)\r\nContent-Length:  0\r\n\r\n"
}
```

## 3. REGISTER with Auth
```json
{
  "rawMessage": "REGISTER sip:192.168.34.144 SIP/2.0\r\nVia: SIP/2.0/UDP 192.168.34.153:50820;branch=z9hG4bK-524287-1---9646572775ba6c39;rport\r\nMax-Forwards: 70\r\nContact: <sip:1000@192.168.34.153:50820;rinstance=2faa2f419739e433>\r\nTo: <sip:1000@192.168.34.144>\r\nFrom: <sip:1000@192.168.34.144>;tag=2eaa6b0f\r\nCall-ID: 80103NTAyMTdhZjg2ZTc5MTdhMDRjZmNiZWI4Y2VkNDNlMDI\r\nCSeq: 2 REGISTER\r\nExpires: 3600\r\nAllow: SUBSCRIBE, NOTIFY, INVITE, ACK, CANCEL, BYE, REFER, INFO, OPTIONS, MESSAGE\r\nUser-Agent: X-Lite release 4.9.4 stamp 80103\r\nAuthorization: Digest username=\"1000\",realm=\"asterisk\",nonce=\"1471955086/5e8a879717e9231143a0160a5355daaf\",uri=\"sip:192.168.34.144\",response=\"83a86c149feb04598895876a9109c901\",cnonce=\"a6fb2b60f655eb7743403c650fd74cb8\",nc=00000001,qop=auth,algorithm=md5,opaque=\"6e81bca34e2cab98\"\r\nContent-Length: 0\r\n\r\n"
}
```

## 4. INVITE (with SDP)
```json
{
  "rawMessage": "INVITE sip:5701119694298@hojuzat.bevatel.com SIP/2.0\r\nVia: SIP/2.0/WSS 192.0.2.13;branch=z9hG4bK7569671\r\nTo: <sip:5701119694298@hojuzat.bevatel.com>\r\nFrom: \"Abdullah\" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca\r\nCSeq: 2 INVITE\r\nCall-ID: 6eudmg9f02tvm1s3uf51\r\nMax-Forwards: 70\r\nAuthorization: Digest algorithm=MD5, username=\"2022\", realm=\"asterisk\", nonce=\"0f475b76\", uri=\"sip:5701119694298@hojuzat.bevatel.com\", response=\"af17033e33324fed8721fde740e502c1\"\r\nContact: <sip:fm9ql4uu@192.0.2.13;transport=wss;ob>\r\nAllow: ACK,CANCEL,INVITE,MESSAGE,BYE,OPTIONS,INFO,NOTIFY,REFER\r\nSupported: outbound\r\nUser-Agent: Browser Phone 0.3.24 (SIPJS - 0.20.0) Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36\r\nContent-Type: application/sdp\r\nContent-Length: 1556\r\n\r\nv=0\r\no=- 3776520818430971122 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS ab9f691b-3e43-4530-ad38-231f5ce99b2f\r\nm=audio 44214 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126\r\nc=IN IP4 34.166.132.204\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=candidate:804248646 1 udp 2113937151 7cffc9d2-55ae-4498-a9e0-cf1c1cef2f0e.local 44214 typ host generation 0 network-cost 999\r\na=candidate:2553833512 1 udp 1677729535 34.166.132.204 44214 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999\r\na=ice-ufrag:u1dy\r\na=ice-pwd:gBDEHkexY6cpZnpBmdgGm32J\r\na=ice-options:trickle\r\na=fingerprint:sha-256 1A:33:59:DB:0B:B8:BE:77:7A:C3:B6:15:79:A2:31:2E:BB:DE:E3:DE:E7:43:32:0C:A9:01:E6:6D:30:B0:69:42\r\na=setup:actpass\r\na=mid:0\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=sendrecv\r\na=msid:ab9f691b-3e43-4530-ad38-231f5ce99b2f 3c349ec2-93da-47f3-9e62-ae5077689925\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:63 red/48000/2\r\na=fmtp:63 111/111\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:533267626 cname:XIRHy6k9KecZAaAU\r\na=ssrc:533267626 msid:ab9f691b-3e43-4530-ad38-231f5ce99b2f 3c349ec2-93da-47f3-9e62-ae5077689925\r\n"
}
```

## 5. 100 Trying
```json
{
  "rawMessage": "SIP/2.0 100 Trying\r\nVia: SIP/2.0/WSS 192.0.2.13;branch=z9hG4bK7569671;received=34.166.132.204;rport=34798\r\nFrom: \"Abdullah\" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca\r\nTo: <sip:5701119694298@hojuzat.bevatel.com>\r\nCall-ID: 6eudmg9f02tvm1s3uf51\r\nCSeq: 2 INVITE\r\nServer: Hojuzat-Cloud-PBX\r\nAllow: INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH, MESSAGE\r\nSupported: replaces\r\nContact: <sip:5701119694298@15.188.152.201:0;transport=ws>\r\nContent-Length: 0\r\n\r\n"
}
```

## 6. 200 OK (INVITE response with SDP)
```json
{
  "rawMessage": "SIP/2.0 200 OK\r\nVia: SIP/2.0/WSS 192.0.2.13;branch=z9hG4bK7569671;received=34.166.132.204;rport=34798\r\nFrom: \"Abdullah\" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca\r\nTo: <sip:5701119694298@hojuzat.bevatel.com>;tag=as5ee0bc23\r\nCall-ID: 6eudmg9f02tvm1s3uf51\r\nCSeq: 2 INVITE\r\nServer: Hojuzat-Cloud-PBX\r\nAllow: INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH, MESSAGE\r\nSupported: replaces\r\nContact: <sip:5701119694298@15.188.152.201:0;transport=ws>\r\nContent-Type: application/sdp\r\nContent-Length: 879\r\n\r\nv=0\r\no=root 1335455324 1335455324 IN IP4 15.188.152.201\r\ns=Asterisk PBX 18.17.1\r\nc=IN IP4 15.188.152.201\r\nt=0 0\r\nm=audio 17776 RTP/SAVPF 0 8 126\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:126 telephone-event/8000\r\na=fmtp:126 0-16\r\na=ptime:20\r\na=maxptime:150\r\na=ice-ufrag:3403b43304ed24601c11071f3d8c20c6\r\na=ice-pwd:13b2f2ab1a0c8c6263ec0ce13e0e0a8f\r\na=candidate:Hac1f279a 1 UDP 2130706431 172.31.39.154 17776 typ host\r\na=candidate:Sfbc98c9 1 UDP 1694498815 15.188.152.201 17776 typ srflx raddr 172.31.39.154 rport 17776\r\na=candidate:Hac1f279a 2 UDP 2130706430 172.31.39.154 17777 typ host\r\na=candidate:Sfbc98c9 2 UDP 1694498814 15.188.152.201 17777 typ srflx raddr 172.31.39.154 rport 17777\r\na=connection:new\r\na=setup:active\r\na=fingerprint:SHA-256 12:DE:85:94:A4:B8:3E:69:C1:59:DD:B1:12:54:0C:B4:0D:DC:6B:0D:E9:FB:D4:73:BE:25:90:72:D3:59:EC:D5\r\na=rtcp-mux\r\na=sendrecv\r\n"
}
```

## 7. ACK
```json
{
  "rawMessage": "ACK sip:5701119694298@15.188.152.201:0;transport=ws SIP/2.0\r\nVia: SIP/2.0/WSS 192.0.2.13;branch=z9hG4bK2196671\r\nTo: <sip:5701119694298@hojuzat.bevatel.com>;tag=as5ee0bc23\r\nFrom: \"Abdullah\" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca\r\nCSeq: 2 ACK\r\nCall-ID: 6eudmg9f02tvm1s3uf51\r\nMax-Forwards: 70\r\nSupported: outbound\r\nUser-Agent: Browser Phone 0.3.24 (SIPJS - 0.20.0) Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36\r\nContent-Length: 0\r\n\r\n"
}
```

## 8. BYE
```json
{
  "rawMessage": "BYE sip:fm9ql4uu@192.0.2.13;transport=wss;ob SIP/2.0\r\nVia: SIP/2.0/WS 15.188.152.201:0;branch=z9hG4bK741fc999;rport\r\nMax-Forwards: 70\r\nFrom: <sip:5701119694298@hojuzat.bevatel.com>;tag=as5ee0bc23\r\nTo: \"Abdullah\" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca\r\nCall-ID: 6eudmg9f02tvm1s3uf51\r\nCSeq: 102 BYE\r\nUser-Agent: Hojuzat-Cloud-PBX\r\nProxy-Authorization: Digest username=\"hqm4f069\", realm=\"asterisk\", algorithm=MD5, uri=\"sip:hojuzat.bevatel.com\", nonce=\"0f475b76\", response=\"da184870d94f7005f03bd218d59936f0\"\r\nX-Asterisk-HangupCause: Normal Clearing\r\nX-Asterisk-HangupCauseCode: 16\r\nContent-Length: 0\r\n\r\n"
}
```

## 9. 200 OK (after BYE)
```json
{
  "rawMessage": "SIP/2.0 200 OK\r\nVia: SIP/2.0/WS 15.188.152.201:0;branch=z9hG4bK741fc999;rport\r\nFrom: <sip:5701119694298@hojuzat.bevatel.com>;tag=as5ee0bc23\r\nTo: \"Abdullah\" <sip:2022@hojuzat.bevatel.com>;tag=7flrfnjkca\r\nCSeq: 102 BYE\r\nCall-ID: 6eudmg9f02tvm1s3uf51\r\nSupported: outbound\r\nUser-Agent: Browser Phone 0.3.24 (SIPJS - 0.20.0) Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36\r\nContent-Length: 0\r\n\r\n"
}
```

## 10. 200 OK (OPTIONS keepalive)
```json
{
  "rawMessage": "SIP/2.0 200 OK\r\nVia: SIP/2.0/WS 15.188.152.201:0;branch=z9hG4bK79a32775;rport\r\nFrom: \"Unknown\" <sip:Unknown@15.188.152.201:0>;tag=as3ec64bc1\r\nTo: <sip:fm9ql4uu@192.0.2.13;transport=wss>;tag=s2d9f93p8m\r\nCSeq: 102 OPTIONS\r\nCall-ID: 3c4664e77aaddded3dbdfd366d42e663@15.188.152.201:0\r\nSupported: outbound\r\nUser-Agent: Browser Phone 0.3.24 (SIPJS - 0.20.0) Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36\r\nAllow: ACK,BYE,CANCEL,INFO,INVITE,MESSAGE,NOTIFY,OPTIONS,PRACK,REFER,REGISTER,SUBSCRIBE\r\nAccept: application/sdp,application/dtmf-relay\r\nContent-Length: 0\r\n\r\n"
}
```

## 11. 200 OK (REGISTER response)
```json
{
  "rawMessage": "SIP/2.0 200 OK\r\nVia: SIP/2.0/UDP 192.168.34.144:5060;rport=5060;branch=z9hG4bKPjGI-y29Bep0Pmg-noegpeTEIgJlOqCp1a\r\nContact: <sip:192.168.34.153:50820>\r\nTo: <sip:1000@192.168.34.153;rinstance=2faa2f419739e433>;tag=85406038\r\nFrom: <sip:1000@192.168.34.144>;tag=ArrpYvPGwm-ItSGfGngXuLcbqtblFcGs\r\nCall-ID: YREYCykz5u9wN63CsTl4o3pNAD1uyBkn\r\nCSeq: 11812 OPTIONS\r\nAccept: application/sdp\r\nAccept-Language: en\r\nAllow: SUBSCRIBE, NOTIFY, INVITE, ACK, CANCEL, BYE, REFER, INFO, OPTIONS, MESSAGE\r\nSupported: replaces\r\nUser-Agent: X-Lite release 4.9.4 stamp 80103\r\nAllow-Events: talk, hold\r\nContent-Length: 0\r\n\r\n"
}
```

> **Note:** All `\r\n` sequences are properly escaped for JSON. Use **POST** method in Postman.
