import { test, expect } from '@playwright/test';
import { sendSignedWebhook } from '../support/signedWebhook';
import briefSampleOrder from '../fixtures/order-ORD-10482.json';

test.describe('E2E Happy Path Flow', () => {
  const receiverUrl = process.env.RECEIVER_URL || 'http://localhost:3001';
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';

  test('receives order webhook, forwards, and appears on live dashboard', async ({ page }) => {
    // 1. Send signed webhook with Stage 2 sample payload
    const response = await sendSignedWebhook({
      receiverUrl,
      payload: briefSampleOrder,
      secret: webhookSecret,
      signatureHeaderName: 'X-Webhook-Signature',
    });

    expect(response.status).toBe(202);

    // 2. Open dashboard UI
    await page.goto('/');

    // 3. Verify order appears on dashboard
    await expect(page.getByText('ORD-10482')).toBeVisible({ timeout: 10000 });
  });
});
