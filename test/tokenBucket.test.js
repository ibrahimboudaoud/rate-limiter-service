const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const TokenBucket = require('../src/algorithms/tokenBucket');

describe('TokenBucket', () => {
  test('allows a burst up to capacity, then denies', () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 });
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      assert.equal(bucket.hit('user1', now).allowed, true, `request ${i + 1} should be allowed`);
    }
    const sixth = bucket.hit('user1', now);
    assert.equal(sixth.allowed, false);
    assert.equal(sixth.remaining, 0);
  });

  test('boundary case: the request that lands exactly on the limit is allowed, the next is denied', () => {
    const bucket = new TokenBucket({ capacity: 3, refillRate: 1 });
    const now = Date.now();

    const results = [bucket.hit('k', now), bucket.hit('k', now), bucket.hit('k', now)];
    assert.deepEqual(results.map((r) => r.allowed), [true, true, true]);
    assert.equal(results[2].remaining, 0);

    const denied = bucket.hit('k', now);
    assert.equal(denied.allowed, false);
    assert.equal(denied.remaining, 0);
  });

  test('refills tokens over time and caps refill at capacity', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });

    const bucket = new TokenBucket({ capacity: 2, refillRate: 1 }); // 1 token/sec
    assert.equal(bucket.hit('u').allowed, true);
    assert.equal(bucket.hit('u').allowed, true);
    assert.equal(bucket.hit('u').allowed, false); // drained

    t.mock.timers.tick(1000); // +1 token
    const afterOneSec = bucket.hit('u');
    assert.equal(afterOneSec.allowed, true);
    assert.equal(afterOneSec.remaining, 0);

    t.mock.timers.tick(5000); // way more than enough to refill to full capacity
    const afterLongIdle = bucket.hit('u');
    assert.equal(afterLongIdle.allowed, true);
    assert.equal(afterLongIdle.remaining, 1); // capacity 2, consumed 1, refill capped at 2
  });

  test('does not let idle time accumulate unbounded refill (decay is capped)', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });

    const bucket = new TokenBucket({ capacity: 3, refillRate: 1 });
    bucket.hit('u'); // 2 left

    t.mock.timers.tick(60_000); // idle for a full minute
    const result = bucket.hit('u');
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 2); // back to full capacity (3), minus this hit
  });

  test('tracks state independently per key', () => {
    const bucket = new TokenBucket({ capacity: 1, refillRate: 1 });
    const now = Date.now();

    assert.equal(bucket.hit('a', now).allowed, true);
    assert.equal(bucket.hit('a', now).allowed, false);
    assert.equal(bucket.hit('b', now).allowed, true);
  });
});
