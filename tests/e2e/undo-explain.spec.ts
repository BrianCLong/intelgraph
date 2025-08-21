import { test, expect } from "@playwright/test";

test("undo/redo keyboard + toolbar + explain stays in sync", async ({ page })=>{
  await page.goto("/case/CASE-1");
  // Make a change (timeline range)
  await page.evaluate(()=>{
    const el = document.querySelector("#pane-timeline")!;
    const detail = { start:new Date(Date.now()-2*3600e3).toISOString(), end:new Date().toISOString() };
    (el as any).dispatchEvent(new CustomEvent("intelgraph:timeline:range_changed", { detail }));
  });
  // Undo with keyboard
  await page.keyboard.press(process.platform === "darwin" ? "Meta+KeyZ" : "Control+KeyZ");
  // Redo via button
  await page.click('[data-test="btn-redo"]');
  // Explain open and includes time window
  await page.evaluate(()=> document.body.dispatchEvent(new CustomEvent("intelgraph:explain:open", { detail: [] })));
  await expect(page.locator('[data-test="explain-query"]')).toContainText("time");
});
