// ============================
// Categories API
// ============================
// GET    /api/categories — public, cached
// POST   /api/categories — admin create
// PATCH  /api/categories — admin update (body.id)
// DELETE /api/categories?id= — admin delete

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { cacheGet, cacheSet, cacheDelete, cacheKeys } from '@/lib/redis';
import { requireRole } from '@/lib/auth';
import type { Category } from '@/types';

export async function GET(_request: NextRequest) {
  const cached = await cacheGet<Category[]>(cacheKeys.categories());
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  if (isFirebaseConfigured()) {
    try {
      const db = getAdminDb()!;
      // Equality filter only (no composite index needed); sort in memory.
      const snapshot = await db.collection('categories').where('isActive', '==', true).get();
      const categories = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Category)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      await cacheSet(cacheKeys.categories(), categories, 600);
      return NextResponse.json({ success: true, data: categories });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  const { DEMO_CATEGORIES, DEMO_VIDEOS } = await import('@/lib/demo-data');
  const categories = DEMO_CATEGORIES.map((c, i) => ({ ...c, videoCount: DEMO_VIDEOS.filter((v) => v.categoryId === c.id).length, order: i }));
  await cacheSet(cacheKeys.categories(), categories, 600);
  return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ success: false, error: 'Category name required' }, { status: 400 });

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
    }
    const db = getAdminDb()!;
    const ref = await db.collection('categories').add({
      ...body,
      videoCount: 0,
      createdAt: new Date().toISOString(),
    });
    await cacheDelete(cacheKeys.categories());
    return NextResponse.json({ success: true, data: { id: ref.id, ...body } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = requireRole(request, ['admin']);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Category ID required' }, { status: 400 });

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
    }
    const db = getAdminDb()!;
    await db.collection('categories').doc(id).update(data);
    await cacheDelete(cacheKeys.categories());
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
    if (!id) return NextResponse.json({ success: false, error: 'Category ID required' }, { status: 400 });

    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Firebase not configured' }, { status: 503 });
    }
    const db = getAdminDb()!;
    await db.collection('categories').doc(id).delete();
    await cacheDelete(cacheKeys.categories());
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
