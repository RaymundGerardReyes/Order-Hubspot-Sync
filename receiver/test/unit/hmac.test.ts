import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from '../../src/hmac';

describe('HMAC Verification Unit Tests', () => {
  const secret = 'test_webhook_secret_key_123';
  const payload = JSON.stringify({ orderId: 'ORD-10482', totalAmount: 99.0 });

  it('validates a correct HMAC signature with sha256= prefix', () => {
    const rawSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const result = verifySignature(payload, `sha256=${rawSignature}`, secret);

    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('validates a correct raw HMAC signature without prefix', () => {
    const rawSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const result = verifySignature(payload, rawSignature, secret);

    expect(result.isValid).toBe(true);
  });

  it('rejects an invalid or tampered signature', () => {
    const fakeSignature = 'f'.repeat(64);
    const result = verifySignature(payload, `sha256=${fakeSignature}`, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Signature hash mismatch');
  });

  it('rejects when signature header is missing', () => {
    const result = verifySignature(payload, undefined, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Missing signature header');
  });

  it('rejects when signature length is invalid', () => {
    const result = verifySignature(payload, 'sha256=short', secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Invalid signature length');
  });
});
