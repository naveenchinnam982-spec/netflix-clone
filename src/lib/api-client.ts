// ============================
// API Client
// ============================
// Typed fetch wrapper used by client components to call internal API routes.
// Throws a readable error when a route responds with an error payload.

import type { APIResponse } from '@/types';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(path, { ...options, headers });

  let payload: APIResponse<T>;
  try {
    payload = (await response.json()) as APIResponse<T>;
  } catch {
    throw new ApiError(`Invalid response from ${path}`, response.status);
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  }

  return payload.data as T;
}
