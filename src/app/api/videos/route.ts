// ============================
// Videos API
// ============================
// GET  /api/videos?category=&q=&sort=&page=&limit=  — public list with cache
// POST /api/videos                                  — admin create
// PUT  /api/videos                                  — admin update (body.id)
// DELETE /api/videos?id=                            — admin delete

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheGet, cacheSet, cacheDelete, cacheKeys } from '@/lib/redis';
import { requireRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import type { Video } from '@/types';

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 120, windowMs: 60_000, keyPrefix: 'videos' });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const q = searchParams.get('q');
  const sort = searchParams.get('sort') || 'date';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24')));

  const cacheKey = `videos:${category || 'all'}:${q || ''}:${sort}:${page}:${limit}`;
  const cached = await cacheGet<{ videos: Video[]; hasMore: boolean }>(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached, pagination: { page, limit } });
  }

  // Firebase mode
  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      let query: FirebaseFirestore.Query = db.collection('videos')
        .where('status', '==', 'ready')
        .orderBy(sort === 'views' ? 'views' : 'createdAt', sort === 'views' ? 'desc' : 'desc')
        .limit(limit);

      if (category) {
        query = db.collection('videos')
          .where('categoryId', '==', category)
          .where('status', '==', 'ready')
          .orderBy('createdAt', 'desc')
          .limit(limit);
      }

      const snapshot = await query.get();
      let videos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Video);

      // Client-side text search across the page (Firestore lacks full-text).
      if (q) {
        const term = q.toLowerCase();
        videos = videos.filter(
          (v) => v.title.toLowerCase().includes(term) || v.description.toLowerCase().includes(term) || v.tags?.some((t) => t.toLowerCase().includes(term))
        );
      }

      const result = { videos, hasMore: snapshot.docs.length === limit };
      await cacheSet(cacheKey, result, 120);
      return NextResponse.json({ success: true, data: result, pagination: { page, limit } });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  // Demo mode: serve the demo dataset through the same contract.
  const { DEMO_VIDEOS } = await import('@/lib/demo-data');
  let videos = [...DEMO_VIDEOS];
  if (category) videos = videos.filter((v) => v.categoryId === category);
  if (q) {
    const term = q.toLowerCase();
    videos = videos.filter((v) => v.title.toLowerCase().includes(term) || v.description.toLowerCase().includes(term) || v.tags?.some((t) => t.toLowerCase().includes(term)));
  }
  if (sort === 'views') videos.sort((a, b) => b.views - a.views);
  else videos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const start = (page - 1) * limit;
  const slice = videos.slice(start, start + limit);
  const result = { videos: slice, hasMore: start + limit < videos.length };
  await cacheSet(cacheKey, result, 120);
  return NextResponse.json({ success: true, data: result, pagination: { page, limit, total: videos.length } });
}

export async function POST(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  const limited = rateLimit(request, { limit: 20, windowMs: 60_000, keyPrefix: 'videos-post' });
  if (limited) return limited;

  try {
    const body = await request.json();
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured — create videos from the dashboard instead' },
        { status: 503 }
      );
    }
    const db = getAdminDb()!;
    const docRef = await db.collection('videos').add({
      ...body,
      views: 0,
      likes: 0,
      dislikes: 0,
      status: body.status || 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await cacheDelete(cacheKeys.recent());
    return NextResponse.json({ success: true, data: { id: docRef.id, ...body } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Video ID required' }, { status: 400 });

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
    }
    const db = getAdminDb()!;
    await db.collection('videos').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    await cacheDelete(cacheKeys.video(id));
    return NextResponse.json({ success: true, data: { id, ...data } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Video ID required' }, { status: 400 });

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
    }
    const db = getAdminDb()!;
    await db.collection('videos').doc(id).delete();
    await cacheDelete(cacheKeys.video(id));
    return NextResponse.json({ success: true, message: 'Video deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
