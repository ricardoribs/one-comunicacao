class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownMs = options.cooldownMs || 30000;
    this.timeoutMessage = options.timeoutMessage || 'Serviço temporariamente indisponível.';
    this.failures = 0;
    this.openedAt = null;
  }

  isOpen() {
    if (!this.openedAt) {
      return false;
    }

    if (Date.now() - this.openedAt > this.cooldownMs) {
      this.openedAt = null;
      this.failures = 0;
      return false;
    }

    return true;
  }

  async run(fn) {
    if (this.isOpen()) {
      const error = new Error(this.timeoutMessage);
      error.statusCode = 503;
      throw error;
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.openedAt = null;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.openedAt = Date.now();
      }
      throw error;
    }
  }

  getState() {
    return {
      open: this.isOpen(),
      failures: this.failures,
      openedAt: this.openedAt,
      cooldownMs: this.cooldownMs,
      failureThreshold: this.failureThreshold,
    };
  }
}

module.exports = CircuitBreaker;
