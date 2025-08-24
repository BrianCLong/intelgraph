import DataLoader from 'dataloader';

test('dataloader batches requests', async () => {
  let calls = 0;
  const loader = new DataLoader(async (keys: readonly string[]) => {
    calls++;
    return keys as readonly string[];
  });
  const tasks = Array.from({ length: 100 }, (_, i) => loader.load(String(i)));
  await Promise.all(tasks);
  expect(calls).toBe(1);
});
