import http from 'k6/http';
import { check, sleep } from 'k6';

// Test Configuration
export const options = {
  scenarios: {
    // 1. Average Load: 100 users for 30s
    average_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
    },
    // 2. Stress Spike: Ramp up to 1000 users
    stress_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 }, // Fast ramp up
        { duration: '10s', target: 1000 }, // Hold
        { duration: '10s', target: 0 },    // Ramp down
      ],
      startTime: '35s', // Start after average_load finishes
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% of requests must be faster than 50ms
    http_req_failed: ['rate<0.01'],  // Error rate (500s) should be < 1% (429s are okay/expected)
  },
};

export default function () {
  const url = 'http://localhost:3000/limit/incr';
  
  // Simulate different users (randomize ID to hit different Redis keys)
  const userId = `user_${Math.floor(Math.random() * 1000)}`;
  
  const payload = JSON.stringify({
    key: userId,
    cost: 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Check if we got a valid response (200 OK or 429 Too Many Requests)
  check(res, {
    'is status 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(0.1); // Sleep 100ms between requests
}