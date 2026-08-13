// ============================
// Auth Helpers (Server)
// ============================
// JWT signing/verification and route guards for API routes. The token is
// issued by /api/auth/login after verifying the Firebase ID token; it carries
// uid/email/role and is stored in an httpOnly cookie.

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@/types';

export interface AuthPayload {
  uid: string;
  email?: string;
  role: UserRole;
}

const TOKEN_TTL = '7d';

// In production a missing/unset JWT_SECRET must fail loudly instead of
// silently signing tokens with a publicly-known fallback secret. The check
// is lazy (at sign/verify time) so the build itself never fails on it.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'dev-secret-change-me') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production (see .env.local.example)');
    }
    return 'dev-secret-change-me';
  }
  return secret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get('token')?.value;
  if (cookie) return cookie;
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Returns the authenticated user payload, or null when unauthenticated. */
export function requireAuth(request: NextRequest): AuthPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

/** Returns the user payload only when they hold one of the allowed roles. */
export function requireRole(request: NextRequest, roles: UserRole[]): AuthPayload | null {
  const user = requireAuth(request);
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
