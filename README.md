# Book Store Platform

A minimal viable but realistic book store: register, browse, cart, order,
pay. It's built as a **modular monolith** on purpose - one deployable app,
but with clean module boundaries per domain (Users, Books, Cart, Orders,
Payments, Notifications), so it can later be split into services without a
redesign.

The point of this project isn't to build e-commerce features. It's to have
just enough real complexity to justify serious observability and DevOps
work - logging, metrics, dashboards, alerts, load testing, and eventually a
microservices split with tracing - without spending most of the time
debating discount engines and inventory reservation edge cases.

## Stack

- **NestJS** (TypeScript) - modular monolith, one module per domain
- **PostgreSQL + Prisma** - schema in `prisma/schema.prisma`
- **JWT auth** (Passport) - access tokens only, no refresh tokens yet
- **nestjs-pino** - structured JSON request/app logging
- **Prometheus** (`@willsoto/nestjs-prometheus`) - `/metrics` endpoint, plus
  two custom business metrics (`orders_total`, `payment_duration_seconds`)
- **Terminus** - `/health` endpoint with a Postgres connectivity check
- **Swagger** - API docs at `/api/docs`
- **k6** - load generator in `load-test/`, exercising the real user journey

## What's in scope vs. deferred

| In scope (MVP) | Deferred |
|---|---|
| Register / login | Refresh tokens, password reset |
| Browse & search books | Recommendations, reviews/ratings |
| Cart (add/update/remove/clear) | Coupons/discounts |
| Checkout -> order -> payment -> notification | Real payment gateway, inventory reservation windows |
| Order history | Shipping/fulfillment states |
| Mock payment (configurable latency + failure rate) | Multiple payment methods |
| Synchronous notification records | Queue-backed delivery (BullMQ) - see Roadmap |

All six domains exist as real modules from day one; only the advanced
features within them are postponed.

## Getting started

### 1. Prerequisites

- Node.js 20+
- Docker (for Postgres) - or your own local Postgres instance

### 2. Install and configure

```bash
npm install
cp .env.example .env
# edit .env if you're not using the default docker-compose Postgres
```

> **Note on `prisma generate`:** this project's sandbox environment
> couldn't reach `binaries.prisma.sh` (its egress allowlist doesn't
> include it), so the Prisma client could not be pre-generated here. This
> is a one-time step you'll run yourself with normal internet access:
>
> ```bash
> npx prisma generate
> ```
>
> Everything else has been installed and type-checked in this environment;
> the only compile errors seen were the expected "missing Prisma client"
> ones that `prisma generate` resolves.

### 3. Start Postgres

```bash
docker-compose up -d postgres
```

### 4. Run migrations and seed data

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

The seed creates an admin user (`admin@bookstore.local` / `Admin123!`) and
half a dozen books.

### 5. Run the app

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`
- Metrics: `http://localhost:3000/metrics`

### 6. Try the flow

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"reader@example.com","password":"S3curePass!","name":"Ada"}'

# Browse books
curl http://localhost:3000/books

# Add to cart (use the accessToken from register/login)
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"bookId":"<a book id from /books>","quantity":1}'

# Checkout
curl -X POST http://localhost:3000/orders -H "Authorization: Bearer <token>"
```

### 7. Run the whole stack in Docker

```bash
docker-compose up --build
```

### 8. Generate load

Once the app is running:

```bash
k6 run load-test/scenario.js
```

See `load-test/README.md` for details and tuning options. This is
deliberately set up early, before dashboards exist, because there's no
point instrumenting an app with nothing hitting it.

## Architecture notes

- **Modular monolith today, microservices later.** Each domain module
  (`src/auth`, `src/books`, `src/cart`, `src/orders`, `src/payments`,
  `src/notifications`) only talks to others through its service's public
  methods, not by reaching into another module's Prisma queries directly.
  That boundary discipline is what makes a later split (e.g., pulling
  Payments or Notifications out into their own service) a matter of moving
  a folder and adding a network call, rather than an untangling exercise.
- **Orders is the orchestrator.** `OrdersService.createOrder` is the one
  place that coordinates cart -> stock decrement -> order -> payment ->
  notification, inside a Prisma transaction for the parts that must be
  atomic (stock + order + cart clear), with payment handled afterward so a
  slow/failed payment can never lose an already-placed order.
- **Payments is intentionally mocked.** It simulates latency and a
  configurable failure rate (`PAYMENT_FAILURE_RATE` in `.env`) instead of
  integrating a real gateway. That gives dashboards and alerts something
  real to react to without pulling in payment-gateway edge cases.
- **Notifications are synchronous for now.** `NotificationsService.notify`
  just writes a record and logs it. The method signature is written to
  stay stable when it's swapped for a BullMQ producer later, so that
  change won't ripple into `OrdersService`.

## Roadmap (in the order we plan to tackle it)

1. **Ship this MVP flow and get load-test data flowing.**
2. **Add Grafana dashboards on top of the existing `/metrics` endpoint** -
   request rates/latency, order outcome breakdown, payment latency
   histogram.
3. **Add alerting rules** against those metrics (e.g., payment failure rate
   above threshold, p95 checkout latency).
4. **Introduce BullMQ + Redis for notifications**, turning `notify()` into
   a queue producer and adding a worker - this unlocks queue-depth and
   retry metrics as a new signal to observe.
5. **Add OpenTelemetry tracing**, since a modular monolith is a good place
   to learn span/trace concepts before they're forced on you by a
   distributed system.
6. **Split into microservices** - most likely Payments and Notifications
   first, since they're already the most decoupled - and move the whole
   thing onto Kubernetes, at which point distributed tracing across
   service boundaries becomes the main event rather than a nice-to-have.

Reviews, coupons, recommendations, and inventory reservation are **not** on
this roadmap; they're explicitly out of scope for what this project is
for.
