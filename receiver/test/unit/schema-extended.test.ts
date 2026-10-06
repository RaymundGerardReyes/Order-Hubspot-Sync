import { describe, expect, it } from 'vitest';
import { OrderPayloadSchema } from '../../src/schema';

describe('OrderPayloadSchema Extended Edge Cases', () => {
  const baseOrder = {
    event: 'order.created',
    order_id: 'ORD-EXT-001',
    created_at: '2026-10-06T10:00:00+08:00',
    currency: 'USD',
    customer: {
      email: 'customer@example.com',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+15551234567',
    },
    items: [
      {
        sku: 'SKU-01',
        name: 'Item 1',
        qty: 1,
        price: 100.0,
      },
    ],
    total: 100.0,
  };

  // ─── 1. Currency Code Validation ──────────────────────────────────────────
  describe('Currency Code Edge Cases', () => {
    it('accepts valid 3-letter uppercase currencies', () => {
      ['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD'].forEach((curr) => {
        const res = OrderPayloadSchema.safeParse({ ...baseOrder, currency: curr });
        expect(res.success).toBe(true);
      });
    });

    it('rejects lowercase currency code (e.g. usd)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, currency: 'usd' });
      expect(res.success).toBe(false);
    });

    it('rejects 2-letter currency code (e.g. US)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, currency: 'US' });
      expect(res.success).toBe(false);
    });

    it('rejects 4-letter currency code (e.g. USDT)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, currency: 'USDT' });
      expect(res.success).toBe(false);
    });

    it('rejects currency with numbers or symbols ($$$)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, currency: '$$$' });
      expect(res.success).toBe(false);
    });
  });

  // ─── 2. ISO-8601 Timestamp & Timezone Validation ──────────────────────────
  describe('Timestamp & Timezone Edge Cases', () => {
    it('accepts UTC timestamps with Z suffix', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: '2026-10-06T02:00:00Z' });
      expect(res.success).toBe(true);
    });

    it('accepts timestamps with millisecond precision and offset', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: '2026-10-06T02:00:00.123+08:00' });
      expect(res.success).toBe(true);
    });

    it('accepts negative timezone offsets (e.g. -05:00)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: '2026-10-06T02:00:00-05:00' });
      expect(res.success).toBe(true);
    });

    it('accepts leap day timestamps (2024-02-29)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: '2024-02-29T23:59:59Z' });
      expect(res.success).toBe(true);
    });

    it('rejects timestamp missing a timezone offset (e.g. 2026-10-06T10:00:00)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: '2026-10-06T10:00:00' });
      expect(res.success).toBe(false);
    });

    it('rejects invalid calendar dates (e.g. 2026-13-45T10:00:00Z)', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: '2026-13-45T10:00:00Z' });
      expect(res.success).toBe(false);
    });

    it('rejects malformed date strings', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, created_at: 'not-a-date' });
      expect(res.success).toBe(false);
    });
  });

  // ─── 3. Mathematical Summation & Minor-Unit Calculation ──────────────────
  describe('Minor-Unit Summation Cross-Validation', () => {
    it('handles multiple items with fractional cent calculations without float drift', () => {
      const order = {
        ...baseOrder,
        items: [
          { sku: 'A', name: 'Item A', qty: 3, price: 10.33 },
          { sku: 'B', name: 'Item B', qty: 2, price: 20.15 },
        ],
        total: 71.29, // 3 * 10.33 = 30.99; 2 * 20.15 = 40.30; 30.99 + 40.30 = 71.29
      };
      const res = OrderPayloadSchema.safeParse(order);
      expect(res.success).toBe(true);
    });

    it('rejects total off by a single cent (+0.01)', () => {
      const order = {
        ...baseOrder,
        items: [{ sku: 'A', name: 'Item A', qty: 1, price: 50.0 }],
        total: 50.01,
      };
      const res = OrderPayloadSchema.safeParse(order);
      expect(res.success).toBe(false);
    });

    it('rejects total off by a single cent (-0.01)', () => {
      const order = {
        ...baseOrder,
        items: [{ sku: 'A', name: 'Item A', qty: 1, price: 50.0 }],
        total: 49.99,
      };
      const res = OrderPayloadSchema.safeParse(order);
      expect(res.success).toBe(false);
    });

    it('accurately verifies a 20-item order sum', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        sku: `SKU-${i}`,
        name: `Item ${i}`,
        qty: 2,
        price: 5.5,
      }));
      const order = {
        ...baseOrder,
        items,
        total: 220.0, // 20 * 2 * 5.5 = 220.0
      };
      const res = OrderPayloadSchema.safeParse(order);
      expect(res.success).toBe(true);
    });

    it('accepts zero-priced items (free promotional items)', () => {
      const order = {
        ...baseOrder,
        items: [
          { sku: 'PAID', name: 'Paid Item', qty: 1, price: 100.0 },
          { sku: 'FREE', name: 'Free Gift', qty: 1, price: 0.0 },
        ],
        total: 100.0,
      };
      const res = OrderPayloadSchema.safeParse(order);
      expect(res.success).toBe(true);
    });
  });

  // ─── 4. Customer Field Validation ─────────────────────────────────────────
  describe('Customer Data Edge Cases', () => {
    it('accepts emails with subdomains and +tags', () => {
      const emails = [
        'user+promo@domain.com',
        'first.last@dept.corp.example.com',
        'customer123@sub-domain.co.uk',
      ];
      emails.forEach((email) => {
        const res = OrderPayloadSchema.safeParse({
          ...baseOrder,
          customer: { ...baseOrder.customer, email },
        });
        expect(res.success).toBe(true);
      });
    });

    it('rejects emails missing domain or @ symbol', () => {
      ['plainaddress', 'missingat.com', 'user@', '@nodomain.com', 'user @domain.com'].forEach((email) => {
        const res = OrderPayloadSchema.safeParse({
          ...baseOrder,
          customer: { ...baseOrder.customer, email },
        });
        expect(res.success).toBe(false);
      });
    });

    it('accepts international names with accents and unicode characters', () => {
      const res = OrderPayloadSchema.safeParse({
        ...baseOrder,
        customer: {
          ...baseOrder.customer,
          first_name: 'José-María',
          last_name: 'François',
        },
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty string first_name when provided', () => {
      const res = OrderPayloadSchema.safeParse({
        ...baseOrder,
        customer: {
          ...baseOrder.customer,
          first_name: '',
        },
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty string last_name when provided', () => {
      const res = OrderPayloadSchema.safeParse({
        ...baseOrder,
        customer: {
          ...baseOrder.customer,
          last_name: '',
        },
      });
      expect(res.success).toBe(false);
    });
  });

  // ─── 5. Item Properties & Constraints ─────────────────────────────────────
  describe('Item Structural Constraints', () => {
    it('rejects an order with an empty items array', () => {
      const res = OrderPayloadSchema.safeParse({ ...baseOrder, items: [], total: 0 });
      expect(res.success).toBe(false);
    });

    it('rejects items with negative prices', () => {
      const res = OrderPayloadSchema.safeParse({
        ...baseOrder,
        items: [{ sku: 'ERR', name: 'Negative', qty: 1, price: -10.0 }],
        total: -10.0,
      });
      expect(res.success).toBe(false);
    });

    it('rejects items with negative quantity', () => {
      const res = OrderPayloadSchema.safeParse({
        ...baseOrder,
        items: [{ sku: 'ERR', name: 'NegQty', qty: -1, price: 10.0 }],
        total: 10.0,
      });
      expect(res.success).toBe(false);
    });

    it('rejects items with empty sku or empty name', () => {
      const res1 = OrderPayloadSchema.safeParse({
        ...baseOrder,
        items: [{ sku: '', name: 'NoSku', qty: 1, price: 10.0 }],
      });
      expect(res1.success).toBe(false);

      const res2 = OrderPayloadSchema.safeParse({
        ...baseOrder,
        items: [{ sku: 'SKU-OK', name: '', qty: 1, price: 10.0 }],
      });
      expect(res2.success).toBe(false);
    });
  });

  // ─── 6. Event Name Validation ─────────────────────────────────────────────
  describe('Event Identifier Validation', () => {
    it('rejects non-order.created events', () => {
      ['order.updated', 'order.cancelled', 'order.deleted', 'ORDER.CREATED'].forEach((event) => {
        const res = OrderPayloadSchema.safeParse({ ...baseOrder, event });
        expect(res.success).toBe(false);
      });
    });
  });
});
