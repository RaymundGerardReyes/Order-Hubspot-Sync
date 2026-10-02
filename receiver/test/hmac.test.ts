import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from '../src/hmac';

describe('verifySignature', () => {
  const secret = 'super_secret_signing_key_123';
  const samplePayload = JSON.stringify({ orderId: 'ord_123', totalAmount: 50.0 });

  it('approves a valid HMAC signature', () => {
    const validSignature = crypto.createHmac('sha256', secret).update(samplePayload).digest('hex');
    const result = verifySignature(samplePayload, `sha256=${validSignature}`, secret);

    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects an invalid/tampered signature', () => {
    const invalidSignature = 'a'.repeat(64);
    const result = verifySignature(samplePayload, `sha256=${invalidSignature}`, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Signature hash mismatch');
  });

  it('rejects when signature header is missing', () => {
    const result = verifySignature(samplePayload, undefined, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Missing signature header');
  });

  it('rejects signature with incorrect length', () => {
    const result = verifySignature(samplePayload, 'sha256=tooshort', secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Invalid signature length');
  });
});
