// ============================
// Auth API - Login
// ============================
// POST /api/auth/login { idToken }
// Verifies the Firebase ID token (client-side sign-in) and issues a JWT in
// an httpOnly cookie so the edge middleware can protect /dashboard and /live.
// In demo mode (no Firebase service account) it issues a demo JWT.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, isFirebaseConfigured } from '@/lib/firebase-admin';
import { signToken, type AuthPayload } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000, keyPrefix: 'auth-login' });
  if (limited) return limited;

  try {
    const { idToken } = await request.json();
    let payload: AuthPayload;

    if (isFirebaseConfigured() && idToken) {
      const adminAuth = getAdminAuth()!;
      const decoded = await adminAuth.verifyIdToken(idToken);
      payload = {
        uid: decoded.uid,
        email: decoded.email || undefined,
        role: ((decoded.role as AuthPayload['role']) || 'user') as AuthPayload['role'],
      };
    } else {
      // Demo mode: mint a JWT for the demo admin so the middleware and
      // dashboard work without Firebase credentials.
      payload = { uid: 'demo-admin', email: 'admin@streamflix.dev', role: 'admin' };
    }

    const token = signToken(payload);

    const response = NextResponse.json({ success: true, data: { token, user: payload } });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Signed out' });
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
