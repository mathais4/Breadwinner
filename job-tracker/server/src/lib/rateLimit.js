// Tiny fixed-window rate limiter (no dependency). In-memory, so it's per server instance:
// good enough to blunt password guessing on a single-instance deployment.
export function createLimiter({ windowMs, max, now = () => Date.now() }) {
  const hits = new Map(); // key -> { count, resetAt }
  let lastSweep = now();

  return {
    check(key) {
      const t = now();
      if (t - lastSweep > windowMs) {
        for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
        lastSweep = t;
      }
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        entry = { count: 0, resetAt: t + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), retryAfterSec: Math.ceil((entry.resetAt - t) / 1000) };
    },
  };
}

export function rateLimit(options) {
  const limiter = createLimiter(options);
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    const { allowed, retryAfterSec } = limiter.check(req.ip);
    if (allowed) return next();
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  };
}
