import { describe, expect, it } from 'vitest';
import { OrderPayloadSchema } from '../../src/schema';
import invalidEmailFixture from '../fixtures/orders/invalid-email.json';
import missingCustomerFixture from '../fixtures/orders/missing-customer.json';
import validOrderFixture from '../fixtures/orders/valid-order.json';
import zeroQtyFixture from '../fixtures/orders/zero-qty.json';

describe('OrderPayloadSchema Unit Tests', () => {
  it('passes on valid order fixture', () => {
    const result = OrderPayloadSchema.safeParse(validOrderFixture);
    expect(result.success).toBe(true);
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
