# Project 1: Distributed URL Shortener

A high-performance URL shortener built with Node.js, TypeScript, and Redis.
Designed as part of the **100-Day System Design Mastery Program**.

## 🚀 Features
*   **Base62 Encoding:** Efficient 7-character short codes (See [ADR-014](docs/adr/ADR-014.md)).
*   **Caching Strategy:** Cache-Aside pattern with Redis for sub-10ms reads (See [ADR-016](docs/adr/ADR-016.md)).
*   **Abuse Protection:** Rate limiting (Token Bucket) and Blocklist middleware (See [ADR-015](docs/adr/ADR-015.md)).
*   **Observability:** Prometheus-style metrics exposed at `/metrics`.

## 🛠️ Architecture
See the full [Architecture Diagram](docs/arch.md).

## 📊 Benchmarks
Load tested with `k6` (1000 concurrent users):
*   **Throughput:** ~700 RPS
*   **p95 Latency:** < 100ms
*   **Error Rate:** 0.00%
*   See full report: [docs/benchmarks/url.md](docs/benchmarks/url.md)

## 🐳 How to Run
Prerequisite: Docker installed.

```bash
# 1. Start the full stack (App + Redis)
docker-compose up --build

# 2. Test creation (Write)
curl -X POST http://localhost:3000/shorten \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.google.com"}'

# 3. Test redirection (Read)
curl -v http://localhost:3000/<code_from_previous_step>

# 4. View Metrics
Open http://localhost:3000/metrics in your browser

# 5. Run Load Tests (Optional)
# Requires k6 installed
k6 run tests/load_test.js
