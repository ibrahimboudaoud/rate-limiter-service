# Rate Limiter Service - Spec

## What this is
I keep running into rate limiting in system design interviews and articles and realized I only understood it at a surface level, I could describe token bucket in a sentence but I'd never actually written one. So this is me building both real algorithms from scratch until I actually get it, not just building something to put on a resume.

## Stack
- Backend: Node.js + Express (or Next.js API routes if I want one repo)
- Storage: in-memory Map for state (Redis is a nice stretch goal but not required for the demo)
- Frontend: a single page, vanilla JS or a small React component, no framework overhead needed
- No database required, no auth required, deploy target: Railway/Render/Fly, free tier

## Core build (in order)
1. Implement tokenBucket(key, capacity, refillRate), a pure function/class tracking tokens per key, refilling over time, allow/deny per request.
2. Implement slidingWindowLog(key, limit, windowMs), tracks timestamps per key in a log, evicts old ones outside the window, allow/deny based on count.
3. Wrap both behind a tiny Express middleware: POST /api/hit?strategy=bucket|sliding&key=demo returns allowed, remaining, and resetAt.
4. Write unit tests for both algorithms: burst behavior, refill/decay over time (use fake timers), and the boundary case (exactly at the limit).
5. Build a one-page demo: a button that fires requests rapidly, a live counter showing allowed vs blocked, and a toggle to switch strategy live so the difference between the two algorithms is visually obvious.

## What I actually want to understand cold by the end of this
- Why token bucket allows bursts but sliding window doesn't, and when each one is the right call.
- Why the state has to be tracked per key (per user, per IP) instead of globally.
- What happens under concurrent requests to the same key, and whether the current in-memory version has a race condition (it does, if two requests read-then-write the count without synchronization, worth noting as a known limitation or fixing with a simple lock).
- How this would need to change in a real multi-server setup, since two server instances can't share one JS Map, which is exactly why Redis exists for this.

## Stretch (skip if short on time)
- Swap the in-memory Map for Redis (INCR + EXPIRE for a simple version).
- Add a third strategy, fixed window counter, and let the demo compare all three side by side.
