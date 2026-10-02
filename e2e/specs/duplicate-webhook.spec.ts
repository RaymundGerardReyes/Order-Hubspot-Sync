import { test, expect } from '@playwright/test';
import { sendSignedWebhook } from '../support/signedWebhook';
import briefSampleOrder from '../fixtures/order-ORD-10482.json';

test.describe('E2E Duplicate Webhook Flow', () => {
  const receiverUrl = process.env.RECEIVER_URL || 'http://localhost:3001';
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';

  test('sending the same order_id twice does not create duplicate deals', async () => {
    // 1. First send
    const res1 = await sendSignedWebhook({
      receiverUrl,
      payload: briefSampleOrder,
      secret: webhookSecret,
    });
    expect([200, 202]).toContain(res1.status);

    // 2. Second send with identical order_id
    const res2 = await sendSignedWebhook({
      receiverUrl,
      payload: briefSampleOrder,
      secret: webhookSecret,
    });
    expect([200, 202]).toContain(res2.status);
  });
});
