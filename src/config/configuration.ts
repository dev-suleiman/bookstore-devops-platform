export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
  payments: {
    // Simulated latency/failure so the payment step produces something
    // worth measuring later (latency histograms, failure-rate alerts)
    // without needing a real payment gateway integration.
    minLatencyMs: parseInt(process.env.PAYMENT_MIN_LATENCY_MS ?? '100', 10),
    maxLatencyMs: parseInt(process.env.PAYMENT_MAX_LATENCY_MS ?? '600', 10),
    failureRate: parseFloat(process.env.PAYMENT_FAILURE_RATE ?? '0.1'),
  },
});
