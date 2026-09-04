// Sliding window log: each key keeps a log of the timestamps of its recent
// requests. On every hit, timestamps older than `windowMs` are evicted, and
// the request is allowed only if fewer than `limit` timestamps remain in
// the window. Unlike token bucket, idle time never banks up extra capacity,
// so this strategy enforces a hard, smooth cap with no burst allowance.
class SlidingWindowLog {
  constructor({ limit, windowMs }) {
    if (limit <= 0) throw new Error('limit must be > 0');
    if (windowMs <= 0) throw new Error('windowMs must be > 0');

    this.limit = limit;
    this.windowMs = windowMs;
    this.logs = new Map(); // key -> timestamps[] (ascending, oldest first)
  }

  _evictOld(timestamps, now) {
    const windowStart = now - this.windowMs;
    let i = 0;
    while (i < timestamps.length && timestamps[i] <= windowStart) {
      i++;
    }
    if (i > 0) timestamps.splice(0, i);
  }

  // now is injectable for tests; defaults to the real clock at call time.
  hit(key, now = Date.now()) {
    let timestamps = this.logs.get(key);
    if (!timestamps) {
      timestamps = [];
      this.logs.set(key, timestamps);
    }

    this._evictOld(timestamps, now);

    const allowed = timestamps.length < this.limit;
    if (allowed) {
      timestamps.push(now);
    }

    const remaining = Math.max(0, this.limit - timestamps.length);
    const resetAt = timestamps.length > 0 ? timestamps[0] + this.windowMs : now;

    return { allowed, remaining, resetAt };
  }
}

module.exports = SlidingWindowLog;
