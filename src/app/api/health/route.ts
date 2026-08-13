// ============================
// Health API
// ============================
// GET /api/health — liveness + configuration summary. Used by the
// platform (and Railway/uptime monitors) to verify the app is up.

import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase-admin';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      backend: isFirebaseConfigured() ? 'firebase' : 'demo',
      cloudinary: Boolean(process.env.CLOUDINARY_API_KEY && !process.env.CLOUDINARY_API_KEY.includes('YOUR_')),
      redis: Boolean(process.env.REDIS_URL),
      socketServer: Boolean(process.env.NEXT_PUBLIC_SOCKET_URL),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('YOUR_')),
      uptime: Math.round(process.uptime()),
    },
  });
}
