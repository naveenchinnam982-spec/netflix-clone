// ============================
// Video Detail API
// ============================
// GET    /api/videos/:id  — public, cached, increments views
// PATCH  /api/videos/:id  — admin update
// DELETE /api/videos/:id  — admin delete

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheGet, cacheSet, cacheDelete, cacheKeys } from '@/lib/redis';
import { requireRole } from '@/lib/auth';
import type { Video } from '@/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cached = await cacheGet<Video>(cacheKeys.video(id));
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      const doc = await db.collection('videos').doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
      }
      const video = { id: doc.id, ...doc.data() } as Video;
      // Increment views asynchronously (don't block the response).
      db.collection('videos').doc(id).update({ views: (video.views || 0) + 1 }).catch(() => {});
      await cacheSet(cacheKeys.video(id), { ...video, views: video.views + 1 }, 300);
      return NextResponse.json({ success: true, data: { ...video, views: video.views + 1 } });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  // Demo mode
  const { DEMO_VIDEOS } = await import('@/lib/demo-data');
  const video = DEMO_VIDEOS.find((v) => v.id === id);
  if (!video) {
    return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
  }
  await cacheSet(cacheKeys.video(id), video, 300);
  return NextResponse.json({ success: true, data: video });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
    }
    const db = getAdminDb()!;
    await db.collection('videos').doc(id).update({ ...body, updatedAt: new Date().toISOString() });
    await cacheDelete(cacheKeys.video(id));
    return NextResponse.json({ success: true, data: { id, ...body } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  try {
    const { id } = await params;
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
