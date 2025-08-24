/**
 * Repeatedly evaluates the provided condition until it returns a truthy value
 * or the timeout is reached. Useful for replacing arbitrary timeouts with
 * deterministic checks.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await condition()) {
        return;
      }
    } catch {
      // ignore condition errors and retry
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`waitFor: condition not met within ${timeout}ms`);
}
