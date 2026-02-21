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

        this.parseRequestLine();
        this.parseHeaders();
        this.parseBody();
    }

    parseRequestLine() {
        const [method, uri, version] = this.requestLine.split(' ');
        this.method = method;
        this.uri = uri;
        this.version = version;
    }

    parseHeaders() {
        const headerLines = this.headers;
        this.headers = {};
        headerLines.forEach(line => {
            if (!line.trim()) return;
            const delimiterIndex = line.indexOf(':');
            if (delimiterIndex !== -1) {
                const key = line.substring(0, delimiterIndex).trim();
                const value = line.substring(delimiterIndex + 1).trim();
                this.headers[key] = value;
            }
        });
    }

    parseBody() {
        if (this.body && this.body.trim()) {
            try {
                this.body = JSON.parse(this.body);
            } catch (error) {
                // If it's not JSON (like SDP), leave as raw string
            }
        } else {
            this.body = null; // Clean up empty body string
        }
    }
}

module.exports = SIPParser;