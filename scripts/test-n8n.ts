import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zero-dependency .env loader
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

for (const envPath of [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../receiver/.env'),
]) {
  loadEnvFile(envPath);
}

const secret = process.env.WEBHOOK_SECRET || 'stage2_secret_key_super_secure_99';
const defaultUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/orders';
const cliUrl = process.argv.slice(2).find((arg) => arg.startsWith('--url='))?.split('=')[1];
const targetUrl = cliUrl || defaultUrl;

interface TestCaseResult {
  name: string;
  passed: boolean;
  status: number;
  expectedStatus: number | number[];
  details: string;
}

const results: TestCaseResult[] = [];

function sign(payload: string, key: string = secret): string {
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

async function dispatch(body: string, signature?: string): Promise<{ status: number; data: any; text: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': crypto.randomUUID(),
  };
  if (signature !== undefined) {
    headers['X-Webhook-Signature'] = signature;
  }

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, data, text };
}

async function runTestSuite(): Promise<void> {
  console.log('\n======================================================');
  console.log('  n8n Automated Workflow Validation & Logic Test Suite');
  console.log(`  Target Webhook: ${targetUrl}`);
  console.log('======================================================\n');

  const testOrderId = `N8N-TEST-${Date.now().toString(36).toUpperCase()}`;

  // ─── Test 1: Valid Order Submission (Req 22, 23) ───────────────
  try {
    const validPayload = {
      event: 'order.created',
      order_id: testOrderId,
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

    const raw = JSON.stringify(validPayload);
    const signature = sign(raw);
    const res = await dispatch(raw, signature);

    // Accept 202 (or 200 in mock test mode)
    const passed = res.status === 202 || res.status === 200;
    results.push({
      name: 'Test 1: Valid Order Submission with Proper HMAC',
      passed,
      status: res.status,
      expectedStatus: [200, 202],
      details: passed ? `Accepted: ${JSON.stringify(res.data)}` : `Unexpected status: ${res.status} (${res.text})`,
    });
  } catch (err: any) {
    results.push({
      name: 'Test 1: Valid Order Submission with Proper HMAC',
      passed: false,
      status: 0,
      expectedStatus: 202,
      details: `Network/Connection error: ${err.message}`,
    });
  }

  // ─── Test 2: Invalid HMAC Signature (Req 22) ───────────────────
  try {
    const payload = {
      event: 'order.created',
      order_id: `TAMPERED-${Date.now()}`,
      created_at: new Date().toISOString(),
      customer: { email: 'hacker@example.com', first_name: 'Evil', last_name: 'User' },
      items: [{ sku: 'X', name: 'X', qty: 1, price: 100 }],
      currency: 'PHP',
      total: 100.0,
    };
    const raw = JSON.stringify(payload);
    const badSignature = '0000000000000000000000000000000000000000000000000000000000000000';
    const res = await dispatch(raw, badSignature);

    const passed = res.status === 401;
    results.push({
      name: 'Test 2: Cryptographic Tampering / Invalid HMAC',
      passed,
      status: res.status,
      expectedStatus: 401,
      details: passed ? `Properly rejected 401: ${res.data?.message || res.text}` : `Failed to reject: ${res.status}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Test 2: Cryptographic Tampering / Invalid HMAC',
      passed: false,
      status: 0,
      expectedStatus: 401,
      details: `Network error: ${err.message}`,
    });
  }

  // ─── Test 3: Mathematical Integrity Failure (Req 22) ───────────
  try {
    const payload = {
      event: 'order.created',
      order_id: `MATH-FAIL-${Date.now()}`,
      created_at: new Date().toISOString(),
      customer: { email: 'math@example.com', first_name: 'Math', last_name: 'Test' },
      items: [{ sku: 'ITEM-1', name: 'Item', qty: 2, price: 450.0 }], // Sum = 900
      currency: 'PHP',
      total: 999.0, // Tampered total
    };
    const raw = JSON.stringify(payload);
    const signature = sign(raw);
    const res = await dispatch(raw, signature);

    const passed = res.status === 422;
    results.push({
      name: 'Test 3: Mathematical Integrity Mismatch (sum(items) != total)',
      passed,
      status: res.status,
      expectedStatus: 422,
      details: passed ? `Properly rejected 422: ${res.data?.message || res.text}` : `Failed: status=${res.status}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Test 3: Mathematical Integrity Mismatch',
      passed: false,
      status: 0,
      expectedStatus: 422,
      details: `Network error: ${err.message}`,
    });
  }

  // ─── Test 4: Idempotency Sequential Duplicate (Req 24) ─────────
  try {
    const validDuplicate = {
      event: 'order.created',
      order_id: testOrderId, // Re-submitting exact orderId from Test 1
      created_at: new Date().toISOString(),
      customer: { email: 'maria.santos@example.com', first_name: 'Maria', last_name: 'Santos' },
      items: [{ sku: 'TSH-BLK-M', name: 'Black Tee (M)', qty: 2, price: 450.0 }],
      currency: 'PHP',
      total: 900.0,
    };
    const raw = JSON.stringify(validDuplicate);
    const signature = sign(raw);
    const res = await dispatch(raw, signature);

    const isDuplicatePayload = res.data && typeof res.data === 'object' && res.data.duplicate === true;
    const passed = res.status === 200 && isDuplicatePayload;
    results.push({
      name: 'Test 4: Idempotency Duplicate Detection (Same order_id)',
      passed,
      status: res.status,
      expectedStatus: 200,
      details: passed ? `Idempotent duplicate handled: duplicate=true` : `Failed: status=${res.status} data=${JSON.stringify(res.data)}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Test 4: Idempotency Duplicate Detection',
      passed: false,
      status: 0,
      expectedStatus: 200,
      details: `Network error: ${err.message}`,
    });
  }

  // ─── Test 5: Missing Required Fields (Req 22) ───────────────────
  try {
    const missingEmailPayload = {
      event: 'order.created',
      order_id: `MISSING-EMAIL-${Date.now()}`,
      created_at: new Date().toISOString(),
      customer: { first_name: 'No', last_name: 'Email' },
      items: [{ sku: 'TSH', name: 'Tee', qty: 1, price: 100 }],
      currency: 'PHP',
      total: 100.0,
    };
    const raw = JSON.stringify(missingEmailPayload);
    const signature = sign(raw);
    const res = await dispatch(raw, signature);

    const passed = res.status === 422 || res.status === 400;
    results.push({
      name: 'Test 5: Missing Required Schema Fields (No customer email)',
      passed,
      status: res.status,
      expectedStatus: [400, 422],
      details: passed ? `Properly rejected: status=${res.status}` : `Failed: status=${res.status}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Test 5: Missing Required Schema Fields',
      passed: false,
      status: 0,
      expectedStatus: 422,
      details: `Network error: ${err.message}`,
    });
  }

  // ─── Print Summary ─────────────────────────────────────────────
  console.log('------------------------------------------------------');
  console.log('  TEST EXECUTION REPORT:');
  console.log('------------------------------------------------------');

  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] ${r.name}`);
    console.log(`        Expected: ${Array.isArray(r.expectedStatus) ? r.expectedStatus.join(' or ') : r.expectedStatus} | Received: ${r.status}`);
    console.log(`        Details:  ${r.details}\n`);
    if (!r.passed) allPassed = false;
  }

  console.log('======================================================');
  if (allPassed) {
    console.log('  ALL n8n WORKFLOW LOGIC TESTS PASSED (5/5)');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error('  SOME TESTS FAILED — Review log output above.');
    console.log('======================================================\n');
    // Exit with non-zero when run in CI or test runners
    process.exit(1);
  }
}

runTestSuite();
