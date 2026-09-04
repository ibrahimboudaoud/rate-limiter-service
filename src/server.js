const path = require('path');
const express = require('express');
const TokenBucket = require('./algorithms/tokenBucket');
const SlidingWindowLog = require('./algorithms/slidingWindowLog');

// Demo-tuned limits: 10 requests, refilling/expiring over 10 seconds either way,
// so bucket vs. sliding window behave visibly differently at the same rate.
const tokenBucket = new TokenBucket({ capacity: 10, refillRate: 1 }); // 1 token/sec
const slidingWindowLog = new SlidingWindowLog({ limit: 10, windowMs: 10000 });

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/hit', (req, res) => {
  const strategy = req.query.strategy;
  const key = req.query.key;

  if (strategy !== 'bucket' && strategy !== 'sliding') {
    return res.status(400).json({ error: "strategy must be 'bucket' or 'sliding'" });
  }
  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }

  const limiter = strategy === 'bucket' ? tokenBucket : slidingWindowLog;
  const result = limiter.hit(key);

  res.status(result.allowed ? 200 : 429).json(result);
});

module.exports = app;
