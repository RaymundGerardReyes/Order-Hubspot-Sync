import crypto from 'node:crypto';

export interface SignatureVerificationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Verify HMAC-SHA256 signature using timing-safe buffer comparison.
 */
export function verifySignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { isValid: false, reason: 'Missing signature header' };
  }

  // Header format expected: sha256=<hex> or raw hex
  const cleanHeader = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  if (cleanHeader.length !== 64) {
    return { isValid: false, reason: 'Invalid signature length' };
  }

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(computedHash, 'utf8');
  const receivedBuffer = Buffer.from(cleanHeader, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { isValid: false, reason: 'Signature buffer length mismatch' };
  }

  const isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  return {
    isValid,
    reason: isValid ? undefined : 'Signature hash mismatch',
  };
}
