# Response Codes

## 1xx: Provisional Responses

This 1xx response is sent by the UAS to indicate that it has received the request and is processing it. It indicates that the request has been received by the next-hop server and that some inspecified action is being taken on behalf of this call (eg. ringing, call forwarding, database lookup, etc.)

This response, like all other provisional responses, stops retransmissions of an `INVITE` by a UAC. the 100 Trying response is the only exception to this rule, in that it's never forwarded upstream by a stateful proxy.

## 2xx: Success Responses

This 2xx response is sent by the UAS to indicate that it has received the request and is processing it.

## 3xx: Redirection Responses

## 4xx: Client Error Responses

## 5xx: Server Error Responses

## 6xx: Global Error Responses
