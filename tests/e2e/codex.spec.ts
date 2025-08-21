import { test, expect } from '@playwright/test';

test('drag entity into Codex and export HTML', async ({ page }) => {
  await page.goto('/case/CASE-1');
  await page.keyboard.press('KeyN'); // open Codex
  await page.dragAndDrop('[data-node-id="E-1"]', '[aria-label="Codex"]');
  await expect(page.locator('[data-test="codex-card"]').first()).toBeVisible();
  await page.click('button:has-text("Export HTML")');
  await expect(page.locator('[data-test="export-success"]')).toBeVisible();
});
