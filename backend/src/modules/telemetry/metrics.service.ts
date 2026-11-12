import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CircuitBreakerRegistry } from '../inference/resilience/circuit-breaker';

export interface RequestMetricEvent {
  endpoint: string;
  statusCode: number;
  model?: string;
  latencyMs: number;
  ttftMs?: number;
  promptTokens?: number;
  completionTokens?: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // In-memory telemetry counters
  private requestCounts = new Map<string, number>();
  private totalLatencyMs = new Map<string, number>();
  private promptTokensCount = new Map<string, number>();
  private completionTokensCount = new Map<string, number>();
  private ttftSumMs = new Map<string, number>();
  private ttftCount = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  public recordRequest(event: RequestMetricEvent): void {
    const model = event.model || 'none';
    const key = `endpoint="${event.endpoint}",status="${event.statusCode}",model="${model}"`;

    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    this.totalLatencyMs.set(key, (this.totalLatencyMs.get(key) || 0) + event.latencyMs);

    if (event.promptTokens) {
      const pKey = `model="${model}",type="prompt"`;
      this.promptTokensCount.set(pKey, (this.promptTokensCount.get(pKey) || 0) + event.promptTokens);
    }

    if (event.completionTokens) {
      const cKey = `model="${model}",type="completion"`;
      this.completionTokensCount.set(
        cKey,
        (this.completionTokensCount.get(cKey) || 0) + event.completionTokens
      );
    }

    if (event.ttftMs && event.ttftMs > 0) {
      const tKey = `model="${model}"`;
      this.ttftSumMs.set(tKey, (this.ttftSumMs.get(tKey) || 0) + event.ttftMs);
      this.ttftCount.set(tKey, (this.ttftCount.get(tKey) || 0) + 1);
    }
  }

  public async getPrometheusMetrics(): Promise<string> {
    const lines: string[] = [
      '# HELP yoyo_http_requests_total Total number of HTTP requests processed by YOYO Edge Gateway',
      '# TYPE yoyo_http_requests_total counter',
    ];

    if (this.requestCounts.size === 0) {
      lines.push('yoyo_http_requests_total{endpoint="/v1/models",status="200",model="none"} 0');
    } else {
      for (const [key, count] of this.requestCounts.entries()) {
        lines.push(`yoyo_http_requests_total{${key}} ${count}`);
      }
    }

    lines.push('');
    lines.push('# HELP yoyo_request_duration_ms_avg Average request duration in milliseconds');
    lines.push('# TYPE yoyo_request_duration_ms_avg gauge');
    for (const [key, totalLat] of this.totalLatencyMs.entries()) {
      const count = this.requestCounts.get(key) || 1;
      const avg = (totalLat / count).toFixed(2);
      lines.push(`yoyo_request_duration_ms_avg{${key}} ${avg}`);
    }

    lines.push('');
    lines.push('# HELP yoyo_tokens_total Total tokens processed (prompt & completion)');
    lines.push('# TYPE yoyo_tokens_total counter');
    for (const [key, count] of this.promptTokensCount.entries()) {
      lines.push(`yoyo_tokens_total{${key}} ${count}`);
    }
    for (const [key, count] of this.completionTokensCount.entries()) {
      lines.push(`yoyo_tokens_total{${key}} ${count}`);
    }

    lines.push('');
    lines.push('# HELP yoyo_time_to_first_token_ms_avg Average TTFT for streaming requests');
    lines.push('# TYPE yoyo_time_to_first_token_ms_avg gauge');
    for (const [key, sum] of this.ttftSumMs.entries()) {
      const cnt = this.ttftCount.get(key) || 1;
      lines.push(`yoyo_time_to_first_token_ms_avg{${key}} ${(sum / cnt).toFixed(2)}`);
    }

    // Circuit Breakers status
    lines.push('');
    lines.push(
      '# HELP yoyo_circuit_breaker_state Worker circuit breaker status (0=CLOSED/Healthy, 1=HALF_OPEN, 2=OPEN/Failing)'
    );
    lines.push('# TYPE yoyo_circuit_breaker_state gauge');
    const breakerStats = CircuitBreakerRegistry.getInstance().getAllStatus();
    for (const [name, stat] of Object.entries(breakerStats)) {
      const code = stat.state === 'CLOSED' ? 0 : stat.state === 'HALF_OPEN' ? 1 : 2;
      lines.push(
        `yoyo_circuit_breaker_state{worker="${name}",state="${stat.state.toLowerCase()}"} ${code}`
      );
    }

    // Live Worker Node status from DB
    try {
      const workers = await this.prisma.modelWorker.findMany();
      if (workers.length > 0) {
        lines.push('');
        lines.push('# HELP yoyo_worker_status Cloud GPU worker status (1=ONLINE, 0=OFFLINE)');
        lines.push('# TYPE yoyo_worker_status gauge');
        for (const worker of workers) {
          const isOnline = worker.status === 'ONLINE' ? 1 : 0;
          lines.push(
            `yoyo_worker_status{worker_name="${worker.workerName}",engine="${worker.engineType.toLowerCase()}"} ${isOnline}`
          );
        }
      }
    } catch (err: any) {
      this.logger.debug(`Could not query worker status for metrics: ${err.message}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  public reset(): void {
    this.requestCounts.clear();
    this.totalLatencyMs.clear();
    this.promptTokensCount.clear();
    this.completionTokensCount.clear();
    this.ttftSumMs.clear();
    this.ttftCount.clear();
  }
}

