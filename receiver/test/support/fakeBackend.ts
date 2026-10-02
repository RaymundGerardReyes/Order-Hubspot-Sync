import http, { Server } from 'node:http';

export interface FakeBackendOptions {
  status?: number;
  responseBody?: unknown;
  delayMs?: number;
}

export class FakeBackend {
  private server?: Server;
  public port: number = 0;
  public requestsReceived: Array<{
    headers: http.IncomingHttpHeaders;
    body: unknown;
  }> = [];

  constructor(private options: FakeBackendOptions = {}) {}

  public async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        let bodyBuffer = '';
        req.on('data', (chunk) => {
          bodyBuffer += chunk;
        });

        req.on('end', () => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(bodyBuffer);
          } catch {
            parsed = bodyBuffer;
          }

          this.requestsReceived.push({
            headers: req.headers,
            body: parsed,
          });

          const respond = () => {
            const status = this.options.status || 202;
            const body = this.options.responseBody || {
              status: 'accepted',
              message: 'Mock backend accepted order',
            };

            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(body));
          };

          if (this.options.delayMs) {
            setTimeout(respond, this.options.delayMs);
          } else {
            respond();
          }
        });
      });

      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server?.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          resolve(`http://127.0.0.1:${this.port}`);
        }
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  }
}
