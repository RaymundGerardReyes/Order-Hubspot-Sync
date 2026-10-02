import { test, expect } from '@playwright/test';
import { sendSignedWebhook } from '../support/signedWebhook';
import briefSampleOrder from '../fixtures/order-ORD-10482.json';

test.describe('E2E Bad Signature Spec', () => {
  const receiverUrl = process.env.RECEIVER_URL || 'http://localhost:3001';

  test('rejects webhook with invalid HMAC signature with 401', async () => {
    const res = await sendSignedWebhook({
      receiverUrl,
      payload: briefSampleOrder,
      secret: 'wrong_unshared_secret_key',
    });

    expect(res.status).toBe(401);
  });
});
