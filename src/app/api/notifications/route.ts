// ============================
// Notifications API
// ============================
// GET  /api/notifications — current user's notifications
// POST /api/notifications  — mark notifications read ({ ids })
// Admin create via /api/notifications/broadcast would be added here.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth';
import type { Notification } from '@/types';

export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (!isFirebaseConfigured()) {
    const { DEMO_NOTIFICATIONS } = await import('@/lib/demo-data');
    return NextResponse.json({ success: true, data: DEMO_NOTIFICATIONS });
  }

  try {
    const db = getAdminDb()!;
    const snapshot = await db
      .collection('notifications')
      .doc(user.uid)
      .collection('items')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Notification);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: 'ids array required' }, { status: 400 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ success: true, message: 'Marked as read (demo)' });
  }

  try {
    const db = getAdminDb()!;
    const batch = db.batch();
    ids.forEach((id) => {
      batch.update(db.collection('notifications').doc(user.uid).collection('items').doc(id), { isRead: true, readAt: new Date().toISOString() });
    });
    await batch.commit();
    return NextResponse.json({ success: true, message: `${ids.length} notifications marked as read` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
