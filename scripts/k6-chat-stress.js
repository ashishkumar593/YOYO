import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '1m', target: 50 },   // Scale to 50 concurrent streams
    { duration: '30s', target: 100 }, // Peak stress at 100 concurrent streams
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],     // Error rate must be less than 2%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete under 1500ms
  },
};

export default function () {
  const url = __ENV.YOYO_API_URL || 'https://api.yoyo.ai/v1/chat/completions';
  const apiKey = __ENV.YOYO_API_KEY || 'sk_live_test_key_placeholder';
  const payload = JSON.stringify({
    model: 'llama-3.3-70b',
    messages: [
      { role: 'system', content: 'You are an AI assistant.' },
      { role: 'user', content: 'Explain asynchronous backpressure in distributed queue architectures.' },
    ],
    temperature: 0.7,
    max_tokens: 256,
    stream: false,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    timeout: '30s',
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 401 (if unseeded key)': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}

