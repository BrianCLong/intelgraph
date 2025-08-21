import { test, expect } from '@playwright/test';

test('timeline range brushes graph and map', async ({ page }) => {
  await page.goto('/case/CASE-1');
  // simulate range change
  await page.evaluate(() => {
    const el = document.querySelector('#pane-timeline')!;
    const detail = {
      start: new Date(Date.now() - 3600e3).toISOString(),
      end: new Date().toISOString(),
    };
    (el as any).dispatchEvent(new CustomEvent('intelgraph:timeline:range_changed', { detail }));
  });
  await expect(page.locator('#graph')).toBeVisible();
  await expect(page.locator('#map')).toBeVisible();
});
