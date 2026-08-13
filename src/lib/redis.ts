// ============================
// Redis Cache Helper
// ============================
// Optional Redis-backed cache for API routes. Used to cache hot reads
// (trending videos, featured video, category lists) behind a TTL.
// Degrades gracefully to a no-op in-memory cache when REDIS_URL is absent,
// so the app runs on Vercel without extra infrastructure.

import Redis from 'ioredis';

let client: Redis | null = null;
const memory = new Map<string, { value: string; expiresAt: number }>();

function getClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    client.on('error', () => {
      // Log and continue without cache rather than failing requests.
    });
  }
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  const entry = memory.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return JSON.parse(entry.value) as T;
  }
  if (entry) memory.delete(key);
  return null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const redis = getClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch {
      // fall through to memory
    }
  }
  memory.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 });
  // Bound memory usage.
  if (memory.size > 200) {
    const now = Date.now();
    for (const [k, v] of memory) {
      if (v.expiresAt <= now) memory.delete(k);
    }
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }
  memory.delete(key);
}

export const cacheKeys = {
  trending: () => 'videos:trending',
  featured: () => 'videos:featured',
  recent: () => 'videos:recent',
  video: (id: string) => `videos:${id}`,
  categories: () => 'categories',
  analytics: () => 'analytics:daily',
};
