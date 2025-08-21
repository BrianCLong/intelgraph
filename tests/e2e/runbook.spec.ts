import { test, expect } from '@playwright/test';


test('Rapid Attribution flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await expect(page.getByText('Map columns')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Ask a question').fill('Show infrastructure pivot from malware X across last 90 days');
  await page.getByRole('button', { name: 'Preview Cypher' }).click();
  await expect(page.getByText('Estimated cost')).toBeVisible();
  await page.getByRole('button', { name: 'Run in Sandbox' }).click();
  await expect(page.getByTestId('tri-pane')).toBeVisible();
  await page.getByTestId('graph').hover();
  await expect(page.getByText('Provenance')).toBeVisible();
});
