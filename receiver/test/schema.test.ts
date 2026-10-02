import { describe, expect, it } from 'vitest';
import { OrderPayloadSchema } from '../src/schema';

describe('OrderPayloadSchema', () => {
  const validPayload = {
    orderId: 'ORD-TEST-100',
    customer: {
      email: 'customer@example.com',
      name: 'Jane Doe',
    },
    items: [
      {
        sku: 'SKU-001',
        name: 'Product A',
        quantity: 2,
        unitPrice: 25.0,
      },
    ],
    totalAmount: 50.0,
    currency: 'USD',
  };

  it('validates a complete, compliant payload', () => {
    const result = OrderPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('fails when email is malformed', () => {
    const invalidPayload = {
      ...validPayload,
      customer: { email: 'not-an-email' },
    };
    const result = OrderPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('fails when item quantity is 0', () => {
    const invalidPayload = {
      ...validPayload,
      items: [{ sku: 'SKU-001', quantity: 0, unitPrice: 25.0 }],
    };
    const result = OrderPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('fails when items array is empty', () => {
    const invalidPayload = {
      ...validPayload,
      items: [],
    };
    const result = OrderPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});
