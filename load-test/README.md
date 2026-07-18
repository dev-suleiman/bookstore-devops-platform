# Load testing

This uses [k6](https://k6.io/) rather than a hand-rolled script, since it
already produces the kind of latency/error-rate summaries that are worth
comparing against whatever the app's own metrics say - a good early sanity
check before you trust a Grafana dashboard.

## Install k6

- macOS: `brew install k6`
- Linux: see https://k6.io/docs/get-started/installation/
- Docker: `docker run --rm -i grafana/k6 run - < scenario.js`

## Run it

Make sure the app is running first (`npm run start:dev` or via
`docker-compose up`), then:

```bash
k6 run load-test/scenario.js
```

Tune the load:

```bash
k6 run -e BASE_URL=http://localhost:3000 -e VUS=25 -e DURATION=3m load-test/scenario.js
```

## What it does

Each virtual user runs the real end-to-end flow: register, browse the
catalog, add 1-2 books to the cart, then check out. Checkout is the
interesting step - it's the one that touches the database, the mock
payment provider (which has configurable latency and a configurable
failure rate via `PAYMENT_FAILURE_RATE`), and the notification write, so
it's the step most worth watching once dashboards exist.

## Why this exists this early

The plan is to add structured logging, Prometheus metrics, and eventually
tracing and alerting on top of this app. None of that is meaningful without
traffic to look at. Running this script gives you:

- A realistic mix of read (`GET /books`) and write (`POST /orders`) traffic.
- A natural source of both successful and failed orders, since the mock
  payment provider fails a configurable fraction of the time - useful for
  testing alert rules on error rate, not just the happy path.
- Latency distributions across the full request path (registration through
  checkout), rather than a single endpoint hammered in isolation.
