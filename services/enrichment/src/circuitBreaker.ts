export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;

  constructor(
    private failureThreshold: number,
    private resetTimeoutMs: number,
  ) {}

  canRequest(): boolean {
    return Date.now() >= this.openUntil;
  }

  success() {
    this.failures = 0;
  }

  failure() {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openUntil = Date.now() + this.resetTimeoutMs;
      this.failures = 0;
    }
  }
}
