import { describe, expect, it } from 'vitest';
import { OrderPayloadSchema } from '../../src/schema';
import invalidEmailFixture from '../fixtures/orders/invalid-email.json';
import missingCustomerFixture from '../fixtures/orders/missing-customer.json';
import validOrderFixture from '../fixtures/orders/valid-order.json';
import zeroQtyFixture from '../fixtures/orders/zero-qty.json';
import briefSampleOrderFixture from '../fixtures/orders/brief-sample-order.json';

describe('OrderPayloadSchema Unit Tests', () => {
  it('passes on valid order fixture', () => {
    const result = OrderPayloadSchema.safeParse(validOrderFixture);
    expect(result.success).toBe(true);
  });

  it('passes on exact Stage 2 brief sample order fixture', () => {
    const result = OrderPayloadSchema.safeParse(briefSampleOrderFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe('ORD-10482');
      expect(result.data.customer.name).toBe('Maria Santos');
      expect(result.data.totalAmount).toBe(900.00);
      expect(result.data.currency).toBe('PHP');
      expect(result.data.items[0].quantity).toBe(2);
      expect(result.data.items[0].unitPrice).toBe(450.00);
    }
  });

  it('fails on invalid customer email fixture', () => {
    const result = OrderPayloadSchema.safeParse(invalidEmailFixture);
    expect(result.success).toBe(false);
  });

  it('fails on zero quantity item fixture', () => {
    const result = OrderPayloadSchema.safeParse(zeroQtyFixture);
    expect(result.success).toBe(false);
  });

  it('fails on missing customer fixture', () => {
    const result = OrderPayloadSchema.safeParse(missingCustomerFixture);
    expect(result.success).toBe(false);
  });
});
