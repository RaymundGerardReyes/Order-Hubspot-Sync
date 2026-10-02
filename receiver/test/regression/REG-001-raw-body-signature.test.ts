/**
 * REG-001: Signature must be computed on raw bytes, not re-serialized JSON.
 * Issue: If JSON is parsed and re-serialized before HMAC verification, whitespace, key ordering,
 * or unicode escaping differences will cause valid signatures to be rejected.
 * Date: 2026-10-02
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';
import * as forwardModule from '../../src/forward';
import { FastifyInstance } from 'fastify';

describe('REG-001: Raw Body Signature Preservation', () => {
  let app: FastifyInstance;
  const webhookSecret = 'test_webhook_secret_key_123';

  beforeEach(() => {
    vi.restoreAllMocks();
    app = buildTestApp({
      customConfig: { webhookSecret },
    });
  });

  it('successfully verifies signatures generated over non-standard whitespace payloads', async () => {
    vi.spyOn(forwardModule, 'forwardOrder').mockResolvedValue({
      statusCode: 202,
      data: { status: 'accepted' },
    });

    // Intentionally construct JSON with irregular whitespace and newlines
    const rawWhitespaceJson = `{\n  "order_id":   "ORD-REG-001",\n  "customer": {\n    "name": "Jane Doe",\n    "email": "jane@example.com"\n  },\n  "items": [\n    {"sku": "SKU-REG", "quantity": 1, "price": 49.99}\n  ],\n  "total_amount": 49.99,\n  "currency": "USD",\n  "placed_at": "2026-10-02T12:00:00Z"\n}`;

    const signature = signPayload(rawWhitespaceJson, webhookSecret, true);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature,
      },
      body: rawWhitespaceJson,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: 'accepted' });
  });
});
