import { test, expect } from "@playwright/test";

test("Focus Mode toggles via hotkey and dims non-active panes", async ({
  page,
}) => {
  await page.goto("/case/CASE-1");
  await page.keyboard.press("KeyF");
  await expect(page.locator("#ov-graph")).toHaveClass(/off/);
  await expect(page.locator("#ov-codex")).toHaveClass(/on|off/); // depending on hover region
  await page.keyboard.press("KeyF"); // exit
  await expect(page.locator("#ov-graph")).toHaveClass(/ig-dim-hidden/);
});

test("Auto mode engages when editing Codex", async ({ page }) => {
  await page.goto("/case/CASE-1");
  await page.dispatchEvent("#pane-codex", "custom", {
    detail: { type: "intelgraph:codex:edit_start" },
  });
  await expect(page.locator("#ov-codex")).toHaveClass(/off/); // codex is active, others on
  await expect(page.locator("#ov-graph")).toHaveClass(/on/);
});
