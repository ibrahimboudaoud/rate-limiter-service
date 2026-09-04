const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const SlidingWindowLog = require('../src/algorithms/slidingWindowLog');

describe('SlidingWindowLog', () => {
  test('allows a burst up to the limit, then denies within the same window', () => {
    const limiter = new SlidingWindowLog({ limit: 5, windowMs: 10_000 });
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      assert.equal(limiter.hit('user1', now).allowed, true, `request ${i + 1} should be allowed`);
    }
    const sixth = limiter.hit('user1', now);
    assert.equal(sixth.allowed, false);
    assert.equal(sixth.remaining, 0);
  });

  test('boundary case: the request that lands exactly on the limit is allowed, the next is denied', () => {
    const limiter = new SlidingWindowLog({ limit: 3, windowMs: 5000 });
    const now = Date.now();

    const results = [limiter.hit('k', now), limiter.hit('k', now), limiter.hit('k', now)];
    assert.deepEqual(results.map((r) => r.allowed), [true, true, true]);
    assert.equal(results[2].remaining, 0);

    const denied = limiter.hit('k', now);
    assert.equal(denied.allowed, false);
    assert.equal(denied.remaining, 0);
  });

  test('evicts entries only once they age out of the window (no early bursting)', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });

    const limiter = new SlidingWindowLog({ limit: 2, windowMs: 1000 });
    assert.equal(limiter.hit('u').allowed, true); // t=0
    assert.equal(limiter.hit('u').allowed, true); // t=0
    assert.equal(limiter.hit('u').allowed, false); // limit hit, both entries still in window

    t.mock.timers.tick(500); // t=500, oldest entries are still within the 1000ms window
    assert.equal(limiter.hit('u').allowed, false);

    t.mock.timers.tick(600); // t=1100, the t=0 entries have now aged out
    const afterWindow = limiter.hit('u');
    assert.equal(afterWindow.allowed, true);
  });

  test('decays smoothly: entries expire individually, not all at once', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });

    const limiter = new SlidingWindowLog({ limit: 2, windowMs: 1000 });
    assert.equal(limiter.hit('u').allowed, true); // t=0

    t.mock.timers.tick(400);
    assert.equal(limiter.hit('u').allowed, true); // t=400, count=2

    t.mock.timers.tick(650); // t=1050: the t=0 entry has aged out, the t=400 one has not
    const result = limiter.hit('u');
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 0); // t=400 and t=1050 entries are both in window now
  });

  test('tracks state independently per key', () => {
    const limiter = new SlidingWindowLog({ limit: 1, windowMs: 1000 });
    const now = Date.now();

    assert.equal(limiter.hit('a', now).allowed, true);
    assert.equal(limiter.hit('a', now).allowed, false);
    assert.equal(limiter.hit('b', now).allowed, true);
  });
});
