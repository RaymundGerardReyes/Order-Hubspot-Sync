import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zero-dependency pure built-in .env parser
function loadEnvFile(filePath: string): void {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore
  }
}

// Search candidate .env paths
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../receiver/.env'),
];

for (const envPath of candidateEnvPaths) {
  loadEnvFile(envPath);
}

export interface MockOrderItem {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface MockCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface MockOrderPayload {
  event: string;
  order_id: string;
  created_at: string;
  customer: MockCustomer;
  items: MockOrderItem[];
  currency: string;
  total: number;
}

async function sendMockWebhook(): Promise<void> {
  const secret = process.env.WEBHOOK_SECRET || 'stage2_secret_key_super_secure_99';
  const targetUrl = process.env.API_URL || 'http://localhost:3001/webhooks/orders';

  const cliArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
    || process.argv.slice(2).find((arg) => arg.startsWith('--order-id='))?.split('=')[1]
    || process.argv.slice(2).find((arg) => arg.startsWith('--orderId='))?.split('=')[1];
  const orderId = cliArg || process.env.ORDER_ID || `ORD-${Date.now().toString(36).toUpperCase()}`;

  // Canonical Stage 2 brief payload format
  const payload: MockOrderPayload = {
    event: 'order.created',
    order_id: orderId,
    created_at: new Date().toISOString(),
    customer: {
      email: 'maria.santos@example.com',
      first_name: 'Maria',
      last_name: 'Santos',
      phone: '+639171234567',
    },
    items: [
      {
        sku: 'TSH-BLK-M',
        name: 'Black Tee (M)',
        qty: 2,
        price: 450.0,
      },
    ],
    currency: 'PHP',
    total: 900.0,
  };

  const rawPayload = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

  console.log(`[MockWebhook] Dispatching Order: ${orderId}`);
  console.log(`[MockWebhook] Target: ${targetUrl}`);
  console.log(`[MockWebhook] Signature: ${signature}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Request-Id': crypto.randomUUID(),
      },
      body: rawPayload,
    });

    const responseData = await response.text();
    console.log(`[MockWebhook] Response (${response.status}):`, responseData);
  } catch (error: any) {
    if (error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED') {
      console.error(
        `\n[MockWebhook] Error: Connection refused at ${targetUrl}.\n` +
        `The receiver API server is not running on port 3001.\n` +
        `Please start the receiver server first:\n` +
        `  cd "receiver"\n` +
        `  npm run dev\n`
      );
    } else {
      console.error('[MockWebhook] Failed to dispatch webhook:', error);
    }
  }
}

sendMockWebhook();
