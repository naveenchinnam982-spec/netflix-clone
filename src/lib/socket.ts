// ============================
// Socket.io Client
// ============================
// Singleton socket connection used for live streams, chat, watch-together,
// and realtime notifications. When NEXT_PUBLIC_SOCKET_URL is not configured
// (demo mode) the socket is a no-op event emitter so UI code never breaks.

'use client';

import { io, type Socket } from 'socket.io-client';

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

let socket: Socket | null = null;

/**
 * Returns a connected socket. Falls back to a minimal local event emitter
 * when no socket server URL is configured, keeping demo mode functional.
 */
export function getSocket(): Socket {
  if (socket) return socket;

  if (!SOCKET_URL) {
    // Minimal stand-in: emits to local listeners only (single tab).
    const listeners = new Map<string, Set<(...args: any[]) => void>>();
    socket = {
      connected: true,
      id: `local-${Date.now()}`,
      on: (event: string, cb: (...args: any[]) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
        return socket as Socket;
      },
      off: (event: string, cb?: (...args: any[]) => void) => {
        const set = listeners.get(event);
        if (set && cb) set.delete(cb);
        return socket as Socket;
      },
      emit: (event: string, ...args: any[]) => {
        const set = listeners.get(event);
        set?.forEach((cb) => cb(...args));
        return socket as Socket;
      },
      removeAllListeners: (event?: string) => {
        if (event) listeners.delete(event);
        else listeners.clear();
        return socket as Socket;
      },
      disconnect: () => undefined,
      connect: () => socket as Socket,
    } as unknown as Socket;
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return socket;
}

/** Whether a real socket server is configured (vs. local demo emitter). */
export function hasSocketServer(): boolean {
  return Boolean(SOCKET_URL);
}
