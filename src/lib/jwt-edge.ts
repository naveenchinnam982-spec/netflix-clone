// ============================
// Edge JWT Verifier
// ============================
// Edge-runtime-safe HS256 JWT verification using Web Crypto. Mirrors the
// tokens minted by src/lib/auth.ts (jsonwebtoken, HS256, same JWT_SECRET),
// so middleware can guard routes without pulling Node APIs into the Edge
// Runtime.

// Lazy secret resolution, mirroring src/lib/auth.ts. In production a missing
// JWT_SECRET makes verification fail closed (null => unauthenticated) instead
// of accepting tokens signed with the publicly-known fallback secret.
function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'dev-secret-change-me') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[jwt-edge] JWT_SECRET must be set in production (see .env.local.example)');
      return null;
    }
    return 'dev-secret-change-me';
  }
  return secret;
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface EdgeAuthPayload {
  uid: string;
  email?: string;
  role: string;
}

/** Verifies an HS256 JWT and returns its payload, or null when invalid. */
export async function verifyTokenEdge(token: string): Promise<EdgeAuthPayload | null> {
  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Reject non-HS256 tokens.
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    if (header.alg !== 'HS256') return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(signatureB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as EdgeAuthPayload & {
      exp?: number;
    };

    // Expiry check (jsonwebtoken embeds `exp` in seconds).
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    return { uid: payload.uid, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
