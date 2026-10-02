/**
 * REG-001: Signature must be computed on raw bytes, not re-serialized JSON.
 * Issue: If JSON is parsed and re-serialized before HMAC verification, whitespace, key ordering,
 * or unicode escaping differences will cause valid signatures to be rejected.
 * Date: 2026-10-02
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';
import { FastifyInstance } from 'fastify';

describe('REG-001: Raw Body Signature Preservation', () => {
  let app: FastifyInstance;
  const webhookSecret = 'test_webhook_secret_key_123';

  beforeEach(() => {
    app = buildTestApp({
      customConfig: { webhookSecret },
    });
  });

  it('successfully verifies signatures generated over non-standard whitespace payloads', async () => {
    const uniqueOrderId = `ORD-REG-RAW-${Date.now()}`;
    // Intentionally construct JSON with irregular whitespace and newlines
    const rawWhitespaceJson = `{\n  "event": "order.created",\n  "order_id":   "${uniqueOrderId}",\n  "created_at": "2026-10-02T12:00:00Z",\n  "customer": {\n    "name": "Jane Doe",\n    "email": "jane@example.com"\n  },\n  "items": [\n    {"sku": "SKU-REG", "name": "Item 1", "quantity": 1, "price": 49.99}\n  ],\n  "total_amount": 49.99,\n  "currency": "USD"\n}`;

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
    expect(response.json().status).toBe('accepted');
  });
});

