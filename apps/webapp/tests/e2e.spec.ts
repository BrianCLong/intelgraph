import { test, expect } from '@playwright/test';

test('load graph and select node', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page.getByLabel('toggle theme')).toBeVisible();
  // dispatch selection via exposed store
  await page.evaluate(() => {
    (window as any).store.dispatch({
      type: 'selection/selectNode',
      payload: 'a',
    });
  });
  const selected = await page.evaluate(
    () => (window as any).store.getState().selection.selectedNodeId,
  );
  expect(selected).toBe('a');
});
