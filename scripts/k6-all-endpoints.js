import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 10 }, // Ramp-up to 10 VUs
    { duration: '40s', target: 30 }, // Plateau at 30 concurrent requests
    { duration: '20s', target: 50 }, // Spike to 50 VUs
    { duration: '20s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],     // Error rate must be less than 2%
    http_req_duration: ['p(95)<1500'], // 95% of requests must finish within 1500ms
  },
};

export default function () {
  const baseUrl = __ENV.YOYO_API_URL || 'http://localhost:4000/v1';
  const apiKey = __ENV.YOYO_API_KEY || 'sk_live_test_placeholder';

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    timeout: '30s',
  };

  group('Chat Completions Non-Streaming', () => {
    const payload = JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'Explain distributed consensus in 20 words.' }],
      temperature: 0.7,
      max_tokens: 64,
      stream: false,
    });
    const res = http.post(`${baseUrl}/chat/completions`, payload, params);
    check(res, {
      'chat status 200': (r) => r.status === 200,
      'zero retention header present': (r) => r.headers['X-Yoyo-Zero-Data-Retention'] === 'true' || r.headers['x-yoyo-zero-data-retention'] === 'true',
    });
  });

  group('Vector Embeddings', () => {
    const payload = JSON.stringify({
      model: 'nomic-embed-text',
      input: 'Cloud AI model API inference gateway scaling benchmark',
    });
    const res = http.post(`${baseUrl}/embeddings`, payload, params);
    check(res, {
      'embeddings status 200': (r) => r.status === 200,
      'embeddings zero retention header': (r) => r.headers['X-Yoyo-Zero-Data-Retention'] === 'true' || r.headers['x-yoyo-zero-data-retention'] === 'true',
    });
  });

  group('Semantic Reranker', () => {
    const payload = JSON.stringify({
      model: 'bge-reranker-large',
      query: 'What is YOYO?',
      documents: [
        'YOYO is an enterprise cloud AI model API platform.',
        'PostgreSQL is an open-source database.',
        'Redis provides sub-millisecond in-memory caching.',
      ],
      top_n: 2,
      return_documents: true,
    });
    const res = http.post(`${baseUrl}/rerank`, payload, params);
    check(res, {
      'rerank status 200': (r) => r.status === 200,
      'rerank zero retention header': (r) => r.headers['X-Yoyo-Zero-Data-Retention'] === 'true' || r.headers['x-yoyo-zero-data-retention'] === 'true',
    });
  });

  sleep(1);
}

