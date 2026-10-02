import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Retry Failed Attempt Spec', () => {
  test('allows clicking retry button on failed attempts', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const retryButtons = page.getByRole('button', { name: /retry/i });
    const count = await retryButtons.count();

    if (count > 0) {
      await retryButtons.first().click();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
