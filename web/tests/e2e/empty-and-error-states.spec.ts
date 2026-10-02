import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Empty and Error States Spec', () => {
  test('handles page load without throwing unhandled exceptions', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.refreshButton).toBeVisible();
  });
});
