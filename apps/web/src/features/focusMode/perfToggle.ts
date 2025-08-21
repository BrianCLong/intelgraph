export async function measureToggle(fn: () => void) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}
