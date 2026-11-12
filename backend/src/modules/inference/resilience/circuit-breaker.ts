import { Logger } from '@nestjs/common';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  successThreshold?: number;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastStateChange: Date;
}

export class CircuitBreakerOpenException extends Error {
  constructor(public readonly breakerName: string) {
    super(`Circuit breaker '${breakerName}' is OPEN (failing fast to prevent cascade errors)`);
    this.name = 'CircuitBreakerOpenException';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: Date = new Date();
  private readonly logger = new Logger(CircuitBreaker.name);

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;

  constructor(
    public readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 15000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  public getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  public isAvailable(): boolean {
    this.checkStateTransition();
    return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
  }

  private checkStateTransition(): void {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
        this.successCount = 0;
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.logger.warn(
        `[CircuitBreaker:${this.name}] Transitioning state from ${this.state} -> ${newState}`
      );
      this.state = newState;
      this.lastStateChange = new Date();
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  public recordFailure(error?: any): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === 'CLOSED') {
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }
    } else if (this.state === 'HALF_OPEN') {
      // Any failure during HALF_OPEN immediately re-trips the breaker
      this.transitionTo('OPEN');
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = new Date();
    this.logger.log(`[CircuitBreaker:${this.name}] Circuit reset to CLOSED (Healthy)`);
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAvailable()) {
      throw new CircuitBreakerOpenException(this.name);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure(err);
      throw err;
    }
  }

  public getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      lastStateChange: this.lastStateChange,
    };
  }
}

export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private readonly breakers = new Map<string, CircuitBreaker>();

  private constructor() {}

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  public getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(name, options);
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  public getAllStatus(): Record<string, CircuitBreakerStats> {
    const statuses: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      statuses[name] = breaker.getStats();
    }
    return statuses;
  }

  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

