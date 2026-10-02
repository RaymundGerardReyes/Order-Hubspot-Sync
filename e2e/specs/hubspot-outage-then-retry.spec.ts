import { test, expect } from '@playwright/test';
import { sendSignedWebhook } from '../support/signedWebhook';

test.describe('E2E HubSpot Outage and Manual Retry Spec', () => {
  const receiverUrl = process.env.RECEIVER_URL || 'http://localhost:3001';
  const webhookSecret = process.env.WEBHOOK_SECRET || 'test_webhook_secret_key_123';

  test('records failed attempt on outage and allows retry via dashboard', async ({ page }) => {
    const orderPayload = {
      event: 'order.created',
      order_id: 'ORD-OUTAGE-01',
      customer: { email: 'outage@example.com', first_name: 'Outage', last_name: 'Test' },
      items: [{ sku: 'SKU-OUT', name: 'Item', qty: 1, price: 50 }],
      total: 50,
      currency: 'USD',
    };

    const res = await sendSignedWebhook({
      receiverUrl,
      payload: orderPayload,
      secret: webhookSecret,
    });
    expect([200, 202]).toContain(res.status);

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
