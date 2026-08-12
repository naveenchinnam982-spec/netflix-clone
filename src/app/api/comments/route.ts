// ============================
// Comments API
// ============================
// GET  /api/comments?videoId= — public
// POST /api/comments          — authenticated (add or reply)
// DELETE /api/comments?id=&videoId= — owner or admin

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import type { Comment } from '@/types';

export async function GET(request: NextRequest) {
  const videoId = new URL(request.url).searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ success: false, error: 'videoId required' }, { status: 400 });

  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      const snapshot = await db.collection('comments').doc(videoId).collection('items').orderBy('createdAt', 'desc').limit(200).get();
      const comments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Comment);
      return NextResponse.json({ success: true, data: comments });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  const { DEMO_COMMENTS } = await import('@/lib/demo-data');
  const demo = videoId === 'demo-1' ? DEMO_COMMENTS : [];
  return NextResponse.json({ success: true, data: demo });
}

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: 'Sign in to comment' }, { status: 401 });

  const limited = rateLimit(request, { limit: 10, windowMs: 60_000, keyPrefix: 'comments' });
  if (limited) return limited;

  const { videoId, text, parentId } = await request.json();
  if (!videoId || !text?.trim()) {
    return NextResponse.json({ success: false, error: 'videoId and text required' }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ success: false, error: 'Comment too long (max 2000 chars)' }, { status: 400 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
  }

  const db = getAdminDb()!;
  const userDoc = await db.collection('users').doc(user.uid).get();
  const profile = userDoc.exists ? userDoc.data() : null;

  const comment: Omit<Comment, 'id'> = {
    videoId,
    userId: user.uid,
    user: {
      uid: user.uid,
      email: user.email || '',
      displayName: profile?.displayName || 'User',
      photoURL: profile?.photoURL || '',
      role: profile?.role || 'user',
      emailVerified: true,
      isBanned: false,
      subscription: profile?.subscription || 'free',
      createdAt: profile?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: profile?.preferences || {},
      stats: profile?.stats || {},
    },
    text: text.trim(),
    likes: 0,
    dislikes: 0,
    replies: 0,
    parentId,
    status: 'active',
    isEdited: false,
    createdAt: new Date().toISOString(),
  };

  const ref = await db.collection('comments').doc(videoId).collection('items').add(comment);
  return NextResponse.json({ success: true, data: { id: ref.id, ...comment } }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const videoId = searchParams.get('videoId');
  if (!id || !videoId) return NextResponse.json({ success: false, error: 'id and videoId required' }, { status: 400 });

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
  }

  const db = getAdminDb()!;
  const doc = await db.collection('comments').doc(videoId).collection('items').doc(id).get();
  if (!doc.exists) return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });

  const data = doc.data() as Comment;
  if (data.userId !== user.uid && user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'You can only delete your own comments' }, { status: 403 });
  }

  await doc.ref.delete();
  return NextResponse.json({ success: true, message: 'Comment deleted' });
}
