# Phase 10: Security Hardening & End-to-End Testing

## 1. Objective
Harden the platform against common web and AI-specific attack vectors. Implement full automated test coverage, including a mock Ollama server for GPU-free CI/CD testing, integration tests, and k6 stress/load test suites.

---

## 2. Deliverables Checklist
- [ ] GPU Mock Server (`packages/common/src/mock/mock-ollama.ts`):
  - Emulates Ollama endpoints (`/api/chat`, `/api/embeddings`, `/api/tags`, `/api/pull`).
  - Simulates streaming token delays ($20\text{ ms}$/token) and valid SSE output.
  - Enables 100% test coverage in CI environments without physical GPUs.
- [ ] Automated Test Suites:
  - Unit Tests: Tokenizer estimation, API key hashing, SSE stream formatting.
  - Integration Tests (Supertest): Auth lifecycle, API key validation, rate limiter behavior.
  - End-to-End Tests: Next.js dashboard interactions.
- [ ] Security Hardening:
  - Strict CORS policy and security headers (Helmet).
  - Rate limiting on auth endpoints (Brute force protection: 5 attempts / minute).
  - Maximum payload size restriction ($128\text{ KB}$ for JSON prompts).
  - Non-root container execution (`USER 1001:1001`).
- [ ] Load Testing (k6 script):
  - `tests/load/k6-chat-stress.js`: Tests 100 concurrent streaming connections, verifying TTFT, throughput, and error rates.

---

## 3. Threat Mitigation Summary
- **SSRF**: Inference workers only bind to the internal Docker network.
- **Token Exhaustion**: In-memory token bounds check runs before request leaves the gateway.
- **SQL Injection**: Complete parameterization via Prisma ORM.
- **XSS**: Automatic React/Next.js output escaping + strict CSP.

---

## 4. Acceptance Criteria
1. Test suite passes with $>85\%$ coverage on critical auth and inference paths.
2. GPU mock server passes all integration tests in non-GPU environments.
3. k6 load test sustains 100 concurrent streams with $<1\%$ error rate.

