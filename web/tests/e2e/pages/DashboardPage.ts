import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;
  readonly refreshButton: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /order sync dashboard/i });
    this.table = page.locator('table');
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.rows = page.locator('table tbody tr');
  }

  async goto() {
    await this.page.goto('/');
  }

  async getRetryButtonForOrder(orderId: string): Promise<Locator> {
    const row = this.page.locator('tr', { hasText: orderId });
    return row.getByRole('button', { name: /retry/i });
  }
}
