import { test, expect } from '@playwright/test';

test('ECS ingest panel works', async ({ page }) => {
  await page.goto(process.env.APP_URL || 'http://localhost:5173');
  await page.getByText('Elastic SIEM (ECS) Ingest').click();
  await page.getByRole('textbox').fill('[{"@timestamp":"2025-08-22T00:00:00Z","event":{"id":"e2"},"source":{"ip":"3.3.3.3"},"destination":{"ip":"4.4.4.4"},"host":{"name":"h2"},"user":{"name":"u2"}}]');
  await page.getByRole('button', { name: 'Ingest JSON' }).click();
  await expect(page.locator('#ecsIngestResult')).toContainText('accepted 1');
});
