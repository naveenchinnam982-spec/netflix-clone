// ============================
// Users API (Admin)
// ============================
// GET    /api/users — list users
// PATCH  /api/users — update role / ban status (body: { id, isBanned?, role? })
// DELETE /api/users?id= — delete user

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  if (!isFirebaseConfigured()) {
    const { DEMO_USERS } = await import('@/lib/demo-data');
    return NextResponse.json({ success: true, data: DEMO_USERS });
  }

  try {
    const db = getAdminDb()!;
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(500).get();
    const users = snapshot.docs.map((doc) => doc.data() as User);
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  const { id, isBanned, role } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
  }

  try {
    const db = getAdminDb()!;
    const auth = getAdminAuth()!;

    if (typeof isBanned === 'boolean') {
      await auth.updateUser(id, { disabled: isBanned });
      await db.collection('users').doc(id).update({ isBanned });
    }
    if (role) {
      await auth.setCustomUserClaims(id, { role });
      await db.collection('users').doc(id).update({ role });
    }

    return NextResponse.json({ success: true, message: 'User updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
  }

  try {
    await getAdminAuth()!.deleteUser(id);
    await getAdminDb()!.collection('users').doc(id).delete();
    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
