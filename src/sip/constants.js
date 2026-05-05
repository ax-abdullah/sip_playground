'use strict';

/**
 * SIP Methods (RFC 3261 + extensions)
 */
const Methods = {
  REGISTER: 'REGISTER',
  INVITE: 'INVITE',
  ACK: 'ACK',
  BYE: 'BYE',
  CANCEL: 'CANCEL',
  OPTIONS: 'OPTIONS',
  INFO: 'INFO',
  MESSAGE: 'MESSAGE',
  PRACK: 'PRACK',
  UPDATE: 'UPDATE',
  REFER: 'REFER',
  SUBSCRIBE: 'SUBSCRIBE',
  NOTIFY: 'NOTIFY',
  PUBLISH: 'PUBLISH',
};

/**
 * SIP Response Codes to Reason Phrases
 */
const ResponseCodes = {
  // 1xx Provisional
  100: 'Trying',
  180: 'Ringing',
  181: 'Call Is Being Forwarded',
  182: 'Queued',
  183: 'Session Progress',
  199: 'Early Dialog Terminated',

  // 2xx Success
  200: 'OK',
  202: 'Accepted',
  204: 'No Notification',

  // 3xx Redirection
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Moved Temporarily',
  305: 'Use Proxy',
  380: 'Alternative Service',

  // 4xx Client Error
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  410: 'Gone',
  412: 'Conditional Request Failed',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Unsupported URI Scheme',
  417: 'Unknown Resource-Priority',
  420: 'Bad Extension',
  421: 'Extension Required',
  422: 'Session Interval Too Small',
  423: 'Interval Too Brief',
  428: 'Use Identity Header',
  429: 'Provide Referrer Identity',
  433: 'Anonymity Disallowed',
  436: 'Bad Identity-Info',
  437: 'Unsupported Certificate',
  438: 'Invalid Identity Header',
  439: 'First Hop Lacks Outbound Support',
  440: 'Max-Breadth Exceeded',
  469: 'Bad Info Package',
  470: 'Consent Needed',
  480: 'Temporarily Unavailable',
  481: 'Call/Transaction Does Not Exist',
  482: 'Loop Detected',
  483: 'Too Many Hops',
  484: 'Address Incomplete',
  485: 'Ambiguous',
  486: 'Busy Here',
  487: 'Request Terminated',
  488: 'Not Acceptable Here',
  489: 'Bad Event',
  491: 'Request Pending',
  493: 'Undecipherable',
  494: 'Security Agreement Required',

  // 5xx Server Error
  500: 'Server Internal Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Server Time-out',
  505: 'Version Not Supported',
  513: 'Message Too Large',
  555: 'Push Notification Service Not Supported',
  580: 'Precondition Failure',

  // 6xx Global Failure
  600: 'Busy Everywhere',
  603: 'Decline',
  604: 'Does Not Exist Anywhere',
  606: 'Not Acceptable',
  607: 'Unwanted',
  608: 'Rejected',
};

/**
 * Compact form header map (RFC 3261 §7.3.3)
 * Single character → full header name
 */
const CompactForms = {
  i: 'Call-ID',
  v: 'Via',
  f: 'From',
  t: 'To',
  m: 'Contact',
  l: 'Content-Length',
  c: 'Content-Type',
  e: 'Content-Encoding',
  k: 'Supported',
  s: 'Subject',
  r: 'Refer-To',
};

/**
 * SIP Timer Values (RFC 3261 §17)
 */
const TimerValues = {
  T1: 500,            // RTT estimate (ms)
  T2: 4000,           // Max retransmit interval for non-INVITE
  T4: 5000,           // Max network transit duration

  // Derived timers
  TIMER_A: 500,       // ICT retransmit (starts at T1, doubles)
  TIMER_B: 32000,     // ICT timeout (64 * T1)
  TIMER_C: 180000,    // Proxy INVITE timeout (>3 min)
  TIMER_D_UDP: 32000, // ICT wait after final response (>32s for UDP)
  TIMER_D_TCP: 0,     // ICT wait after final response (0 for TCP)
  TIMER_E: 500,       // NICT retransmit (starts at T1, doubles to T2)
  TIMER_F: 32000,     // NICT timeout (64 * T1)
  TIMER_G: 500,       // IST retransmit final response (starts at T1, doubles to T2)
  TIMER_H: 32000,     // IST wait for ACK (64 * T1)
  TIMER_I_UDP: 5000,  // IST wait after ACK (T4 for UDP)
  TIMER_I_TCP: 0,     // IST wait after ACK (0 for TCP)
  TIMER_J_UDP: 32000, // NIST wait after final response (64*T1 for UDP)
  TIMER_J_TCP: 0,     // NIST wait after final response (0 for TCP)
  TIMER_K_UDP: 5000,  // NICT wait after final response (T4 for UDP)
  TIMER_K_TCP: 0,     // NICT wait after final response (0 for TCP)
};

/**
 * Transport types
 */
const Transports = {
  UDP: 'UDP',
  TCP: 'TCP',
  TLS: 'TLS',
  WS: 'WS',
  WSS: 'WSS',
};

module.exports = {
  Methods,
  ResponseCodes,
  CompactForms,
  TimerValues,
  Transports,
};
