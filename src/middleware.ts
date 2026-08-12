// ============================
// Edge Middleware
// ============================
// Runs at the edge on every request:
//   - Security headers
//   - Rate limiting for API routes (incl. auth brute-force protection)
//   - JWT guard for /dashboard and protected API routes
//   - Maintenance-mode banner check (redirect when enabled)

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenEdge } from '@/lib/jwt-edge';

const PROTECTED_API_PREFIXES = ['/api/users', '/api/analytics', '/api/upload'];
const PROTECTED_PAGES = ['/dashboard', '/live'];

const AUTH_RATE_LIMIT: Record<string, { limit: number; windowMs: number }> = {
  '/api/auth/login': { limit: 10, windowMs: 60_000 },
  '/api/auth/me': { limit: 60, windowMs: 60_000 },
  '/api/comments': { limit: 30, windowMs: 60_000 },
};

// Lightweight in-memory limiter for the edge. Single-instance only;
// replace with Upstash Redis rate limiting for production scale.
const edgeBuckets = new Map<string, number[]>();

function edgeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = edgeBuckets.get(key)?.filter((t) => now - t < windowMs) || [];
  if (bucket.length >= limit) return false;
  bucket.push(now);
  edgeBuckets.set(key, bucket);
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ---- Security headers ----
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // ---- Rate limiting ----
  const limitConfig = AUTH_RATE_LIMIT[pathname];
  if (limitConfig) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!edgeRateLimit(`${pathname}:${ip}`, limitConfig.limit, limitConfig.windowMs)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // ---- Maintenance mode ----
  if (process.env.MAINTENANCE_MODE === 'true' && pathname !== '/maintenance') {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // ---- JWT guard for protected API routes ----
  if (PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '');
    const user = token ? await verifyTokenEdge(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ---- JWT guard for dashboard pages ----
  if (PROTECTED_PAGES.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('token')?.value;
    const user = token ? await verifyTokenEdge(token) : null;
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/dashboard') && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/browse', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/live/:path*'],
};
