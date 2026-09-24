// k6 load test for the book store platform.
//
// Why k6, and why now: the whole point of keeping the business logic thin
// is to spend the saved time on observability - but there's nothing to
// observe without traffic. This script exercises the real user journey
// (register -> browse -> cart -> checkout) so that logs, metrics, and
// traces have realistic data to show, including payment failures, since
// the mock payment provider fails a configurable fraction of the time.
//
// Run it with:
//   k6 run load-test/scenario.js
//
// Override target/load via environment variables, e.g.:
//   k6 run -e BASE_URL=http://localhost:3000 -e VUS=20 -e DURATION=2m load-test/scenario.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://bookstore.local';

export const options = {
  scenarios: {
    steady_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Number(__ENV.VUS || 10) },
        { duration: __ENV.DURATION || '2m', target: Number(__ENV.VUS || 10) },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

const checkoutDuration = new Trend('checkout_duration_ms');
const orderFailureRate = new Rate('order_failure_rate');

function randomEmail() {
  return `loadtest-${__VU}-${__ITER}-${Date.now()}@example.com`;
}

export default function () {
  // 1. Register a fresh user for this iteration. In a real-world load test
  // you'd usually reuse a pool of accounts, but for a small book store this
  // keeps the script self-contained with no setup step required.
  const email = randomEmail();
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password: 'LoadTest123!', name: 'Load Test User' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(registerRes, { 'registered (201)': (r) => r.status === 201 });
  const token = registerRes.json('accessToken');
  const authHeaders = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };

  sleep(1);

  // 2. Browse the catalog.
  const listRes = http.get(`${BASE_URL}/books?page=1&pageSize=10`);
  check(listRes, { 'listed books (200)': (r) => r.status === 200 });
  const books = listRes.json('items') || [];
  if (books.length === 0) {
    // No catalog seeded yet - nothing further to do this iteration.
    return;
  }

  sleep(1);

  // 3. Add one or two random books to the cart.
  const pickCount = Math.min(books.length, Math.random() < 0.5 ? 1 : 2);
  for (let i = 0; i < pickCount; i++) {
    const book = books[Math.floor(Math.random() * books.length)];
    const addRes = http.post(
      `${BASE_URL}/cart/items`,
      JSON.stringify({ bookId: book.id, quantity: 1 }),
      authHeaders,
    );
    check(addRes, { 'added to cart (201 or 200)': (r) => r.status === 201 || r.status === 200 });
  }

  sleep(1);

  // 4. Checkout. This is the interesting step: it touches Postgres,
  // the mock payment provider (variable latency + failures), and the
  // notification write, so it's the step most worth graphing.
  const checkoutStart = Date.now();
  const orderRes = http.post(`${BASE_URL}/orders`, null, authHeaders);
  checkoutDuration.add(Date.now() - checkoutStart);

  const orderOk = check(orderRes, { 'order created (201)': (r) => r.status === 201 });
  if (orderOk) {
    const status = orderRes.json('status');
    orderFailureRate.add(status === 'FAILED');
  }

  sleep(2);
}
