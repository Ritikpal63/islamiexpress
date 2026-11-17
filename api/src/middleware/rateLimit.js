module.exports = function rateLimit({ windowMs = 60000, max = 120, keyGenerator } = {}) {
  const buckets = new Map();
  let requestsSinceCleanup = 0;

  return (req, res, next) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : `${req.ip || req.socket.remoteAddress || "unknown"}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start >= windowMs) {
      buckets.set(key, { start: now, count: 1 });
      next();
    } else {
      bucket.count += 1;
      if (bucket.count > max) {
        return res
          .status(429)
          .json({ success: false, message: "Too many requests. Please try again later." });
      }
      next();
    }

    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 256) {
      for (const [bucketKey, entry] of buckets) {
        if (now - entry.start >= windowMs) buckets.delete(bucketKey);
      }
      requestsSinceCleanup = 0;
    }
  };
};
