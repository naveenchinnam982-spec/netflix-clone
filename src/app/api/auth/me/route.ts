// ============================
// Auth Me API
// ============================
// GET /api/auth/me — returns the current user from the JWT cookie,
// with full profile loaded from Firestore when available.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        return NextResponse.json({ success: true, data: { ...user, profile: doc.data() } });
      }
    } catch {
      // Fall through to JWT-only response.
    }
  }

  return NextResponse.json({ success: true, data: user });
}
