// ============================
// Cloudinary Webhook
// ============================
// Cloudinary calls this endpoint when eager transcoding (HLS/DASH) or
// auto-caption generation finishes. Updates the matching Firestore video
// document with streaming URLs and flips its status to 'ready'.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheDelete, cacheKeys } from '@/lib/redis';

interface CloudinaryNotification {
  notification_type?: string;
  public_id?: string;
  eager?: Array<{ format: string; secure_url: string; width: number; height: number }>;
  playback_url?: string;
  secure_url?: string;
  duration?: number;
  info?: { resource_type?: string; bytes?: number };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CloudinaryNotification;

    // Verify the notification came from Cloudinary using the shared secret.
    const signature = request.headers.get('x-cloudinary-signature');
    if (process.env.CLOUDINARY_API_SECRET && signature) {
      const crypto = await import('crypto');
      const expected = crypto
        .createHash('sha1')
        .update(`${JSON.stringify(body)}${process.env.CLOUDINARY_API_SECRET}`)
        .digest('hex');
      if (signature !== expected) {
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
      }
    }

    if (!isFirebaseConfigured() || !body.public_id) {
      return NextResponse.json({ success: true }); // Acknowledge; nothing to update.
    }

    const db = getAdminDb()!;
    const snapshot = await db.collection('videos').where('videoUrl', '==', body.secure_url).limit(1).get();
    const snapshotByPublicId = body.public_id
      ? await db.collection('videos').where('title', '==', body.public_id).limit(1).get()
      : null;

    const ref = !snapshot.empty ? snapshot.docs[0].ref : snapshotByPublicId && !snapshotByPublicId.empty ? snapshotByPublicId.docs[0].ref : null;
    if (!ref) {
      return NextResponse.json({ success: true, message: 'No matching video document' });
    }

    const updates: Record<string, unknown> = { status: 'ready', processingProgress: 100, updatedAt: new Date().toISOString() };
    if (body.playback_url) updates.hlsUrl = body.playback_url;
    if (body.eager) {
      const hls = body.eager.find((e) => e.format === 'm3u8');
      if (hls) updates.hlsUrl = hls.secure_url;
    }
    if (body.duration) updates.duration = Math.round(body.duration);

    await ref.update(updates);
    await cacheDelete(cacheKeys.recent());
    await cacheDelete(cacheKeys.trending());
    await cacheDelete(cacheKeys.video(ref.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
