import { MetricsService } from './metrics.service';
import { CircuitBreakerRegistry } from '../inference/resilience/circuit-breaker';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      modelWorker: {
        findMany: jest.fn().mockResolvedValue([
          {
            workerName: 'cloud-gpu-node-01',
            engineType: 'VLLM',
            status: 'ONLINE',
          },
          {
            workerName: 'cloud-gpu-node-02',
            engineType: 'OLLAMA',
            status: 'OFFLINE',
          },
        ]),
      },
    };
    service = new MetricsService(mockPrisma);
  });

  it('should initialize and produce baseline prometheus metrics', async () => {
    const output = await service.getPrometheusMetrics();
    expect(output).toContain('# HELP yoyo_http_requests_total');
    expect(output).toContain('# TYPE yoyo_http_requests_total counter');
    expect(output).toContain('yoyo_worker_status{worker_name="cloud-gpu-node-01",engine="vllm"} 1');
    expect(output).toContain('yoyo_worker_status{worker_name="cloud-gpu-node-02",engine="ollama"} 0');
  });

  it('should record requests and output accurate counts, latencies, and tokens', async () => {
    service.recordRequest({
      endpoint: '/v1/chat/completions',
      statusCode: 200,
      model: 'llama-3.3-70b',
      latencyMs: 150,
      ttftMs: 35,
      promptTokens: 20,
      completionTokens: 50,
    });

    service.recordRequest({
      endpoint: '/v1/chat/completions',
      statusCode: 200,
      model: 'llama-3.3-70b',
      latencyMs: 250,
      ttftMs: 45,
      promptTokens: 30,
      completionTokens: 70,
    });

    const output = await service.getPrometheusMetrics();
    expect(output).toContain('yoyo_http_requests_total{endpoint="/v1/chat/completions",status="200",model="llama-3.3-70b"} 2');
    expect(output).toContain('yoyo_request_duration_ms_avg{endpoint="/v1/chat/completions",status="200",model="llama-3.3-70b"} 200.00');
    expect(output).toContain('yoyo_tokens_total{model="llama-3.3-70b",type="prompt"} 50');
    expect(output).toContain('yoyo_tokens_total{model="llama-3.3-70b",type="completion"} 120');
    expect(output).toContain('yoyo_time_to_first_token_ms_avg{model="llama-3.3-70b"} 40.00');
  });

  it('should expose circuit breaker states in prometheus output', async () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker = registry.getBreaker('test-metric-worker');
    breaker.recordFailure(new Error('fail 1'));
    breaker.recordFailure(new Error('fail 2'));
    breaker.recordFailure(new Error('fail 3'));

    const output = await service.getPrometheusMetrics();
    expect(output).toContain('# HELP yoyo_circuit_breaker_state');
    expect(output).toContain('yoyo_circuit_breaker_state{worker="test-metric-worker",state="open"} 2');
  });
});

