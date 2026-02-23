export class RateLimiter {
  private lastRequestTime = 0;

  constructor(private readonly minIntervalMs: number = 100) {}

  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minIntervalMs - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }
}
