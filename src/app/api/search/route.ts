// ============================
// Search API
// ============================
// GET /api/search?q=&category=&language=&minDuration=&maxDuration=&sort=
// Instant search across titles, descriptions, and tags.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheGet, cacheSet } from '@/lib/redis';
import { rateLimit } from '@/lib/rate-limit';
import type { Video } from '@/types';

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 60, windowMs: 60_000, keyPrefix: 'search' });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const category = searchParams.get('category');
  const language = searchParams.get('language');
  const minDuration = parseInt(searchParams.get('minDuration') || '0');
  const maxDuration = parseInt(searchParams.get('maxDuration') || String(Number.MAX_SAFE_INTEGER));
  const sort = searchParams.get('sort') || 'relevance';

  if (!q) {
    return NextResponse.json({ success: true, data: [] });
  }

  const cacheKey = `search:${q}:${category || ''}:${language || ''}:${sort}`;
  const cached = await cacheGet<Video[]>(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached });

  let videos: Video[] = [];

  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      // Equality filter only (no composite index needed); sorted below.
      const snapshot = await db.collection('videos').where('status', '==', 'ready').get();
      videos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Video);
    } catch {
      videos = [];
    }
  } else {
    const { DEMO_VIDEOS } = await import('@/lib/demo-data');
    videos = [...DEMO_VIDEOS];
  }

  let results = videos.filter((v) => {
    const text = `${v.title} ${v.description} ${v.tags?.join(' ')} ${v.uploaderName}`.toLowerCase();
    return text.includes(q);
  });

  if (category) results = results.filter((v) => v.categoryId === category);
  if (language) results = results.filter((v) => v.language === language);
  results = results.filter((v) => v.duration >= minDuration && v.duration <= maxDuration);

  if (sort === 'views') results.sort((a, b) => b.views - a.views);
  else if (sort === 'rating') results.sort((a, b) => b.likes - a.likes);
  else if (sort === 'date') results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  await cacheSet(cacheKey, results, 120);
  return NextResponse.json({ success: true, data: results });
}
