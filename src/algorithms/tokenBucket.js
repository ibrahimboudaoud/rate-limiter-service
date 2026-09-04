// Token bucket: each key gets a bucket of `capacity` tokens that refills
// continuously at `refillRate` tokens/second. A request is allowed if a
// token is available, consuming one. Because tokens accumulate while a
// key is idle, a key can spend a burst of saved-up tokens all at once.
class TokenBucket {
  constructor({ capacity, refillRate }) {
    if (capacity <= 0) throw new Error('capacity must be > 0');
    if (refillRate <= 0) throw new Error('refillRate must be > 0');

    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.buckets = new Map(); // key -> { tokens, lastRefill }
  }

  _refill(bucket, now) {
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    if (elapsedSec <= 0) return;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillRate);
    bucket.lastRefill = now;
  }

  // now is injectable for tests; defaults to the real clock at call time.
  hit(key, now = Date.now()) {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      this._refill(bucket, now);
    }

    const allowed = bucket.tokens >= 1;
    if (allowed) {
      bucket.tokens -= 1;
    }

    const deficit = 1 - bucket.tokens;
    const resetAt = deficit <= 0 ? now : now + (deficit / this.refillRate) * 1000;

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      resetAt: Math.round(resetAt),
    };
  }
}

module.exports = TokenBucket;
