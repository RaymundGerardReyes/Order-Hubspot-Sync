/**
 * REG-002: Signature header prefix handling.
 * Issue: Webhook dispatchers may provide the HMAC signature either with or without
 * the 'sha256=' prefix. The receiver must handle both formats seamlessly.
 * Date: 2026-10-02
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';
import * as forwardModule from '../../src/forward';
import validOrder from '../fixtures/orders/valid-order.json';
import { FastifyInstance } from 'fastify';

describe('REG-002: Header Prefix Compatibility', () => {
  let app: FastifyInstance;
  const webhookSecret = 'test_webhook_secret_key_123';
  const rawPayload = JSON.stringify(validOrder);

  beforeEach(() => {
    vi.restoreAllMocks();
    app = buildTestApp({
      customConfig: { webhookSecret },
    });
  });

  it('accepts signatures formatted WITH "sha256=" prefix', async () => {
    vi.spyOn(forwardModule, 'forwardOrder').mockResolvedValue({
      statusCode: 202,
      data: { status: 'accepted' },
    });

    const signatureWithPrefix = signPayload(rawPayload, webhookSecret, true);
    expect(signatureWithPrefix).toMatch(/^sha256=[a-f0-9]{64}$/);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': signatureWithPrefix,
      },
      body: rawPayload,
    });

    expect(response.statusCode).toBe(202);
  });

  it('accepts signatures formatted WITHOUT "sha256=" prefix (raw 64-char hex)', async () => {
    vi.spyOn(forwardModule, 'forwardOrder').mockResolvedValue({
      statusCode: 202,
      data: { status: 'accepted' },
    });

    const rawHexSignature = signPayload(rawPayload, webhookSecret, false);
    expect(rawHexSignature).toMatch(/^[a-f0-9]{64}$/);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': rawHexSignature,
      },
      body: rawPayload,
    });

    expect(response.statusCode).toBe(202);
  });
});
