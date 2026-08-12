// ============================
// Local Storage Helpers
// ============================
// Typed localStorage wrapper used to persist user data (my list, history,
// likes, uploads) when the platform runs in demo mode without Firebase.
// Intentionally NOT a client component: every accessor guards with
// `typeof window === 'undefined'`, so this module is safe to import from
// both Route Handlers (server) and client components.

const PREFIX = 'streamflix:';

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — degrade silently.
  }
}

export function removeLocal(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore.
  }
}
