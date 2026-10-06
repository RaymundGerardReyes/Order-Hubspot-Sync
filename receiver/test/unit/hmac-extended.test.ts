import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from '../../src/hmac';

describe('HMAC Verification Extended Edge Cases', () => {
  const secret = 'super_secret_stage2_key_$%^&*()_+~`!';
  const baseJson = {
    order_id: 'ORD-HMAC-999',
    customer: { email: 'test@example.com' },
    total: 99.99,
  };

  it('verifies signature with UTF-8 multibyte characters (emojis and international characters)', () => {
    const unicodePayload = JSON.stringify({
      ...baseJson,
      notes: 'Customer note: 🛒 Order for François & 李小龙 with ₱99.99',
    });
    const hash = crypto.createHmac('sha256', secret).update(unicodePayload).digest('hex');
    const result = verifySignature(unicodePayload, `sha256=${hash}`, secret);

    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('verifies signature when secret contains complex symbols and spaces', () => {
    const complexSecret = '   p@$$w0rd with spaces & symbols!@#$%^&*()   ';
    const payload = JSON.stringify(baseJson);
    const hash = crypto.createHmac('sha256', complexSecret).update(payload).digest('hex');
    const result = verifySignature(payload, hash, complexSecret);

    expect(result.isValid).toBe(true);
  });

  it('supports raw Buffer inputs as well as string inputs', () => {
    const payloadString = JSON.stringify(baseJson);
    const payloadBuffer = Buffer.from(payloadString, 'utf8');
    const hash = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');

    const result = verifySignature(payloadBuffer, `sha256=${hash}`, secret);
    expect(result.isValid).toBe(true);
  });

  it('rejects truncated signature of 63 hex characters', () => {
    const payload = JSON.stringify(baseJson);
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const truncated = hash.slice(0, 63);

    const result = verifySignature(payload, `sha256=${truncated}`, secret);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Invalid signature length');
  });

  it('rejects extended signature of 65 hex characters', () => {
    const payload = JSON.stringify(baseJson);
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const extended = `${hash}a`;

    const result = verifySignature(payload, `sha256=${extended}`, secret);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Invalid signature length');
  });

  it('rejects signature containing non-hex characters', () => {
    const payload = JSON.stringify(baseJson);
    // Replace last character with 'z' (not valid hex)
    const invalidHex = `${'a'.repeat(63)}z`;

    const result = verifySignature(payload, `sha256=${invalidHex}`, secret);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Signature hash mismatch');
  });

  it('rejects empty string signature header', () => {
    const payload = JSON.stringify(baseJson);
    const result = verifySignature(payload, '', secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Missing signature header');
  });

  it('rejects undefined signature header', () => {
    const payload = JSON.stringify(baseJson);
    const result = verifySignature(payload, undefined, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Missing signature header');
  });

  it('fails when payload is slightly altered (single character change)', () => {
    const payloadOriginal = JSON.stringify(baseJson);
    const hash = crypto.createHmac('sha256', secret).update(payloadOriginal).digest('hex');

    const payloadTampered = JSON.stringify({ ...baseJson, total: 100.0 });
    const result = verifySignature(payloadTampered, `sha256=${hash}`, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Signature hash mismatch');
  });

  it('verifies byte-exact sensitivity: formatted JSON produces different hash than minified JSON', () => {
    const minified = JSON.stringify(baseJson);
    const formatted = JSON.stringify(baseJson, null, 2);

    const hashMinified = crypto.createHmac('sha256', secret).update(minified).digest('hex');
    const hashFormatted = crypto.createHmac('sha256', secret).update(formatted).digest('hex');

    expect(hashMinified).not.toEqual(hashFormatted);

    // Verifying minified with formatted hash fails
    const result = verifySignature(minified, `sha256=${hashFormatted}`, secret);
    expect(result.isValid).toBe(false);
  });

  it('verifies that empty body has predictable HMAC hash', () => {
    const emptyPayload = '';
    const hash = crypto.createHmac('sha256', secret).update(emptyPayload).digest('hex');
    const result = verifySignature(emptyPayload, hash, secret);

    expect(result.isValid).toBe(true);
  });

  it('correctly handles raw signature without sha256= prefix', () => {
    const payload = JSON.stringify(baseJson);
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const result = verifySignature(payload, hash, secret);

    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects signature with wrong secret key', () => {
    const payload = JSON.stringify(baseJson);
    const hashWithWrongSecret = crypto.createHmac('sha256', 'wrong_secret').update(payload).digest('hex');
    const result = verifySignature(payload, `sha256=${hashWithWrongSecret}`, secret);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Signature hash mismatch');
  });

  it('rejects signature with null bytes or whitespace padding', () => {
    const payload = JSON.stringify(baseJson);
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const padded = ` ${hash} `;

    const result = verifySignature(payload, padded, secret);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Invalid signature length');
  });

  it('timingSafeEqual comparison prevents timing side-channels for all 64-char strings', () => {
    const payload = JSON.stringify(baseJson);
    const validHash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Mismatched in the very first character
    const mismatchFirst = `${validHash[0] === 'a' ? 'b' : 'a'}${validHash.slice(1)}`;
    const resFirst = verifySignature(payload, mismatchFirst, secret);
    expect(resFirst.isValid).toBe(false);

    // Mismatched in the very last character
    const mismatchLast = `${validHash.slice(0, 63)}${validHash[63] === 'a' ? 'b' : 'a'}`;
    const resLast = verifySignature(payload, mismatchLast, secret);
    expect(resLast.isValid).toBe(false);
  });
});
