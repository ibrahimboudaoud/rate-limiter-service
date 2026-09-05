# rate-limiter-service

**Live demo:** [rate-limiter-service-mnx5.onrender.com](https://rate-limiter-service-mnx5.onrender.com)

(Free-tier hosting, so the first request after it's been idle a while can take 10-30 seconds to wake up. After that it's instant.)

A rate limiter built from scratch because I was tired of being able to describe token bucket in an interview but not actually having written one.

Two real algorithms, a tiny API in front of them, and a demo that looks less like a form and more like something you'd actually want to stare at during an incident.

## Why this exists

Rate limiting comes up constantly in system design interviews and I noticed I could talk about it fine but I'd never once implemented it. That gap bugged me more than it should have, so this is me closing it. No framework doing the hard part for me, no `npm install some-rate-limiter`. Just the two algorithms, written by hand, tested, and then a UI that actually shows you what's happening inside instead of just spitting out allowed/blocked.

## What's in here

**Token bucket** — every key gets a bucket of tokens that refill continuously over time. Idle time banks up capacity, so a key can spend a burst all at once if it's been quiet for a while.

**Sliding window log** — every key keeps a log of recent request timestamps. Old ones age out of the window as time passes. No banking, no bursts, just a hard smooth cap.

Same problem, genuinely different behavior, and the demo is built specifically to make that difference visible instead of just telling you about it in a paragraph like this one.

## The demo

Toggle between strategies and watch the internals live: the bucket panel shows a meter draining and refilling, the sliding window panel shows a timeline of timestamps aging out. Hit FIRE for a single request or FIRE x20 to burst it and watch the algorithms actually disagree with each other about what should happen.

It's styled like a terminal/systems dashboard on purpose. Monospace, near-black, hard edges, green for allow, red for block. No gradients, no rounded cards, because a demo about watching a system's internals shouldn't look like a landing page.

## Running it locally

```
npm install
npm start
```

Then open `http://localhost:3000` (or whatever port it prints).

## API

```
POST /api/hit?strategy=bucket|sliding&key=demo
```

Returns `{ allowed, remaining, resetAt }`, `200` if allowed, `429` if not.

## Tests

```
npm test
```

10 tests covering burst behavior, the exact boundary case, and refill/eviction over time using fake timers, no external test framework, just Node's built-in `node:test` runner.

## Stack

Node, Express, vanilla JS/HTML/CSS on the frontend. No database. No auth. Deliberately small.

## What I actually learned building this

The real "aha" wasn't the code, it was watching the two algorithms handle a repeated burst differently. Fire 20 requests fast on either strategy and 10 get through, 10 get blocked, same as you'd expect. But fire another burst immediately after and they diverge: sliding window blocks the whole thing outright since nothing ages out that fast, while token bucket blocks it too but for a different reason, a burst under a second can't accrue a whole token back. Same surface behavior, completely different reason underneath. That's the kind of thing you don't actually get until you've built it.
