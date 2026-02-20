class SIPParser {
    constructor() {
        this.headers = {};
        this.body = null;
    }

    parse(rawMessage) {
        if (!rawMessage) {
            throw new Error('No message provided');
        }
        const [headerPart, bodyPart] = rawMessage.split('\r\n\r\n');
        const lines = headerPart.split('\r\n');
        const requestLine = lines.shift();

        this.requestLine = requestLine;
        this.headers = lines;
        this.body = bodyPart;
    }

    parseRequestLine() {
        const [method, uri, version] = this.requestLine.split(' ');
        this.method = method;
        this.uri = uri;
        this.version = version;
    }

    parseHeaders() {
        this.headers.forEach(line => {
            const [key, value] = line.split(':');
            this.headers[key] = value;
        });
    }

    parseBody() {
        this.body = JSON.parse(this.body);
    }

    parse() {
        this.parseRequestLine();
        this.parseHeaders();
        this.parseBody();
    }
}

module.exports = SIPParser;