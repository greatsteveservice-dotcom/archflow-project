import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for MVP (no Redis needed).
 * Uses a Map of IP → { count, resetAt } entries.
 * Automatically cleans up expired entries to prevent memory leaks.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const store of stores.values()) {
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Create a rate limiter for a specific route.
 *
 * @param name   Unique store name (e.g. 'signup', 'invite')
 * @param limit  Max requests allowed in the window
 * @param windowMs  Time window in milliseconds
 */
export function rateLimit(name: string, limit: number, windowMs: number) {
  /**
   * Check rate limit. Returns null if allowed, or a 429 NextResponse if exceeded.
   */
  return function check(req: NextRequest): NextResponse | null {
    cleanup();

    const ip = getClientIp(req);
    const store = getStore(name);
    const now = Date.now();

    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return null; // allowed
    }

    entry.count++;

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          },
        }
      );
    }

    return null; // allowed
  };
}
