// ============================
// Upload Complete API
// ============================
// POST /api/upload/complete
// Called after the final chunk succeeds. Creates the Firestore video
// document with the transcoded URLs (HLS/DASH/thumbnail) returned by the
// chunk route, then kicks off eager caption/summary generation when enabled.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheDelete, cacheKeys } from '@/lib/redis';
import { requireRole } from '@/lib/auth';
import type { Video, VideoVisibility } from '@/types';

interface CompleteBody {
  uploadId?: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  visibility?: VideoVisibility;
  fileSize?: number;
  format?: string;
  duration?: number;
  videoUrl?: string;
  hlsUrl?: string;
  dashUrl?: string;
  thumbnail?: string;
  publicId?: string;
}

export async function POST(request: NextRequest) {
  const user = requireRole(request, ['admin', 'teacher']);
  if (!user) return NextResponse.json({ success: false, error: 'Upload access required' }, { status: 403 });

  try {
    const body = (await request.json()) as CompleteBody;
    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: 'Video title required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isFirebaseConfigured()) {
      const db = getAdminDb()!;
      const video: Omit<Video, 'id'> = {
        title: body.title.trim(),
        description: body.description || '',
        thumbnail: body.thumbnail || '',
        thumbnailBlur: '',
        videoUrl: body.videoUrl || '',
        hlsUrl: body.hlsUrl || '',
        dashUrl: body.dashUrl || '',
        duration: body.duration || 0,
        views: 0,
        likes: 0,
        dislikes: 0,
        categoryId: body.categoryId || '',
        category: null as any,
        tags: body.tags || [],
        visibility: body.visibility || 'public',
        status: body.videoUrl ? 'ready' : 'processing',
        uploadedBy: user.uid,
        uploader: null as any,
        uploaderName: user.email || 'Teacher',
        uploaderAvatar: '',
        language: 'en',
        ageRestricted: false,
        allowComments: true,
        allowRatings: true,
        captions: [],
        chapters: [],
        quality: ['480p', '720p', '1080p'],
        resolution: { width: 1920, height: 1080, label: '1080p', bitrate: 3000 },
        fileSize: body.fileSize || 0,
        format: body.format || 'mp4',
        processedQualities: body.videoUrl ? ['480p', '720p', '1080p'] : [],
        processingProgress: body.videoUrl ? 100 : 0,
        createdAt: now,
        updatedAt: now,
      };

      const ref = await db.collection('videos').add(video);
      await cacheDelete(cacheKeys.recent());
      await cacheDelete(cacheKeys.trending());
      return NextResponse.json({ success: true, data: { id: ref.id, ...video } }, { status: 201 });
    }

    // ---- Demo mode: simulate a finished upload with a playable sample ----
    const { DEMO_VIDEOS, DEMO_CATEGORIES } = await import('@/lib/demo-data');
    const sample = DEMO_VIDEOS[0];
    const category = DEMO_CATEGORIES.find((c) => c.id === body.categoryId) || DEMO_CATEGORIES[0];
    const video: Video = {
      id: `v-${Date.now()}`,
      title: body.title.trim(),
      description: body.description || '',
      thumbnail: sample.thumbnail,
      thumbnailBlur: sample.thumbnailBlur,
      videoUrl: sample.videoUrl,
      hlsUrl: sample.hlsUrl,
      duration: sample.duration,
      views: 0,
      likes: 0,
      dislikes: 0,
      categoryId: category.id,
      category,
      tags: body.tags || [],
      visibility: body.visibility || 'public',
      status: 'ready',
      uploadedBy: user.uid,
      uploader: null as any,
      uploaderName: user.email || 'Teacher',
      uploaderAvatar: '',
      language: 'en',
      ageRestricted: false,
      allowComments: true,
      allowRatings: true,
      captions: [],
      chapters: [],
      quality: ['720p', '1080p'],
      resolution: { width: 1920, height: 1080, label: '1080p', bitrate: 3000 },
      fileSize: body.fileSize || 0,
      format: body.format || 'mp4',
      processedQualities: ['720p', '1080p'],
      processingProgress: 100,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to localStorage via the repository so it shows up in browse.
    const { repo } = await import('@/lib/repository');
    const created = await repo.createVideo(video);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to finalize upload' }, { status: 500 });
  }
}
