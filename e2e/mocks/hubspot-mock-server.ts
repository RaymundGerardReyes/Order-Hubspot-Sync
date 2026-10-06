import http, { Server } from 'node:http';

export class HubspotMockServer {
  private server?: Server;
  public port: number = 0;
  public contacts: Map<string, Record<string, unknown>> = new Map();
  public deals: Map<string, Record<string, unknown>> = new Map();
  public associations: Array<{ dealId: string; contactId: string }> = [];
  public failureMode?: { status: number; message: string };

  public async start(desiredPort: number = 0): Promise<string> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        let bodyBuffer = '';
        req.on('data', (chunk) => {
          bodyBuffer += chunk;
        });

        req.on('end', () => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(bodyBuffer);
          } catch {
            // empty or raw
          }

          const sendJson = (status: number, data: unknown) => {
            if (!res.headersSent) {
              res.writeHead(status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            }
          };

          if (this.failureMode) {
            sendJson(this.failureMode.status, { message: this.failureMode.message });
            return;
          }

          const url = req.url || '';

          // Contacts Search
          if (url.includes('/crm/v3/objects/contacts/search')) {
            const emailFilter = parsed.filterGroups?.[0]?.filters?.find(
              (f: any) => f.propertyName === 'email'
            )?.value;

            const found = Array.from(this.contacts.values()).filter(
              (c: any) => c.properties?.email === emailFilter
            );

            sendJson(200, { total: found.length, results: found });
            return;
          }

          // Contacts Create
          if (req.method === 'POST' && url.includes('/crm/v3/objects/contacts')) {
            const id = `ct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const contact = { id, properties: parsed.properties };
            this.contacts.set(id, contact);
            sendJson(201, contact);
            return;
          }

          // Contacts Update (PATCH)
          if (req.method === 'PATCH' && url.includes('/crm/v3/objects/contacts/')) {
            const id = url.split('/contacts/')[1]?.split('?')[0];
            const existing = this.contacts.get(id) || { id, properties: {} };
            existing.properties = { ...existing.properties, ...parsed.properties };
            this.contacts.set(id, existing);
            sendJson(200, existing);
            return;
          }

          // Deals Search
          if (url.includes('/crm/v3/objects/deals/search')) {
            const orderIdFilter = parsed.filterGroups?.[0]?.filters?.find(
              (f: any) => f.propertyName === 'order_id' || f.propertyName === 'external_order_id'
            )?.value;

            const found = Array.from(this.deals.values()).filter(
              (d: any) =>
                d.properties?.order_id === orderIdFilter ||
                d.properties?.external_order_id === orderIdFilter
            );

            sendJson(200, { total: found.length, results: found });
            return;
          }

          // Deals Create
          if (req.method === 'POST' && url.includes('/crm/v3/objects/deals')) {
            const id = `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const deal = { id, properties: parsed.properties };
            this.deals.set(id, deal);
            if (parsed.associations?.[0]?.to?.id) {
              this.associations.push({ dealId: id, contactId: parsed.associations[0].to.id });
            }
            sendJson(201, deal);
            return;
          }

          // Deal to Contact Association
          if (req.method === 'PUT' && url.includes('/associations/contacts/')) {
            const parts = url.split('/');
            const dealId = parts[5];
            const contactId = parts[8];
            this.associations.push({ dealId, contactId });
            sendJson(200, { status: 'associated' });
            return;
          }

          sendJson(200, { ok: true });
        });
      });

      this.server.listen(desiredPort, '127.0.0.1', () => {
        const address = this.server?.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          resolve(`http://127.0.0.1:${this.port}`);
        }
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
