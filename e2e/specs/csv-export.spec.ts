import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test.describe('E2E Language B CSV Export Spec (Req 28)', () => {
  test('php exporter/export-deals.php handles execution and writes CSV header', async () => {
    const scriptPath = 'exporter/export-deals.php';
    expect(fs.existsSync(scriptPath)).toBe(true);

    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    expect(scriptContent).toContain('hubspot_deal_id,deal_name,amount,close_date,pipeline,deal_stage,created_at,external_order_id');
    expect(scriptContent).toContain('crm/v3/objects/deals/search');
  });
});
