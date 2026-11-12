import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenException,
} from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-worker', {
      failureThreshold: 3,
      resetTimeoutMs: 100,
      successThreshold: 2,
    });
  });

  it('should initialize in CLOSED state', () => {
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.isAvailable()).toBe(true);
  });

  it('should transition to OPEN after reaching failure threshold', () => {
    breaker.recordFailure(new Error('503 Service Unavailable'));
    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure(new Error('503 Service Unavailable'));
    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure(new Error('503 Service Unavailable'));
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isAvailable()).toBe(false);
  });

  it('should fail fast when OPEN via execute()', async () => {
    breaker.recordFailure(new Error('err1'));
    breaker.recordFailure(new Error('err2'));
    breaker.recordFailure(new Error('err3'));
    expect(breaker.getState()).toBe('OPEN');

    await expect(
      breaker.execute(async () => 'should not run')
    ).rejects.toThrow(CircuitBreakerOpenException);
  });

  it('should transition to HALF_OPEN after resetTimeoutMs and recover to CLOSED on consecutive successes', async () => {
    breaker.recordFailure(new Error('err1'));
    breaker.recordFailure(new Error('err2'));
    breaker.recordFailure(new Error('err3'));
    expect(breaker.getState()).toBe('OPEN');

    // Wait for resetTimeoutMs
    await new Promise((resolve) => setTimeout(resolve, 110));

    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(breaker.isAvailable()).toBe(true);

    // 1st success
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('HALF_OPEN');

    // 2nd success -> recovery to CLOSED
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should immediately re-trip to OPEN if a failure occurs during HALF_OPEN', async () => {
    breaker.recordFailure(new Error('err1'));
    breaker.recordFailure(new Error('err2'));
    breaker.recordFailure(new Error('err3'));
    expect(breaker.getState()).toBe('OPEN');

    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(breaker.getState()).toBe('HALF_OPEN');

    // Failure during canary probe
    breaker.recordFailure(new Error('probe failed'));
    expect(breaker.getState()).toBe('OPEN');
  });

  it('should manage multiple instances via CircuitBreakerRegistry', () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const b1 = registry.getBreaker('worker-a');
    const b2 = registry.getBreaker('worker-b');

    expect(b1).toBeDefined();
    expect(b2).toBeDefined();
    expect(registry.getBreaker('worker-a')).toBe(b1);

    const stats = registry.getAllStatus();
    expect(stats['worker-a']).toBeDefined();
    expect(stats['worker-b']).toBeDefined();
  });
});

