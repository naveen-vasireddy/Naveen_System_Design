import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration: Ramp up to 1000 RPS
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Warm up
    { duration: '1m', target: 500 },   // High load
    { duration: '30s', target: 1000 }, // Stress test
    { duration: '10s', target: 0 },    // Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests must be < 200ms
    http_req_failed: ['rate<0.01'], // Less than 1% failure
  },
};

export default function () {
  const url = 'http://localhost:3000';
  
  // 1. WRITE: Shorten a URL
  const payload = JSON.stringify({
    url: 'https://www.google.com/search?q=system+design',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const resPost = http.post(`${url}/shorten`, payload, params);
  
  check(resPost, {
    'is created': (r) => r.status === 201,
  });

  // Extract the code if successful
  if (resPost.status === 201) {
    const body = JSON.parse(resPost.body);
    const code = body.code;

    // 2. READ: Visit the short URL (Cache Hit Test)
    // We expect a 301 Redirect
    const resGet = http.get(`${url}/${code}`, { redirects: 0 }); // Disable auto-redirect to measure our server time only

    check(resGet, {
      'is redirect': (r) => r.status === 301,
    });
  }

  sleep(1);
}