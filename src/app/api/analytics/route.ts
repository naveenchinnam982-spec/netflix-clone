// ============================
// Analytics API (Admin)
// ============================
// GET /api/analytics — aggregated platform metrics, cached for 5 minutes.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheGet, cacheSet, cacheKeys } from '@/lib/redis';
import { requireRole } from '@/lib/auth';
import type { Analytics, Video } from '@/types';

export async function GET(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  const cached = await cacheGet<Analytics>(cacheKeys.analytics());
  if (cached) return NextResponse.json({ success: true, data: cached });

  if (!isFirebaseConfigured()) {
    const { DEMO_ANALYTICS } = await import('@/lib/demo-data');
    await cacheSet(cacheKeys.analytics(), DEMO_ANALYTICS, 300);
    return NextResponse.json({ success: true, data: DEMO_ANALYTICS });
  }

  try {
    const db = getAdminDb()!;
    const [usersSnap, videosSnap, commentsSnap, streamsSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('videos').count().get(),
      db.collection('comments').count().get(),
      db.collection('liveStreams').where('status', '==', 'live').count().get(),
    ]);

    // Top videos by views.
    const topVideosSnap = await db.collection('videos').orderBy('views', 'desc').limit(5).get();
    const mostWatched = topVideosSnap.docs.map((d) => ({ ...(d.data() as Video), id: d.id }));

    const analytics: Analytics = {
      dailyUsers: [],
      mostWatched,
      watchTime: 0,
      revenue: 0,
      topCategories: [],
      storageUsage: 0,
      bandwidthUsage: 0,
      userGrowth: [],
      videoUploads: [],
      activeStreams: streamsSnap.data().count,
      totalVideos: videosSnap.data().count,
      totalUsers: usersSnap.data().count,
      totalComments: commentsSnap.data().count,
    };

    await cacheSet(cacheKeys.analytics(), analytics, 300);
    return NextResponse.json({ success: true, data: analytics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
