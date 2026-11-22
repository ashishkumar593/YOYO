#!/usr/bin/env node

/**
 * YOYO Cloud AI Platform — High-Concurrency Throughput & TTFT Benchmark Suite
 * Measures: Gateway Routing Latency, Time-To-First-Token (TTFT), Output Velocity (tokens/s),
 * Concurrent Throughput, and Error Rates.
 *
 * Usage:
 *   node scripts/benchmark.js --concurrency 5 --requests 20 --model llama3.2:1b
 *   node scripts/benchmark.js --stream true --url http://localhost:4000/v1
 */

const fs = require('fs');
const { performance } = require('perf_hooks');

// Parse CLI Arguments
const args = process.argv.slice(2);
function getArg(key, defaultVal) {
  const idx = args.indexOf(`--${key}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

const BASE_URL = getArg('url', process.env.YOYO_BASE_URL || 'http://localhost:4000/v1');
const API_KEY = getArg('key', process.env.YOYO_API_KEY || 'sk_live_dev_test_benchmark_2026');
const MODEL = getArg('model', 'llama3.2:1b');
const CONCURRENCY = parseInt(getArg('concurrency', '4'), 10);
const TOTAL_REQUESTS = parseInt(getArg('requests', '16'), 10);
const IS_STREAM = getArg('stream', 'true') === 'true';
const MAX_TOKENS = parseInt(getArg('tokens', '128'), 10);

console.log('======================================================================');
console.log('    YOYO CLOUD AI PLATFORM -- THROUGHPUT & TTFT BENCHMARK SUITE       ');
console.log('======================================================================');
console.log(`  Target Gateway URL:   ${BASE_URL}`);
console.log(`  Model Architecture:   ${MODEL}`);
console.log(`  Streaming Mode (SSE): ${IS_STREAM ? 'ENABLED' : 'DISABLED'}`);
console.log(`  Concurrency Level:    ${CONCURRENCY} workers`);
console.log(`  Total Iterations:     ${TOTAL_REQUESTS} requests`);
console.log(`  Max Completion Tokens:${MAX_TOKENS}`);
console.log('======================================================================\n');

// Metric storage
const samples = [];

async function executeSingleRequest(id) {
  const startTime = performance.now();
  let firstTokenTime = null;
  let tokenCount = 0;

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are an enterprise AI assistant benchmark runner.' },
      { role: 'user', content: `Explain speculative token decoding in 2 concise sentences. [Req #${id}]` },
    ],
    temperature: 0.7,
    max_tokens: MAX_TOKENS,
    stream: IS_STREAM,
  };

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        statusCode: res.status,
        totalDurationMs: performance.now() - startTime,
        ttftMs: null,
        tokensCount: 0,
        tokenSpeed: 0,
        error: `HTTP ${res.status}: ${errText.slice(0, 100)}`,
      };
    }

    if (IS_STREAM && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              tokenCount++;
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
              }
            }
          } catch {}
        }
      }
    } else {
      const json = await res.json();
      tokenCount = json.usage?.completion_tokens || 30;
      firstTokenTime = performance.now();
    }

    const endTime = performance.now();
    const totalDurationMs = endTime - startTime;
    const ttftMs = firstTokenTime ? firstTokenTime - startTime : null;
    const streamDurationSec = (endTime - (firstTokenTime || startTime)) / 1000;
    const tokenSpeed = streamDurationSec > 0 ? tokenCount / streamDurationSec : 0;

    return {
      success: true,
      statusCode: res.status,
      totalDurationMs,
      ttftMs,
      tokensCount: tokenCount,
      tokenSpeed: Math.round(tokenSpeed),
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      totalDurationMs: performance.now() - startTime,
      ttftMs: null,
      tokensCount: 0,
      tokenSpeed: 0,
      error: err.message,
    };
  }
}

// Worker Queue Pool
async function runPool() {
  const overallStart = performance.now();
  let completed = 0;
  let activeIndex = 0;

  async function worker(workerId) {
    while (activeIndex < TOTAL_REQUESTS) {
      const currentIdx = ++activeIndex;
      if (currentIdx > TOTAL_REQUESTS) break;

      process.stdout.write(`[Worker ${workerId}] Dispatching request #${currentIdx}... `);
      const sample = await executeSingleRequest(currentIdx);
      samples.push(sample);
      completed++;

      if (sample.success) {
        console.log(`OK (Duration: ${Math.round(sample.totalDurationMs)}ms, TTFT: ${sample.ttftMs ? Math.round(sample.ttftMs) + 'ms' : 'N/A'}, Speed: ${sample.tokenSpeed} t/s)`);
      } else {
        console.log(`FAIL (${sample.error})`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, TOTAL_REQUESTS) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const overallEnd = performance.now();
  const wallClockSec = (overallEnd - overallStart) / 1000;

  // Compute Statistics
  printResults(wallClockSec);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  arr.sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, idx)];
}

function printResults(wallClockSec) {
  const successes = samples.filter((s) => s.success);
  const failures = samples.filter((s) => !s.success);

  const totalTokensGenerated = successes.reduce((acc, s) => acc + s.tokensCount, 0);
  const durations = successes.map((s) => s.totalDurationMs);
  const ttfts = successes.map((s) => s.ttftMs).filter((t) => t !== null);
  const speeds = successes.map((s) => s.tokenSpeed);

  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const avgTtft = ttfts.length ? ttfts.reduce((a, b) => a + b, 0) / ttfts.length : 0;
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const aggregateThroughput = wallClockSec > 0 ? totalTokensGenerated / wallClockSec : 0;

  console.log('\n======================================================================');
  console.log('                    BENCHMARK EXECUTION SUMMARY                       ');
  console.log('======================================================================');
  console.log(`  Total Iterations:      ${samples.length}`);
  console.log(`  Successful Calls:      ${successes.length} (${Math.round((successes.length / samples.length) * 100)}%)`);
  console.log(`  Failed Calls:          ${failures.length}`);
  console.log(`  Wall Clock Time:       ${wallClockSec.toFixed(2)}s`);
  console.log(`  Total Tokens Streamed: ${totalTokensGenerated.toLocaleString()}`);
  console.log(`  Aggregate Throughput:  ${aggregateThroughput.toFixed(1)} tokens/sec across cluster`);
  console.log('----------------------------------------------------------------------');
  console.log('  LATENCY METRICS:');
  console.log(`    Time-To-First-Token (TTFT):`);
  console.log(`      * p50 (Median):   ${Math.round(percentile(ttfts, 50))} ms`);
  console.log(`      * p90:            ${Math.round(percentile(ttfts, 90))} ms`);
  console.log(`      * p99:            ${Math.round(percentile(ttfts, 99))} ms`);
  console.log(`      * Average:        ${Math.round(avgTtft)} ms`);
  console.log(`    Total Request Latency:`);
  console.log(`      * p50 (Median):   ${Math.round(percentile(durations, 50))} ms`);
  console.log(`      * p90:            ${Math.round(percentile(durations, 90))} ms`);
  console.log(`      * p99:            ${Math.round(percentile(durations, 99))} ms`);
  console.log(`      * Average:        ${Math.round(avgDuration)} ms`);
  console.log('----------------------------------------------------------------------');
  console.log('  GENERATION VELOCITY:');
  console.log(`    Per-Stream Velocity:${Math.round(avgSpeed)} tokens/sec`);
  console.log(`    Peak Stream Speed:  ${Math.round(Math.max(...speeds, 0))} tokens/sec`);
  console.log('======================================================================\n');
}

runPool().catch((err) => {
  console.error('[ERROR] Benchmark execution failed:', err);
  process.exit(1);
});
