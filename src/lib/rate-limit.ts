// ============================
// Rate Limiter
// ============================
// Simple in-memory sliding-window rate limiter keyed by IP + route.
// Suitable for a single-instance deployment; swap for an Upstash/Redis
// implementation at scale (see src/lib/redis.ts for the client).

import { NextRequest, NextResponse } from 'next/server';

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodically prune stale buckets to bound memory.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 60_000);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}, 60_000).unref?.();

/**
 * Enforces `limit` requests per `windowMs` per IP.
 * Returns a NextResponse (429) when the limit is exceeded, else null.
 */
export function rateLimit(request: NextRequest, { limit = 60, windowMs = 60_000, keyPrefix = '' }: { limit?: number; windowMs?: number; keyPrefix?: string } = {}): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${keyPrefix || request.nextUrl.pathname}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
    );
  }

  bucket.timestamps.push(now);
  return null;
}
