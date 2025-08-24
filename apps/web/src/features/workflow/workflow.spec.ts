import { test, expect } from '@playwright/test';
import http from 'http';
import app from '../../../../../services/workflow/src/index.js';

let server: http.Server;
let base: string;

test.beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address() as any;
  base = `http://localhost:${port}`;
  await fetch(`${base}/wf/definition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'p',
      definition: {
        initial: 'open',
        states: {
          open: { on: { close: 'closed' }, sla: 1 },
          closed: { on: {} }
        },
        guards: { close: () => true }
      }
    })
  });
  await fetch(`${base}/wf/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: '1', definition: 'p' })
  });
});

test.afterAll(async () => {
  server.close();
});

test('start→transition→complete with SLA countdown UI', async ({ page }) => {
  await page.setContent(`<div id="sla"></div><script>
    async function refresh(){
      const res=await fetch('${base}/wf/cases/1');
      const data=await res.json();
      document.getElementById('sla').textContent=data.slaRemaining;
    }
    refresh();
    setInterval(refresh,500);
  </script>`);
  const first = Number(await page.textContent('#sla'));
  await page.waitForTimeout(600);
  const second = Number(await page.textContent('#sla'));
  expect(second).toBeLessThan(first);
  await page.evaluate(async (base) => {
    await fetch(`${base}/wf/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1', transition: 'close', reason: 'ok' })
    });
  }, base);
  const state = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/wf/cases/1`);
    return (await res.json()).state;
  }, base);
  expect(state).toBe('closed');
});
